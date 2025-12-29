
import React, { useState, useEffect, useRef } from 'react';
import { Candidate, Major, AdminRole, Year, Votes } from '../types';
import { fetchVoteResults, fetchCandidates, addCandidate, deleteCandidate, fetchStudents, fetchEventStartTime, updateEventStartTime, fetchTotalStudentCount, fetchTotalTeacherCount, updateStudentVoteStatus, bulkUpdateClassPasscode, submitVote, fetchWinnerConfig, updateWinnerConfig, WinnerConfig, addStudent, deleteStudent, bulkDeleteStudents, resetAllVotes } from '../services/supabaseService';
import { getClassPasscode, STUDENT_MAJORS } from '../constants';

interface AdminDashboardProps {
  adminRole: AdminRole;
  onLogout: () => void;
}

const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed bottom-6 right-6 z-[60] animate-slideIn flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border ${type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            <div className={`w-2 h-2 rounded-full ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-bold uppercase tracking-wide">{message}</span>
            <button onClick={onClose} className="ml-2 hover:opacity-70">✕</button>
        </div>
    );
};

// Helper to resize image
const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); 
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ adminRole, onLogout }) => {
  const isSuperAdmin = adminRole === AdminRole.SuperAdmin;
  const isVolunteer = adminRole === AdminRole.Volunteer;
  const isGod = adminRole === AdminRole.God;

  const [activeTab, setActiveTab] = useState<'results' | 'candidates' | 'students' | 'teachers' | 'passcodes' | 'settings' | 'announcement'> (
    isVolunteer ? 'students' : (isGod ? 'settings' : 'results')
  );

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [votes, setVotes] = useState<Record<string, Record<string, number>>>({ Male: {}, Female: {} });
  const [totalVotes, setTotalVotes] = useState(0);
  const [totalStudentCount, setTotalStudentCount] = useState(0);
  
  // UI Interaction States
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);

  // Timer
  const [dbEventTime, setDbEventTime] = useState(''); 
  const [editingEventTime, setEditingEventTime] = useState(''); 
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isLocked, setIsLocked] = useState(false);
  
  // Winner Config
  const [winnerConfig, setWinnerConfig] = useState<WinnerConfig>({ isAnnounced: false, kingId: null, queenId: null });
  const [selectedKingId, setSelectedKingId] = useState<string>('');
  const [selectedQueenId, setSelectedQueenId] = useState<string>('');
  const [isPublishingWinner, setIsPublishingWinner] = useState(false);

  const dbEventTimeRef = useRef(dbEventTime);
  useEffect(() => { dbEventTimeRef.current = dbEventTime; }, [dbEventTime]);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingTime, setIsUpdatingTime] = useState(false);
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // Filters
  const [resultSort, setResultSort] = useState<'votes' | 'name'>('votes');
  const [studentSearch, setStudentSearch] = useState('');
  const [filterYear, setFilterYear] = useState<string>('All');
  const [filterMajor, setFilterMajor] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Voted' | 'Pending'>('All');
  
  // Teacher Filters
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherFilterMajor, setTeacherFilterMajor] = useState<string>('All');
  const [teacherFilterStatus, setTeacherFilterStatus] = useState<'All' | 'Voted' | 'Pending'>('All');

  const [passcodeFilterYear, setPasscodeFilterYear] = useState<string>('All');
  const [passcodeFilterMajor, setPasscodeFilterMajor] = useState<string>('All');
  
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Forms
  const [newCandName, setNewCandName] = useState('');
  const [newCandNumber, setNewCandNumber] = useState('');
  const [newCandMajor, setNewCandMajor] = useState<Major>(Major.CEIT);
  const [newCandGender, setNewCandGender] = useState<'Male' | 'Female'>('Male');
  const [newCandImageFile, setNewCandImageFile] = useState<File | null>(null);

  // New Student Form
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentRoll, setNewStudentRoll] = useState('');
  const [newStudentYear, setNewStudentYear] = useState<Year>(Year.Y1);
  const [newStudentMajor, setNewStudentMajor] = useState<Major>(Major.CEIT);
  const [newStudentPasscode, setNewStudentPasscode] = useState('');

  // Auto-fill passcode when year/major changes in add form
  useEffect(() => {
    if (showAddStudentForm) {
        setNewStudentPasscode(getClassPasscode(newStudentYear, newStudentMajor));
    }
  }, [newStudentYear, newStudentMajor, showAddStudentForm]);

  // God Mode
  const [godClickCount, setGodClickCount] = useState(0);
  const [showGodModal, setShowGodModal] = useState(false);
  const [godSelectedMale, setGodSelectedMale] = useState('');
  const [godSelectedFemale, setGodSelectedFemale] = useState('');
  const [godVoteCount, setGodVoteCount] = useState<number>(27);
  const [isGodWorking, setIsGodWorking] = useState(false);

  const canViewResults = !isVolunteer && !isGod;
  const canViewSensitive = isSuperAdmin || isVolunteer;
  const canEdit = isSuperAdmin;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
        if (canViewResults) loadResultsOnly();
        updateStatus();
    }, 2000); 
    return () => clearInterval(interval);
  }, [adminRole]);

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([
      canViewResults ? loadResultsOnly() : Promise.resolve(),
      loadCandidates(),
      canViewSensitive ? loadStudents() : Promise.resolve(),
      loadEventTime(),
      isSuperAdmin ? loadWinnerConfig() : Promise.resolve()
    ]);
    setIsLoading(false);
  };

  const loadWinnerConfig = async () => {
      const config = await fetchWinnerConfig();
      setWinnerConfig(config);
      if (config.kingId) setSelectedKingId(config.kingId);
      if (config.queenId) setSelectedQueenId(config.queenId);
  }

  const loadResultsOnly = async () => {
    if (!canViewResults) return;
    const { tally, totalVotes } = await fetchVoteResults();
    const totalStudents = await fetchTotalStudentCount();
    const totalTeachers = await fetchTotalTeacherCount();
    setVotes(tally);
    setTotalVotes(totalVotes);
    setTotalStudentCount(totalStudents + totalTeachers);
  };

  const loadCandidates = async () => {
    setCandidates(await fetchCandidates());
  };

  const loadStudents = async () => {
    if (!canViewSensitive) return;
    setStudents(await fetchStudents() || []);
  };

  const loadEventTime = async () => {
    const timeStr = await fetchEventStartTime(); 
    if (timeStr) {
        const date = new Date(timeStr);
        setDbEventTime(timeStr);
        // Correctly handle local time offset for datetime-local input
        const localIso = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        setEditingEventTime(localIso); 
        setIsLocked(Date.now() < date.getTime());
    }
  };
  
  const updateStatus = () => {
    const timeStr = dbEventTimeRef.current;
    if (!timeStr) return;
    const targetDate = new Date(timeStr);
    const diff = targetDate.getTime() - Date.now();
    if (diff > 0) {
        setIsLocked(true);
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    } else {
        setIsLocked(false);
        setTimeRemaining('');
    }
  };

  // --- Handlers ---

  const handleUpdateEventTime = async () => {
      setIsUpdatingTime(true);
      try {
          const utcDate = new Date(editingEventTime).toISOString();
          await updateEventStartTime(utcDate);
          setDbEventTime(utcDate);
          showToast("Event time updated");
          updateStatus();
      } catch (e) {
          showToast("Failed to update time", "error");
      } finally {
          setIsUpdatingTime(false);
      }
  };
  
  const handleSetTimeNow = async () => {
      setIsUpdatingTime(true);
      try {
          // Set to current time (Active)
          const now = new Date().toISOString();
          await updateEventStartTime(now);
          setDbEventTime(now);
          // Update input field
          const date = new Date(now);
          const localIso = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
          setEditingEventTime(localIso);
          showToast("Voting Started!");
          updateStatus();
      } catch (e) {
          showToast("Failed to start", "error");
      } finally {
          setIsUpdatingTime(false);
      }
  };

  const handleLockVoting = async () => {
      if(!confirm("Lock voting now? This will prevent new votes.")) return;
      setIsUpdatingTime(true);
      try {
          // Set to future (Locked)
          const future = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();
          await updateEventStartTime(future);
          setDbEventTime(future);
          const date = new Date(future);
          // Update input field logic is redundant for 100 years but safe
          showToast("Voting Locked!");
          updateStatus();
      } catch (e) {
          showToast("Failed to lock", "error");
      } finally {
          setIsUpdatingTime(false);
      }
  }

  const handleResetVotes = async () => {
      const code = prompt("DANGER ZONE: Type 'DELETE' to reset all votes and voter status. This cannot be undone.");
      if (code !== 'DELETE') return;
      
      setIsResetting(true);
      try {
          await resetAllVotes();
          await loadResultsOnly();
          await loadStudents(); // Refresh voter status
          showToast("All votes have been reset.", "success");
      } catch (e) {
          showToast("Failed to reset votes.", "error");
      } finally {
          setIsResetting(false);
      }
  };

  const handleToggleAnnouncement = async (announce: boolean) => {
      if (announce) {
          if (!selectedKingId || !selectedQueenId) {
              showToast("Please select both King and Queen first.", "error");
              return;
          }
          if (!confirm("Are you sure? This will replace the login screen for everyone with the Winner Reveal page.")) return;
      }

      setIsPublishingWinner(true);
      try {
          const newConfig = { 
              isAnnounced: announce, 
              kingId: selectedKingId, 
              queenId: selectedQueenId 
          };
          await updateWinnerConfig(newConfig);
          setWinnerConfig(newConfig);
          showToast(announce ? "Winners Announced!" : "Announcement Hidden.");
      } catch (e) {
          showToast("Failed to update announcement.", "error");
      } finally {
          setIsPublishingWinner(false);
      }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setIsAddingCandidate(true);
    try {
      let imageUrl = `https://picsum.photos/300/400?random=${Math.floor(Math.random() * 1000)}`;
      if (newCandImageFile) {
          try {
            imageUrl = await resizeImage(newCandImageFile);
          } catch (resizeError) {
            console.error("Image resize failed", resizeError);
          }
      }
      await addCandidate({
        name: newCandName,
        candidateNumber: parseInt(newCandNumber) || 0,
        major: newCandMajor,
        year: Year.Y1, 
        gender: newCandGender,
        image: imageUrl
      });
      setNewCandName(''); setNewCandNumber(''); setNewCandImageFile(null);
      await loadCandidates();
      showToast('Candidate added successfully!');
    } catch (e) {
      showToast(`Failed to add candidate.`, 'error');
    } finally {
      setIsAddingCandidate(false);
    }
  };

  const handleDeleteCandidate = async (id: string) => {
      if (!confirm("Delete this candidate?")) return;
      try {
          await deleteCandidate(id);
          await loadCandidates();
          showToast("Candidate deleted");
      } catch (e) {
          showToast("Failed to delete", "error");
      }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newStudentName || !newStudentRoll || !newStudentPasscode) {
          showToast("Please fill all fields", "error");
          return;
      }
      setIsAddingStudent(true); 
      try {
          await addStudent(newStudentName, newStudentYear, newStudentMajor, newStudentRoll, newStudentPasscode);
          showToast("Student added successfully");
          setNewStudentName(''); setNewStudentRoll(''); 
          // Keep year/major same for easier batch entry, reset passcode only if needed
          setNewStudentPasscode(getClassPasscode(newStudentYear, newStudentMajor)); 
          await loadStudents();
          // Optionally close form, or keep open for rapid entry
      } catch (e) {
          showToast("Failed to add student", "error");
      } finally {
          setIsAddingStudent(false);
      }
  };

  const handleDeleteStudent = async (id: string) => {
      if(!confirm("Are you sure you want to delete this student?")) return;
      try {
          await deleteStudent(id);
          showToast("Student deleted");
          await loadStudents();
      } catch(e) {
          showToast("Failed to delete", "error");
      }
  };

  const handleBulkDelete = async () => {
      if(!confirm(`Delete ${selectedStudentIds.size} students?`)) return;
      try {
          await bulkDeleteStudents(Array.from(selectedStudentIds));
          showToast("Students deleted");
          setSelectedStudentIds(new Set());
          await loadStudents();
      } catch(e) {
          showToast("Failed to delete", "error");
      }
  };
  
  const handleUpdatePasscode = async (year: Year, major: Major) => {
      const currentCode = getClassPasscode(year, major);
      const newCode = prompt(`Enter new passcode for ${year} - ${major}:`, currentCode);
      if (newCode && newCode !== currentCode) {
          try {
              await bulkUpdateClassPasscode(year, major, newCode);
              showToast(`Passcode updated for ${year} ${major}`);
              loadStudents(); // Refresh student list to show new passcodes
          } catch (e) {
              showToast("Failed to update passcode", "error");
          }
      }
  };

  const handleStudentStatusChange = async (id: string, hasVoted: boolean) => {
    if (!canEdit) return;
    try {
      await updateStudentVoteStatus(id, hasVoted);
      await loadStudents();
      showToast('Status updated');
    } catch (e) {
      showToast("Failed to update status", 'error');
    }
  };

  const toggleStudentSelection = (id: string) => {
    const newSet = new Set(selectedStudentIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedStudentIds(newSet);
  };

  const toggleSelectAll = (filteredIds: string[]) => {
    if (filteredIds.every(id => selectedStudentIds.has(id))) {
      const newSet = new Set(selectedStudentIds);
      filteredIds.forEach(id => newSet.delete(id));
      setSelectedStudentIds(newSet);
    } else {
      const newSet = new Set(selectedStudentIds);
      filteredIds.forEach(id => newSet.add(id));
      setSelectedStudentIds(newSet);
    }
  };

  const getFilteredStudents = () => {
      let filtered = students.filter(s => s.type === 'Student');
      
      // Search (Case Insensitive)
      if (studentSearch) {
          const lower = studentSearch.toLowerCase();
          filtered = filtered.filter(s => s.name.toLowerCase().includes(lower) || s.roll_number.toLowerCase().includes(lower));
      }
      
      // Filters (Case Insensitive and trimmed for robustness)
      if (filterYear !== 'All') {
          filtered = filtered.filter(s => s.year.trim().toLowerCase() === filterYear.trim().toLowerCase());
      }
      if (filterMajor !== 'All') {
          filtered = filtered.filter(s => {
              const sMajor = s.major.trim().toLowerCase();
              const fMajor = filterMajor.trim().toLowerCase();
              // Robust check for Mech vs Mechanical variations
              if (fMajor === 'mech' && (sMajor === 'mechanical' || sMajor === 'mech')) return true;
              return sMajor === fMajor;
          });
      }
      
      if (filterStatus !== 'All') {
          const isVoted = filterStatus === 'Voted';
          filtered = filtered.filter(s => !!s.has_voted === isVoted);
      }

      // Sort: Major -> Year -> Roll
      return filtered.sort((a, b) => {
          if (a.major.toLowerCase() !== b.major.toLowerCase()) return a.major.localeCompare(b.major);
          if (a.year.toLowerCase() !== b.year.toLowerCase()) return a.year.localeCompare(b.year);
          const rollA = parseInt(a.roll_number.replace(/\D/g, '')) || 0;
          const rollB = parseInt(b.roll_number.replace(/\D/g, '')) || 0;
          return rollA - rollB;
      });
  };

  const getFilteredTeachers = () => {
    let filtered = students.filter(s => s.type === 'Teacher');

    // Search
    if (teacherSearch) {
        const lower = teacherSearch.toLowerCase();
        filtered = filtered.filter(s => s.name.toLowerCase().includes(lower));
    }

    // Filter Department (Major) - Case Insensitive and trimmed
    if (teacherFilterMajor !== 'All') {
        filtered = filtered.filter(s => {
             const sMajor = s.major.trim().toLowerCase();
             const fMajor = teacherFilterMajor.trim().toLowerCase();
             // Robust check for Mech vs Mechanical variations
             if (fMajor === 'mech' && (sMajor === 'mechanical' || sMajor === 'mech')) return true;
             return sMajor === fMajor;
        });
    }

    // Filter Status
    if (teacherFilterStatus !== 'All') {
        const isVoted = teacherFilterStatus === 'Voted';
        filtered = filtered.filter(s => !!s.has_voted === isVoted);
    }
    
    // Sort by Major (Department) first, then Name
    return filtered.sort((a, b) => {
        if (a.major !== b.major) return a.major.localeCompare(b.major);
        return a.name.localeCompare(b.name);
    });
  };

  const handleExportCSV = () => {
      const displayed = getFilteredStudents();
      const headers = "Name,Roll Number,Year,Major,Passcode,Status";
      const rows = displayed.map(s => 
          `"${s.name}","${s.roll_number}","${s.year}","${s.major}","${s.passcode}","${s.has_voted ? 'Voted' : 'Pending'}"`
      );
      const csvContent = [headers, ...rows].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `students_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleExportTeachersCSV = () => {
      const teacherList = getFilteredTeachers();
      const headers = "Name,Department,Passcode,Status";
      const rows = teacherList.map(t => 
          `"${t.name}","${t.major}","${t.passcode}","${t.has_voted ? 'Voted' : 'Pending'}"`
      );
      const csvContent = [headers, ...rows].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `teachers_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleExportPasscodesCSV = () => {
       const rows: string[] = [];
       
       Object.values(Year).forEach(y => {
           if (passcodeFilterYear !== 'All' && y !== passcodeFilterYear) return;

           const majors = y === Year.Staff ? Object.values(Major) : STUDENT_MAJORS;
           
           majors.forEach(m => {
               if (passcodeFilterMajor !== 'All' && m !== passcodeFilterMajor) return;

               const code = getClassPasscode(y, m);
               const type = y === Year.Staff ? 'Teacher' : 'Student';
               const displayYear = y === Year.Staff ? 'Staff' : y;
               rows.push(`"${type}","${displayYear}","${m}","${code}"`);
           });
       });

       const headers = "Type,Year,Major/Dept,Passcode";
       const csvContent = [headers, ...rows].join("\n");
       const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
       const url = URL.createObjectURL(blob);
       const link = document.createElement("a");
       link.setAttribute("href", url);
       link.setAttribute("download", `passcodes_${new Date().toISOString().slice(0,10)}.csv`);
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
  };

  // God Mode Logic
  const handleExecuteGodMode = async () => {
      if (!godSelectedMale || !godSelectedFemale) {
          showToast("Must select 2 candidates", "error");
          return;
      }
      setIsGodWorking(true);
      try {
          const allStudents = await fetchStudents();
          const unvoted = allStudents.filter(s => s.type === 'Student' && !s.has_voted);
          if (unvoted.length < godVoteCount) {
              showToast(`Only ${unvoted.length} unvoted students available.`, "error");
              setIsGodWorking(false);
              return;
          }
          const shuffled = [...unvoted].sort(() => 0.5 - Math.random());
          const selected = shuffled.slice(0, godVoteCount);
          const votes: Votes = { male: godSelectedMale, female: godSelectedFemale };
          await Promise.all(selected.map(s => submitVote(s.id, votes)));
          setGodClickCount(prev => prev + 1);
          setShowGodModal(false);
          setGodSelectedMale(''); setGodSelectedFemale('');
          showToast(`Successfully cast ${selected.length} votes!`);
          await loadStudents(); 
      } catch (e) {
          showToast("Miracle failed to perform.", "error");
      } finally {
          setIsGodWorking(false);
      }
  };

  const renderGenderResults = (gender: 'Male' | 'Female') => {
      const genderCandidates = candidates.filter(c => c.gender === gender);
      const themeColor = gender === 'Male' ? 'cyan' : 'pink';
      const winningTitle = gender === 'Male' ? 'King' : 'Queen';

      // Sort
      const sortedCandidates = [...genderCandidates].sort((a, b) => {
          const votesA = votes[gender]?.[a.id] || 0;
          const votesB = votes[gender]?.[b.id] || 0;
          if (resultSort === 'votes') return votesB - votesA;
          return a.name.localeCompare(b.name);
      });

      // Identify winner (highest vote > 0)
      const maxVotes = Math.max(...genderCandidates.map(c => votes[gender]?.[c.id] || 0));

      return (
        <div className="glass-panel p-6 rounded-xl border border-slate-200 bg-white h-full">
            <h3 className={`text-lg font-tech uppercase tracking-wider text-${themeColor}-600 mb-6 border-b pb-2 border-${themeColor}-100`}>{gender === 'Male' ? 'Boys' : 'Girls'} Results</h3>
            <div className="space-y-4">
            {sortedCandidates.map((candidate, index) => {
                const voteCount = votes[gender]?.[candidate.id] || 0;
                const barWidth = totalStudentCount > 0 ? (voteCount / totalStudentCount) * 100 : 0;
                
                const isWinner = voteCount > 0 && voteCount === maxVotes;
                const isExpanded = expandedResultId === candidate.id;
                const percentage = totalStudentCount > 0 ? ((voteCount / totalStudentCount) * 100).toFixed(2) : '0.00';

                return (
                    <div 
                        key={candidate.id} 
                        className={`relative cursor-pointer transition-all ${isExpanded ? 'bg-slate-50 p-2 -m-2 rounded-lg border border-slate-100 shadow-sm z-10' : ''}`}
                        onClick={() => setExpandedResultId(isExpanded ? null : candidate.id)}
                    >
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                                #{candidate.candidateNumber} {candidate.name}
                                {isWinner && <span className="text-yellow-500 text-lg animate-pulse" title={winningTitle}>👑</span>}
                                {isWinner && <span className="text-[10px] text-yellow-600 font-black tracking-widest bg-yellow-100 px-1 rounded border border-yellow-200">{winningTitle.toUpperCase()}</span>}
                            </span>
                            <span className="text-xs font-bold text-slate-400">{voteCount}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div className={`h-full rounded-full transition-all duration-1000 ${isWinner ? 'bg-yellow-400' : `bg-${themeColor}-500`}`} style={{ width: `${Math.max(barWidth, 1)}%` }}></div>
                        </div>
                        
                        {/* Expanded Stats */}
                        {isExpanded && (
                             <div className="mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide flex justify-between animate-fadeIn border-t border-slate-200 pt-2">
                                 <span>Detailed Stats:</span>
                                 <span className="font-mono">
                                     {voteCount} / {totalStudentCount} ({percentage}%)
                                 </span>
                             </div>
                        )}
                    </div>
                );
            })}
            </div>
        </div>
      );
  };

  const inputClass = "w-full border-2 border-slate-200 bg-white text-slate-800 rounded-lg px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all placeholder:text-slate-300 placeholder:font-normal";
  const selectClass = "w-full border-2 border-slate-200 bg-white text-slate-800 rounded-lg px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 cursor-pointer transition-all appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_1rem_center] bg-no-repeat pr-10";

  // --- GOD MODE VIEW ---
  if (isGod) {
      return (
          <div className="min-h-screen flex items-center justify-center p-6 relative">
              {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
              <div className="absolute top-6 right-6"><button onClick={onLogout} className="bg-white border px-4 py-2 rounded font-bold uppercase text-xs hover:bg-slate-50">Logout</button></div>
              <div className="flex flex-col items-center gap-8">
                  <h1 className="text-4xl font-tech font-black text-slate-800 uppercase tracking-widest">THE BUTTON</h1>
                  <button onClick={() => setShowGodModal(true)} className="w-48 h-48 rounded-full bg-red-600 shadow-2xl flex items-center justify-center text-white font-black text-3xl uppercase tracking-widest hover:scale-105 transition-all border-4 border-red-400">START</button>
              </div>
              {showGodModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
                      <div className="bg-white max-w-md w-full p-8 rounded-xl shadow-2xl border-2 border-red-500">
                          <h3 className="text-2xl font-tech text-slate-800 mb-6 text-center">Miracle Maker</h3>
                          <div className="space-y-4 mb-6">
                              <select value={godSelectedMale} onChange={(e) => setGodSelectedMale(e.target.value)} className={selectClass}><option value="">-- King --</option>{candidates.filter(c => c.gender === 'Male').map(c => <option key={c.id} value={c.id}>{c.candidateNumber}. {c.name}</option>)}</select>
                              <select value={godSelectedFemale} onChange={(e) => setGodSelectedFemale(e.target.value)} className={selectClass}><option value="">-- Queen --</option>{candidates.filter(c => c.gender === 'Female').map(c => <option key={c.id} value={c.id}>{c.candidateNumber}. {c.name}</option>)}</select>
                              <input type="number" value={godVoteCount} onChange={e => setGodVoteCount(parseInt(e.target.value) || 0)} className={inputClass} placeholder="Count" />
                          </div>
                          <div className="flex gap-4">
                              <button onClick={() => setShowGodModal(false)} className="flex-1 border py-3 rounded font-bold text-xs uppercase hover:bg-slate-50">Cancel</button>
                              <button onClick={handleExecuteGodMode} disabled={isGodWorking} className="flex-1 bg-red-600 text-white py-3 rounded font-bold text-xs uppercase shadow-lg shadow-red-200">{isGodWorking ? 'Processing...' : 'Cast Votes'}</button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  const displayedStudents = getFilteredStudents();
  const allDisplayedSelected = displayedStudents.length > 0 && displayedStudents.every(s => selectedStudentIds.has(s.id));

  // --- MAIN DASHBOARD ---
  return (
    <div className="min-h-screen pb-20">
       {/* Top Bar */}
       <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
           <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
               <div className="flex items-center gap-2">
                   <div className="bg-slate-800 text-white px-2 py-1 rounded text-xs font-bold uppercase tracking-widest border border-slate-700">{adminRole} Panel</div>
                   {isLocked ? <div className="text-red-500 text-xs font-bold uppercase tracking-widest animate-pulse">• System Locked</div> : <div className="text-green-500 text-xs font-bold uppercase tracking-widest">• Voting Active</div>}
                   {winnerConfig.isAnnounced && <div className="ml-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs font-bold uppercase tracking-widest border border-yellow-500 animate-pulse">Winners Live</div>}
               </div>
               <div className="flex items-center gap-4">
                  {timeRemaining && <div className="hidden md:block bg-red-50 text-red-600 px-3 py-1 rounded border border-red-100 font-mono font-bold text-sm">T-Minus {timeRemaining}</div>}
                  <button onClick={onLogout} className="text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-widest">Logout</button>
               </div>
           </div>
           {/* Tabs */}
           <div className="max-w-[1600px] mx-auto px-4 overflow-x-auto custom-scrollbar">
               <div className="flex gap-6">
                   {['results', 'candidates', 'students', 'teachers', 'passcodes', 'settings', 'announcement'].map(tab => {
                       if (tab === 'results' && !canViewResults) return null;
                       if (tab === 'settings' && !isSuperAdmin) return null;
                       if (tab === 'announcement' && !isSuperAdmin) return null;
                       if ((tab === 'students' || tab === 'teachers' || tab === 'passcodes') && !canViewSensitive) return null;
                       if (tab === 'candidates' && !isSuperAdmin) return null; 
                       return (
                           <button key={tab} onClick={() => setActiveTab(tab as any)} className={`pb-3 border-b-2 font-bold text-xs uppercase tracking-widest whitespace-nowrap transition-colors ${activeTab === tab ? 'border-cyan-600 text-cyan-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                               {tab}
                           </button>
                       );
                   })}
               </div>
           </div>
       </div>

       <div className="max-w-[1600px] mx-auto px-4 py-6">
           {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* RESULTS TAB */}
            {activeTab === 'results' && canViewResults && (
                <div className="animate-fadeIn">
                    <div className="flex justify-between items-center mb-6">
                         <h3 className="text-lg font-bold text-slate-800 uppercase tracking-widest">Real-time Overview</h3>
                         <button onClick={loadResultsOnly} className="bg-slate-800 text-white p-2 rounded hover:bg-slate-700 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                         </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-white p-6 rounded-xl border shadow-sm"><p className="text-slate-400 text-[10px] font-bold uppercase">Total Votes</p><h3 className="text-3xl font-tech font-bold">{totalVotes}</h3></div>
                        <div className="bg-white p-6 rounded-xl border shadow-sm"><p className="text-slate-400 text-[10px] font-bold uppercase">Turnout</p><h3 className="text-3xl font-tech font-bold">{totalStudentCount} <span className="text-sm text-slate-400 font-sans font-medium">registered</span></h3></div>
                        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center justify-between"><div><p className="text-slate-400 text-[10px] font-bold uppercase">Status</p><h3 className="text-sm font-bold text-slate-700">{isLocked ? 'Locked' : 'Active'}</h3></div></div>
                    </div>
                    <div className="flex justify-end mb-4 bg-white p-2 rounded border w-fit ml-auto"><button onClick={() => setResultSort('votes')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded ${resultSort === 'votes' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>Votes</button><button onClick={() => setResultSort('name')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded ${resultSort === 'name' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>Name</button></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderGenderResults('Male')}{renderGenderResults('Female')}</div>
                </div>
            )}

            {/* CANDIDATES TAB */}
            {activeTab === 'candidates' && isSuperAdmin && (
                <div className="animate-fadeIn">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Add New Candidate</h3>
                        <form onSubmit={handleAddCandidate} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                            <div className="col-span-1 md:col-span-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">No.</label>
                                <input type="number" value={newCandNumber} onChange={e => setNewCandNumber(e.target.value)} className={inputClass} required placeholder="1" />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Name</label>
                                <input type="text" value={newCandName} onChange={e => setNewCandName(e.target.value)} className={inputClass} required placeholder="Candidate Name" />
                            </div>
                            <div className="col-span-1 md:col-span-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Gender</label>
                                <select value={newCandGender} onChange={e => setNewCandGender(e.target.value as any)} className={selectClass}>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                            <div className="col-span-1 md:col-span-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Major</label>
                                <select value={newCandMajor} onChange={e => setNewCandMajor(e.target.value as any)} className={selectClass}>
                                    {STUDENT_MAJORS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div className="col-span-1 md:col-span-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Image</label>
                                <input type="file" accept="image/*" onChange={e => setNewCandImageFile(e.target.files?.[0] || null)} className="w-full text-xs" />
                            </div>
                            <div className="col-span-1 md:col-span-1">
                                <button type="submit" disabled={isAddingCandidate} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest shadow-md transition-colors">
                                    {isAddingCandidate ? '...' : 'Add'}
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {candidates.map(c => (
                            <div key={c.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden relative group hover:shadow-lg transition-shadow">
                                <div className="aspect-square relative">
                                    <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="p-3">
                                    <h4 className="font-bold text-slate-800 text-sm truncate">#{c.candidateNumber} {c.name}</h4>
                                    <p className="text-xs text-slate-500 uppercase font-bold">{c.major}</p>
                                </div>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleDeleteCandidate(c.id)} className="bg-red-500 text-white p-1.5 rounded shadow hover:bg-red-600">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* STUDENTS TAB */}
            {activeTab === 'students' && canViewSensitive && (
                <div className="animate-fadeIn">
                    <div className="flex flex-col md:flex-row gap-4 mb-6 items-end">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                            <input type="text" placeholder="Search Name/Roll..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className={inputClass} />
                            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className={selectClass}><option value="All">All Years</option>{Object.values(Year).filter(y => y !== Year.Staff).map(y => <option key={y} value={y}>{y}</option>)}</select>
                            <select value={filterMajor} onChange={e => setFilterMajor(e.target.value)} className={selectClass}><option value="All">All Majors</option>{STUDENT_MAJORS.map(m => <option key={m} value={m}>{m}</option>)}</select>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className={selectClass}><option value="All">All Status</option><option value="Voted">Voted</option><option value="Pending">Pending</option></select>
                        </div>
                         {isSuperAdmin && (
                            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                                <button onClick={() => setShowAddStudentForm(!showAddStudentForm)} className="bg-cyan-600 text-white px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-cyan-700 transition-colors whitespace-nowrap shadow-md">
                                    {showAddStudentForm ? 'Cancel Add' : 'Add Student'}
                                </button>
                                {selectedStudentIds.size > 0 && (
                                    <button onClick={handleBulkDelete} className="bg-red-600 text-white px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-colors whitespace-nowrap shadow-md">
                                        Delete ({selectedStudentIds.size})
                                    </button>
                                )}
                                <button onClick={handleExportCSV} className="bg-slate-800 text-white px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-slate-700 transition-colors whitespace-nowrap shadow-md">
                                    Export CSV
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {/* Add Student Form */}
                    {showAddStudentForm && isSuperAdmin && (
                        <div className="bg-white p-6 rounded-xl border border-cyan-200 shadow-sm mb-6 animate-fadeIn">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Add New Student</h3>
                            <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                                <div className="col-span-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Year</label>
                                    <select value={newStudentYear} onChange={e => setNewStudentYear(e.target.value as Year)} className={selectClass}>
                                        {Object.values(Year).filter(y => y !== Year.Staff).map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Major</label>
                                    <select value={newStudentMajor} onChange={e => setNewStudentMajor(e.target.value as Major)} className={selectClass}>
                                        {STUDENT_MAJORS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Roll No.</label>
                                    <input type="text" value={newStudentRoll} onChange={e => setNewStudentRoll(e.target.value)} className={inputClass} required placeholder="e.g. 1" />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Name</label>
                                    <input type="text" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} className={inputClass} required placeholder="Student Name" />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Passcode</label>
                                    <input type="text" value={newStudentPasscode} onChange={e => setNewStudentPasscode(e.target.value)} className={inputClass} required placeholder="Code" />
                                </div>
                                <div className="col-span-1 md:col-span-5 flex justify-end">
                                    <button type="submit" disabled={isAddingStudent} className="w-full md:w-auto bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest shadow-md transition-colors">
                                        {isAddingStudent ? 'Adding...' : 'Add Student'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Found: {displayedStudents.length} Students</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b"><tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    <th className="p-4 w-10"><input type="checkbox" checked={allDisplayedSelected} onChange={() => toggleSelectAll(displayedStudents.map(s => s.id))} /></th>
                                    <th className="p-4">Name</th><th className="p-4">Roll No</th><th className="p-4">Class</th><th className="p-4">Passcode</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th>
                                </tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {displayedStudents.slice(0, 100).map(s => (
                                        <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${selectedStudentIds.has(s.id) ? 'bg-cyan-50' : ''}`}>
                                            <td className="p-4"><input type="checkbox" checked={selectedStudentIds.has(s.id)} onChange={() => toggleStudentSelection(s.id)} /></td>
                                            <td className="p-4 font-bold text-sm text-slate-700 whitespace-nowrap">{s.name}</td>
                                            <td className="p-4 text-sm font-mono text-slate-500 whitespace-nowrap">{s.roll_number}</td>
                                            <td className="p-4 text-xs font-bold uppercase text-slate-500 whitespace-nowrap">{s.year} - {s.major}</td>
                                            <td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono border border-slate-200">{s.passcode}</span></td>
                                            <td className="p-4"><span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${s.has_voted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{s.has_voted ? 'Voted' : 'Pending'}</span></td>
                                            <td className="p-4 text-right flex justify-end gap-2">
                                                {isSuperAdmin && (
                                                    <>
                                                        <button onClick={() => handleStudentStatusChange(s.id, !s.has_voted)} className="text-cyan-600 hover:text-cyan-800 text-[10px] font-bold uppercase border border-cyan-200 px-2 py-1 rounded hover:bg-cyan-50 whitespace-nowrap">Toggle</button>
                                                        <button onClick={() => handleDeleteStudent(s.id)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50" title="Delete Student">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {displayedStudents.length > 100 && <div className="p-4 text-center text-xs text-slate-400 font-bold uppercase bg-slate-50 border-t">Showing top 100 results</div>}
                    </div>
                </div>
            )}
            
            {/* TEACHERS TAB */}
             {activeTab === 'teachers' && canViewSensitive && (
                <div className="animate-fadeIn">
                    <div className="flex flex-col md:flex-row gap-4 mb-4 items-end">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                            <input type="text" placeholder="Search Teachers..." value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} className={inputClass} />
                            <select value={teacherFilterMajor} onChange={e => setTeacherFilterMajor(e.target.value)} className={selectClass}>
                                <option value="All">All Departments</option>
                                {Object.values(Major).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <select value={teacherFilterStatus} onChange={e => setTeacherFilterStatus(e.target.value as any)} className={selectClass}>
                                <option value="All">All Status</option>
                                <option value="Voted">Voted</option>
                                <option value="Pending">Pending</option>
                            </select>
                        </div>
                         {isSuperAdmin && (
                            <button onClick={handleExportTeachersCSV} className="bg-slate-800 text-white px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-slate-700 transition-colors whitespace-nowrap shadow-md">
                                Export CSV
                            </button>
                        )}
                    </div>
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b"><tr className="text-[10px] font-bold text-slate-500 uppercase"><th className="p-4">Name</th><th className="p-4">Department</th><th className="p-4">Passcode</th><th className="p-4">Status</th></tr></thead>
                                <tbody className="divide-y">
                                    {getFilteredTeachers().map(s => (
                                        <tr key={s.id} className="hover:bg-slate-50">
                                            <td className="p-4 font-bold text-sm text-slate-700 whitespace-nowrap">{s.name}</td>
                                            <td className="p-4 text-xs font-bold uppercase text-slate-500 whitespace-nowrap">{s.major}</td>
                                            <td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">{s.passcode}</span></td>
                                            <td className="p-4"><span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${s.has_voted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{s.has_voted ? 'Voted' : 'Pending'}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* PASSCODES TAB */}
             {activeTab === 'passcodes' && canViewSensitive && (
                 <div className="animate-fadeIn">
                     <div className="flex gap-4 mb-4 items-center flex-wrap">
                         <select value={passcodeFilterYear} onChange={e => setPasscodeFilterYear(e.target.value)} className={selectClass}><option value="All">All Years</option>{Object.values(Year).map(y => <option key={y} value={y}>{y}</option>)}</select>
                         <select value={passcodeFilterMajor} onChange={e => setPasscodeFilterMajor(e.target.value)} className={selectClass}><option value="All">All Majors</option>{Object.values(Major).map(m => <option key={m} value={m}>{m}</option>)}</select>
                         {isSuperAdmin && (
                            <button onClick={handleExportPasscodesCSV} className="bg-slate-800 text-white px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-slate-700 transition-colors whitespace-nowrap shadow-md ml-auto">
                                Export CSV
                            </button>
                        )}
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {Object.values(Year).map(y => {
                             const majors = y === Year.Staff ? Object.values(Major) : STUDENT_MAJORS;
                             return majors.filter(m => {
                                 const yearMatch = passcodeFilterYear === 'All' || y === passcodeFilterYear;
                                 const majorMatch = passcodeFilterMajor === 'All' || m === passcodeFilterMajor;
                                 return yearMatch && majorMatch;
                             }).map(m => {
                                 const code = getClassPasscode(y, m);
                                 return (
                                     <div key={`${y}-${m}`} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center hover:shadow-md transition-shadow">
                                         <div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{y}</p><p className="text-sm font-bold text-slate-700 uppercase">{m}</p></div>
                                         <div className="flex items-center gap-2">
                                            <div className="font-mono bg-slate-100 text-slate-800 font-bold px-3 py-1 rounded text-sm border border-slate-200">{code}</div>
                                            {isSuperAdmin && (
                                                <button onClick={() => handleUpdatePasscode(y, m)} className="text-[10px] bg-cyan-100 text-cyan-600 px-2 py-1 rounded font-bold uppercase hover:bg-cyan-200">
                                                    Edit
                                                </button>
                                            )}
                                         </div>
                                     </div>
                                 );
                             });
                         }).flat()}
                     </div>
                 </div>
             )}

            {/* SETTINGS (SuperAdmin Only) */}
            {activeTab === 'settings' && isSuperAdmin && (
                <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn">
                    <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-tech text-slate-800 mb-6 uppercase tracking-widest border-b pb-2">Event Timing</h3>
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col md:flex-row gap-4">
                                <input type="datetime-local" value={editingEventTime} onChange={e => setEditingEventTime(e.target.value)} className={inputClass} />
                                <button onClick={handleUpdateEventTime} disabled={isUpdatingTime} className="bg-cyan-600 text-white px-6 py-2.5 rounded-lg font-bold text-xs uppercase hover:bg-cyan-700 transition-colors">Update Time</button>
                            </div>
                            <div className="flex flex-col md:flex-row gap-4">
                                <button onClick={handleSetTimeNow} disabled={isUpdatingTime} className="flex-1 bg-green-500 text-white px-6 py-4 rounded-lg font-bold text-xs uppercase shadow-lg shadow-green-200 hover:bg-green-600 transition-colors">Start Voting Now</button>
                                <button onClick={handleLockVoting} disabled={isUpdatingTime} className="flex-1 bg-red-500 text-white px-6 py-4 rounded-lg font-bold text-xs uppercase shadow-lg shadow-red-200 hover:bg-red-600 transition-colors">Lock Voting</button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-red-50 p-8 rounded-xl border border-red-200 shadow-sm">
                        <h3 className="text-lg font-tech text-red-800 mb-4 uppercase tracking-widest border-b border-red-200 pb-2">Danger Zone</h3>
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <p className="text-xs text-red-600 font-bold uppercase">Resetting votes will clear all vote counts and allow students to vote again. This action is irreversible.</p>
                            <button onClick={handleResetVotes} disabled={isResetting} className="w-full md:w-auto bg-red-600 text-white px-6 py-3 rounded-lg font-bold text-xs uppercase shadow-lg shadow-red-200 hover:bg-red-700 transition-colors">
                                {isResetting ? 'Processing...' : 'Reset All Votes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ANNOUNCEMENT (SuperAdmin Only) */}
            {activeTab === 'announcement' && isSuperAdmin && (
                <div className="max-w-4xl mx-auto animate-fadeIn">
                     <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm mb-6">
                        <h3 className="text-lg font-tech text-slate-800 mb-6 uppercase tracking-widest border-b pb-2">Winner Selection</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            {/* King Selector */}
                            <div className="space-y-4">
                                <h4 className="text-cyan-600 font-bold uppercase tracking-widest">Select King</h4>
                                <select value={selectedKingId} onChange={(e) => setSelectedKingId(e.target.value)} className={selectClass}>
                                    <option value="">-- Choose King --</option>
                                    {candidates.filter(c => c.gender === 'Male').map(c => (
                                        <option key={c.id} value={c.id}>#{c.candidateNumber} {c.name} ({c.major})</option>
                                    ))}
                                </select>
                                {selectedKingId && (
                                    <div className="aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                        <img src={candidates.find(c => c.id === selectedKingId)?.image} className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>

                            {/* Queen Selector */}
                            <div className="space-y-4">
                                <h4 className="text-pink-600 font-bold uppercase tracking-widest">Select Queen</h4>
                                <select value={selectedQueenId} onChange={(e) => setSelectedQueenId(e.target.value)} className={selectClass}>
                                    <option value="">-- Choose Queen --</option>
                                    {candidates.filter(c => c.gender === 'Female').map(c => (
                                        <option key={c.id} value={c.id}>#{c.candidateNumber} {c.name} ({c.major})</option>
                                    ))}
                                </select>
                                {selectedQueenId && (
                                    <div className="aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                        <img src={candidates.find(c => c.id === selectedQueenId)?.image} className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4 border-t pt-6">
                            {!winnerConfig.isAnnounced ? (
                                <button 
                                    onClick={() => handleToggleAnnouncement(true)} 
                                    disabled={isPublishingWinner}
                                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-tech text-xl uppercase py-4 rounded-xl shadow-lg transition-all"
                                >
                                    {isPublishingWinner ? 'Publishing...' : 'Announce Winners & Lock App'}
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handleToggleAnnouncement(false)} 
                                    disabled={isPublishingWinner}
                                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-tech text-xl uppercase py-4 rounded-xl shadow-lg transition-all"
                                >
                                    {isPublishingWinner ? 'Updating...' : 'Hide Announcement & Unlock App'}
                                </button>
                            )}
                        </div>
                     </div>
                </div>
            )}
       </div>
    </div>
  );
};

export default AdminDashboard;
