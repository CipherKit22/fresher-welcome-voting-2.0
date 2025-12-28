
import { supabase, isMockMode } from './supabaseClient';
import { Candidate, StudentInfo, Votes, Major, Year } from '../types';
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
      .upsert(
        { key: 'event_start_time', value: isoDate },
        { onConflict: 'key' }
      );

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
      return MOCK_CANDIDATES.sort((a, b) => a.candidateNumber - b.candidateNumber);
    }

    const { data, error } = await supabase
      .from('candidates')
      .select('*');
    
    if (error) {
      console.warn('Supabase Error (fetchCandidates):', error.message);
      return [];
    }
    
    // Map snake_case from DB to camelCase for frontend
    return data.map((c: any) => {
        let number = c.candidate_number;
        let name = c.name;

        // Fallback: If column doesn't exist or is null, try to parse from name "1. Name"
        if (!number && typeof name === 'string') {
            const match = name.match(/^(\d+)\.\s+(.*)/);
            if (match) {
                number = parseInt(match[1]);
                name = match[2];
            }
        }

        return {
            id: c.id,
            name: name,
            candidateNumber: number || 0,
            major: c.major,
            year: c.year,
            gender: c.gender,
            image: c.image
        };
    }).sort((a: Candidate, b: Candidate) => a.candidateNumber - b.candidateNumber);

  } catch (err) {
    console.warn("fetchCandidates connection error:", err);
    return [];
  }
};

export const addCandidate = async (candidate: Omit<Candidate, 'id'>) => {
  try {
    if (isMockMode || !supabase) {
      const newCand = { ...candidate, id: `mock-${Date.now()}` };
      MOCK_CANDIDATES.push(newCand);
      return [newCand];
    }

    // WORKAROUND: Combine number into name to allow storing candidate number 
    // without requiring a specific 'candidate_number' column in the database.
    const combinedName = `${candidate.candidateNumber}. ${candidate.name}`;

    const dbPayload = {
        name: combinedName,
        major: candidate.major,
        year: candidate.year,
        gender: candidate.gender,
        image: candidate.image
    };

    const { data, error } = await supabase
      .from('candidates')
      .insert([dbPayload])
      .select();
    
    if (error) throw error;
    return data;
  } catch (err: any) {
    console.error("addCandidate error:", err.message || err);
    throw err;
  }
};

export const updateCandidate = async (id: string, updates: Partial<Candidate>) => {
    try {
        if (isMockMode || !supabase) {
            const idx = MOCK_CANDIDATES.findIndex(c => c.id === id);
            if (idx > -1) {
                MOCK_CANDIDATES[idx] = { ...MOCK_CANDIDATES[idx], ...updates };
            }
            return;
        }

        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.major) dbUpdates.major = updates.major;
        if (updates.gender) dbUpdates.gender = updates.gender;
        
        const { error } = await supabase
            .from('candidates')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
    } catch (err) {
        console.error("updateCandidate error:", err);
        throw err;
    }
}

