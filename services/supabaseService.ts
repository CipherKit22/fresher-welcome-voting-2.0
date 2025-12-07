
import { supabase, isMockMode } from './supabaseClient';
import { Candidate, StudentInfo, Votes, Major, Year, VotingRole } from '../types';
import { MOCK_CANDIDATES, MOCK_STUDENTS, getClassPasscode, DEFAULT_EVENT_TIME } from '../constants';

// --- Configuration ---

export const fetchEventStartTime = async (): Promise<string> => {
  try {
    if (isMockMode || !supabase) {
      return DEFAULT_EVENT_TIME;
    }

    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'event_start_time')
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_EVENT_TIME;
    }
    return data.value;
  } catch (err) {
    console.error("fetchEventStartTime error:", err);
    return DEFAULT_EVENT_TIME;
  }
};

export const updateEventStartTime = async (isoDate: string) => {
  try {
    if (isMockMode || !supabase) {
      console.log("Mock Mode: Event time updated to", isoDate);
      return;
    }

    const { error } = await supabase
      .from('app_config')
      .upsert({ key: 'event_start_time', value: isoDate });

    if (error) throw error;
  } catch (err) {
    console.error("updateEventStartTime error:", err);
    throw err;
  }
};

// --- Candidates ---

export const fetchCandidates = async (): Promise<Candidate[]> => {
  try {
    if (isMockMode || !supabase) {
      return MOCK_CANDIDATES;
    }

    const { data, error } = await supabase
      .from('candidates')
      .select('*');
    
    if (error) {
      console.warn('Supabase Error (fetchCandidates):', error.message);
      return [];
    }
    return data as Candidate[];
  } catch (err) {
    console.warn("fetchCandidates connection error:", err);
    return [];
  }
};

export const addCandidate = async (candidate: Omit<Candidate, 'id'>) => {
  try {
    if (isMockMode || !supabase) {
      console.log("Mock Mode: Candidate added", candidate);
      const newCand = { ...candidate, id: `mock-${Date.now()}` };
      MOCK_CANDIDATES.push(newCand);
      return [newCand];
    }

    const { data, error } = await supabase
      .from('candidates')
      .insert([candidate])
      .select();
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("addCandidate error:", err);
    throw err;
  }
};

