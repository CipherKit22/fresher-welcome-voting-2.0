
import React from 'react';
import { Candidate } from '../types';

interface CandidateCardProps {
  candidate: Candidate;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (id: string) => void;
}

const CandidateCard: React.FC<CandidateCardProps> = ({ 
  candidate, 
  isSelected, 
  isDisabled, 
  onSelect
}) => {
  const isMale = candidate.gender === 'Male';
  const themeColor = isMale ? 'cyan' : 'pink';

  return (
    <div 
      onClick={() => !isDisabled && onSelect(candidate.id)}
      className={`
        relative group cursor-pointer transition-all duration-300 touch-manipulation select-none
        ${isDisabled 
          ? 'opacity-40 grayscale pointer-events-none' 
          : 'hover:-translate-y-1'
        }
      `}
    >
      <div className={`
        relative overflow-hidden bg-white rounded-xl transition-all duration-300
        ${isSelected 
          ? `ring-4 ring-${themeColor}-500 shadow-xl shadow-${themeColor}-100 transform scale-[0.98]` 
          : `border border-slate-200 hover:border-${themeColor}-300 hover:shadow-lg`
        }
      `}>
        
        {/* Selection Marker */}
        <div className={`
            absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg shadow-md transition-all duration-300
            ${isSelected 
                ? `${isMale ? 'bg-cyan-500' : 'bg-pink-500'} text-white opacity-100 scale-100` 
                : 'bg-white/50 text-transparent opacity-0 scale-50'
            }
        `}>
             ✓
        </div>

        <div className="relative aspect-[3/4]">
          <img 
            src={candidate.image} 
            alt={candidate.name} 
            loading="lazy"
            decoding="async"
            className={`w-full h-full object-cover transition-all duration-500 ${isSelected ? 'saturate-125' : 'grayscale-[0.1] group-hover:grayscale-0'}`}
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent flex flex-col justify-end p-3">
            <div>
              <h3 className="text-sm md:text-lg font-bold text-white font-tech uppercase tracking-wide leading-tight mb-1 drop-shadow-md">
                 <span className="opacity-80 text-xs md:text-sm mr-1">#{candidate.candidateNumber}</span>
                 {candidate.name}
              </h3>
              <div className="flex items-center gap-2">
                <p className={`${isMale ? 'text-cyan-300' : 'text-pink-300'} font-bold text-[10px] md:text-xs uppercase tracking-widest drop-shadow-sm`}>
                    {candidate.major}
                </p>
              </div>
            </div>
          </div>
          
          {/* Subtle Hover Overlay */}
          {!isSelected && !isDisabled && (
            <div className={`absolute inset-0 bg-${themeColor}-500/0 group-hover:bg-${themeColor}-500/10 transition-colors duration-300`}></div>
          )}
          
          {/* Selected Overlay */}
          {isSelected && (
              <div className={`absolute inset-0 bg-${themeColor}-500/20 mix-blend-overlay transition-colors`}></div>
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
