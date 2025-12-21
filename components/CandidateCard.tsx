
import React from 'react';
import { Candidate } from '../types';

interface CandidateCardProps {
  candidate: Candidate;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (id: string) => void;
  onInfoClick?: (candidate: Candidate) => void;
}

const CandidateCard: React.FC<CandidateCardProps> = ({ 
  candidate, 
  isSelected, 
  isDisabled, 
  onSelect,
  onInfoClick
}) => {
  const isMale = candidate.gender === 'Male';
  const themeColor = isMale ? 'cyan' : 'pink';

  return (
    <div 
      onClick={() => !isDisabled && onSelect(candidate.id)}
      className={`
        relative group cursor-pointer transition-all duration-300 touch-manipulation
        ${isDisabled 
          ? 'opacity-40 grayscale pointer-events-none' 
          : 'hover:-translate-y-1'
        }
      `}
    >
      <div className={`
        relative overflow-hidden bg-white rounded-xl transition-all duration-300
        ${isSelected 
          ? `ring-4 ring-${themeColor}-500 shadow-xl shadow-${themeColor}-100 transform scale-[1.02]` 
          : `border border-slate-200 hover:border-${themeColor}-300 hover:shadow-lg`
        }
      `}>
        
        {/* Selection Marker */}
        {isSelected && (
           <div className={`absolute top-3 right-3 z-20 ${isMale ? 'bg-cyan-500' : 'bg-pink-500'} text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg shadow-md animate-bounce`}>
             ✓
           </div>
        )}

        <div className="relative aspect-[3/4]">
          <img 
            src={candidate.image} 
            alt={candidate.name} 
            loading="lazy"
            decoding="async"
            className={`w-full h-full object-cover transition-all duration-500 ${isSelected ? 'scale-105 saturate-125' : 'grayscale-[0.1] group-hover:grayscale-0'}`}
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent flex flex-col justify-end p-3 md:p-4">
            <div>
              <h3 className="text-sm sm:text-base md:text-xl font-bold text-white font-tech uppercase tracking-wide leading-tight mb-0.5 md:mb-1 drop-shadow-md">
                 <span className="opacity-80 text-xs md:text-sm mr-1">#{candidate.candidateNumber}</span>
                 {candidate.name}
              </h3>
              <div className="flex items-center gap-2">
                <p className={`${isMale ? 'text-cyan-300' : 'text-pink-300'} font-bold text-[10px] md:text-xs uppercase tracking-widest drop-shadow-sm`}>
                    {candidate.major}
                </p>
                {/* Inline Info Button */}
                {candidate.bio && onInfoClick && !isDisabled && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onInfoClick(candidate);
                        }}
                        className="text-[10px] font-bold text-white bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded backdrop-blur-sm transition-colors uppercase tracking-wider flex items-center gap-1"
                        type="button"
                    >
                        View Bio
                    </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Subtle Hover Overlay */}
          {!isSelected && !isDisabled && (
            <div className={`absolute inset-0 bg-${themeColor}-500/0 group-hover:bg-${themeColor}-500/10 transition-colors duration-300`}></div>
          )}
        </div>

        {isSelected && (
          <div className={`${isMale ? 'bg-cyan-600' : 'bg-pink-600'} text-white text-center text-xs font-bold py-2 font-tech uppercase tracking-widest`}>
            SELECTED
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateCard;
