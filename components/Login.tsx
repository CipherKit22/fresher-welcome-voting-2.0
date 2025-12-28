
import React, { useState, useRef, useEffect } from 'react';
import { Major, Year, StudentInfo } from '../types';
import { verifyStudent, verifyTeacher, fetchTeachers, checkStudentRegistration } from '../services/supabaseService';
import { STUDENT_MAJORS } from '../constants';

interface LoginProps {
  onLogin: (student: StudentInfo) => void;
  onAdminClick: () => void;
  onGuestClick: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onAdminClick, onGuestClick }) => {
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
  
  // Common
  const [major, setMajor] = useState<Major>(Major.CEIT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifiedUser, setVerifiedUser] = useState<StudentInfo | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Registration Check Modal
  const [showCheckReg, setShowCheckReg] = useState(false);
  const [checkYear, setCheckYear] = useState<Year>(Year.Y1);
  const [checkMajor, setCheckMajor] = useState<Major>(Major.Civil);
  const [checkQuery, setCheckQuery] = useState('');
  const [checkResults, setCheckResults] = useState<{name: string, rollNumber: string, hasVoted: boolean}[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  // Student Form
  const [year, setYear] = useState<Year>(Year.Y1);
  const [rollNumber, setRollNumber] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);

  // Teacher Form
  const [teacherName, setTeacherName] = useState('');
  const [teacherPasscode, setTeacherPasscode] = useState('');
  const [showTeacherPasscode, setShowTeacherPasscode] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [teacherList, setTeacherList] = useState<string[]>([]);
  
  useEffect(() => {
    if (activeTab === 'teacher') {
        fetchTeachers(major).then(names => setTeacherList(names));
    }
  }, [major, activeTab]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
        if (checkQuery.length >= 2) {
            setIsChecking(true);
            const results = await checkStudentRegistration(checkYear, checkMajor, checkQuery);
            setCheckResults(results);
            setIsChecking(false);
        } else {
            setCheckResults([]);
        }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [checkQuery, checkYear, checkMajor]);

  const filteredTeachers = teacherList.filter(name => 
    name.toLowerCase().includes(teacherName.toLowerCase())
  );

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (activeTab === 'student') {
        result = await verifyStudent(year, major, rollNumber.trim(), passcode.trim());
      } else {
        result = await verifyTeacher(major, teacherName.trim(), teacherPasscode.trim());
      }
      
      if (result.success && result.student) {
        setVerifiedUser(result.student);
      } else {
        setError(result.message || 'Login Failed');
      }
    } catch (err) {
      setError('System Error. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  const confirmLogin = () => {
    if (verifiedUser) {
      onLogin(verifiedUser);
    }
  };

  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (verifiedUser) {
    // Only show relevant badges for teachers
    const isTeacher = verifiedUser.type === 'Teacher';
    return (
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 relative overflow-hidden text-center font-tech">
         <h2 className="text-3xl font-bold text-slate-800 mb-8 uppercase tracking-widest">Hello!</h2>
         
         <div className="bg-cyan-50/50 border border-cyan-100 rounded-2xl p-6 mb-8">
            <p className="text-cyan-600 font-bold text-[10px] uppercase tracking-widest mb-3">Welcome</p>
            <h3 className="text-2xl font-bold text-slate-800 mb-4 uppercase tracking-wider">{verifiedUser.name}</h3>
            
            <div className="flex justify-center gap-2 flex-wrap">
               {/* Display Year/Role Badge */}
               <span className="bg-white px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-500 shadow-sm border border-slate-100 uppercase tracking-wide">{verifiedUser.year}</span>
               
               {/* Display Major/Department Badge */}
               <span className="bg-white px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-500 shadow-sm border border-slate-100 uppercase tracking-wide">{verifiedUser.major}</span>
               
               {/* Display Roll Number only for Students */}
               {!isTeacher && (
                   <span className="bg-white px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-500 shadow-sm border border-slate-100 uppercase tracking-wide">Roll: {verifiedUser.rollNumber}</span>
               )}
            </div>
         </div>

         <div className="flex gap-4">
             <button onClick={() => setVerifiedUser(null)} className="flex-1 py-4 rounded-xl border-2 border-slate-200 text-slate-500 font-bold text-xs uppercase hover:bg-slate-50 transition-colors tracking-widest">Not Me</button>
             <button onClick={confirmLogin} className="flex-1 py-4 rounded-xl bg-[#0891b2] text-white font-bold text-xs uppercase shadow-lg shadow-cyan-200 hover:bg-[#0e7490] transition-colors tracking-widest">Start Voting</button>
         </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col items-center font-tech">
      <div className="w-full bg-white rounded-3xl shadow-2xl p-8 relative overflow-hidden">
         {/* Help Icon */}
         <button 
           onClick={() => setShowTutorial(true)} 
           className="absolute top-6 right-6 text-cyan-600 hover:text-cyan-800 transition-colors"
           type="button"
         >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
         </button>

         {/* Tutorial Modal Overlay */}
         {showTutorial && (
            <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur flex flex-col items-center justify-center p-8 animate-fadeIn text-center">
                <h3 className="text-xl font-bold text-slate-800 mb-6 uppercase tracking-widest">Login Guide</h3>
                <ul className="text-left space-y-4 text-slate-600 text-xs font-bold mb-8 w-full">
                    <li className="flex gap-3 items-start">
                    <span className="bg-cyan-100 text-cyan-600 rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                    Select your Academic Year and Major correctly.
                    </li>
                    <li className="flex gap-3 items-start">
                    <span className="bg-cyan-100 text-cyan-600 rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                    Enter your Roll Number (e.g., 1, 42).
                    </li>
                    <li className="flex gap-3 items-start">
                    <span className="bg-cyan-100 text-cyan-600 rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                    Enter the Passcode provided by your EC (e.g., "QXTA").
                    </li>
                </ul>
                <button onClick={() => setShowTutorial(false)} className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-700 w-full shadow-lg">Got it</button>
            </div>
         )}

         <div className="text-center mb-8">
            <img src="https://hbtu.edu.mm/img/Hmawbi-logo.png" alt="Logo" className="w-16 h-20 object-contain mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-800 uppercase tracking-widest">Welcome</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Please Login to Vote</p>
         </div>

         {/* Tabs */}
         <div className="flex gap-4 mb-8">
            <button 
              onClick={() => {setActiveTab('student'); setError('');}}
              className={`flex-1 py-4 rounded-xl font-bold uppercase tracking-wider text-sm border-2 transition-all flex flex-col items-center gap-1 ${activeTab === 'student' ? 'border-[#0891b2] text-[#0891b2] bg-cyan-50/50' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
               </svg>
               Student
            </button>
            <button 
              onClick={() => {setActiveTab('teacher'); setError('');}}
              className={`flex-1 py-4 rounded-xl font-bold uppercase tracking-wider text-sm border-2 transition-all flex flex-col items-center gap-1 ${activeTab === 'teacher' ? 'border-[#0891b2] text-[#0891b2] bg-cyan-50/50' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
               </svg>
               Teacher
            </button>
         </div>

         <form onSubmit={handleVerify} className="space-y-5 animate-fadeIn">
            {activeTab === 'student' && (
                <>
                  <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">Academic Year</label>
                      <div className="relative">
                          <select value={year} onChange={(e) => setYear(e.target.value as Year)} className="w-full bg-white border-2 border-slate-200 text-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#0891b2] transition-colors appearance-none font-tech">
                              {Object.values(Year).filter(y => y !== Year.Staff).map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                             <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </div>
                      </div>
                  </div>

                  <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">Major</label>
                      <div className="relative">
                          <select value={major} onChange={(e) => setMajor(e.target.value as Major)} className="w-full bg-white border-2 border-slate-200 text-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#0891b2] transition-colors appearance-none font-tech">
                              {STUDENT_MAJORS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                             <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </div>
                      </div>
                  </div>

                  <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">Roll Number</label>
                      <input 
                        type="text" 
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        placeholder="e.g. 1"
                        className="w-full bg-white border-2 border-slate-200 text-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#0891b2] transition-colors placeholder:font-normal font-tech"
                      />
                  </div>

                  <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">Class Passcode</label>
                      <div className="relative">
                          <input 
                            type={showPasscode ? "text" : "password"} 
                            value={passcode}
                            onChange={(e) => setPasscode(e.target.value)}
                            placeholder="Get from your EC"
                            className="w-full bg-white border-2 border-slate-200 text-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#0891b2] transition-colors placeholder:font-normal font-tech"
                          />
                          <button type="button" onClick={() => setShowPasscode(!showPasscode)} className="absolute inset-y-0 right-4 text-slate-400 hover:text-[#0891b2]">
                             {showPasscode ? (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                             ) : (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                             )}
                          </button>
                      </div>
                  </div>
                </>
            )}

            {activeTab === 'teacher' && (
                <>
                  <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">Department</label>
                      <div className="relative">
                          <select value={major} onChange={(e) => setMajor(e.target.value as Major)} className="w-full bg-white border-2 border-slate-200 text-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#0891b2] transition-colors appearance-none font-tech">
                              {Object.values(Major).map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                             <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </div>
                      </div>
                  </div>

                  <div className="relative" ref={dropdownRef}>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">Name</label>
                      <input 
                        type="text" 
                        value={teacherName}
                        onChange={(e) => { setTeacherName(e.target.value); setIsDropdownOpen(true); }}
                        onFocus={() => setIsDropdownOpen(true)}
                        placeholder="Search Name..."
                        className="w-full bg-white border-2 border-slate-200 text-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#0891b2] transition-colors placeholder:font-normal font-tech"
                      />
                      {isDropdownOpen && teacherList.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border-2 border-slate-100 rounded-xl shadow-xl max-h-40 overflow-y-auto custom-scrollbar font-tech">
                              {filteredTeachers.map((name, i) => (
                                  <div key={i} onClick={() => { setTeacherName(name); setIsDropdownOpen(false); }} className="px-4 py-2 hover:bg-cyan-50 cursor-pointer text-sm font-bold text-slate-600">
                                      {name}
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>

                  <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">Passcode</label>
                      <div className="relative">
                          <input 
                            type={showTeacherPasscode ? "text" : "password"} 
                            value={teacherPasscode}
                            onChange={(e) => setTeacherPasscode(e.target.value)}
                            placeholder="Department Passcode"
                            className="w-full bg-white border-2 border-slate-200 text-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#0891b2] transition-colors placeholder:font-normal font-tech"
                          />
                          <button type="button" onClick={() => setShowTeacherPasscode(!showTeacherPasscode)} className="absolute inset-y-0 right-4 text-slate-400 hover:text-[#0891b2]">
                             {showTeacherPasscode ? (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                             ) : (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                             )}
                          </button>
                      </div>
                  </div>
                </>
            )}

            {activeTab === 'student' && (
                <div className="flex justify-center pb-2">
                    <button type="button" onClick={() => setShowCheckReg(true)} className="text-[#0891b2] text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 hover:underline">
                       <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                       Check Registration Status
                    </button>
                </div>
            )}

            {error && (
               <div className="bg-red-50 text-red-500 text-xs font-bold p-3 rounded-lg border border-red-100 flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {error}
               </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-[#0891b2] hover:bg-[#0e7490] text-white font-bold text-lg uppercase py-4 rounded-xl shadow-lg shadow-cyan-200/50 transition-all hover:-translate-y-1 tracking-widest">
               {loading ? 'Checking...' : 'Login'}
            </button>
            
            <button type="button" onClick={onGuestClick} className="w-full bg-white border-2 border-slate-200 text-slate-500 font-bold text-xs uppercase py-3 rounded-xl hover:bg-slate-50 transition-all tracking-widest">
               Guest Mode
            </button>

            <p className="text-center text-[10px] font-bold text-red-400 uppercase tracking-widest pt-2 flex items-center justify-center gap-1">
               <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
               Do Not Use VPN
            </p>
         </form>

         {/* Check Reg Modal */}
         {showCheckReg && (
             <div className="absolute inset-0 z-50 bg-white flex flex-col p-6 animate-fadeIn font-tech">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl text-slate-800 uppercase tracking-wide font-bold">Status Check</h3>
                    <button onClick={() => setShowCheckReg(false)} className="text-slate-400 hover:text-red-500 font-bold text-sm">CLOSE</button>
                 </div>
                 <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-2">
                         <select value={checkYear} onChange={(e) => setCheckYear(e.target.value as Year)} className="p-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-700 outline-none">{Object.values(Year).filter(y=>y!==Year.Staff).map(y=><option key={y} value={y}>{y}</option>)}</select>
                         <select value={checkMajor} onChange={(e) => setCheckMajor(e.target.value as Major)} className="p-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-700 outline-none">{STUDENT_MAJORS.map(m=><option key={m} value={m}>{m}</option>)}</select>
                     </div>
                     <input 
                       type="text" 
                       value={checkQuery} 
                       onChange={(e) => setCheckQuery(e.target.value)} 
                       placeholder="Enter Name or Roll No."
                       className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-[#0891b2]"
                       autoFocus
                     />
                 </div>
                 <div className="mt-4 flex-1 overflow-y-auto custom-scrollbar">
                     {checkQuery.length < 2 ? (
                         <p className="text-center text-slate-400 text-xs mt-10">Type at least 2 characters...</p>
                     ) : checkResults.length > 0 ? (
                         <div className="space-y-2">
                             {checkResults.map((res, i) => (
                                 <div key={i} className="flex justify-between items-center p-3 border border-slate-100 rounded bg-slate-50">
                                     <div>
                                         <p className="font-bold text-slate-700 text-sm">{res.name}</p>
                                         <p className="text-[10px] text-slate-400 font-bold uppercase">Roll: {res.rollNumber}</p>
                                     </div>
                                     <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${res.hasVoted ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>{res.hasVoted ? 'Voted' : 'Pending'}</span>
                                 </div>
                             ))}
                         </div>
                     ) : (
                         !isChecking && <p className="text-center text-slate-400 text-xs mt-10">No students found.</p>
                     )}
                 </div>
             </div>
         )}
      </div>

      <button onClick={onAdminClick} className="mt-8 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors">Admin Portal</button>
    </div>
  );
};

export default Login;
