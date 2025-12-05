
import React, { useState } from 'react';
import Login from './components/Login';
import Ballot from './components/Ballot';
import VotingAssistant from './components/VotingAssistant';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import { StudentInfo, Votes, AdminRole } from './types';
import { submitVote } from './services/supabaseService';

type AppView = 'student-login' | 'student-voting' | 'student-voted' | 'admin-login' | 'admin-dashboard';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('student-login');
  const [currentStudent, setCurrentStudent] = useState<StudentInfo | null>(null);
  const [adminRole, setAdminRole] = useState<AdminRole>(AdminRole.Admin);
  const [isPageLoading, setIsPageLoading] = useState(false);

  // Helper to trigger page loader on view change
  const changeView = (newView: AppView) => {
    setIsPageLoading(true);
    setTimeout(() => {
      setView(newView);
      setIsPageLoading(false);
    }, 600); // 600ms transition for smooth feel
  };

  const handleLogin = (student: StudentInfo) => {
    setCurrentStudent(student);
    if (student.hasVoted) {
      changeView('student-voted');
    } else {
      changeView('student-voting');
    }
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

  const handleAdminLoginSuccess = (role: AdminRole) => {
    setAdminRole(role);
    changeView('admin-dashboard');
  };

  const showHeader = view !== 'student-login' && view !== 'admin-login';

  return (
    <div className="min-h-screen text-slate-800 overflow-hidden relative selection:bg-cyan-200 selection:text-cyan-900 font-medium">
      
      {/* Global Page Loader */}
      {isPageLoading && (
        <div className="cyber-loader-container">
          <div className="cyber-spinner"></div>
          <p className="mt-4 font-tech text-cyan-600 font-bold tracking-widest animate-pulse">PROCESSING...</p>
        </div>
      )}

      {/* Modern Background Animation */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-200/40 rounded-full blur-[100px] animate-blob mix-blend-multiply"></div>
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-purple-200/40 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-multiply"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] bg-blue-200/40 rounded-full blur-[100px] animate-blob animation-delay-4000 mix-blend-multiply"></div>
      </div>

      {showHeader && (
        <header className="relative z-10 border-b border-slate-200 bg-white/70 backdrop-blur-md sticky top-0 shadow-sm transition-all duration-300">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div 
              className="flex items-center gap-4 cursor-pointer group" 
              onClick={() => changeView('student-login')}
            >
              <img 
                  src="https://upload.wikimedia.org/wikipedia/en/9/9c/Technological_University_%28Hmawbi%29_Logo.png" 
                  alt="TU Hmawbi Logo" 
                  className="h-12 w-auto object-contain transition-transform group-hover:scale-105"
              />
              <div className="flex flex-col">
                <span className="font-tech text-lg font-bold tracking-wide text-cyan-900 group-hover:text-cyan-600 transition-colors uppercase">
                  TU HMAWBI
                </span>
                <span className="text-[10px] tracking-widest text-slate-500 font-bold uppercase">
                  Freshers Welcome
                </span>
              </div>
            </div>
            
            {currentStudent && view === 'student-voting' && (
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Student</div>
                  <div className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    {currentStudent.name}
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg transition-all uppercase tracking-wider font-bold border border-slate-200"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </header>
      )}

      <main className={`relative z-10 flex flex-col items-center justify-center p-6 ${showHeader ? 'min-h-[calc(100vh-80px)]' : 'min-h-screen'}`}>
        
        {view === 'student-login' && (
          <Login 
            onLogin={handleLogin} 
            onAdminClick={() => changeView('admin-login')}
          />
        )}

        {view === 'admin-login' && (
          <AdminLogin 
            onLoginSuccess={handleAdminLoginSuccess} 
            onBack={() => changeView('student-login')}
          />
        )}

        {view === 'admin-dashboard' && (
          <AdminDashboard 
            adminRole={adminRole}
            onLogout={() => changeView('student-login')}
          />
        )}

        {view === 'student-voting' && (
          <Ballot 
            onSubmit={handleSubmitVotes} 
          />
        )}

        {view === 'student-voted' && (
          <div className="text-center animate-fadeIn max-w-lg w-full glass-panel p-10 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200 animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-tech text-slate-800 mb-2 uppercase tracking-wide">Done!</h2>
            
            <p className="text-slate-500 text-lg mb-8 leading-relaxed font-normal">
              Your votes have been submitted. Thank you!
            </p>
            
            <button 
              onClick={handleLogout}
              className="text-cyan-600 hover:text-cyan-800 font-tech text-sm tracking-widest uppercase hover:underline underline-offset-4 decoration-cyan-500 transition-all font-bold"
            >
              Back to Home
            </button>
          </div>
        )}
      </main>

      {(view === 'student-login' || view === 'student-voting') && <VotingAssistant />}
      
    </div>
  );
};

export default App;
