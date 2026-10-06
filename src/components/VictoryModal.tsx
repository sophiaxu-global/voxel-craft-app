import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, Award, CheckCircle2, RotateCcw, Sparkles, Star, Trophy } from 'lucide-react';
import { LevelConfig } from '../types';
import { soundManager } from '../utils/audio';

interface VictoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  level: LevelConfig;
  stars: number;
  onNextLevel: () => void;
  onReplayLevel: () => void;
  hasNextLevel: boolean;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  onClose,
  level,
  stars,
  onNextLevel,
  onReplayLevel,
  hasNextLevel,
}) => {
  useEffect(() => {
    if (isOpen) {
      soundManager.playVictory();
      // Confetti burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      const timer = setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md select-none">
      <div className="flex w-full max-w-md flex-col items-center rounded-3xl border border-white/15 bg-[#0c0c0d] p-6 text-center shadow-2xl">
        {/* Trophy Header */}
        <div className="relative mb-3 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-[#a3e635]/50 bg-[#a3e635]/15 shadow-[0_0_25px_rgba(163,230,53,0.3)]">
          <Trophy className="h-10 w-10 text-[#a3e635] animate-bounce" />
          <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-[#a3e635]" />
        </div>

        <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#a3e635]">
          Sector Objective Accomplished
        </span>
        <h2 className="mt-1 text-2xl font-black italic tracking-tight text-white">{level.title}</h2>
        <p className="mt-1 font-mono text-xs text-[#a3e635]">{level.subtitle}</p>

        {/* 3 Stars */}
        <div className="my-4 flex items-center justify-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Star
              key={i}
              className={`h-7 w-7 transition-all duration-500 ${
                i < stars
                  ? 'fill-[#a3e635] text-[#a3e635] scale-110 drop-shadow-[0_0_12px_rgba(163,230,53,0.6)]'
                  : 'text-white/10'
              }`}
            />
          ))}
        </div>

        {/* Objectives Recap */}
        <div className="mb-5 w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-left">
          <div className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.25em] text-[#a3e635]">
            Verified Mandates:
          </div>
          <div className="space-y-2 text-xs text-white/90">
            {level.objectives.map((obj) => (
              <div key={obj.id} className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-[#a3e635] shrink-0" />
                <span className="font-medium">{obj.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex w-full flex-col gap-2.5">
          {hasNextLevel && (
            <button
              id="victory-next-level-btn"
              onClick={onNextLevel}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#a3e635] py-3.5 text-xs font-black uppercase tracking-tight text-black shadow-lg transition hover:bg-white active:scale-95"
            >
              <span>Advance to Next Challenge</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={onReplayLevel}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] py-3 text-xs font-bold uppercase tracking-wider text-white hover:border-[#a3e635] hover:text-[#a3e635]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Replay</span>
            </button>

            <button
              onClick={onClose}
              className="flex flex-1 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] py-3 text-xs font-bold uppercase tracking-wider text-white hover:border-[#a3e635] hover:text-[#a3e635]"
            >
              <span>Continue World</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
