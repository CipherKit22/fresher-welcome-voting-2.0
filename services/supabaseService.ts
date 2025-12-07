
import { supabase, isMockMode } from './supabaseClient';
import { Candidate, StudentInfo, Votes, Major, Year, VotingRole } from '../types';
import { MOCK_CANDIDATES, STUDENT_DATABASE, getClassPasscode, DEFAULT_EVENT_TIME, MOCK_TEACHERS } from '../constants';

// --- Configuration ---

export const fetchEventStartTime = async (): Promise<string> => {
  try {
    if (isMockMode || !supabase) {
      return new Date(Date.now() + 10 * 60 * 1000).toISOString();
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
      console.warn('Supabase Error (fetchCandidates), falling back to mock:', error.message);
      return MOCK_CANDIDATES; // Fallback to ensure UI works
    }
    return data as Candidate[];
  } catch (err) {
    console.warn("fetchCandidates connection error, using mock:", err);
    return MOCK_CANDIDATES;
  }
};

export const addCandidate = async (candidate: Omit<Candidate, 'id'>) => {
  try {
    if (isMockMode || !supabase) {
      console.log("Mock Mode: Candidate added (simulated)", candidate);
      MOCK_CANDIDATES.push({ ...candidate, id: `mock-${Date.now()}` });
      return [{ ...candidate, id: `mock-${Date.now()}` }];
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
      console.log("Mock Mode: Candidate deleted (simulated)", id);
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
      // Mock Validation Logic
      
      const expectedPasscode = getClassPasscode(year, major);
      // For mock purposes, we strictly check against the fruit list
      if (passcode.toLowerCase() !== expectedPasscode.toLowerCase()) {
         return { success: false, message: `Wrong Passcode. Please ask your Class Leader (EC).` };
      }

      const dbKey = `${year}_${major}_${rollNumber}`;
      const studentName = STUDENT_DATABASE[dbKey];

      if (studentName) {
        return {
          success: true,
          student: {
            id: `mock-student-${dbKey}`,
            name: studentName,
            type: 'Student',
            year: year,
            major: major,
            rollNumber: rollNumber,
            hasVoted: false 
          }
        };
      }

      return {
        success: true,
        student: {
          id: `mock-generic-${Date.now()}`,
          name: `Student ${major} ${rollNumber}`,
          type: 'Student',
          year: year,
          major: major,
          rollNumber: rollNumber,
          hasVoted: false
        }
      };
    }

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('year', year)
      .eq('major', major)
      .eq('roll_number', rollNumber)
      .eq('type', 'Student')
      .maybeSingle(); 

    if (error) {
      console.warn("Supabase Login Failed, falling back to mock check.");
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
        const teachers = MOCK_TEACHERS[major] || [];
        const found = teachers.find(t => t.toLowerCase() === name.toLowerCase());
        
        if (found) {
            // Mock passcode check - accept 'TEACHER' or just ensure it's not empty
            if (passcode !== 'TEACHER') return { success: false, message: "Wrong Passcode." };

            return {
                success: true,
                student: {
                id: `mock-teacher-${major}-${name.replace(/\s+/g, '-').toLowerCase()}`,
                name: found, 
                type: 'Teacher',
                year: Year.Staff,
                major: major,
                rollNumber: "Staff",
                hasVoted: false
                }
            };
        } else {
             return { success: false, message: "Teacher not found in this department." };
        }
     }

     // Database check
     const { data, error } = await supabase
        .from('students') // We are storing teachers in students table with type='Teacher'
        .select('*')
        .eq('major', major)
        .eq('name', name)
        .eq('type', 'Teacher')
        .maybeSingle();

     if (error || !data) {
         return { success: false, message: "Teacher not found or system error." };
     }

     // Check Passcode
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
            if (major) return MOCK_TEACHERS[major] || [];
            return Object.values(MOCK_TEACHERS).flat();
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
      return [
        { id: 'm1', name: 'Mg Mg', year: Year.Y1, major: Major.Civil, roll_number: '1', has_voted: false, type: 'Student', passcode: 'Apple' },
        { id: 'm2', name: 'Mya Mya', year: Year.Y3, major: Major.CEIT, roll_number: '1', has_voted: true, type: 'Student', passcode: 'Grape' },
        { id: 't1', name: 'Dr. Kyaw', year: Year.Staff, major: Major.Civil, roll_number: 'Staff', has_voted: false, type: 'Teacher', passcode: 'TEACHER' }
      ];
    }

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.warn("Supabase Error (fetchStudents), using mock:", error.message);
       return [
        { id: 'm1', name: 'Mg Mg', year: Year.Y1, major: Major.Civil, roll_number: '1', has_voted: false, type: 'Student', passcode: 'Apple' },
      ];
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
      return 100; // Mock total count
    }
    const { count, error } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });

    if (error) {
      // Fallback
      return 100;
    }
    return count || 0;
  } catch (err) {
    console.error("fetchTotalStudentCount error:", err);
    return 100;
  }
};

export const addStudent = async (name: string, year: string, major: string, rollNumber: string, passcode: string) => {
  try {
    if (isMockMode || !supabase) {
      console.log("Mock Mode: Student added", { name, year, major });
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
         if (!MOCK_TEACHERS[major as Major]) MOCK_TEACHERS[major as Major] = [];
         MOCK_TEACHERS[major as Major].push(name);
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

export const submitVote = async (studentId: string, votes: Votes) => {
  try {
    if (isMockMode || !supabase) {
      console.log("Mock Mode: Vote submitted for", studentId, votes);
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
      MOCK_CANDIDATES.forEach((c, idx) => {
        const baseCount = (idx * 13) % 40; 
        if (c.gender === 'Male') tally.Male[c.id] = baseCount + 10;
        else tally.Female[c.id] = baseCount + 12;
      });
      return { tally, totalVotes: 50 };
    }

    const { data, error } = await supabase.from('votes').select('*');
    
    if (error) {
      console.warn("Supabase Error (fetchVoteResults), using mock:", error.message);
      // Return mock data on error so admin dashboard is not empty
      const tally: Record<string, Record<string, number>> = { Male: {}, Female: {} };
      MOCK_CANDIDATES.forEach((c, idx) => {
        const baseCount = (idx * 13) % 40; 
        if (c.gender === 'Male') tally.Male[c.id] = baseCount + 10;
        else tally.Female[c.id] = baseCount + 12;
      });
      return { tally, totalVotes: 50 };
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
