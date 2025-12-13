
import React, { useState, useEffect } from 'react';
import { Candidate, Major, AdminRole, Year } from '../types';
import { fetchVoteResults, fetchCandidates, addCandidate, deleteCandidate, fetchStudents, addStudent, deleteStudent, fetchEventStartTime, updateEventStartTime, fetchTotalStudentCount, updateStudentVoteStatus, bulkDeleteStudents, bulkUpdateStudentStatus, resetAllVotes, addTeacher, bulkUpdateClassPasscode } from '../services/supabaseService';
import { getClassPasscode, STUDENT_MAJORS } from '../constants';

interface AdminDashboardProps {
  adminRole: AdminRole;
  onLogout: () => void;
}

const Spinner: React.FC = () => (
  <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const LargeSpinner: React.FC = () => (
    <svg className="animate-spin h-10 w-10 text-cyan-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

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

// Helper for resizing image to prevent payload too large errors
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
        // Compress to JPEG with 0.7 quality
        resolve(canvas.toDataURL('image/jpeg', 0.7)); 
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ adminRole, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'results' | 'candidates' | 'students' | 'teachers' | 'passcodes' | 'settings'>('results');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [votes, setVotes] = useState<Record<string, Record<string, number>>>({
    Male: {},
    Female: {}
  });
  const [totalVotes, setTotalVotes] = useState(0);
  const [totalStudentCount, setTotalStudentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [eventStartTime, setEventStartTime] = useState('');
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isLocked, setIsLocked] = useState(false);

  // Granular Loading States
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);
  const [isUpdatingTime, setIsUpdatingTime] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [isResettingVotes, setIsResettingVotes] = useState(false);
  const [isUpdatingPasscode, setIsUpdatingPasscode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [resultSort, setResultSort] = useState<'votes' | 'name'>('votes');
  const [studentSearch, setStudentSearch] = useState('');
  const [filterYear, setFilterYear] = useState<string>('All');
  const [filterMajor, setFilterMajor] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Voted' | 'Pending'>('All');
  const [studentSort, setStudentSort] = useState<'default' | 'name' | 'roll'>('default');
  
  // Teacher Filters
  const [teacherSearch, setTeacherSearch] = useState('');
  const [filterTeacherMajor, setFilterTeacherMajor] = useState<string>('All');

  // Passcode Management State
  const [passcodeFilterYear, setPasscodeFilterYear] = useState<string>('All');
  const [passcodeFilterMajor, setPasscodeFilterMajor] = useState<string>('All');
  const [passcodeSearch, setPasscodeSearch] = useState('');
  const [editingPasscode, setEditingPasscode] = useState<{year: Year, major: Major, code: string} | null>(null);

  // Selection for Bulk Actions
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Modal States
  const [deleteModal, setDeleteModal] = useState<{ type: 'candidate' | 'student' | 'teacher'; id: string; name: string } | null>(null);
  const [voteDetailModal, setVoteDetailModal] = useState<{ name: string; number: number; category: string; count: number; percentage: string; totalStudents: number } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmationText, setResetConfirmationText] = useState('');
  
  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Candidate Form
  const [newCandName, setNewCandName] = useState('');
  const [newCandNumber, setNewCandNumber] = useState('');
  const [newCandMajor, setNewCandMajor] = useState<Major>(Major.CEIT);
  const [newCandYear, setNewCandYear] = useState<string>(Year.Y1);
  const [newCandGender, setNewCandGender] = useState<'Male' | 'Female'>('Male');
  const [newCandImageFile, setNewCandImageFile] = useState<File | null>(null);

  // Student Form
  const [newStudName, setNewStudName] = useState('');
  const [newStudYear, setNewStudYear] = useState<Year>(Year.Y1);
  const [newStudMajor, setNewStudMajor] = useState<Major>(Major.Civil);
  const [newStudRoll, setNewStudRoll] = useState('');
  const [newStudPasscode, setNewStudPasscode] = useState('');
  const [showStudentPasscode, setShowStudentPasscode] = useState(false);

  // Teacher Form
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherMajor, setNewTeacherMajor] = useState<Major>(Major.Civil);
  const [newTeacherPasscode, setNewTeacherPasscode] = useState('');
  const [showTeacherPasscode, setShowTeacherPasscode] = useState(false);

  // Initial Data Load
  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
        loadResultsOnly();
        updateStatus();
    }, 1000); 
    return () => clearInterval(interval);
  }, [eventStartTime]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
      setToast({ message, type });
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadResultsOnly(),
        loadCandidates(),
        adminRole === AdminRole.SuperAdmin ? loadStudents() : Promise.resolve(),
        loadEventTime()
      ]);
    } catch (e) {
      console.error("Critical load error", e);
    }
    setIsLoading(false);
  };

  const updateStatus = () => {
    if (!eventStartTime) return;
    const now = new Date().getTime();
    const start = new Date(eventStartTime).getTime();
    const diff = start - now;

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

  const loadResultsOnly = async () => {
    const { tally, totalVotes } = await fetchVoteResults();
    const totalStudents = await fetchTotalStudentCount();
    setVotes(tally);
    setTotalVotes(totalVotes);
    setTotalStudentCount(totalStudents);
  };

  const loadCandidates = async () => {
    const data = await fetchCandidates();
    setCandidates(data);
  };

  const loadStudents = async () => {
    if (adminRole !== AdminRole.SuperAdmin) return;
    const data = await fetchStudents();
    setStudents(data || []);
  };

  // Refresh Handlers
  const handleRefreshResults = async () => {
      setIsRefreshing(true);
      await loadResultsOnly();
      setIsRefreshing(false);
      showToast('Results synced');
  };

  const handleRefreshStudents = async () => {
      setIsRefreshing(true);
      await loadStudents();
      setIsRefreshing(false);
      showToast('Student list synced');
  };

  const loadEventTime = async () => {
    const time = await fetchEventStartTime();
    const date = new Date(time);
    const offset = date.getTimezoneOffset() * 60000; 
    const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
    
    setEventStartTime(localISOTime);
    const now = new Date().getTime();
    setIsLocked(now < date.getTime());
  };

  const handleUpdateEventTime = async () => {
    setIsUpdatingTime(true);
    try {
      const date = new Date(eventStartTime);
      const isoDate = date.toISOString();
      await updateEventStartTime(isoDate);
      showToast('Event time updated successfully!');
      loadEventTime();
    } catch (e: any) {
      console.error(e);
      showToast(`Failed to update time`, 'error');
    } finally {
      setIsUpdatingTime(false);
    }
  };

  const handleStartImmediately = async () => {
      setIsUpdatingTime(true);
      try {
          const now = new Date();
          const isoDate = now.toISOString();
          await updateEventStartTime(isoDate);
          showToast('Voting started immediately!');
          loadEventTime();
      } catch(e) {
          showToast('Failed to start', 'error');
      } finally {
          setIsUpdatingTime(false);
      }
  };

  const initiateResetVotes = () => {
    setResetConfirmationText('');
    setShowResetConfirm(true);
  };

  const handleConfirmResetVotes = async () => {
    if (resetConfirmationText !== 'CONFIRM RESET') {
      showToast('Incorrect confirmation text', 'error');
      return;
    }
    
    setIsResettingVotes(true);
    try {
      await resetAllVotes();
      await loadResultsOnly();
      await loadStudents(); 
      showToast("All votes have been reset successfully.");
      setShowResetConfirm(false);
    } catch (e) {
      showToast("Failed to reset votes.", 'error');
    } finally {
      setIsResettingVotes(false);
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminRole !== AdminRole.SuperAdmin) return;
    setIsAddingCandidate(true);
    
    try {
      let imageUrl = `https://picsum.photos/300/400?random=${Math.floor(Math.random() * 1000)}`;
      
      // Handle file upload with compression
      if (newCandImageFile) {
          try {
            imageUrl = await resizeImage(newCandImageFile);
          } catch (resizeError) {
            console.error("Image resize failed, using placeholder", resizeError);
            // Fallback to placeholder if resize fails, or continue?
            // Continuing with placeholder is safer.
          }
      }

      await addCandidate({
        name: newCandName,
        candidateNumber: parseInt(newCandNumber) || 0,
        major: newCandMajor,
        year: newCandYear,
        gender: newCandGender,
        image: imageUrl
      });
      
      setNewCandName('');
      setNewCandNumber('');
      setNewCandImageFile(null);
      await loadCandidates();
      showToast('Candidate added successfully!');
    } catch (error: any) {
      console.error("Add candidate error:", error);
      showToast(`Failed to add candidate. ${error.message || ''}`, 'error');
    } finally {
      setIsAddingCandidate(false);
    }
  };

  const promptDeleteCandidate = (id: string, name: string) => {
    if (adminRole !== AdminRole.SuperAdmin) return;
    setDeleteModal({ type: 'candidate', id, name });
  };

  const promptDeleteStudent = (id: string, name: string) => {
    setDeleteModal({ type: 'student', id, name });
  };

  const promptDeleteTeacher = (id: string, name: string) => {
    setDeleteModal({ type: 'teacher', id, name });
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    setIsProcessingDelete(true);

    try {
      if (deleteModal.type === 'candidate') {
        await deleteCandidate(deleteModal.id);
        await loadCandidates();
        showToast('Candidate deleted');
      } else {
        await deleteStudent(deleteModal.id);
        await loadStudents();
        showToast(`${deleteModal.type === 'teacher' ? 'Teacher' : 'Student'} deleted`);
      }
      setDeleteModal(null);
    } catch (e) {
      showToast(`Failed to delete ${deleteModal.type}`, 'error');
    } finally {
      setIsProcessingDelete(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingStudent(true);
    try {
      await addStudent(newStudName, newStudYear, newStudMajor, newStudRoll, newStudPasscode);
      setNewStudName('');
      setNewStudRoll('');
      setNewStudPasscode('');
      await loadStudents();
      showToast('Student authorized successfully!');
    } catch (e) {
      showToast('Failed to add student. Roll No duplicate?', 'error');
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingTeacher(true);
    try {
        await addTeacher(newTeacherName, newTeacherMajor, newTeacherPasscode);
        setNewTeacherName('');
        setNewTeacherPasscode('');
        await loadStudents();
        showToast('Teacher added successfully!');
    } catch (e) {
        showToast('Failed to add teacher.', 'error');
    } finally {
        setIsAddingTeacher(false);
    }
  }

  const handleStudentStatusChange = async (id: string, hasVoted: boolean) => {
    if (adminRole !== AdminRole.SuperAdmin) return;
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

  const handleBulkDelete = async () => {
    if (selectedStudentIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedStudentIds.size} users?`)) return;
    
    setIsBulkProcessing(true);
    try {
      await bulkDeleteStudents(Array.from(selectedStudentIds));
      setSelectedStudentIds(new Set());
      await loadStudents();
      showToast('Bulk delete successful');
    } catch (e) {
      showToast("Bulk delete failed", 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkStatusUpdate = async (hasVoted: boolean) => {
    if (selectedStudentIds.size === 0) return;
    
    setIsBulkProcessing(true);
    try {
      await bulkUpdateStudentStatus(Array.from(selectedStudentIds), hasVoted);
      setSelectedStudentIds(new Set());
      await loadStudents();
      showToast('Bulk status update successful');
    } catch (e) {
      showToast("Bulk update failed", 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Passcode Management Logic
  const handleUpdatePasscode = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingPasscode) return;
      
      setIsUpdatingPasscode(true);
      try {
          await bulkUpdateClassPasscode(editingPasscode.year, editingPasscode.major, editingPasscode.code);
          showToast(`Passcode updated for ${editingPasscode.year} ${editingPasscode.major}`);
          setEditingPasscode(null);
          // Refresh students to see changes if any are loaded
          if (adminRole === AdminRole.SuperAdmin) loadStudents();
      } catch (e) {
          showToast('Failed to update passcode', 'error');
      } finally {
          setIsUpdatingPasscode(false);
      }
  };

  const getPasscodeList = () => {
    const list: {year: Year, major: Major, currentCode: string}[] = [];
    Object.values(Year).forEach(y => {
        // If year is Staff/Teacher, we show ALL majors. If year is Student (Y1-Y6), we show only STUDENT_MAJORS
        const majorsForYear = (y === Year.Staff) ? Object.values(Major) : STUDENT_MAJORS;

        majorsForYear.forEach(m => {
            if (passcodeFilterYear !== 'All' && passcodeFilterYear !== y) return;
            if (passcodeFilterMajor !== 'All' && passcodeFilterMajor !== m) return;
            
            // Find a student/teacher in this class to get the current active passcode
            const type = y === Year.Staff ? 'Teacher' : 'Student';
            const sample = students.find(s => s.year === y && s.major === m && s.type === type);
            
            // For students, default from constants, for teachers default is 'TEACHER' if not found
            let defaultCode = 'TEACHER';
            if (type === 'Student') {
                defaultCode = getClassPasscode(y, m);
            }

            list.push({
                year: y,
                major: m,
                currentCode: sample ? sample.passcode : defaultCode
            });
        });
    });
    return list;
  };

  const getFilteredStudents = () => {
    // Filter only Students (type != Teacher)
    const yearOrder = Object.values(Year);
    const filtered = students.filter(s => {
      if (s.type === 'Teacher') return false; 
      const matchSearch = (s.name || '').toLowerCase().includes(studentSearch.toLowerCase()) || 
                          (s.roll_number || '').toLowerCase().includes(studentSearch.toLowerCase());
      const matchYear = filterYear === 'All' || s.year === filterYear;
      const matchMajor = filterMajor === 'All' || s.major === filterMajor;
      const matchStatus = filterStatus === 'All' || 
                          (filterStatus === 'Voted' ? s.has_voted : !s.has_voted);
      return matchSearch && matchYear && matchMajor && matchStatus;
    });

    return filtered.sort((a, b) => {
        if (studentSort === 'name') {
            return (a.name || '').localeCompare(b.name || '');
        } else if (studentSort === 'roll') {
            return (parseInt(a.roll_number) || 0) - (parseInt(b.roll_number) || 0);
        } else {
            if (a.major !== b.major) return (a.major || '').localeCompare(b.major || '');
            if (a.year !== b.year) return yearOrder.indexOf(a.year) - yearOrder.indexOf(b.year);
            return (parseInt(a.roll_number) || 0) - (parseInt(b.roll_number) || 0);
        }
    });
  };

  const getFilteredTeachers = () => {
     return students.filter(s => {
        if (s.type !== 'Teacher') return false;
        const matchSearch = (s.name || '').toLowerCase().includes(teacherSearch.toLowerCase());
        const matchMajor = filterTeacherMajor === 'All' || s.major === filterTeacherMajor;
        return matchSearch && matchMajor;
     });
  }

  const displayedStudents = getFilteredStudents();
  const displayedTeachers = getFilteredTeachers();
  const allDisplayedSelected = displayedStudents.length > 0 && displayedStudents.every(s => selectedStudentIds.has(s.id));
  const passcodesList = getPasscodeList();

  // Render logic for results
  const renderGenderResults = (gender: 'Male' | 'Female') => {
      const genderCandidates = candidates.filter(c => c.gender === gender);
      const categoryLabel = gender === 'Male' ? 'BOYS' : 'GIRLS';
      const titles = gender === 'Male' ? ['KING', 'PRINCE'] : ['QUEEN', 'PRINCESS'];
      const themeColor = gender === 'Male' ? 'cyan' : 'pink';

      // Sort by votes
      const sortedCandidates = [...genderCandidates].sort((a, b) => {
          const votesA = votes[gender]?.[a.id] || 0;
          const votesB = votes[gender]?.[b.id] || 0;
          if (resultSort === 'votes') return votesB - votesA;
          return a.name.localeCompare(b.name);
      });

      return (
        <div className="glass-panel p-6 rounded-xl border border-slate-200 bg-white">
            <div className={`flex justify-between items-center mb-6 border-b border-${themeColor}-100 pb-3`}>
                <h3 className={`text-lg font-tech uppercase tracking-wider text-${themeColor}-600`}>
                    {categoryLabel} RESULTS
                </h3>
            </div>
            
            <div className="space-y-5">
            {sortedCandidates.map((candidate, index) => {
                const voteCount = votes[gender]?.[candidate.id] || 0;
                const totalBase = totalStudentCount > 0 ? totalStudentCount : 1;
                const percentage = ((voteCount / totalBase) * 100).toFixed(1);
                
                // Determine Title (Only if sorted by votes and has votes)
                let title = null;
                if (resultSort === 'votes' && voteCount > 0) {
                   if (index === 0) title = titles[0]; // Winner
                   if (index === 1) title = titles[1]; // Runner-up
                }

                const barWidth = totalStudentCount > 0 ? (voteCount / totalStudentCount) * 100 : 0;
                
                return (
                    <div key={candidate.id} className="relative group">
                    <div className="flex justify-between items-end mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                             <span className="text-slate-500 font-mono text-xs font-bold mr-1">#{candidate.candidateNumber}</span>
                             <span className={`text-sm font-bold uppercase ${title ? `text-${themeColor}-700` : 'text-slate-600'}`}>
                                {candidate.name}
                             </span>

                             {title && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${index === 0 ? 'bg-yellow-500 shadow-md' : `bg-${themeColor}-500 opacity-80`}`}>
                                   {title}
                                </span>
                             )}
                        </div>
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wide">
                            {voteCount} <span className="text-[10px] opacity-60">/ {totalStudentCount}</span>
                        </span>
                    </div>
                    <div 
                        className="w-full h-3 bg-slate-100 rounded-full overflow-hidden cursor-pointer border border-slate-200 shadow-inner"
                        onClick={() => setVoteDetailModal({ 
                            name: candidate.name, 
                            number: candidate.candidateNumber,
                            category: categoryLabel, 
                            count: voteCount, 
                            percentage: percentage,
                            totalStudents: totalStudentCount
                        })}
                    >
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ease-out progress-striped ${index === 0 && voteCount > 0 ? 'bg-yellow-400' : `bg-${themeColor}-500`}`} 
                            style={{ width: `${Math.max(barWidth, 0.5)}%` }}
                        ></div>
                    </div>
                    </div>
                );
            })}
            {sortedCandidates.length === 0 && <div className="text-slate-400 text-sm text-center py-4">No candidates available.</div>}
            </div>
        </div>
      );
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 animate-fadeIn relative pb-20">
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* --- EDIT PASSCODE MODAL --- */}
      {editingPasscode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white max-w-sm w-full p-6 rounded-xl shadow-2xl border border-slate-200">
                <h3 className="text-lg font-tech text-slate-800 mb-1 uppercase tracking-wider">Update Passcode</h3>
                <p className="text-xs text-slate-400 font-bold uppercase mb-4">{editingPasscode.year} - {editingPasscode.major}</p>
                
                <form onSubmit={handleUpdatePasscode}>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">New Passcode</label>
                    <input 
                        autoFocus
                        type="text" 
                        value={editingPasscode.code}
                        onChange={(e) => setEditingPasscode({...editingPasscode, code: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-lg focus:border-cyan-500 outline-none mb-6 font-mono font-bold tracking-wider"
                    />
                    <div className="flex gap-3">
                        <button 
                            type="button"
                            onClick={() => setEditingPasscode(null)}
                            className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg hover:bg-slate-200 font-bold text-xs uppercase"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={isUpdatingPasscode}
                            className="flex-1 bg-cyan-600 text-white py-2 rounded-lg hover:bg-cyan-700 font-bold text-xs uppercase flex justify-center items-center gap-2"
                        >
                            {isUpdatingPasscode ? <Spinner /> : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* --- DELETE MODAL --- */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white max-w-sm w-full p-6 rounded-xl shadow-2xl border border-slate-200 transform transition-all scale-100">
            <h3 className="text-red-600 font-bold text-lg mb-2">Confirm Deletion</h3>
            <p className="text-slate-600 text-sm mb-6">
              Are you sure you want to remove <span className="text-slate-900 font-bold">{deleteModal.name}</span>? This cannot be undone.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteModal(null)}
                className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg hover:bg-slate-200 font-bold text-xs"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isProcessingDelete}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-bold text-xs flex justify-center items-center gap-2"
              >
                {isProcessingDelete ? <Spinner /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- RESET VOTES CONFIRMATION MODAL --- */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-red-900/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-white max-w-md w-full p-8 rounded-xl shadow-2xl border-2 border-red-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse"></div>
            
            <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-red-600 font-black text-2xl uppercase tracking-widest font-tech">Danger Zone</h3>
                <p className="text-slate-600 font-bold mt-2">You are about to delete ALL votes.</p>
                <p className="text-slate-500 text-sm mt-1">This action cannot be undone. All student voting records will be reset to 'Pending'.</p>
            </div>

            <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">
                    Type <span className="text-red-600 select-none">CONFIRM RESET</span> below
                </label>
                <input 
                    type="text" 
                    value={resetConfirmationText}
                    onChange={(e) => setResetConfirmationText(e.target.value)}
                    className="w-full text-center bg-red-50 border border-red-200 text-red-900 font-bold px-4 py-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none uppercase tracking-widest placeholder-red-200"
                    placeholder="CONFIRM RESET"
                />
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => { setShowResetConfirm(false); setResetConfirmationText(''); }}
                className="flex-1 bg-slate-200 text-slate-600 py-3 rounded-lg hover:bg-slate-300 font-bold text-xs uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmResetVotes}
                disabled={isResettingVotes || resetConfirmationText !== 'CONFIRM RESET'}
                className="flex-1 bg-red-600 disabled:bg-red-300 text-white py-3 rounded-lg hover:bg-red-700 font-bold text-xs uppercase tracking-widest flex justify-center items-center gap-2 shadow-lg shadow-red-200 transition-all"
              >
                {isResettingVotes ? <Spinner /> : 'Reset Everything'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- VOTE DETAIL MODAL --- */}
      {voteDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setVoteDetailModal(null)}>
          <div className="bg-white max-w-sm w-full p-6 rounded-xl shadow-2xl border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-slate-400 font-mono text-sm font-bold mb-1">Candidate #{voteDetailModal.number}</div>
              <h3 className="text-slate-800 text-2xl font-bold font-tech uppercase mb-1">{voteDetailModal.name}</h3>
              <p className="text-cyan-600 text-xs font-bold uppercase tracking-widest mb-6">{voteDetailModal.category}</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                   <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Votes / Total</div>
                   <div className="text-xl text-slate-800 font-tech font-bold mt-1">
                      {voteDetailModal.count} / {voteDetailModal.totalStudents}
                   </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                   <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Student Share</div>
                   <div className="text-3xl text-cyan-600 font-tech">{voteDetailModal.percentage}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 glass-panel p-6 rounded-xl gap-4 relative">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-tech text-slate-800 uppercase tracking-wider flex items-center gap-3">
                {adminRole === AdminRole.SuperAdmin ? 'Super Admin' : 'Admin View'}
              </h1>
              {adminRole === AdminRole.SuperAdmin && (
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded border flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${isLocked ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                        <div className={`w-2 h-2 rounded-full ${isLocked ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
                        {isLocked ? `LOCKED (${timeRemaining})` : 'VOTING LIVE'}
                    </div>
                    {isLocked && (
                        <button 
                            onClick={handleStartImmediately}
                            disabled={isUpdatingTime}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest shadow-sm transition-colors flex items-center gap-1"
                        >
                            {isUpdatingTime ? <Spinner /> : 'Start Now'}
                        </button>
                    )}
                  </div>
              )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 mt-2">
            <p className="text-slate-500 font-medium text-sm">
              Total Votes Cast: <span className="text-slate-900 font-bold">{totalVotes}</span>
            </p>
            <p className="text-slate-500 font-medium text-sm">
              Registered Students: <span className="text-slate-900 font-bold">{totalStudentCount}</span>
            </p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full md:w-auto border border-slate-300 hover:bg-slate-100 text-slate-600 px-5 py-2 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Modern Tabs */}
      <div className="mb-8 p-1 bg-slate-200/50 rounded-xl inline-flex overflow-hidden flex-wrap gap-1">
        {['results', ...(adminRole === AdminRole.SuperAdmin ? ['candidates', 'students', 'teachers', 'passcodes', 'settings'] : [])].map((tab) => (
            <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`
                    px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-300
                    ${activeTab === tab 
                        ? 'bg-white text-cyan-700 shadow-md transform scale-100' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
                `}
            >
                {tab}
            </button>
        ))}
      </div>

      <div className="min-h-[500px] relative">
        
        {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-40 rounded-xl">
               <div className="text-cyan-600 font-bold text-sm uppercase tracking-widest flex items-center gap-3">
                 <LargeSpinner /> Syncing Database...
               </div>
            </div>
        )}

        {/* Results View */}
        {!isLoading && activeTab === 'results' && (
            <div className="space-y-8 animate-fadeIn">
              
              <div className="flex justify-between items-center mb-4">
                 <div className="flex-1"></div>
                 <div className="flex items-center gap-4">
                     {/* Added Refresh Button */}
                     <button
                        onClick={handleRefreshResults}
                        disabled={isRefreshing}
                        className="bg-white border border-slate-300 text-slate-600 hover:text-cyan-600 hover:border-cyan-300 px-3 py-2 rounded-lg transition-colors shadow-sm"
                        title="Refresh Results"
                     >
                        {isRefreshing ? <Spinner /> : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        )}
                     </button>
                     {adminRole === AdminRole.SuperAdmin && (
                       <button
                         onClick={initiateResetVotes}
                         disabled={isResettingVotes}
                         className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors"
                       >
                         {isResettingVotes ? <Spinner /> : 'Reset Votes'}
                       </button>
                     )}
                     <div className="relative flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Sort:</span>
                        <select 
                          value={resultSort} 
                          onChange={(e) => setResultSort(e.target.value as 'votes' | 'name')}
                          className="bg-transparent text-slate-700 text-xs font-bold uppercase outline-none cursor-pointer appearance-none pr-6"
                        >
                          <option value="votes">Highest Votes</option>
                          <option value="name">Alphabetical</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                     </div>
                 </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                  {renderGenderResults('Male')}
                  {renderGenderResults('Female')}
              </div>

            </div>
        )}

        {/* Manage Candidates */}
        {!isLoading && activeTab === 'candidates' && (
            <div className="grid lg:grid-cols-3 gap-8 animate-fadeIn">
            <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {candidates.map(candidate => (
                <div key={candidate.id} className="glass-panel bg-white p-3 flex gap-4 items-center rounded-lg group border border-slate-200">
                    <img src={candidate.image} alt={candidate.name} loading="lazy" decoding="async" className="w-12 h-12 object-cover rounded-md" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-mono text-xs font-bold">#{candidate.candidateNumber}</span>
                          <h4 className="text-slate-800 font-bold text-sm">{candidate.name}</h4>
                      </div>
                      <p className="text-slate-400 text-[10px] font-bold uppercase">{candidate.major} • {candidate.gender}</p>
                    </div>
                    <button 
                      onClick={() => promptDeleteCandidate(candidate.id, candidate.name)} 
                      className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"
                    >
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
                ))}
            </div>

            <div className="glass-panel bg-white p-6 h-fit sticky top-4 rounded-xl border border-slate-200">
                <h3 className="text-lg font-tech text-slate-800 mb-4 uppercase tracking-wider">Add Candidate</h3>
                <form onSubmit={handleAddCandidate} className="space-y-4">
                  <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Name</label>
                      <input 
                        required 
                        disabled={isAddingCandidate}
                        value={newCandName} 
                        onChange={e => setNewCandName(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-300 p-2 text-slate-900 text-sm rounded-lg focus:border-cyan-500 outline-none" 
                      />
                  </div>
                  <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Candidate Number</label>
                      <input 
                        type="number"
                        required 
                        disabled={isAddingCandidate}
                        value={newCandNumber} 
                        onChange={e => setNewCandNumber(e.target.value)} 
                        placeholder="e.g. 1"
                        className="w-full bg-slate-50 border border-slate-300 p-2 text-slate-900 text-sm rounded-lg focus:border-cyan-500 outline-none" 
                      />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                     <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Major</label>
                        <div className="relative">
                            <select 
                                disabled={isAddingCandidate}
                                value={newCandMajor} 
                                onChange={e => setNewCandMajor(e.target.value as Major)} 
                                className="w-full bg-slate-50 border border-slate-300 p-2 text-slate-900 text-xs rounded-lg appearance-none pr-8"
                            >
                                {STUDENT_MAJORS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                     </div>
                     <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Year</label>
                        <div className="relative">
                            <select 
                                disabled={isAddingCandidate}
                                value={newCandYear} 
                                onChange={e => setNewCandYear(e.target.value)} 
                                className="w-full bg-slate-50 border border-slate-300 p-2 text-slate-900 text-xs rounded-lg appearance-none pr-8"
                            >
                                {Object.values(Year).filter(y => y !== Year.Staff).map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                     </div>
                  </div>
                  <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Gender</label>
                      <div className="relative">
                        <select 
                            disabled={isAddingCandidate}
                            value={newCandGender} 
                            onChange={e => setNewCandGender(e.target.value as any)} 
                            className="w-full bg-slate-50 border border-slate-300 p-2 text-slate-900 text-sm rounded-lg appearance-none pr-8"
                        >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                      </div>
                  </div>
                  <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Photo Upload</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        disabled={isAddingCandidate}
                        onChange={(e) => {
                            if(e.target.files && e.target.files[0]) {
                                setNewCandImageFile(e.target.files[0]);
                            }
                        }}
                        className="w-full bg-slate-50 border border-slate-300 p-2 text-slate-900 text-xs rounded-lg focus:border-cyan-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100" 
                      />
                      <p className="text-[10px] text-slate-400 mt-1">If no image is uploaded, a placeholder will be used.</p>
                  </div>
                  <button 
                    disabled={isAddingCandidate}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-lg disabled:opacity-50 flex justify-center uppercase text-xs tracking-wider shadow-md shadow-cyan-200"
                  >
                    {isAddingCandidate ? <span className="flex items-center gap-2"><Spinner /> Processing</span> : 'Add Candidate'}
                  </button>
                </form>
            </div>
            </div>
        )}

        {/* Manage Students (Implemented) */}
        {!isLoading && activeTab === 'students' && adminRole === AdminRole.SuperAdmin && (
            <div className="animate-fadeIn space-y-6">
                
                {/* Header & Controls */}
                <div className="glass-panel bg-white p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 border border-slate-200">
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                        <div className="bg-cyan-50 text-cyan-700 px-4 py-2 rounded-lg border border-cyan-100">
                             <span className="text-[10px] font-bold uppercase block tracking-wider opacity-70">Students</span>
                             <span className="text-xl font-bold font-tech">{students.filter(s => s.type !== 'Teacher').length}</span>
                        </div>
                        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-100">
                             <span className="text-[10px] font-bold uppercase block tracking-wider opacity-70">Voted</span>
                             <span className="text-xl font-bold font-tech">{students.filter(s => s.type !== 'Teacher' && s.has_voted).length}</span>
                        </div>
                    </div>
                    
                    <button
                        onClick={handleRefreshStudents}
                        disabled={isRefreshing}
                        className="bg-white border border-slate-300 text-slate-600 hover:text-cyan-600 hover:border-cyan-300 p-2 rounded-lg transition-colors shadow-sm"
                        title="Refresh Student List"
                    >
                         {isRefreshing ? <Spinner /> : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        )}
                    </button>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Students Table */}
                  <div className="lg:col-span-2">
                     <div className="glass-panel bg-white p-4 mb-4 rounded-xl flex flex-col gap-4 border border-slate-200">
                         {/* Filters */}
                         <div className="flex flex-col md:flex-row gap-4">
                             <input 
                                type="text" 
                                placeholder="Search Name or Roll No..." 
                                value={studentSearch}
                                onChange={(e) => setStudentSearch(e.target.value)}
                                className="flex-1 bg-slate-50 border border-slate-300 p-2 text-slate-900 text-xs rounded-lg outline-none focus:border-cyan-500" 
                             />
                             <div className="flex gap-2">
                                <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-2 outline-none">
                                    <option value="All">All Years</option>
                                    {Object.values(Year).filter(y => y !== Year.Staff).map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-2 outline-none">
                                    <option value="All">Status</option>
                                    <option value="Voted">Voted</option>
                                    <option value="Pending">Pending</option>
                                </select>
                             </div>
                         </div>
                         
                         {/* Bulk Actions */}
                         {selectedStudentIds.size > 0 && (
                            <div className="flex justify-between items-center bg-cyan-50 p-2 rounded-lg border border-cyan-100 animate-fadeIn">
                                <span className="text-xs font-bold text-cyan-800 uppercase tracking-wider ml-2">{selectedStudentIds.size} Selected</span>
                                <div className="flex gap-2">
                                    <button onClick={() => handleBulkStatusUpdate(false)} disabled={isBulkProcessing} className="text-[10px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1 rounded font-bold uppercase">Set Pending</button>
                                    <button onClick={() => handleBulkStatusUpdate(true)} disabled={isBulkProcessing} className="text-[10px] bg-white border border-slate-200 hover:bg-slate-50 text-green-600 px-3 py-1 rounded font-bold uppercase">Set Voted</button>
                                    <button onClick={handleBulkDelete} disabled={isBulkProcessing} className="text-[10px] bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1 rounded font-bold uppercase">Delete</button>
                                </div>
                            </div>
                         )}
                     </div>

                     <div className="overflow-x-auto glass-panel bg-white rounded-xl max-h-[600px] overflow-y-auto custom-scrollbar border border-slate-200">
                         <table className="w-full text-left text-sm text-slate-600">
                            <thead className="text-xs uppercase bg-slate-100 text-slate-500 sticky top-0 z-10 backdrop-blur-md">
                              <tr>
                                  <th className="px-4 py-3 w-10">
                                      <input 
                                        type="checkbox" 
                                        onChange={() => toggleSelectAll(displayedStudents.map(s => s.id))}
                                        checked={allDisplayedSelected}
                                        className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                      />
                                  </th>
                                  <th className="px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-slate-200" onClick={() => setStudentSort('roll')}>Roll No</th>
                                  <th className="px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-slate-200" onClick={() => setStudentSort('name')}>Name</th>
                                  <th className="px-4 py-3 whitespace-nowrap">Major / Year</th>
                                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                                  <th className="px-4 py-3 whitespace-nowrap text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                                {displayedStudents.length > 0 ? (
                                    displayedStudents.map((stud) => (
                                        <tr key={stud.id} className={`border-b border-slate-100 hover:bg-slate-50 ${selectedStudentIds.has(stud.id) ? 'bg-cyan-50/50' : ''}`}>
                                            <td className="px-4 py-3">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedStudentIds.has(stud.id)}
                                                    onChange={() => toggleStudentSelection(stud.id)}
                                                    className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs font-bold text-slate-500">{stud.roll_number}</td>
                                            <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{stud.name}</td>
                                            <td className="px-4 py-3 text-xs">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-600">{stud.major}</span>
                                                    <span className="text-slate-400">{stud.year}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button 
                                                    onClick={() => handleStudentStatusChange(stud.id, !stud.has_voted)}
                                                    className={`text-[10px] font-bold uppercase px-2 py-1 rounded border transition-colors ${stud.has_voted ? 'bg-green-50 text-green-600 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200' : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200'}`}
                                                >
                                                    {stud.has_voted ? 'Voted' : 'Pending'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button 
                                                    onClick={() => promptDeleteStudent(stud.id, stud.name)}
                                                    className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-mono text-xs">No students found matching filters.</td>
                                    </tr>
                                )}
                            </tbody>
                         </table>
                     </div>
                  </div>

                  {/* Add Student Form */}
                  <div className="glass-panel bg-white p-6 h-fit sticky top-4 rounded-xl border border-slate-200">
                      <h3 className="text-lg font-tech text-slate-800 mb-4 uppercase tracking-wider">Authorize Student</h3>
                      <form onSubmit={handleAddStudent} className="space-y-4">
                        <div>
                            <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Student Name</label>
                            <input 
                                required 
                                disabled={isAddingStudent}
                                value={newStudName} 
                                onChange={e => setNewStudName(e.target.value)} 
                                className="w-full bg-slate-50 border border-slate-300 p-2 text-slate-900 text-sm rounded-lg focus:border-cyan-500 outline-none" 
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                             <div>
                                <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Year</label>
                                <select 
                                    disabled={isAddingStudent}
                                    value={newStudYear} 
                                    onChange={e => setNewStudYear(e.target.value as Year)} 
                                    className="w-full bg-slate-50 border border-slate-300 p-2 text-slate-900 text-xs rounded-lg appearance-none"
                                >
                                    {Object.values(Year).filter(y => y !== Year.Staff).map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                             </div>
                             <div>
                                <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Major</label>
                                <select 
                                    disabled={isAddingStudent}
                                    value={newStudMajor} 
                                    onChange={e => setNewStudMajor(e.target.value as Major)} 
                                    className="w-full bg-slate-50 border border-slate-300 p-2 text-slate-900 text-xs rounded-lg appearance-none"
                                >
                                    {STUDENT_MAJORS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                             </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Roll Number</label>
                            <input 
                                required 
                                disabled={isAddingStudent}
                                value={newStudRoll} 
                                onChange={e => setNewStudRoll(e.target.value)} 
                                className="w-full bg-slate-50 border border-slate-300 p-2 text-slate-900 text-sm rounded-lg focus:border-cyan-500 outline-none" 
                                placeholder="e.g. 1"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Passcode</label>
                            <div className="relative">
                                <input 
                                    type={showStudentPasscode ? 'text' : 'password'}
                                    required 
                                    disabled={isAddingStudent}
                                    value={newStudPasscode} 
                                    onChange={e => setNewStudPasscode(e.target.value)} 
                                    className="w-full bg-slate-50 border border-slate-300 p-2 text-slate-900 text-sm rounded-lg focus:border-cyan-500 outline-none pr-8" 
                                />
                                <button type="button" onClick={() => setShowStudentPasscode(!showStudentPasscode)} className="absolute inset-y-0 right-0 px-2 text-slate-400">
                                   {showStudentPasscode ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>

                        <button 
                            disabled={isAddingStudent}
                            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-lg disabled:opacity-50 flex justify-center uppercase text-xs tracking-wider shadow-md shadow-cyan-200"
                        >
                            {isAddingStudent ? <Spinner /> : 'Add Student'}
                        </button>
                      </form>
                  </div>
                </div>
            </div>
        )}

        {/* Passcode Management */}
        {!isLoading && activeTab === 'passcodes' && adminRole === AdminRole.SuperAdmin && (
            <div className="animate-fadeIn space-y-4">
                <div className="glass-panel bg-white p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 border border-slate-200">
                    <div className="flex-1 w-full">
                       <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Search Class or Code</label>
                       <input 
                           type="text" 
                           placeholder="Type to search..." 
                           value={passcodeSearch}
                           onChange={(e) => setPasscodeSearch(e.target.value)}
                           className="w-full bg-slate-50 border border-slate-300 p-2 text-slate-900 text-xs rounded-lg outline-none focus:border-cyan-500" 
                       />
                    </div>
                    
                    <div className="flex gap-2 w-full md:w-auto">
                         <div className="relative flex-1 md:flex-none">
                            <select value={passcodeFilterYear} onChange={e => setPasscodeFilterYear(e.target.value)} className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none appearance-none pr-8">
                                <option value="All">All Years</option>
                                {Object.values(Year).map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                        <div className="relative flex-1 md:flex-none">
                            <select value={passcodeFilterMajor} onChange={e => setPasscodeFilterMajor(e.target.value)} className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none appearance-none pr-8">
                                <option value="All">All Majors</option>
                                {Object.values(Major).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden glass-panel bg-white rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="text-xs uppercase bg-slate-100 text-slate-500">
                            <tr>
                                <th className="px-6 py-4 font-bold tracking-wider">Academic Year</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Major / Department</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Current Passcode</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {passcodesList
                             .filter(p => 
                                (passcodeSearch === '' || 
                                 p.major.toLowerCase().includes(passcodeSearch.toLowerCase()) || 
                                 p.year.toLowerCase().includes(passcodeSearch.toLowerCase()) ||
                                 p.currentCode.toLowerCase().includes(passcodeSearch.toLowerCase()))
                             )
                             .map((item) => (
                               <tr key={`${item.year}-${item.major}`} className="hover:bg-slate-50 transition-colors">
                                   <td className="px-6 py-4">
                                       <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase">{item.year}</span>
                                   </td>
                                   <td className="px-6 py-4 font-bold text-slate-800">{item.major}</td>
                                   <td className="px-6 py-4">
                                       <span className="font-mono font-bold text-cyan-700 bg-cyan-50 px-3 py-1 rounded border border-cyan-100 tracking-wider">
                                          {item.currentCode}
                                       </span>
                                   </td>
                                   <td className="px-6 py-4 text-right">
                                       <button 
                                            onClick={() => setEditingPasscode({ year: item.year, major: item.major, code: item.currentCode })}
                                            className="text-cyan-600 hover:text-cyan-800 font-bold text-xs uppercase hover:underline"
                                       >
                                            Edit
                                       </button>
                                   </td>
                               </tr>
                           ))}
                           {passcodesList.filter(p => 
                                (passcodeSearch === '' || 
                                 p.major.toLowerCase().includes(passcodeSearch.toLowerCase()) || 
                                 p.year.toLowerCase().includes(passcodeSearch.toLowerCase()) ||
                                 p.currentCode.toLowerCase().includes(passcodeSearch.toLowerCase()))
                             ).length === 0 && (
                               <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No classes found.</td></tr>
                           )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* Manage Teachers */}
        {!isLoading && activeTab === 'teachers' && adminRole === AdminRole.SuperAdmin && (
            <div className="grid lg:grid-cols-3 gap-8 animate-fadeIn">
              <div className="lg:col-span-2">
                 <div className="glass-panel bg-white p-4 mb-4 rounded-xl flex flex-col gap-4 border border-slate-200">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Teacher List</h4>
                        <span className="bg-cyan-50 text-cyan-700 text-[10px] font-bold px-3 py-1 rounded border border-cyan-100 uppercase">
                            Total: {displayedTeachers.length}
                        </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Search Teacher</label>
                            <input 
                                type="text" 
                                placeholder="Name..." 
                                value={teacherSearch}
                                onChange={(e) => setTeacherSearch(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 p-2 text-slate-900 text-xs rounded-lg outline-none focus:border-cyan-500" 
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Department</label>
                            <div className="relative min-w-[150px]">
                                <select value={filterTeacherMajor} onChange={e => setFilterTeacherMajor(e.target.value)} className="w-full bg-slate-50 border border-slate-300 p-2 text-slate-900 text-xs rounded-lg outline-none appearance-none pr-8">
                                    <option value="All">All Departments</option>
                                    {Object.values(Major).map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
                 
                 <div className="overflow-x-auto glass-panel bg-white rounded-xl max-h-[600px] overflow-y-auto custom-scrollbar border border-slate-200">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="text-xs uppercase bg-slate-100 text-slate-500 sticky top-0 z-10 backdrop-blur-md">
                          <tr>
                              <th className="px-4 py-3 whitespace-nowrap">Name</th>
                              <th className="px-4 py-3 whitespace-nowrap">Department</th>
                              <th className="px-4 py-3 whitespace-nowrap">Status</th>
                              <th className="px-4 py-3 whitespace-nowrap">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedTeachers.length > 0 ? (
                            displayedTeachers.map((teach) => (
                              <tr key={teach.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{teach.name}</td>
                                <td className="px-4 py-3 text-xs whitespace-nowrap font-mono text-cyan-700 bg-cyan-50 rounded px-2 w-fit">{teach.major}</td>
                                <td className="px-4 py-3">
                                   {teach.has_voted 
                                     ? <span className="text-green-600 font-bold text-[10px] uppercase">Voted</span>
                                     : <span className="text-slate-400 font-bold text-[10px] uppercase">Pending</span>
                                   }
                                </td>
                                <td className="px-4 py-3">
                                    <button 
                                      onClick={() => promptDeleteTeacher(teach.id, teach.name)} 
                                      className="text-red-500 hover:text-red-700 text-xs font-bold"
                                    >
                                      Remove
                                    </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                             <tr>
                               <td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-mono text-xs">No teachers found.</td>
                             </tr>
                          )}
                        </tbody>
                    </table>
                 </div>
              </div>

              <div className="glass-panel bg-white p-6 h-fit sticky top-4 rounded-xl border border-slate-200">
                  <h3 className="text-lg font-tech text-slate-800 mb-4 uppercase tracking-wider">Add Teacher</h3>
                  <form onSubmit={handleAddTeacher} className="space-y-4">
                     <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Teacher Name</label>
                        <input 
                          required 
                          disabled={isAddingTeacher}
                          value={newTeacherName} 
                          onChange={e => setNewTeacherName(e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-300 p-2 text-slate-900 text-sm rounded-lg outline-none focus:border-cyan-500" 
                        />
                     </div>
                     <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Department</label>
                        <div className="relative">
                            <select 
                                disabled={isAddingTeacher}
                                value={newTeacherMajor} 
                                onChange={e => setNewTeacherMajor(e.target.value as Major)} 
                                className="w-full bg-slate-50 border border-slate-300 p-2 text-slate-900 text-xs rounded-lg appearance-none pr-8"
                            >
                                {Object.values(Major).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                     </div>
                     <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Department Passcode</label>
                        <div className="relative">
                            <input 
                            required 
                            disabled={isAddingTeacher}
                            value={newTeacherPasscode} 
                            onChange={e => setNewTeacherPasscode(e.target.value)} 
                            type={showTeacherPasscode ? 'text' : 'password'}
                            className="w-full bg-slate-50 border border-slate-300 p-2 text-slate-900 text-sm rounded-lg outline-none focus:border-cyan-500 pr-10" 
                            />
                            <button 
                            type="button" 
                            onClick={() => setShowTeacherPasscode(!showTeacherPasscode)}
                            className="absolute inset-y-0 right-0 flex items-center px-2 text-slate-400 hover:text-cyan-600 transition-colors"
                            >
                            {showTeacherPasscode ? (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                            ) : (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            )}
                            </button>
                        </div>
                     </div>
                     
                     <button 
                       disabled={isAddingTeacher}
                       className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-lg disabled:opacity-50 flex justify-center uppercase text-xs tracking-wider shadow-md shadow-cyan-200"
                     >
                       {isAddingTeacher ? <span className="flex items-center gap-2"><Spinner /> Processing</span> : 'Add Teacher'}
                     </button>
                  </form>
              </div>
            </div>
        )}

        {/* Settings View (SuperAdmin Only) */}
        {!isLoading && activeTab === 'settings' && adminRole === AdminRole.SuperAdmin && (
           <div className="glass-panel bg-white p-8 max-w-2xl mx-auto rounded-xl animate-fadeIn border border-slate-200">
              <h3 className="text-xl font-tech text-slate-800 mb-6 uppercase tracking-wider">Event Configuration</h3>
              
              <div className="mb-8">
                 <label className="text-xs text-cyan-600 font-bold uppercase block mb-2">Voting Start Time</label>
                 <p className="text-slate-500 text-sm mb-4">Set the exact date and time when the voting countdown ends and students can start selecting candidates.</p>
                 <div className="flex flex-col sm:flex-row gap-4">
                    <input 
                       type="datetime-local" 
                       value={eventStartTime}
                       onChange={(e) => setEventStartTime(e.target.value)}
                       className="bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-lg outline-none focus:border-cyan-500 w-full font-mono text-sm"
                    />
                    <button 
                       onClick={handleUpdateEventTime}
                       disabled={isUpdatingTime}
                       className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-6 py-3 rounded-lg uppercase text-xs tracking-wider whitespace-nowrap min-w-[120px] flex justify-center items-center shadow-md shadow-cyan-200"
                    >
                       {isUpdatingTime ? <Spinner /> : 'Update Timer'}
                    </button>
                 </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-200">
                <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-4">Database Helpers</h4>
                <div className="bg-slate-800 rounded-lg p-4 overflow-x-auto relative group">
                    <p className="text-slate-400 text-xs mb-2 font-mono">// Manual SQL Insert for Teachers (Run in Supabase SQL Editor)</p>
                    <p className="text-yellow-400 text-[10px] mb-2 font-bold uppercase">Fix for: relation "teachers" does not exist</p>
                    <code className="text-green-400 font-mono text-xs block whitespace-pre select-all">
                    {`INSERT INTO students (name, major, type, passcode, year, roll_number)\nVALUES \n  ('Dr. Wai Phyo Aung', 'EC', 'Teacher', 'TEEC', 'Teacher', 'T-EC-001');`}
                    </code>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-8">
                 <p className="text-xs text-slate-500">Note: Updating the timer affects all users immediately. Make sure to set the correct local time.</p>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
