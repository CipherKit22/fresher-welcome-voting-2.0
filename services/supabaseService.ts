
import { supabase, isMockMode } from './supabaseClient';
import { Candidate, StudentInfo, Votes, Major, Year, VotingRole } from '../types';
import { MOCK_CANDIDATES, STUDENT_DATABASE, getClassPasscode, DEFAULT_EVENT_TIME } from '../constants';

// --- Configuration ---

export const fetchEventStartTime = async (): Promise<string> => {
  try {
    if (isMockMode || !supabase) {
      // Return a default mock time (e.g., 10 mins from now)
      return new Date(Date.now() + 10 * 60 * 1000).toISOString();
    }

    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'event_start_time')
      .maybeSingle();

    if (error || !data) {
      // If table doesn't exist or key not set, return fallback
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
      // Return mock data for demo
      return MOCK_CANDIDATES;
    }

    const { data, error } = await supabase
      .from('candidates')
      .select('*');
    
    if (error) {
      console.error('Supabase Error (fetchCandidates):', error.message);
      return [];
    }
    return data as Candidate[];
  } catch (err) {
    console.error("fetchCandidates connection error:", err);
    return [];
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

// --- Students ---

export const verifyStudent = async (year: Year, major: Major, rollNumber: string, passcode: string): Promise<{ success: boolean; student?: StudentInfo; message?: string }> => {
  try {
    if (isMockMode || !supabase) {
      // Mock Validation Logic
      
      // 1. Check Passcode (Deterministic generation from constants)
      const expectedPasscode = getClassPasscode(year, major);
      if (passcode.toLowerCase() !== expectedPasscode.toLowerCase()) {
        return { success: false, message: `Wrong Passcode. It's a fruit starting with ${expectedPasscode[0]}.` };
      }

      // 2. Check Specific Mock Database (for Mg Mg and Mya Mya)
      const dbKey = `${year}_${major}_${rollNumber}`;
      const studentName = STUDENT_DATABASE[dbKey];

      if (studentName) {
        return {
          success: true,
          student: {
            id: `mock-student-${dbKey}`,
            name: studentName,
            year: year,
            major: major,
            rollNumber: rollNumber,
            hasVoted: false // In mock mode, reset every reload
          }
        };
      }

      // 3. Generic Success for other valid passcodes in Mock Mode
      return {
        success: true,
        student: {
          id: `mock-generic-${Date.now()}`,
          name: `Student ${major} ${rollNumber}`,
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
      .maybeSingle(); 

    if (error) {
      console.error("Supabase Error (verifyStudent):", error.message);
      return { success: false, message: "Connection failed." };
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

export const fetchStudents = async () => {
  try {
    if (isMockMode || !supabase) {
      // Return some dummy students for the admin panel
      return [
        { id: 'm1', name: 'Mg Mg', year: Year.Y1, major: Major.Civil, roll_number: '1', has_voted: false },
        { id: 'm2', name: 'Mya Mya', year: Year.Y3, major: Major.CEIT, roll_number: '1', has_voted: true },
        { id: 'm3', name: 'Aung Aung', year: Year.Y2, major: Major.EC, roll_number: '12', has_voted: false },
      ];
    }

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("Supabase Error (fetchStudents):", error.message);
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
      return 100; // Mock total count
    }
    const { count, error } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error("Error fetching total students:", error);
      return 0;
    }
    return count || 0;
  } catch (err) {
    console.error("fetchTotalStudentCount error:", err);
    return 0;
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
      .insert([{ name, year, major, roll_number: rollNumber, passcode, has_voted: false }])
      .select();
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("addStudent error:", err);
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
      console.log("Mock Mode: Student deleted", id);
      return;
    }
    // FIX: Delete votes first to satisfy foreign key constraints
    const { error: voteError } = await supabase.from('votes').delete().eq('voter_id', id);
    if (voteError) throw voteError;

    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error("deleteStudent error:", err);
    throw err;
  }
};

// --- Bulk Operations ---

export const bulkDeleteStudents = async (ids: string[]) => {
  try {
    if (isMockMode || !supabase) {
      console.log("Mock Mode: Bulk delete students", ids);
      return;
    }
    // FIX: Delete votes first
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


// --- Votes ---

export const submitVote = async (studentId: string, votes: Votes) => {
  try {
    if (isMockMode || !supabase) {
      console.log("Mock Mode: Vote submitted for", studentId, votes);
      return;
    }

    // 1. Insert Vote
    // We map 'male' vote to 'king_id' column and 'female' vote to 'queen_id' column
    // This allows reusing existing database schema while changing the logic
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

    // 2. Mark student as voted
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

// New logic: Returns { male: Record<string, number>, female: Record<string, number> }
// Aggregating king_id and prince_id into "male", queen_id and princess_id into "female" to support legacy data if any
export const fetchVoteResults = async () => {
  try {
    if (isMockMode || !supabase) {
      const tally: Record<string, Record<string, number>> = {
        Male: {},
        Female: {}
      };

      // Deterministic mock stats
      MOCK_CANDIDATES.forEach((c, idx) => {
        const baseCount = (idx * 13) % 40; 
        if (c.gender === 'Male') {
          tally.Male[c.id] = baseCount + 10;
        } else {
          tally.Female[c.id] = baseCount + 12;
        }
      });
      
      return { tally, totalVotes: 50 };
    }

    const { data, error } = await supabase.from('votes').select('*');
    
    if (error) {
      console.error("Supabase Error (fetchVoteResults):", error.message);
      return { tally: { Male: {}, Female: {} }, totalVotes: 0 };
    }

    const tally: Record<string, Record<string, number>> = {
      Male: {},
      Female: {}
    };
    
    data.forEach((vote: any) => {
      // Aggregate Male Votes
      if (vote.king_id) tally.Male[vote.king_id] = (tally.Male[vote.king_id] || 0) + 1;
      if (vote.prince_id) tally.Male[vote.prince_id] = (tally.Male[vote.prince_id] || 0) + 1;

      // Aggregate Female Votes
      if (vote.queen_id) tally.Female[vote.queen_id] = (tally.Female[vote.queen_id] || 0) + 1;
      if (vote.princess_id) tally.Female[vote.princess_id] = (tally.Female[vote.princess_id] || 0) + 1;
    });

    return { tally, totalVotes: data.length };
  } catch (err) {
    console.error("fetchVoteResults error:", err);
    return { tally: { Male: {}, Female: {} }, totalVotes: 0 };
  }
};

export const resetAllVotes = async () => {
  try {
    if (isMockMode || !supabase) {
      console.log("Mock Mode: All votes reset.");
      return;
    }

    // 1. Delete all votes
    const { error: deleteError } = await supabase
      .from('votes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); 
    
    if (deleteError) throw deleteError;

    // 2. Reset student status
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
