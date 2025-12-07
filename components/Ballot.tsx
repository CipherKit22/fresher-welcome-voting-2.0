
import React, { useState, useEffect } from 'react';
import { Candidate, Votes } from '../types';
import CandidateCard from './CandidateCard';
import { fetchCandidates, fetchEventStartTime } from '../services/supabaseService';

interface BallotProps {
  onSubmit: (votes: Votes) => void;
}

const Ballot: React.FC<BallotProps> = ({ onSubmit }) => {
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

  // Load Data
  useEffect(() => {
    const loadData = async () => {
      // 1. Get Timer
      const timeStr = await fetchEventStartTime();
      setTargetTime(new Date(timeStr).getTime());

      // 2. Get Candidates
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
    if (!isEventStarted) return;
    
    setVotes(prev => {
      if (activeSection === 'Male') {
        // Toggle if already selected
        return { ...prev, male: prev.male === candidateId ? null : candidateId };
      } else {
        return { ...prev, female: prev.female === candidateId ? null : candidateId };
      }
    });
  };

  const isSelected = (id: string) => votes.male === id || votes.female === id;
  const allVotesCast = votes.male && votes.female;

  const getSelectedCandidateName = (id: string | null) => {
    if (!id) return null;
    return candidates.find(c => c.id === id)?.name;
  };

  if (loading) {
    return <div className="text-center text-cyan-600 font-tech mt-20 animate-pulse">Loading Candidates...</div>;
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-8 relative pb-40 md:pb-32">
      
      {!isEventStarted && (
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
              isDisabled={false} 
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
                      {getSelectedCandidateName(votes.male) || 'None'}
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
                      {getSelectedCandidateName(votes.female) || 'None'}
                    </span>
                  </div>
               </div>
            </div>

            <button
                onClick={() => onSubmit(votes)}
                disabled={!allVotesCast || !isEventStarted}
                className={`
                w-full md:w-auto px-10 py-4 font-tech font-bold text-xl uppercase tracking-widest transition-all rounded-xl shadow-lg
                ${allVotesCast && isEventStarted
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-200 transform hover:scale-105' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                }
                `}
            >
                {isEventStarted ? (allVotesCast ? 'Submit Votes' : 'Pick Both') : 'Locked'}
            </button>
        </div>
      </div>

    </div>
  );
};

export default Ballot;
