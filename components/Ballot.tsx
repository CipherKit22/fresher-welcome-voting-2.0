
import React, { useState, useEffect } from 'react';
import { Candidate, Votes } from '../types';
import CandidateCard from './CandidateCard';
import { fetchCandidates, fetchEventStartTime } from '../services/supabaseService';

interface BallotProps {
  onSubmit: (votes: Votes) => Promise<void>;
  isGuest?: boolean;
  onLoginRequest?: () => void;
}

const Ballot: React.FC<BallotProps> = ({ onSubmit, isGuest, onLoginRequest }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [activeSection, setActiveSection] = useState<'Male' | 'Female'>('Male');
  const [votes, setVotes] = useState<Votes>({
    male: null,
    female: null
  });
  
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [targetTime, setTargetTime] = useState<number>(0);
  const [isEventStarted, setIsEventStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Data
  useEffect(() => {
    const loadData = async () => {
      // 1. Get Timer
      const timeStr = await fetchEventStartTime();
      setTargetTime(new Date(timeStr).getTime());

      // 2. Get Candidates (Robust fetch)
      const data = await fetchCandidates();
      setCandidates(data);
      setLoading(false);
    };
    loadData();
  }, []);

  // Countdown Logic
  useEffect(() => {
    if (targetTime === 0) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, targetTime - now);
      
      setTimeLeft(diff);
      setIsEventStarted(diff === 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleCandidateClick = (candidateId: string) => {
    // In guest mode, clicking doesn't select, maybe just does nothing or expands image (future feature)
    // For now, let's allow selection just so guests can see the UI, but disable submit.
    if (isSubmitting) return;
    
    // Optional: If strict guest mode where clicking does nothing, return here.
    // return; 
    
    setVotes(prev => {
      if (activeSection === 'Male') {
        // Toggle if already selected
        return { ...prev, male: prev.male === candidateId ? null : candidateId };
      } else {
        return { ...prev, female: prev.female === candidateId ? null : candidateId };
      }
    });
  };

  const handleSubmit = async () => {
    if (isGuest && onLoginRequest) {
        onLoginRequest();
        return;
    }
    if (isSubmitting || !allVotesCast || !isEventStarted) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(votes);
    } catch (e) {
      setIsSubmitting(false);
    }
  };

  const isSelected = (id: string) => votes.male === id || votes.female === id;
  const allVotesCast = votes.male && votes.female;

  const getSelectedCandidateDetails = (id: string | null) => {
    if (!id) return null;
    return candidates.find(c => c.id === id);
  };

  if (loading) {
    return <div className="text-center text-cyan-600 font-tech mt-20 animate-pulse">Loading Candidates...</div>;
  }

  const selectedMale = getSelectedCandidateDetails(votes.male);
  const selectedFemale = getSelectedCandidateDetails(votes.female);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-8 relative pb-40 md:pb-32">
      
      {isGuest && (
        <div className="mb-4 bg-yellow-50 border-b border-yellow-200 px-4 py-3 text-center sticky top-[80px] z-30 rounded-lg shadow-sm">
            <p className="text-yellow-800 text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Guest Mode • Voting Disabled
            </p>
        </div>
      )}

      {!isEventStarted && !isGuest && (
        <div className="mb-8 p-6 md:p-8 glass-panel border border-red-200 rounded-2xl text-center relative overflow-hidden bg-white/80">
          <h2 className="text-red-500 font-bold uppercase tracking-widest text-xs md:text-sm mb-4">Voting System Locked</h2>
          <div className="text-4xl sm:text-6xl md:text-8xl font-tech text-slate-800 tabular-nums tracking-widest drop-shadow-sm">
            {formatTime(timeLeft)}
          </div>
          <p className="text-slate-500 text-xs md:text-sm mt-4 uppercase tracking-wider font-medium">Voting Starts Soon</p>
        </div>
      )}

      <div className="flex justify-center mb-8 gap-2">
        <button
          onClick={() => setActiveSection('Male')}
          className={`flex-1 md:flex-none px-6 md:px-8 py-3 font-tech text-lg uppercase tracking-widest transition-all rounded-lg border
            ${activeSection === 'Male' 
              ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-200' 
              : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:border-slate-300'
            }`}
        >
          Boys
        </button>
        <button
          onClick={() => setActiveSection('Female')}
          className={`flex-1 md:flex-none px-6 md:px-8 py-3 font-tech text-lg uppercase tracking-widest transition-all rounded-lg border
            ${activeSection === 'Female' 
              ? 'bg-pink-600 text-white border-pink-500 shadow-lg shadow-pink-200' 
              : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:border-slate-300'
            }`}
        >
          Girls
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 animate-fadeIn">
        {candidates.filter(c => c.gender === activeSection).map((candidate) => {
          return (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              isSelected={isSelected(candidate.id)}
              isDisabled={isSubmitting} 
              onSelect={handleCandidateClick}
            />
          );
        })}
        {candidates.filter(c => c.gender === activeSection).length === 0 && (
          <div className="col-span-full text-center text-slate-500 font-tech py-10">No candidates available.</div>
        )}
      </div>

      {/* Modern Bottom Bar */}
      <div className="fixed bottom-0 left-0 w-full glass-panel border-t border-slate-200 p-4 z-40 bg-white/95 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            
            <div className="flex w-full md:w-auto gap-4 justify-between md:justify-start">
               {/* Male Selection */}
               <div className={`flex items-center gap-3 p-2 rounded-lg transition-colors flex-1 md:flex-none ${activeSection === 'Male' ? 'bg-cyan-50 border border-cyan-100' : 'bg-transparent'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border ${votes.male ? 'bg-cyan-600 border-cyan-600 text-white' : 'bg-slate-100 border-slate-200 text-slate-300'}`}>
                    {votes.male ? '✓' : 'M'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Boy Selected</span>
                    <span className={`text-sm font-bold truncate max-w-[120px] ${votes.male ? 'text-cyan-900' : 'text-slate-300'}`}>
                      {selectedMale ? `No. ${selectedMale.candidateNumber} ${selectedMale.name}` : 'None'}
                    </span>
                  </div>
               </div>

               <div className="w-px bg-slate-200 mx-2 hidden md:block"></div>

               {/* Female Selection */}
               <div className={`flex items-center gap-3 p-2 rounded-lg transition-colors flex-1 md:flex-none ${activeSection === 'Female' ? 'bg-pink-50 border border-pink-100' : 'bg-transparent'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border ${votes.female ? 'bg-pink-600 border-pink-600 text-white' : 'bg-slate-100 border-slate-200 text-slate-300'}`}>
                    {votes.female ? '✓' : 'F'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Girl Selected</span>
                    <span className={`text-sm font-bold truncate max-w-[120px] ${votes.female ? 'text-pink-900' : 'text-slate-300'}`}>
                      {selectedFemale ? `No. ${selectedFemale.candidateNumber} ${selectedFemale.name}` : 'None'}
                    </span>
                  </div>
               </div>
            </div>

            {isGuest ? (
                <button
                    onClick={onLoginRequest}
                    className="w-full md:w-auto px-10 py-4 font-tech font-bold text-xl uppercase tracking-widest transition-all rounded-xl shadow-lg flex items-center justify-center gap-3 bg-slate-800 text-white hover:bg-slate-700 shadow-slate-300"
                >
                    Login to Vote
                </button>
            ) : (
                <button
                    onClick={handleSubmit}
                    disabled={!allVotesCast || !isEventStarted || isSubmitting}
                    className={`
                    w-full md:w-auto px-10 py-4 font-tech font-bold text-xl uppercase tracking-widest transition-all rounded-xl shadow-lg flex items-center justify-center gap-3
                    ${allVotesCast && isEventStarted && !isSubmitting
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-200 transform hover:scale-105' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                    }
                    `}
                >
                    {isSubmitting && (
                        <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    )}
                    {isSubmitting 
                        ? 'Sending...' 
                        : (isEventStarted ? (allVotesCast ? 'Submit Votes' : 'Pick Both') : 'Locked')
                    }
                </button>
            )}
        </div>
      </div>

    </div>
  );
};

export default Ballot;
