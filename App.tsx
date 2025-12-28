
import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Ballot from './components/Ballot';
import VotingAssistant from './components/VotingAssistant';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import WinnerReveal from './components/WinnerReveal';
import { StudentInfo, Votes, AdminRole } from './types';
import { submitVote, fetchWinnerConfig, WinnerConfig } from './services/supabaseService';

type AppView = 'student-login' | 'student-voting' | 'student-voted' | 'admin-login' | 'admin-dashboard' | 'winner-reveal';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('student-login');
  const [currentStudent, setCurrentStudent] = useState<StudentInfo | null>(null);
  const [adminRole, setAdminRole] = useState<AdminRole>(AdminRole.Admin);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [showReminder, setShowReminder] = useState(true);
  
  // Winner Config State
  const [winnerConfig, setWinnerConfig] = useState<WinnerConfig>({ isAnnounced: false, kingId: null, queenId: null });

  // Initial Checks
  useEffect(() => {
    // Check for saved admin session
    const savedRole = localStorage.getItem('adminRole');
    if (savedRole) {
      setAdminRole(savedRole as AdminRole);
      setView('admin-dashboard');
      setShowReminder(false); // No reminder for admin
    } else {
        checkWinnerStatus();
    }

    // Polling for winner announcement
    const interval = setInterval(checkWinnerStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkWinnerStatus = async () => {
      // Don't override if user is already in admin flow
      const savedRole = localStorage.getItem('adminRole');
      if (savedRole) return;

      const config = await fetchWinnerConfig();
      setWinnerConfig(config);
      
      // If announced and user is not admin, force reveal page
      if (config.isAnnounced) {
          setView(prev => (prev === 'admin-login' || prev === 'admin-dashboard') ? prev : 'winner-reveal');
      } else {
          // If announcement turned off, revert to login if currently on reveal
          setView(prev => prev === 'winner-reveal' ? 'student-login' : prev);
      }
  };

  const changeView = (newView: AppView) => {
    setIsPageLoading(true);
    setTimeout(() => {
      setView(newView);
      setIsPageLoading(false);
    }, 500);
  };

  const handleLogin = (student: StudentInfo) => {
    setCurrentStudent(student);
    if (student.hasVoted) {
      changeView('student-voted');
    } else {
      changeView('student-voting');
    }
  };

  const handleGuestLogin = () => {
    const guestUser: StudentInfo = { name: "Guest", type: 'Guest', year: "Guest", major: "Guest", rollNumber: "0", hasVoted: false };
    setCurrentStudent(guestUser);
    changeView('student-voting');
  };

  const handleSubmitVotes = async (votes: Votes) => {
    if (!currentStudent || !currentStudent.id) return;
    try {
      await submitVote(currentStudent.id, votes);
      changeView('student-voted');
    } catch (e) {
      alert("Error submitting vote. Please try again.");
    }
  };

  const handleLogout = () => {
    setCurrentStudent(null);
    changeView('student-login');
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('adminRole');
    changeView('student-login');
    setShowReminder(true);
    // Re-check winner status immediately to potentially show reveal page
    checkWinnerStatus();
  };

  const handleAdminLoginSuccess = (role: AdminRole) => {
    setAdminRole(role);
    localStorage.setItem('adminRole', role);
    changeView('admin-dashboard');
    setShowReminder(false);
  };

  const showHeader = view !== 'student-login' && view !== 'admin-login' && view !== 'winner-reveal';

  return (
    <div className="min-h-screen text-slate-800 overflow-hidden relative">
      
      {/* Reminder Modal */}
      {showReminder && view !== 'admin-dashboard' && view !== 'admin-login' && view !== 'winner-reveal' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white max-w-lg w-full rounded-2xl p-8 shadow-2xl relative overflow-hidden border border-slate-200">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4 text-cyan-600">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h2 className="text-xl font-tech font-bold uppercase tracking-widest text-slate-800">Voting Rules</h2>
                </div>
                <p className="text-slate-600 text-center leading-relaxed font-medium mb-8 whitespace-pre-line">
                    Online voting 50% နှင့် ပါမောက္ခချုပ်ဆရာမကြီး၊ ဒုတိယပါမောက္ခချုပ်ဆရာမကြီးနှင့်တကွ ဌာနမှူးများပါဝင်သော ဒိုင်အဖွဲ့၏ အမှတ်ပေးရွေးချယ်မှု 50%
                    <br/><br/>
                    မှတ်ချက်။  ။ voting resultများကို ကော်မတီအဖွဲဝင် ၇ ဦးက မျှတစွာဆောင်ရွက်သွားပါမည်ဖြစ်ပါသည်။
                </p>
                <button 
                  onClick={() => setShowReminder(false)}
                  className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl uppercase tracking-widest text-sm hover:bg-slate-700 transition-colors shadow-lg"
                >
                   Got it
                </button>
            </div>
        </div>
      )}

      {/* Global Page Loader */}
      {isPageLoading && (
        <div className="cyber-loader-container">
          <div className="cyber-spinner"></div>
          <p className="mt-4 font-tech text-slate-600 uppercase tracking-widest animate-pulse">Initializing System...</p>
        </div>
      )}

      {/* Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
      </div>

      {showHeader && (
        <header className="relative z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => changeView('student-login')}>
              <img src="https://hbtu.edu.mm/img/Hmawbi-logo.png" alt="Logo" className="h-10 w-auto object-contain"/>
              <div className="flex flex-col">
                <span className="font-tech text-lg font-bold tracking-widest text-slate-800 uppercase">TU HMAWBI</span>
                <span className="text-[10px] tracking-[0.2em] text-slate-500 font-bold uppercase">Freshers Welcome</span>
              </div>
            </div>
            
            {currentStudent && view === 'student-voting' && (
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{currentStudent.type}</div>
                  <div className="text-sm font-bold text-slate-700 uppercase tracking-wider">{currentStudent.name}</div>
                </div>
                <button onClick={handleLogout} className="text-xs bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 px-4 py-2 rounded border border-slate-200 transition-colors uppercase tracking-widest font-bold">Log Out</button>
              </div>
            )}
          </div>
        </header>
      )}

      <main className={`relative z-10 flex flex-col items-center justify-center p-4 ${showHeader ? 'min-h-[calc(100vh-64px)]' : 'min-h-screen'}`}>
        {view === 'winner-reveal' && <WinnerReveal kingId={winnerConfig.kingId} queenId={winnerConfig.queenId} onAdminLogin={() => changeView('admin-login')} />}
        {view === 'student-login' && <Login onLogin={handleLogin} onAdminClick={() => changeView('admin-login')} onGuestClick={handleGuestLogin} />}
        {view === 'admin-login' && <AdminLogin onLoginSuccess={handleAdminLoginSuccess} onBack={() => {
            if (winnerConfig.isAnnounced) changeView('winner-reveal');
            else changeView('student-login');
        }} />}
        {view === 'admin-dashboard' && <AdminDashboard adminRole={adminRole} onLogout={handleAdminLogout} />}
        {view === 'student-voting' && <Ballot onSubmit={handleSubmitVotes} isGuest={currentStudent?.type === 'Guest'} onLoginRequest={handleLogout} />}
        {view === 'student-voted' && (
          <div className="text-center animate-fadeIn max-w-lg w-full glass-panel p-10 rounded-xl shadow-2xl relative overflow-hidden border-t-4 border-green-500">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-3xl font-tech text-slate-800 mb-2 uppercase tracking-widest">Votes Cast</h2>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium uppercase tracking-wide">Your selections have been recorded securely.<br/>Thank you for participating.</p>
            <button onClick={handleLogout} className="bg-slate-800 text-white font-tech text-xs tracking-widest uppercase py-3 px-8 rounded hover:bg-slate-700 transition-colors shadow-lg">Return to Login</button>
          </div>
        )}
      </main>

      {(view === 'student-login' || view === 'student-voting') && <VotingAssistant />}
    </div>
  );
};

export default App;