export const deleteCandidate = async (id: string) => {
  try {
    if (isMockMode || !supabase) {
      console.log("Mock Mode: Candidate deleted", id);
      const idx = MOCK_CANDIDATES.findIndex(c => c.id === id);
      if (idx > -1) MOCK_CANDIDATES.splice(idx, 1);
      return;
    }

    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (err) {
    console.error("deleteCandidate error:", err);
    throw err;
  }
};

// --- Students / Teachers ---

export const verifyStudent = async (year: Year, major: Major, rollNumber: string, passcode: string): Promise<{ success: boolean; student?: StudentInfo; message?: string }> => {
  try {
    if (isMockMode || !supabase) {
      // Mock Check against MOCK_STUDENTS
      const found = MOCK_STUDENTS.find(s => 
        s.type === 'Student' &&
        s.year === year && 
        s.major === major && 
        s.rollNumber === rollNumber
      );

      if (!found) {
        return { success: false, message: "Student not found. Please contact Admin." };
      }

      // Check Passcode (Simple equality check for mock mode)
      if (found.passcode?.toLowerCase() !== passcode.toLowerCase()) {
         return { success: false, message: "Wrong Passcode." };
      }

      if (found.hasVoted) {
         return { success: false, message: "You have already voted." };
      }

      return {
        success: true,
        student: { ...found }
      };
    }

    // Real DB Check
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('year', year)
      .eq('major', major)
      .eq('roll_number', rollNumber)
      .eq('type', 'Student')
      .maybeSingle(); 

    if (error) {
      return { success: false, message: "Database Error. Please try again." }; 
    }

    if (!data) {
      return { success: false, message: "Student not found." };
    }

    if (data.passcode.toLowerCase() !== passcode.toLowerCase()) {
      return { success: false, message: "Wrong Passcode." };
    }

    if (data.has_voted) {
      return { success: false, message: "You have already voted." };
    }

    return { 
      success: true, 
      student: {
        id: data.id,
        name: data.name,
        type: 'Student',
        year: data.year as Year,
        major: data.major as Major,
        rollNumber: data.roll_number,
        hasVoted: data.has_voted
      }
    };
  } catch (err) {
    console.error("verifyStudent error:", err);
    return { success: false, message: "Network Error. Please try again." };
  }
};

export const verifyTeacher = async (major: Major, name: string, passcode: string): Promise<{ success: boolean; student?: StudentInfo; message?: string }> => {
  if (!name || !major) return { success: false, message: "Incomplete details." };
  if (!passcode) return { success: false, message: "Passcode required." };

  try {
     if (isMockMode || !supabase) {
        // Mock check
        const found = MOCK_STUDENTS.find(s => 
            s.type === 'Teacher' &&
            s.major === major &&
            s.name.toLowerCase() === name.toLowerCase()
        );

        if (!found) {
             return { success: false, message: "Teacher not found." };
        }

        if (found.passcode !== passcode) {
            return { success: false, message: "Wrong Passcode." };
        }
        
        if (found.hasVoted) {
             return { success: false, message: "You have already voted." };
        }

        return {
            success: true,
            student: { ...found }
        };
     }

     // Database check
     const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('major', major)
        .eq('name', name)
        .eq('type', 'Teacher')
        .maybeSingle();

     if (error || !data) {
         return { success: false, message: "Teacher not found." };
     }

     if (data.passcode !== passcode) {
         return { success: false, message: "Wrong Passcode." };
     }

     if (data.has_voted) {
         return { success: false, message: "You have already voted." };
     }

     return {
         success: true,
         student: {
            id: data.id,
            name: data.name,
            type: 'Teacher',
            year: Year.Staff,
            major: data.major as Major,
            rollNumber: "Staff",
            hasVoted: data.has_voted
         }
     };

  } catch (e) {
      return { success: false, message: "Login Error." };
  }
};

export const fetchTeachers = async (major?: Major): Promise<string[]> => {
    try {
        if (isMockMode || !supabase) {
            const teachers = MOCK_STUDENTS.filter(s => s.type === 'Teacher');
            if (major) {
                return teachers.filter(t => t.major === major).map(t => t.name || '');
            }
            return teachers.map(t => t.name || '');
        }

        let query = supabase
            .from('students')
            .select('name')
            .eq('type', 'Teacher');
        
        if (major) {
            query = query.eq('major', major);
        }

        const { data, error } = await query;
        if (error) return [];
        return data.map(d => d.name);
    } catch (e) {
        return [];
    }
}

export const fetchStudents = async () => {
  try {
    if (isMockMode || !supabase) {
      return MOCK_STUDENTS;
    }

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.warn("Supabase Error (fetchStudents):", error.message);
      return [];
    }
    return data;
  } catch (err) {
    console.error("fetchStudents error:", err);
    return [];
  }
};

export const fetchTotalStudentCount = async (): Promise<number> => {
  try {
    if (isMockMode || !supabase) {
      return MOCK_STUDENTS.filter(s => s.type === 'Student').length;
    }
    const { count, error } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'Student');

    if (error) return 0;
    return count || 0;
  } catch (err) {
    return 0;
  }
};

export const addStudent = async (name: string, year: string, major: string, rollNumber: string, passcode: string) => {
  try {
    if (isMockMode || !supabase) {
      console.log("Mock Mode: Student added", { name, year, major });
      // Check for duplicate in mock
      const exists = MOCK_STUDENTS.some(s => s.rollNumber === rollNumber && s.year === year && s.major === major);
      if (exists) throw new Error("Duplicate Student");

      MOCK_STUDENTS.unshift({
          id: `mock-s-${Date.now()}`,
          name,
          year,
          major,
          rollNumber,
          passcode,
          type: 'Student',
          hasVoted: false
      });
      return;
    }

    const { data, error } = await supabase
      .from('students')
      .insert([{ name, year, major, roll_number: rollNumber, passcode, type: 'Student', has_voted: false }])
      .select();
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("addStudent error:", err);
    throw err;
  }
};

