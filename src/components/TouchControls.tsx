import React from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronUp,
  Footprints,
  Hammer,
  Package,
  Plane,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';

interface TouchControlsProps {
  onDirectionPress: (key: string, isDown: boolean) => void;
  onJumpPress: (isDown: boolean) => void;
  onCrouchPress: (isDown: boolean) => void;
  onMinePress: (isDown: boolean) => void;
  onPlacePress: () => void;
  onOpenInventory: () => void;
  onToggleAutoWalk: () => void;
  isAutoWalking: boolean;
  onToggleFly?: () => void;
  isFlying?: boolean;
  onToggleSprint?: () => void;
  isSprinting?: boolean;
  alwaysShow?: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onDirectionPress,
  onJumpPress,
  onCrouchPress,
  onMinePress,
  onPlacePress,
  onOpenInventory,
  onToggleAutoWalk,
  isAutoWalking,
  onToggleFly,
  isFlying = false,
  onToggleSprint,
  isSprinting = false,
  alwaysShow = false,
}) => {
  const bindDirection = (key: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      onDirectionPress(key, true);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      onDirectionPress(key, false);
    },
    onPointerLeave: () => {
      onDirectionPress(key, false);
    },
    onPointerCancel: () => {
      onDirectionPress(key, false);
    },
  });

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-20 flex flex-col justify-end p-4 select-none ${
        alwaysShow ? '' : 'md:hidden'
      }`}
    >
      <div className="flex w-full items-end justify-between gap-4 pb-2">
        {/* Left: Virtual D-Pad + Walk / Sprint Modifiers */}
        <div className="pointer-events-auto flex flex-col items-center gap-1.5">
          {/* Top Row: Forward */}
          <div className="flex items-center gap-1.5">
            <button
              {...bindDirection('KeyW')}
              id="ctrl-btn-up"
              title="Move Forward (W / ArrowUp)"
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-[#0c0c0d]/90 text-white shadow-xl backdrop-blur-md transition hover:border-[#a3e635] active:scale-95 active:bg-[#a3e635] active:text-black"
            >
              <ArrowUp className="h-6 w-6" />
            </button>
          </div>

          {/* Middle Row: Left, Auto-Walk / Back, Right */}
          <div className="flex items-center gap-1.5">
            <button
              {...bindDirection('KeyA')}
              id="ctrl-btn-left"
              title="Move Left (A / ArrowLeft)"
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-[#0c0c0d]/90 text-white shadow-xl backdrop-blur-md transition hover:border-[#a3e635] active:scale-95 active:bg-[#a3e635] active:text-black"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <button
              {...bindDirection('KeyS')}
              id="ctrl-btn-down"
              title="Move Backward (S / ArrowDown)"
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-[#0c0c0d]/90 text-white shadow-xl backdrop-blur-md transition hover:border-[#a3e635] active:scale-95 active:bg-[#a3e635] active:text-black"
            >
              <ArrowDown className="h-6 w-6" />
            </button>
            <button
              {...bindDirection('KeyD')}
              id="ctrl-btn-right"
              title="Move Right (D / ArrowRight)"
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-[#0c0c0d]/90 text-white shadow-xl backdrop-blur-md transition hover:border-[#a3e635] active:scale-95 active:bg-[#a3e635] active:text-black"
            >
              <ArrowRight className="h-6 w-6" />
            </button>
          </div>

          {/* Bottom Utility Row: Sprint & Auto-Walk */}
          <div className="flex items-center gap-1.5 pt-1">
            {onToggleSprint && (
              <button
                id="ctrl-btn-sprint"
                onClick={onToggleSprint}
                className={`flex h-9 items-center gap-1 rounded-xl border px-3 text-[10px] font-black uppercase tracking-wider shadow-lg backdrop-blur-md transition active:scale-95 ${
                  isSprinting
                    ? 'border-[#a3e635] bg-[#a3e635] text-black'
                    : 'border-white/20 bg-[#0c0c0d]/90 text-white/80'
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Sprint</span>
              </button>
            )}
            <button
              id="ctrl-btn-autowalk"
              onClick={onToggleAutoWalk}
              className={`flex h-9 items-center gap-1 rounded-xl border px-3 text-[10px] font-black uppercase tracking-wider shadow-lg backdrop-blur-md transition active:scale-95 ${
                isAutoWalking
                  ? 'border-[#a3e635] bg-[#a3e635] text-black ring-2 ring-[#a3e635]/50 animate-pulse'
                  : 'border-white/20 bg-[#0c0c0d]/90 text-white/80'
              }`}
            >
              <Footprints className="h-3.5 w-3.5" />
              <span>Auto</span>
            </button>
          </div>
        </div>

        {/* Right: Action Buttons (Jump, Fly, Mine, Place, Inv) */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {onToggleFly && (
              <button
                id="ctrl-btn-fly"
                onClick={onToggleFly}
                title="Toggle Flight"
                className={`flex h-11 w-11 items-center justify-center rounded-2xl border shadow-xl backdrop-blur-md transition active:scale-95 ${
                  isFlying
                    ? 'border-sky-400 bg-sky-400 text-black'
                    : 'border-white/20 bg-[#0c0c0d]/90 text-sky-400 hover:border-sky-400'
                }`}
              >
                <Plane className="h-5 w-5" />
              </button>
            )}
            <button
              id="ctrl-btn-inv"
              onClick={onOpenInventory}
              title="Open Inventory (E)"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-[#0c0c0d]/90 text-[#a3e635] shadow-xl backdrop-blur-md transition active:scale-95 hover:border-[#a3e635]"
            >
              <Package className="h-5 w-5" />
            </button>
            <button
              id="ctrl-btn-place"
              onClick={onPlacePress}
              title="Place Block (Right Click)"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-[#0c0c0d]/90 text-white shadow-xl backdrop-blur-md transition active:scale-95 hover:border-[#a3e635]"
            >
              <Hammer className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="ctrl-btn-mine"
              onPointerDown={(e) => {
                e.preventDefault();
                onMinePress(true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                onMinePress(false);
              }}
              onPointerLeave={() => onMinePress(false)}
              className="flex h-13 w-16 items-center justify-center rounded-2xl border border-rose-500/40 bg-[#0c0c0d]/90 text-xs font-black uppercase tracking-tight text-rose-400 shadow-xl backdrop-blur-md transition active:scale-95 active:bg-rose-500 active:text-white"
            >
              Mine
            </button>
            <button
              id="ctrl-btn-jump"
              onPointerDown={(e) => {
                e.preventDefault();
                onJumpPress(true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                onJumpPress(false);
              }}
              onPointerLeave={() => onJumpPress(false)}
              className="flex h-13 w-16 items-center justify-center rounded-2xl border border-[#a3e635]/40 bg-[#0c0c0d]/90 text-xs font-black uppercase tracking-tight text-[#a3e635] shadow-xl backdrop-blur-md transition active:scale-95 active:bg-[#a3e635] active:text-black"
            >
              Jump
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