export const deleteCandidate = async (id: string) => {
  try {
    if (isMockMode || !supabase) {
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

export const checkStudentRegistration = async (year: string, major: string, query: string) => {
  try {
    if (query.length < 2) return [];

    if (isMockMode || !supabase) {
      // Mock search
      return MOCK_STUDENTS.filter(s =>
        s.type === 'Student' &&
        s.year === year &&
        s.major === major &&
        (s.name?.toLowerCase().includes(query.toLowerCase()) || s.rollNumber.includes(query))
      ).map(s => ({ name: s.name, rollNumber: s.rollNumber, hasVoted: s.hasVoted }));
    }

    const { data, error } = await supabase
      .from('students')
      .select('name, roll_number, has_voted')
      .eq('type', 'Student')
      // Use ilike for case-insensitive checking for Year and Major too
      .ilike('year', year)
      .ilike('major', major) 
      .or(`name.ilike.%${query}%,roll_number.ilike.%${query}%`)
      .limit(20);

    if (error) throw error;
    
    return data.map((s: any) => ({
        name: s.name,
        rollNumber: s.roll_number,
        hasVoted: s.has_voted
    }));

  } catch (err) {
    console.error("checkStudentRegistration error:", err);
    return [];
  }
};

export const verifyStudent = async (year: Year, major: Major, rollNumber: string, passcode: string): Promise<{ success: boolean; student?: StudentInfo; message?: string }> => {
  try {
    if (isMockMode || !supabase) {
      const found = MOCK_STUDENTS.find(s => 
        s.type === 'Student' &&
        s.year === year && 
        s.major === major && 
        s.rollNumber === rollNumber
      );

      if (!found) {
        return { success: false, message: "Student not found. Please contact Admin." };
      }

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

    // USE ILIKE for Year and Major to handle Case Mismatch between DB and Types
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .ilike('year', year)
      .ilike('major', major)
      .ilike('roll_number', rollNumber) 
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

     const { data, error } = await supabase
        .from('students')
        .select('*')
        .ilike('major', major) 
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
            query = query.ilike('major', major);
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

    let allStudents: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let fetchMore = true;

    while (fetchMore) {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .range(from, from + batchSize - 1)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.warn("Supabase Error (fetchStudents):", error.message);
          throw error;
        }

        if (data && data.length > 0) {
            allStudents = [...allStudents, ...data];
            from += batchSize;
            if (data.length < batchSize) {
                fetchMore = false;
            }
        } else {
            fetchMore = false;
        }
    }
    
    return allStudents;
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

export const fetchTotalTeacherCount = async (): Promise<number> => {
  try {
    if (isMockMode || !supabase) {
      return MOCK_STUDENTS.filter(s => s.type === 'Teacher').length;
    }
    const { count, error } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'Teacher');

    if (error) return 0;
    return count || 0;
  } catch (err) {
    return 0;
  }
};

export const addStudent = async (name: string, year: string, major: string, rollNumber: string, passcode: string) => {
  try {
    if (isMockMode || !supabase) {
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
      const uniqueRoll = `T-${Date.now().toString().slice(-6)}`;

      if (isMockMode || !supabase) {
         MOCK_STUDENTS.unshift({
            id: `mock-t-${Date.now()}`,
            name,
            major,
            year: Year.Staff,
            rollNumber: uniqueRoll,
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
            roll_number: uniqueRoll, 
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
            MOCK_STUDENTS.forEach(s => {
                if (s.year === year && s.major === major) {
                    s.passcode = newPasscode;
                }
            });
            return;
        }

        const type = year === Year.Staff ? 'Teacher' : 'Student';
        
        let query = supabase.from('students').update({ passcode: newPasscode });

        if (type === 'Teacher') {
           query = query.ilike('major', major).eq('type', 'Teacher');
        } else {
           query = query.ilike('year', year).ilike('major', major).eq('type', 'Student');
        }
            
        const { error } = await query;
        if (error) throw error;

    } catch (err) {
        console.error("bulkUpdateClassPasscode error:", err);
        throw err;
    }
};


// --- Votes ---

const MOCK_VOTES: any[] = [];

export const submitVote = async (studentId: string, votes: Votes) => {
  try {
    if (isMockMode || !supabase) {
      const student = MOCK_STUDENTS.find(s => s.id === studentId);
      if (student && student.hasVoted) throw new Error("Already voted");

      MOCK_VOTES.push({
        voter_id: studentId,
        king_id: votes.male, 
        queen_id: votes.female
      });
      if (student) student.hasVoted = true;
      return;
    }

    const { data: studentCheck, error: checkError } = await supabase
      .from('students')
      .select('has_voted')
      .eq('id', studentId)
      .single();
    
    if (checkError) throw checkError;
    if (studentCheck && studentCheck.has_voted) {
      throw new Error("You have already voted.");
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
