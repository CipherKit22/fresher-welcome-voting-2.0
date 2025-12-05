
import React, { useState, useEffect } from 'react';
import { Candidate, Votes, VotingRole } from '../types';
import CandidateCard from './CandidateCard';
import { fetchCandidates, fetchEventStartTime } from '../services/supabaseService';

interface BallotProps {
  onSubmit: (votes: Votes) => void;
}

const Ballot: React.FC<BallotProps> = ({ onSubmit }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [activeSection, setActiveSection] = useState<'Male' | 'Female'>('Male');
  const [votes, setVotes] = useState<Votes>({
    king: null,
    queen: null,
    prince: null,
    princess: null
  });
  
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
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
    const candidate = candidates.find(c => c.id === candidateId);
    if (candidate) {
      setSelectedCandidate(candidate);
    }
  };

  const handleVote = (role: VotingRole) => {
    if (!selectedCandidate) return;
    const roleKey = role.toLowerCase() as keyof Votes;
    
    setVotes(prev => {
      const newVotes = { ...prev };
      if (selectedCandidate.gender === 'Male') {
         if (newVotes.king === selectedCandidate.id) newVotes.king = null;
         if (newVotes.prince === selectedCandidate.id) newVotes.prince = null;
      } else {
         if (newVotes.queen === selectedCandidate.id) newVotes.queen = null;
         if (newVotes.princess === selectedCandidate.id) newVotes.princess = null;
      }
      newVotes[roleKey] = selectedCandidate.id;
      return newVotes;
    });
    setSelectedCandidate(null);
  };

  const getCandidateRoleLabel = (candidateId: string): string => {
    if (votes.king === candidateId) return "KING";
    if (votes.queen === candidateId) return "QUEEN";
    if (votes.prince === candidateId) return "PRINCE";
    if (votes.princess === candidateId) return "PRINCESS";
    return "";
  };

  const allVotesCast = votes.king && votes.queen && votes.prince && votes.princess;

  if (loading) {
    return <div className="text-center text-cyan-600 font-tech mt-20 animate-pulse">Loading Candidates...</div>;
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-8 relative pb-32 md:pb-28">
      
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {candidates.filter(c => c.gender === activeSection).map((candidate) => {
          const roleLabel = getCandidateRoleLabel(candidate.id);
          const isSelected = !!roleLabel;
          
          return (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              isSelected={isSelected}
              isDisabled={false} 
              onSelect={handleCandidateClick}
              roleLabel={roleLabel}
            />
          );
        })}
        {candidates.length === 0 && (
          <div className="col-span-full text-center text-slate-500 font-tech py-10">No candidates available.</div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 w-full glass-panel border-t border-slate-200 p-4 z-40 bg-white/95 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="w-full md:w-auto overflow-x-auto flex justify-center md:justify-start">
                <div className="flex gap-4 text-xs font-mono font-bold whitespace-nowrap px-1">
                    <span className={votes.king ? "text-cyan-600" : "text-slate-400"}>KING {votes.king ? "✓" : ""}</span>
                    <span className={votes.prince ? "text-cyan-600" : "text-slate-400"}>PRINCE {votes.prince ? "✓" : ""}</span>
                    <span className="text-slate-300 hidden md:inline">|</span>
                    <span className={votes.queen ? "text-pink-600" : "text-slate-400"}>QUEEN {votes.queen ? "✓" : ""}</span>
                    <span className={votes.princess ? "text-pink-600" : "text-slate-400"}>PRINCESS {votes.princess ? "✓" : ""}</span>
                </div>
            </div>
            <button
                onClick={() => onSubmit(votes)}
                disabled={!allVotesCast || !isEventStarted}
                className={`
                w-full md:w-auto px-8 py-3 font-tech font-bold text-lg uppercase tracking-widest transition-all rounded-lg shadow-lg
                ${allVotesCast && isEventStarted
                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-200' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                }
                `}
            >
                {isEventStarted ? (allVotesCast ? 'Submit Votes' : 'Finish Picking') : 'Locked'}
            </button>
        </div>
      </div>

      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn" onClick={() => setSelectedCandidate(null)}>
          <div className="bg-white border border-slate-200 w-full max-w-md relative shadow-2xl rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
             
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="font-tech text-slate-800 text-lg uppercase tracking-wider">
                    Pick a Role
                 </h3>
                 <button 
                    onClick={() => setSelectedCandidate(null)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                 >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
             </div>

             <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                    <img src={selectedCandidate.image} alt={selectedCandidate.name} className="w-20 h-24 object-cover rounded-lg shadow-md" />
                    <div>
                        <div className="text-2xl text-slate-800 font-tech uppercase font-bold leading-none mb-1">{selectedCandidate.name}</div>
                        <div className="text-cyan-600 text-sm font-bold uppercase tracking-wider">{selectedCandidate.major}</div>
                    </div>
                </div>

                <div className="space-y-3">
                    <p className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-3 text-center">Vote For</p>
                    
                    {selectedCandidate.gender === 'Male' ? (
                        <>
                            <button
                                onClick={() => handleVote(VotingRole.King)}
                                className={`w-full py-4 border-2 font-tech text-lg uppercase tracking-[0.2em] transition-all flex justify-between px-6 items-center rounded-lg
                                    ${votes.king === selectedCandidate.id 
                                        ? 'bg-yellow-50 border-yellow-500 text-yellow-600' 
                                        : 'bg-transparent border-slate-200 text-slate-500 hover:border-yellow-400 hover:text-yellow-600 hover:bg-yellow-50/50'
                                    }`}
                            >
                                <span>Vote as King</span>
                                {votes.king === selectedCandidate.id && <span className="text-yellow-500">●</span>}
                            </button>
                            
                            <button
                                onClick={() => handleVote(VotingRole.Prince)}
                                className={`w-full py-4 border-2 font-tech text-lg uppercase tracking-[0.2em] transition-all flex justify-between px-6 items-center rounded-lg
                                    ${votes.prince === selectedCandidate.id 
                                        ? 'bg-cyan-50 border-cyan-500 text-cyan-600' 
                                        : 'bg-transparent border-slate-200 text-slate-500 hover:border-cyan-400 hover:text-cyan-600 hover:bg-cyan-50/50'
                                    }`}
                            >
                                <span>Vote as Prince</span>
                                {votes.prince === selectedCandidate.id && <span className="text-cyan-500">●</span>}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => handleVote(VotingRole.Queen)}
                                className={`w-full py-4 border-2 font-tech text-lg uppercase tracking-[0.2em] transition-all flex justify-between px-6 items-center rounded-lg
                                    ${votes.queen === selectedCandidate.id 
                                        ? 'bg-purple-50 border-purple-500 text-purple-600' 
                                        : 'bg-transparent border-slate-200 text-slate-500 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50/50'
                                    }`}
                            >
                                <span>Vote as Queen</span>
                                {votes.queen === selectedCandidate.id && <span className="text-purple-500">●</span>}
                            </button>
                            
                            <button
                                onClick={() => handleVote(VotingRole.Princess)}
                                className={`w-full py-4 border-2 font-tech text-lg uppercase tracking-[0.2em] transition-all flex justify-between px-6 items-center rounded-lg
                                    ${votes.princess === selectedCandidate.id 
                                        ? 'bg-pink-50 border-pink-500 text-pink-600' 
                                        : 'bg-transparent border-slate-200 text-slate-500 hover:border-pink-400 hover:text-pink-600 hover:bg-pink-50/50'
                                    }`}
                            >
                                <span>Vote as Princess</span>
                                {votes.princess === selectedCandidate.id && <span className="text-pink-500">●</span>}
                            </button>
                        </>
                    )}
                </div>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Ballot;
