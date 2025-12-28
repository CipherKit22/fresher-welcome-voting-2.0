import React, { useEffect, useState } from 'react';
import { Candidate } from '../types';
import { fetchCandidates } from '../services/supabaseService';

interface WinnerRevealProps {
  kingId: string | null;
  queenId: string | null;
  onAdminLogin: () => void;
}

const WinnerReveal: React.FC<WinnerRevealProps> = ({ kingId, queenId, onAdminLogin }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [tapCount, setTapCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const data = await fetchCandidates();
      setCandidates(data);
      setLoading(false);
    };
    load();
  }, []);

  // Secret Admin Access: 5 taps in quick succession
  const handleLogoClick = () => {
    setTapCount(prev => prev + 1);
    
    // Reset if no clicks for 2 seconds
    const timeout = setTimeout(() => setTapCount(0), 2000);
    
    if (tapCount + 1 >= 5) {
        clearTimeout(timeout);
        onAdminLogin();
    }
  };

  const king = candidates.find(c => c.id === kingId);
  const queen = candidates.find(c => c.id === queenId);

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-tech animate-pulse">Loading Winners...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white relative overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-10 left-10 w-96 h-96 bg-cyan-600/20 rounded-full blur-[100px] animate-pulse"></div>
         <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-600/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 text-center mb-12 animate-fadeIn">
         <div onClick={handleLogoClick} className="cursor-pointer inline-block active:scale-95 transition-transform">
             <img src="https://hbtu.edu.mm/img/Hmawbi-logo.png" alt="Logo" className="w-20 h-24 object-contain mx-auto mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] select-none" />
         </div>
         <h1 className="text-4xl md:text-6xl font-tech font-black uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-pink-400 drop-shadow-lg">
            Winners Revealed
         </h1>
         <p className="text-slate-400 font-bold uppercase tracking-widest mt-4">Fresher Welcome Ceremony 2024</p>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl w-full">
         
         {/* KING CARD */}
         {king ? (
             <div className="relative group animate-slideIn" style={{ animationDelay: '0.2s' }}>
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-2xl opacity-20 group-hover:opacity-30 blur-xl transition-opacity"></div>
                <div className="relative bg-slate-800/50 backdrop-blur-md border border-cyan-500/30 rounded-2xl overflow-hidden p-1">
                   <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
                      <img src={king.image} alt={king.name} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent p-8">
                          <h3 className="text-cyan-400 font-tech text-4xl font-bold uppercase tracking-widest mb-2 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">King</h3>
                          <h4 className="text-white text-2xl font-bold uppercase tracking-wider">{king.name}</h4>
                          <p className="text-cyan-200 text-sm font-bold uppercase tracking-widest mt-1">{king.major}</p>
                      </div>
                   </div>
                </div>
             </div>
         ) : (
             <div className="flex items-center justify-center h-96 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500 font-tech uppercase tracking-widest">
                 King Not Selected
             </div>
         )}

         {/* QUEEN CARD */}
         {queen ? (
             <div className="relative group animate-slideIn" style={{ animationDelay: '0.4s' }}>
                <div className="absolute inset-0 bg-gradient-to-b from-pink-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-30 blur-xl transition-opacity"></div>
                <div className="relative bg-slate-800/50 backdrop-blur-md border border-pink-500/30 rounded-2xl overflow-hidden p-1">
                   <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
                      <img src={queen.image} alt={queen.name} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent p-8">
                          <h3 className="text-pink-400 font-tech text-4xl font-bold uppercase tracking-widest mb-2 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]">Queen</h3>
                          <h4 className="text-white text-2xl font-bold uppercase tracking-wider">{queen.name}</h4>
                          <p className="text-pink-200 text-sm font-bold uppercase tracking-widest mt-1">{queen.major}</p>
                      </div>
                   </div>
                </div>
             </div>
         ) : (
             <div className="flex items-center justify-center h-96 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500 font-tech uppercase tracking-widest">
                 Queen Not Selected
             </div>
         )}

      </div>
      
      <div className="mt-16 text-slate-500 text-xs font-bold uppercase tracking-[0.3em] animate-fadeIn delay-1000">
          Congratulations to the winners
      </div>
    </div>
  );
};

export default WinnerReveal;