import React from 'react';
import { Eye, EyeOff, Layers, Sparkles, Target, X } from 'lucide-react';
import { BlueprintStructure } from '../types';
import { getItemEmoji } from './GameHUD';

interface BlueprintAssistantHUDProps {
  isOpen: boolean;
  onClose: () => void;
  blueprint: BlueprintStructure | null;
  currentLayer: number;
  onSetLayer: (layer: number) => void;
  showGhost: boolean;
  onToggleGhost: () => void;
  progress: {
    totalBlocks: number;
    correctBlocks: number;
    misplacedBlocks: number;
    accuracyPercent: number;
    blockTypeCounts: Record<string, { target: number; current: number }>;
  };
  onTeleportToSite?: () => void;
}

export const BlueprintAssistantHUD: React.FC<BlueprintAssistantHUDProps> = ({
  isOpen,
  onClose,
  blueprint,
  currentLayer,
  onSetLayer,
  showGhost,
  onToggleGhost,
  progress,
  onTeleportToSite,
}) => {
  if (!isOpen || !blueprint) return null;

  const maxLayer = blueprint.dimensions.height;

  return (
    <div className="fixed top-16 left-4 z-40 w-80 rounded-3xl border border-white/15 bg-[#0c0c0d]/95 p-4 text-xs text-white shadow-2xl backdrop-blur-xl select-none">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#a3e635]" />
          <div>
            <div className="text-[9px] uppercase font-bold tracking-[0.25em] text-[#a3e635]">Architectural Grid</div>
            <h3 className="font-bold tracking-tight text-white">{blueprint.name}</h3>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl border border-white/10 p-1 text-white/40 hover:border-[#a3e635] hover:text-[#a3e635]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress Bar & Accuracy Meter */}
      <div className="mb-3 rounded-2xl border border-white/10 bg-black/40 p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-white/60 font-medium">Build Accuracy:</span>
          <span className="font-mono text-sm font-bold text-[#a3e635]">
            {progress.accuracyPercent}%
          </span>
        </div>
        <div className="h-[2px] w-full overflow-hidden bg-white/10">
          <div
            className="h-full bg-[#a3e635] transition-all duration-300 shadow-[0_0_8px_rgba(163,230,53,0.8)]"
            style={{ width: `${progress.accuracyPercent}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-white/40">
          <span>Correct: {progress.correctBlocks} / {progress.totalBlocks}</span>
          {progress.misplacedBlocks > 0 && (
            <span className="text-red-400 font-bold">{progress.misplacedBlocks} misplaced</span>
          )}
        </div>
      </div>

      {/* Layer-by-Layer Slider */}
      <div className="mb-3 rounded-2xl border border-white/10 bg-black/40 p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider font-medium text-white/60">Layer Cutoff:</span>
          <span className="font-mono font-bold text-[#a3e635]">
            {currentLayer >= maxLayer ? 'All Layers' : `Layer ${currentLayer} / ${maxLayer}`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={maxLayer}
          value={currentLayer >= 99 ? maxLayer : currentLayer}
          onChange={(e) => onSetLayer(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-[#a3e635]"
        />
      </div>

      {/* Material Progress Checklist */}
      <div className="mb-3 max-h-36 overflow-y-auto space-y-1.5 rounded-2xl border border-white/10 bg-black/40 p-3">
        <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#a3e635]">
          Required Components:
        </div>
        {Object.entries(progress.blockTypeCounts).map(([type, rawCounts]) => {
          const counts = rawCounts as { target: number; current: number };
          const isDone = counts.current >= counts.target;
          return (
            <div key={type} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <span>{getItemEmoji(type as any)}</span>
                <span className={`capitalize ${isDone ? 'line-through text-white/30' : 'text-white/80'}`}>
                  {type.replace(/_/g, ' ')}
                </span>
              </div>
              <span className={`font-mono text-[10px] ${isDone ? 'text-[#a3e635] font-bold' : 'text-white/40'}`}>
                {counts.current}/{counts.target}
              </span>
            </div>
          );
        })}
      </div>

      {/* Ghost toggle & Teleport actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleGhost}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition ${
            showGhost
              ? 'bg-[#a3e635] text-black hover:bg-white'
              : 'border border-white/10 bg-white/[0.04] text-white/60 hover:text-white'
          }`}
        >
          {showGhost ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          <span>{showGhost ? 'Ghost On' : 'Ghost Off'}</span>
        </button>

        {onTeleportToSite && (
          <button
            onClick={onTeleportToSite}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:border-[#a3e635] hover:text-[#a3e635]"
          >
            <Target className="h-3.5 w-3.5 text-[#a3e635]" />
            <span>Site</span>
          </button>
        )}
      </div>
    </div>
  );
};
