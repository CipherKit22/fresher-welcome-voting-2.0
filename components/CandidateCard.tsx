
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
          ? 'ring-4 ring-cyan-500 shadow-xl shadow-cyan-100 transform scale-[1.02]' 
          : 'border border-slate-200 hover:border-cyan-300 hover:shadow-lg'
        }
      `}>
        {/* Selection Marker */}
        {isSelected && (
           <div className="absolute top-3 right-3 z-20 bg-cyan-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg shadow-md animate-bounce">
             ✓
           </div>
        )}

        <div className="relative aspect-[3/4]">
          <img 
            src={candidate.image} 
            alt={candidate.name} 
            loading="lazy"
            className={`w-full h-full object-cover transition-all duration-500 ${isSelected ? 'scale-105 saturate-125' : 'grayscale-[0.1] group-hover:grayscale-0'}`}
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent flex flex-col justify-end p-4">
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white font-tech uppercase tracking-wide leading-none mb-1 drop-shadow-md">{candidate.name}</h3>
              <p className="text-cyan-300 font-bold text-xs uppercase tracking-widest drop-shadow-sm">{candidate.major}</p>
            </div>
          </div>
          
          {/* Subtle Hover Overlay */}
          {!isSelected && !isDisabled && (
            <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/10 transition-colors duration-300"></div>
          )}
        </div>

        {isSelected && (
          <div className="bg-cyan-600 text-white text-center text-xs font-bold py-2 font-tech uppercase tracking-widest">
            SELECTED
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateCard;
