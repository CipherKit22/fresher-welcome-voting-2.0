
import React, { useState, useRef, useEffect } from 'react';
import { Major, Year, StudentInfo } from '../types';
import { verifyStudent, verifyTeacher } from '../services/supabaseService';
import { MOCK_TEACHERS } from '../constants';

interface LoginProps {
  onLogin: (student: StudentInfo) => void;
  onAdminClick: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onAdminClick }) => {
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
  
  // Common
  const [major, setMajor] = useState<Major>(Major.CEIT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifiedUser, setVerifiedUser] = useState<StudentInfo | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  // Student Form
  const [year, setYear] = useState<Year>(Year.Y1);
  const [rollNumber, setRollNumber] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);

  // Teacher Form
  const [teacherName, setTeacherName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Tutorial Logic
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (activeTab === 'student') {
        result = await verifyStudent(year, major, rollNumber.trim(), passcode.trim());
      } else {
        result = await verifyTeacher(major, teacherName.trim());
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

  // Filter teachers based on major
  const availableTeachers = MOCK_TEACHERS[major] || [];
  const filteredTeachers = availableTeachers.filter(name => 
    name.toLowerCase().includes(teacherName.toLowerCase())
  );

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
    return (
      <div className="w-full max-w-md glass-panel-textured p-8 shadow-2xl relative overflow-hidden animate-fadeIn rounded-2xl border border-white/50">
        <h2 className="text-2xl font-tech text-center mb-6 text-slate-800 tracking-wider">Hello!</h2>
        <div className="bg-cyan-50 p-6 mb-6 text-center border border-cyan-100 rounded-xl">
          <p className="text-cyan-600 text-xs uppercase tracking-wider mb-2 font-bold">Welcome</p>
          <p className="text-3xl font-bold text-slate-800 font-tech">
            {verifiedUser.name}
          </p>
          <div className="flex justify-center gap-2 mt-4 text-cyan-800 text-xs font-bold uppercase flex-wrap">
            <span className="bg-white px-3 py-1 rounded-full border border-cyan-100 shadow-sm">{verifiedUser.type}</span>
            <span className="bg-white px-3 py-1 rounded-full border border-cyan-100 shadow-sm">{verifiedUser.major}</span>
            {verifiedUser.type === 'Student' && (
                <span className="bg-white px-3 py-1 rounded-full border border-cyan-100 shadow-sm">Roll: {verifiedUser.rollNumber}</span>
            )}
          </div>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => setVerifiedUser(null)}
            className="flex-1 px-6 py-3 border border-slate-300 text-slate-500 hover:bg-slate-100 transition-colors uppercase text-xs font-bold tracking-wider rounded-lg"
          >
            Not Me
          </button>
          <button 
            onClick={confirmLogin}
            className="flex-1 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold shadow-lg shadow-cyan-200 transition-all uppercase text-xs tracking-wider rounded-lg"
          >
            Start Voting
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col items-center">
      <div className="w-full glass-panel-textured p-8 shadow-2xl relative overflow-hidden rounded-2xl min-h-[550px]">
        
        {/* Help Button */}
        <button 
          onClick={() => setShowTutorial(true)}
          className="absolute top-4 right-4 text-cyan-600 hover:bg-cyan-50 hover:text-cyan-700 transition-all p-2 z-20 rounded-full"
          title="Login Guide"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </button>

        <div className="text-center mb-6 relative z-10 flex flex-col items-center">
          <img 
            src="https://hbtu.edu.mm/img/Hmawbi-logo.png"
            alt="TU Hmawbi Logo"
            className="w-16 h-20 object-contain mb-2 drop-shadow-md"
          />
          <h1 className="text-2xl font-tech text-slate-800 tracking-wide">
            Welcome
          </h1>
          <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">Please Login to Vote</p>
        </div>

        {/* Custom Tabs */}
        <div className="flex gap-4 mb-6 relative z-10">
           <button
             onClick={() => { setActiveTab('student'); setError(''); }}
             className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 ${activeTab === 'student' ? 'border-cyan-500 bg-cyan-50/50 text-cyan-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'}`}
           >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
              <span className="font-tech font-bold text-sm uppercase tracking-wider">Student</span>
           </button>
           <button
             onClick={() => { setActiveTab('teacher'); setError(''); }}
             className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 ${activeTab === 'teacher' ? 'border-cyan-500 bg-cyan-50/50 text-cyan-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'}`}
           >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="font-tech font-bold text-sm uppercase tracking-wider">Teacher</span>
           </button>
        </div>

        <form onSubmit={handleVerify} className="space-y-4 relative z-10">
          
          {/* --- STUDENT FORM --- */}
          {activeTab === 'student' && (
            <div className="space-y-4 animate-fadeIn">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Academic Year</label>
                    <div className="relative group">
                    <select 
                        value={year} 
                        onChange={(e) => setYear(e.target.value as Year)}
                        className="w-full bg-white border border-slate-300 text-slate-800 px-4 py-3 appearance-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all cursor-pointer text-sm rounded-lg shadow-sm pr-10"
                    >
                        {Object.values(Year).filter(y => y !== Year.Staff).map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Major</label>
                    <div className="relative">
                    <select 
                        value={major} 
                        onChange={(e) => setMajor(e.target.value as Major)}
                        className="w-full bg-white border border-slate-300 text-slate-800 px-4 py-3 appearance-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all cursor-pointer text-sm rounded-lg shadow-sm pr-10"
                    >
                        {Object.values(Major).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Roll Number</label>
                    <input 
                    type="text"
                    inputMode="numeric"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value.replace(/\D/g, ''))}
                    required
                    placeholder="e.g. 1"
                    className="w-full bg-white border border-slate-300 text-slate-800 px-4 py-3 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder-slate-400 text-sm rounded-lg shadow-sm"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Passcode</label>
                    <div className="relative">
                        <input 
                        type={showPasscode ? 'text' : 'password'}
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        required
                        placeholder="••••••"
                        className="w-full bg-white border border-slate-300 text-slate-800 px-4 py-3 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder-slate-400 text-sm tracking-widest rounded-lg shadow-sm pr-10"
                        />
                        <button 
                        type="button" 
                        onClick={() => setShowPasscode(!showPasscode)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-cyan-600 transition-colors"
                        >
                        {showPasscode ? (
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
            </div>
          )}

          {/* --- TEACHER FORM --- */}
          {activeTab === 'teacher' && (
             <div className="space-y-4 animate-fadeIn">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Department</label>
                    <div className="relative">
                    <select 
                        value={major} 
                        onChange={(e) => {
                            setMajor(e.target.value as Major);
                            setTeacherName(''); // Reset name when major changes
                        }}
                        className="w-full bg-white border border-slate-300 text-slate-800 px-4 py-3 appearance-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all cursor-pointer text-sm rounded-lg shadow-sm pr-10"
                    >
                        {Object.values(Major).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                    </div>
                </div>

                <div className="relative" ref={dropdownRef}>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Name</label>
                   <div className="relative">
                        <input
                            type="text"
                            value={teacherName}
                            onChange={(e) => {
                                setTeacherName(e.target.value);
                                setIsDropdownOpen(true);
                            }}
                            onFocus={() => setIsDropdownOpen(true)}
                            placeholder="Type to search name..."
                            className="w-full bg-white border border-slate-300 text-slate-800 px-4 py-3 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder-slate-400 text-sm rounded-lg shadow-sm"
                            required
                        />
                        {/* Search Icon */}
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                           <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                           </svg>
                        </div>
                   </div>

                   {/* Custom Dropdown Menu */}
                   {isDropdownOpen && (
                       <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar animate-fadeIn">
                           {filteredTeachers.length > 0 ? (
                               filteredTeachers.map((name, idx) => (
                                   <div 
                                      key={idx}
                                      onClick={() => {
                                          setTeacherName(name);
                                          setIsDropdownOpen(false);
                                      }}
                                      className="px-4 py-2 hover:bg-cyan-50 cursor-pointer text-sm text-slate-700 font-medium transition-colors"
                                   >
                                      {name}
                                   </div>
                               ))
                           ) : (
                               <div className="px-4 py-3 text-sm text-slate-400 italic">No teachers found in {major}</div>
                           )}
                       </div>
                   )}
                </div>
             </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 text-xs font-medium flex items-center gap-3 rounded-lg animate-slideIn">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-tech font-bold py-4 uppercase tracking-widest shadow-lg shadow-cyan-200 transition-all duration-300 rounded-lg disabled:opacity-50 mt-4"
          >
            {loading ? 'Checking...' : 'Login'}
          </button>
        </form>

        {/* Tutorial Overlay */}
        {showTutorial && (
          <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn overflow-hidden rounded-2xl">
            <div className="w-full h-full p-6 overflow-y-auto custom-scrollbar flex flex-col items-center">
                
                <h3 className="text-2xl font-tech text-slate-800 mb-6 uppercase tracking-widest shrink-0 mt-2">Login Guide</h3>
                
                <div className="space-y-6 w-full max-w-sm text-left pb-4">
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold shrink-0 text-sm border border-cyan-200">1</div>
                    <div>
                        <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Choose Type</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">Select <span className="text-cyan-600 font-bold">Student</span> or <span className="text-cyan-600 font-bold">Teacher</span> tab.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold shrink-0 text-sm border border-cyan-200">2</div>
                    <div>
                        <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Enter Details</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Students use <span className="underline">Roll No & Fruit Code</span>.<br/>
                            Teachers select <span className="underline">Department & Name</span>.
                        </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-200 w-full">
                    <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                         <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                       </svg>
                       Watch Demo
                    </h4>
                    <div className="w-full aspect-video bg-slate-900 rounded-lg overflow-hidden shadow-lg border border-slate-300 relative group">
                        <iframe 
                            src="https://www.youtube.com/embed/dQw4w9WgXcQ?controls=1&modestbranding=1&rel=0" 
                            title="Login Tutorial"
                            className="w-full h-full opacity-90 group-hover:opacity-100 transition-opacity"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowTutorial(false)}
                  className="mt-4 bg-slate-800 text-white px-10 py-3 rounded-lg font-bold uppercase text-xs tracking-widest hover:bg-slate-700 transition-all shadow-lg shrink-0 w-full"
                >
                  Close Guide
                </button>
            </div>
          </div>
        )}

      </div>

      <button 
        onClick={onAdminClick}
        className="mt-6 text-slate-400 hover:text-cyan-600 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
      >
        Admin
      </button>
    </div>
  );
};

export default Login;
