
import React, { useState } from 'react';
import { Major, Year, StudentInfo } from '../types';
import { verifyStudent } from '../services/supabaseService';

interface LoginProps {
  onLogin: (student: StudentInfo) => void;
  onAdminClick: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onAdminClick }) => {
  const [year, setYear] = useState<Year>(Year.Y1);
  const [major, setMajor] = useState<Major>(Major.CEIT); // Default set to CEIT
  const [rollNumber, setRollNumber] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifiedStudent, setVerifiedStudent] = useState<StudentInfo | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await verifyStudent(year, major, rollNumber.trim(), passcode.trim());
      
      if (result.success && result.student) {
        setVerifiedStudent(result.student);
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
    if (verifiedStudent) {
      onLogin(verifiedStudent);
    }
  };

  if (verifiedStudent) {
    return (
      <div className="w-full max-w-md glass-panel-textured p-8 shadow-2xl relative overflow-hidden animate-fadeIn rounded-2xl border border-white/50">
        <h2 className="text-2xl font-tech text-center mb-6 text-slate-800 tracking-wider">Hello!</h2>
        <div className="bg-cyan-50 p-6 mb-6 text-center border border-cyan-100 rounded-xl">
          <p className="text-cyan-600 text-xs uppercase tracking-wider mb-2 font-bold">Welcome</p>
          <p className="text-3xl font-bold text-slate-800 font-tech">
            {verifiedStudent.name}
          </p>
          <div className="flex justify-center gap-2 mt-4 text-cyan-800 text-xs font-bold uppercase flex-wrap">
            <span className="bg-white px-3 py-1 rounded-full border border-cyan-100 shadow-sm">{year}</span>
            <span className="bg-white px-3 py-1 rounded-full border border-cyan-100 shadow-sm">{major}</span>
            <span className="bg-white px-3 py-1 rounded-full border border-cyan-100 shadow-sm">Roll: {rollNumber}</span>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => setVerifiedStudent(null)}
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
      <div className="w-full glass-panel-textured p-8 shadow-2xl relative overflow-hidden rounded-2xl">
        <div className="text-center mb-8 relative z-10 flex flex-col items-center">
          <img 
            src="https://upload.wikimedia.org/wikipedia/en/9/9c/Technological_University_%28Hmawbi%29_Logo.png"
            alt="TU Hmawbi Logo"
            className="w-20 h-24 object-contain mb-4 drop-shadow-md"
          />
          <h1 className="text-3xl font-tech text-slate-800 mb-2 tracking-wide">
            Welcome
          </h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Please Login to Vote</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-5 relative z-10">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Academic Year</label>
            <div className="relative group">
              <select 
                value={year} 
                onChange={(e) => setYear(e.target.value as Year)}
                className="w-full bg-white border border-slate-300 text-slate-800 px-4 py-3 appearance-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all cursor-pointer text-sm rounded-lg shadow-sm pr-10"
              >
                {Object.values(Year).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Major</label>
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
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Roll Number</label>
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
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Passcode</label>
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

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 text-xs font-medium flex items-center gap-3 rounded-lg">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-tech font-bold py-4 uppercase tracking-widest shadow-lg shadow-cyan-200 transition-all duration-300 rounded-lg disabled:opacity-50 mt-2"
          >
            {loading ? 'Checking...' : 'Login'}
          </button>
        </form>
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
