import React from 'react';
import { Keyboard, Moon, Move, Shield, Sliders, Sparkles, Sun, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeOfDay: number;
  onSetTimeOfDay: (time: number) => void;
  isFlying: boolean;
  onToggleFlight: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  volume: number;
  onSetVolume: (vol: number) => void;
  mouseSensitivity: number;
  onSetMouseSensitivity: (val: number) => void;
  gameMode?: 'survival' | 'creative' | 'architect';
  onSetGameMode?: (mode: 'survival' | 'creative' | 'architect') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  timeOfDay,
  onSetTimeOfDay,
  isFlying,
  onToggleFlight,
  isMuted,
  onToggleMute,
  volume,
  onSetVolume,
  mouseSensitivity,
  onSetMouseSensitivity,
  gameMode = 'creative',
  onSetGameMode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md select-none">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl border border-white/15 bg-[#0c0c0d] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Sliders className="h-5 w-5 text-[#a3e635]" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#a3e635]">System Configuration</div>
              <h2 className="text-sm font-black italic tracking-tight text-white">SIMULATION PREFERENCES</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 p-1.5 text-white/40 hover:border-[#a3e635] hover:text-[#a3e635]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6 overflow-y-auto max-h-[70vh]">
          {/* Game Mode Selector */}
          {onSetGameMode && (
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#a3e635]">Active Game Mode</span>
                <span className="font-mono text-xs font-bold text-white capitalize">{gameMode}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onSetGameMode('creative')}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center transition active:scale-95 ${
                    gameMode === 'creative'
                      ? 'border-[#a3e635] bg-[#a3e635]/20 text-[#a3e635] shadow-[0_0_12px_rgba(163,230,53,0.3)]'
                      : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-[#a3e635]/50 hover:text-white'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-black">Creative</span>
                  <span className="text-[9px] text-white/40 leading-tight">Infinite & Flight</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSetGameMode('survival')}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center transition active:scale-95 ${
                    gameMode === 'survival'
                      ? 'border-emerald-400 bg-emerald-950/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                      : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-emerald-400/50 hover:text-white'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span className="text-xs font-black">Survival</span>
                  <span className="text-[9px] text-white/40 leading-tight">Hearts & Mobs</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSetGameMode('architect')}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center transition active:scale-95 ${
                    gameMode === 'architect'
                      ? 'border-purple-400 bg-purple-950/60 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                      : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-purple-400/50 hover:text-white'
                  }`}
                >
                  <Zap className="h-4 w-4" />
                  <span className="text-xs font-black">Architect</span>
                  <span className="text-[9px] text-white/40 leading-tight">Master Tools</span>
                </button>
              </div>
            </div>
          )}

          {/* Flight Control */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#a3e635]">Levitation & Flight (F)</div>
              <p className="text-[11px] text-white/50">Ascend with Space, descend with Shift</p>
            </div>
            <button
              onClick={onToggleFlight}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-black uppercase tracking-wider transition active:scale-95 ${
                isFlying
                  ? 'border-[#a3e635] bg-[#a3e635] text-black shadow-[0_0_12px_rgba(163,230,53,0.5)]'
                  : 'border-white/15 bg-white/5 text-white/70 hover:border-[#a3e635]/50'
              }`}
            >
              <Move className="h-3.5 w-3.5" />
              <span>{isFlying ? 'Flying ON' : 'Fly OFF'}</span>
            </button>
          </div>
          {/* Time of Day Control */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#a3e635]">Solar / Celestial Cycle</span>
              <span className="font-mono text-xs font-bold text-[#a3e635]">
                {Math.floor(timeOfDay * 24)}:00
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={timeOfDay}
              onChange={(e) => onSetTimeOfDay(parseFloat(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-[#a3e635]"
            />
            <div className="mt-2 flex justify-between font-mono text-[10px] text-white/40">
              <span>🌅 Dawn (0.0)</span>
              <span>☀️ Zenith (0.25)</span>
              <span>🌇 Dusk (0.5)</span>
              <span>🌙 Nadir (0.75)</span>
            </div>
          </div>

          {/* Audio Controls */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#a3e635]">Acoustic Architecture</span>
              <button
                onClick={onToggleMute}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white hover:border-[#a3e635] hover:text-[#a3e635]"
              >
                {isMuted ? <VolumeX className="h-3.5 w-3.5 text-red-400" /> : <Volume2 className="h-3.5 w-3.5 text-[#a3e635]" />}
                <span>{isMuted ? 'Muted' : 'Online'}</span>
              </button>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] text-white/60">
                <span>Master Gain</span>
                <span className="font-mono text-[#a3e635] font-bold">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                disabled={isMuted}
                onChange={(e) => onSetVolume(parseFloat(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-[#a3e635] disabled:opacity-30"
              />
            </div>
          </div>

          {/* Mouse Sensitivity */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.25em] text-[#a3e635]">
              <span>Camera Tracking Sensitivity</span>
              <span className="font-mono text-xs font-bold text-[#a3e635]">{Math.round(mouseSensitivity * 1000)}</span>
            </div>
            <input
              type="range"
              min={0.001}
              max={0.006}
              step={0.0005}
              value={mouseSensitivity}
              onChange={(e) => onSetMouseSensitivity(parseFloat(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-[#a3e635]"
            />
          </div>

          {/* Keybindings Reference */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <div className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-[#a3e635]">
              <Keyboard className="h-4 w-4" />
              <span>Telemetry Keymap</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-white/60">
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>Toggle Flight Mode:</span>
                <span className="font-mono font-bold text-[#a3e635]">F</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>Move Vector:</span>
                <span className="font-mono font-bold text-white">W / A / S / D</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>Ascend / Jump:</span>
                <span className="font-mono font-bold text-white">Space</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>Descend / Crouch:</span>
                <span className="font-mono font-bold text-white">Shift</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>Excavate / Strike:</span>
                <span className="font-mono font-bold text-white">L-Click</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>Deploy Voxel:</span>
                <span className="font-mono font-bold text-white">R-Click</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>Pop / Spawn Creeper:</span>
                <span className="font-mono font-bold text-emerald-400">C</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>3x3 Blast Mine:</span>
                <span className="font-mono font-bold text-orange-400">X</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>Auto-Pilot Walk:</span>
                <span className="font-mono font-bold text-[#a3e635]">P</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>Storage Matrix:</span>
                <span className="font-mono font-bold text-[#a3e635]">E</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>Codex Index:</span>
                <span className="font-mono font-bold text-[#a3e635]">R</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>Hotbar Channel:</span>
                <span className="font-mono font-bold text-white">1 - 9 / Wheel</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>Camera Optics:</span>
                <span className="font-mono font-bold text-white">F5</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>Blueprint Grid:</span>
                <span className="font-mono font-bold text-[#a3e635]">B</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