export const addTeacher = async (name: string, major: string, passcode: string) => {
    try {
      if (isMockMode || !supabase) {
         console.log("Mock Mode: Teacher added", { name, major, passcode });
         MOCK_STUDENTS.unshift({
            id: `mock-t-${Date.now()}`,
            name,
            major,
            year: Year.Staff,
            rollNumber: 'Staff',
            passcode: passcode,
            type: 'Teacher',
            hasVoted: false
         });
         return;
      }
  
      const { data, error } = await supabase
        .from('students')
        .insert([{ 
            name, 
            major, 
            year: Year.Staff, 
            roll_number: 'Staff', 
            passcode: passcode || 'TEACHER', 
            type: 'Teacher', 
            has_voted: false 
        }])
        .select();
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error("addTeacher error:", err);
      throw err;
    }
  };

export const updateStudentVoteStatus = async (studentId: string, hasVoted: boolean) => {
  try {
    if (isMockMode || !supabase) {
      console.log(`Mock Mode: Student ${studentId} status updated to ${hasVoted}`);
      const student = MOCK_STUDENTS.find(s => s.id === studentId);
      if (student) student.hasVoted = hasVoted;
      return;
    }

    const { error } = await supabase
      .from('students')
      .update({ has_voted: hasVoted })
      .eq('id', studentId);

    if (error) throw error;
  } catch (err) {
    console.error("updateStudentVoteStatus error:", err);
    throw err;
  }
};

export const deleteStudent = async (id: string) => {
  try {
    if (isMockMode || !supabase) {
      console.log("Mock Mode: Student/Teacher deleted", id);
      const idx = MOCK_STUDENTS.findIndex(s => s.id === id);
      if (idx > -1) MOCK_STUDENTS.splice(idx, 1);
      return;
    }
    const { error: voteError } = await supabase.from('votes').delete().eq('voter_id', id);
    if (voteError) throw voteError;

    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error("deleteStudent error:", err);
    throw err;
  }
};

export const bulkDeleteStudents = async (ids: string[]) => {
  try {
    if (isMockMode || !supabase) {
      console.log("Mock Mode: Bulk delete students", ids);
      for (const id of ids) {
        const idx = MOCK_STUDENTS.findIndex(s => s.id === id);
        if (idx > -1) MOCK_STUDENTS.splice(idx, 1);
      }
      return;
    }
    const { error: voteError } = await supabase.from('votes').delete().in('voter_id', ids);
    if (voteError) throw voteError;

    const { error } = await supabase.from('students').delete().in('id', ids);
    if (error) throw error;
  } catch (err) {
    console.error("bulkDeleteStudents error:", err);
    throw err;
  }
};

export const bulkUpdateStudentStatus = async (ids: string[], hasVoted: boolean) => {
  try {
    if (isMockMode || !supabase) {
      console.log(`Mock Mode: Bulk update status for ${ids.length} students to ${hasVoted}`);
      MOCK_STUDENTS.forEach(s => {
          if (ids.includes(s.id!)) s.hasVoted = hasVoted;
      });
      return;
    }
    const { error } = await supabase
      .from('students')
      .update({ has_voted: hasVoted })
      .in('id', ids);

    if (error) throw error;
  } catch (err) {
    console.error("bulkUpdateStudentStatus error:", err);
    throw err;
  }
};

