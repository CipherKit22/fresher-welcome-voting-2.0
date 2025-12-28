
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
    if (isSubmitting) return;
    
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
    return <div className="text-center text-cyan-600 font-tech mt-20 animate-pulse font-bold tracking-widest">Loading Candidates...</div>;
  }

  const selectedMale = getSelectedCandidateDetails(votes.male);
  const selectedFemale = getSelectedCandidateDetails(votes.female);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-8 relative pb-48 md:pb-36">
      
      {isGuest && (
        <div className="mb-4 bg-amber-50 border border-amber-200 px-4 py-3 text-center sticky top-[80px] z-30 shadow-md">
            <p className="text-amber-700 text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Guest Mode • Voting Disabled
            </p>
        </div>
      )}

      {!isEventStarted && !isGuest && (
        <div className="mb-8 p-8 glass-panel border-l-4 border-red-500 rounded-r-xl text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
          </div>
          <h2 className="text-red-500 font-bold uppercase tracking-widest text-sm mb-2">Voting System Locked</h2>
          <div className="text-5xl md:text-7xl font-tech text-slate-800 tabular-nums tracking-wider">
            {formatTime(timeLeft)}
          </div>
          <p className="text-slate-400 text-xs mt-4 uppercase tracking-widest">Awaiting Authorization</p>
        </div>
      )}

      <div className="flex justify-center mb-8 gap-4">
        <button
          onClick={() => setActiveSection('Male')}
          className={`flex-1 md:flex-none px-8 py-3 font-tech text-lg uppercase tracking-widest border-b-4 transition-all
            ${activeSection === 'Male' 
              ? 'border-cyan-500 text-cyan-700 bg-white shadow-lg' 
              : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-white/50'
            }`}
        >
          Boys
        </button>
        <button
          onClick={() => setActiveSection('Female')}
          className={`flex-1 md:flex-none px-8 py-3 font-tech text-lg uppercase tracking-widest border-b-4 transition-all
            ${activeSection === 'Female' 
              ? 'border-pink-500 text-pink-700 bg-white shadow-lg' 
              : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-white/50'
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
          <div className="col-span-full text-center text-slate-400 font-tech py-20">No candidates available yet.</div>
        )}
      </div>

      {/* Modern Bottom Bar */}
      <div className="fixed bottom-0 left-0 w-full glass-panel border-t border-white/50 p-4 z-40 bg-white/90 backdrop-blur-md shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            
            <div className="flex w-full md:w-auto gap-2 md:gap-4 justify-between md:justify-start">
               {/* Male Selection */}
               <div onClick={() => setActiveSection('Male')} className={`cursor-pointer flex items-center gap-3 p-2 pr-4 rounded-lg transition-colors flex-1 md:flex-none ${activeSection === 'Male' ? 'bg-cyan-50 border border-cyan-100' : ''}`}>
                  <div className={`w-10 h-10 rounded flex items-center justify-center font-bold text-lg border-2 shadow-sm transition-all ${votes.male ? 'bg-cyan-600 border-cyan-600 text-white' : 'bg-white border-slate-300 text-slate-300'}`}>
                    {votes.male ? 'M' : ''}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider whitespace-nowrap">Boy Selected</span>
                    <span className={`text-xs font-bold truncate max-w-[120px] ${votes.male ? 'text-cyan-800' : 'text-slate-300'}`}>
                      {selectedMale ? `No. ${selectedMale.candidateNumber} ${selectedMale.name}` : 'None'}
                    </span>
                  </div>
               </div>

               {/* Female Selection */}
               <div onClick={() => setActiveSection('Female')} className={`cursor-pointer flex items-center gap-3 p-2 pr-4 rounded-lg transition-colors flex-1 md:flex-none ${activeSection === 'Female' ? 'bg-pink-50 border border-pink-100' : ''}`}>
                  <div className={`w-10 h-10 rounded flex items-center justify-center font-bold text-lg border-2 shadow-sm transition-all ${votes.female ? 'bg-pink-600 border-pink-600 text-white' : 'bg-white border-slate-300 text-slate-300'}`}>
                    {votes.female ? 'F' : ''}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider whitespace-nowrap">Girl Selected</span>
                    <span className={`text-xs font-bold truncate max-w-[120px] ${votes.female ? 'text-pink-800' : 'text-slate-300'}`}>
                      {selectedFemale ? `No. ${selectedFemale.candidateNumber} ${selectedFemale.name}` : 'None'}
                    </span>
                  </div>
               </div>
            </div>

            {isGuest ? (
                <button
                    onClick={onLoginRequest}
                    className="w-full md:w-auto px-8 py-3 font-tech font-bold text-sm uppercase tracking-widest transition-all rounded shadow-lg flex items-center justify-center gap-2 bg-slate-800 text-white hover:bg-slate-700 hover:shadow-slate-300/50"
                >
                    Login to Vote
                </button>
            ) : (
                <button
                    onClick={handleSubmit}
                    disabled={!allVotesCast || !isEventStarted || isSubmitting}
                    className={`
                    w-full md:w-auto px-8 py-3 font-tech font-bold text-sm uppercase tracking-widest transition-all rounded shadow-lg flex items-center justify-center gap-2
                    ${allVotesCast && isEventStarted && !isSubmitting
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-200/50 transform hover:-translate-y-1' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }
                    `}
                >
                    {isSubmitting && (
                        <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    )}
                    {isSubmitting 
                        ? 'Transmitting...' 
                        : (isEventStarted ? (allVotesCast ? 'Confirm Votes' : 'Selection Incomplete') : 'System Locked')
                    }
                </button>
            )}
        </div>
      </div>

    </div>
  );
};

export default Ballot;
