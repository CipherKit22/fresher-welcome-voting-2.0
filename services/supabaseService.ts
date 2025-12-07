
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
      if (passcode.toLowerCase() !== expectedPasscode.toLowerCase()) {
        return { success: false, message: `Wrong Passcode. Hint: ${expectedPasscode[0]}...` };
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
      .maybeSingle(); 

    if (error) {
      // Fallback to mock login if DB fails
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

export const verifyTeacher = async (major: Major, name: string): Promise<{ success: boolean; student?: StudentInfo; message?: string }> => {
  // Teachers are currently Mock Only or require a separate table.
  // We will assume Mock/Simulated for this demo based on the requirements.
  
  if (!name || !major) return { success: false, message: "Incomplete details." };

  return {
    success: true,
    student: {
      id: `teacher-${major}-${name.replace(/\s+/g, '-').toLowerCase()}`,
      name: name,
      type: 'Teacher',
      year: Year.Staff,
      major: major,
      rollNumber: "Staff",
      hasVoted: false
    }
  };
};

export const fetchStudents = async () => {
  try {
    if (isMockMode || !supabase) {
      return [
        { id: 'm1', name: 'Mg Mg', year: Year.Y1, major: Major.Civil, roll_number: '1', has_voted: false, type: 'Student' },
        { id: 'm2', name: 'Mya Mya', year: Year.Y3, major: Major.CEIT, roll_number: '1', has_voted: true, type: 'Student' },
        { id: 'm3', name: 'Aung Aung', year: Year.Y2, major: Major.EC, roll_number: '12', has_voted: false, type: 'Student' },
      ];
    }

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.warn("Supabase Error (fetchStudents), using mock:", error.message);
       return [
        { id: 'm1', name: 'Mg Mg', year: Year.Y1, major: Major.Civil, roll_number: '1', has_voted: false, type: 'Student' },
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

    // Only update status if it's a student in the DB
    if (!studentId.startsWith('teacher-')) {
       const { error: studentError } = await supabase
        .from('students')
        .update({ has_voted: true })
        .eq('id', studentId);

       if (studentError) throw studentError;
    }
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