export const bulkUpdateClassPasscode = async (year: Year, major: Major, newPasscode: string) => {
    try {
        if (isMockMode || !supabase) {
            console.log(`Mock Mode: Passcode for ${year} ${major} updated to ${newPasscode}`);
            MOCK_STUDENTS.forEach(s => {
                if (s.year === year && s.major === major) {
                    s.passcode = newPasscode;
                }
            });
            return;
        }

        // Determine if we are updating Teachers or Students based on year
        const type = year === Year.Staff ? 'Teacher' : 'Student';

        const { error } = await supabase
            .from('students')
            .update({ passcode: newPasscode })
            .eq('year', year)
            .eq('major', major)
            .eq('type', type);
            
        if (error) throw error;

    } catch (err) {
        console.error("bulkUpdateClassPasscode error:", err);
        throw err;
    }
};


// --- Votes ---

// Mock votes storage
const MOCK_VOTES: any[] = [];

export const submitVote = async (studentId: string, votes: Votes) => {
  try {
    if (isMockMode || !supabase) {
      console.log("Mock Mode: Vote submitted for", studentId, votes);
      MOCK_VOTES.push({
        voter_id: studentId,
        king_id: votes.male, 
        queen_id: votes.female
      });
      const student = MOCK_STUDENTS.find(s => s.id === studentId);
      if (student) student.hasVoted = true;
      return;
    }

    const { error: voteError } = await supabase
      .from('votes')
      .insert([{
        voter_id: studentId,
        king_id: votes.male, 
        queen_id: votes.female,
        prince_id: null,
        princess_id: null
      }]);

    if (voteError) throw voteError;

    // Update status
    const { error: studentError } = await supabase
    .from('students')
    .update({ has_voted: true })
    .eq('id', studentId);

    if (studentError) throw studentError;

  } catch (err) {
    console.error("submitVote error:", err);
    throw err;
  }
};

export const fetchVoteResults = async () => {
  try {
    if (isMockMode || !supabase) {
      const tally: Record<string, Record<string, number>> = { Male: {}, Female: {} };
      MOCK_VOTES.forEach((vote) => {
        if (vote.king_id) tally.Male[vote.king_id] = (tally.Male[vote.king_id] || 0) + 1;
        if (vote.queen_id) tally.Female[vote.queen_id] = (tally.Female[vote.queen_id] || 0) + 1;
      });
      return { tally, totalVotes: MOCK_VOTES.length };
    }

    const { data, error } = await supabase.from('votes').select('*');
    
    if (error) {
      console.warn("Supabase Error (fetchVoteResults):", error.message);
      return { tally: { Male: {}, Female: {} }, totalVotes: 0 };
    }

    const tally: Record<string, Record<string, number>> = {
      Male: {},
      Female: {}
    };
    
    data.forEach((vote: any) => {
      if (vote.king_id) tally.Male[vote.king_id] = (tally.Male[vote.king_id] || 0) + 1;
      if (vote.prince_id) tally.Male[vote.prince_id] = (tally.Male[vote.prince_id] || 0) + 1;
      if (vote.queen_id) tally.Female[vote.queen_id] = (tally.Female[vote.queen_id] || 0) + 1;
      if (vote.princess_id) tally.Female[vote.princess_id] = (tally.Female[vote.princess_id] || 0) + 1;
    });

    return { tally, totalVotes: data.length };
  } catch (err) {
    console.error("fetchVoteResults error:", err);
    const tally: Record<string, Record<string, number>> = { Male: {}, Female: {} };
    return { tally, totalVotes: 0 };
  }
};

export const resetAllVotes = async () => {
  try {
    if (isMockMode || !supabase) {
      console.log("Mock Mode: All votes reset.");
      MOCK_VOTES.length = 0;
      MOCK_STUDENTS.forEach(s => s.hasVoted = false);
      return;
    }

    const { error: deleteError } = await supabase
      .from('votes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); 
    
    if (deleteError) throw deleteError;

    const { error: updateError } = await supabase
      .from('students')
      .update({ has_voted: false })
      .neq('id', '00000000-0000-0000-0000-000000000000');
      
    if (updateError) throw updateError;
  } catch (err) {
    console.error("resetAllVotes error:", err);
    throw err;
  }
};
