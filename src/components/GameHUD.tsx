import React, { useEffect, useState } from 'react';
import {
  Bomb,
  Building2,
  Car,
  ChefHat,
  ChevronDown,
  ChevronUp,
  Compass,
  Droplets,
  Eye,
  EyeOff,
  Flame,
  Footprints,
  Gamepad2,
  Heart,
  HelpCircle,
  Layers,
  Lock,
  Maximize2,
  Menu,
  Minimize2,
  Moon,
  Move,
  Package,
  Pickaxe,
  PlusCircle,
  RotateCcw,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trees,
  Tv,
  Unlock,
  UtensilsCrossed,
  Volume2,
  VolumeX,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { CameraPerspective } from '../engine/PlayerController';
import { BlockType, InventoryState, ItemType, LevelConfig, PlayerStats } from '../types';
import { soundManager } from '../utils/audio';

interface GameHUDProps {
  stats: PlayerStats;
  inventory: InventoryState;
  onSelectSlot: (slot: number) => void;
  currentLevel: LevelConfig;
  perspective: CameraPerspective;
  onTogglePerspective: () => void;
  onOpenInventory: () => void;
  onOpenRecipes: () => void;
  onOpenLevelSelect: () => void;
  onOpenSettings: () => void;
  onOpenBlueprintHUD?: () => void;
  timeOfDay: number;
  isPointerLocked: boolean;
  onRequestPointerLock: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  blueprintProgress?: {
    accuracyPercent: number;
    correctBlocks: number;
    totalBlocks: number;
  };
  onTeleportToSpawn?: () => void;
  onToggleAutoWalk?: () => void;
  isAutoWalking?: boolean;
  onToggleOnScreenControls?: () => void;
  showOnScreenControls?: boolean;
  onToggleFlight?: () => void;
  onSetGameMode?: (mode: 'survival' | 'creative' | 'architect') => void;
  onCompleteCurrentObjective?: () => void;
  onGenerateCity?: () => void;
  onStampSkyscraper?: () => void;
  onStampTownhouse?: () => void;
  onStampCar?: () => void;
  onStampFountain?: () => void;
  onGenerateRestaurant?: () => void;
  onStampRestaurant?: () => void;
  onOrderGourmetMeal?: () => void;
  onToggleCoasterRide?: () => void;
  onGenerateCoasterPark?: () => void;
  onStampCoasterLoop?: () => void;
  onStampFerrisWheel?: () => void;
  onStampDropTower?: () => void;
  onTriggerCoasterHorn?: () => void;
  onToggleCoasterPerspective?: () => void;
  onCycleHealthTier?: () => void;
  onToggleGodMode?: () => void;
  onToggleForcefield?: () => void;
  onToggleInstaMine?: () => void;
  onToggleMegaJump?: () => void;
  onToggleSuperSpeed?: () => void;
  onHealFull?: () => void;
  onBlastMine?: () => void;
  onTriggerSupermine?: () => void;
  onTriggerLightning?: () => void;
  onSupersonicDash?: () => void;
  onSpawnCreeper?: () => void;
  onSpawnSkeleton?: () => void;
  onSpawnEnderman?: () => void;
  onSpawnPig?: () => void;
  onSpawnZombie?: () => void;
  onSpawnPeopleCrowd?: () => void;
  onLayStraightRails?: () => void;
  onLayPoweredRollerway?: () => void;
  onSpawnMinecart?: () => void;
  onClearMinecarts?: () => void;
  onDismountMinecart?: () => void;
  onAccelerateMinecart?: () => void;
  onBrakeMinecart?: () => void;
  onReverseMinecart?: () => void;
  onTurboMinecart?: () => void;
  onToggleMinecartCruise?: () => void;
  onTriggerTrainHorn?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  inventory,
  onSelectSlot,
  currentLevel,
  perspective,
  onTogglePerspective,
  onOpenInventory,
  onOpenRecipes,
  onOpenLevelSelect,
  onOpenSettings,
  onOpenBlueprintHUD,
  timeOfDay,
  isPointerLocked,
  onRequestPointerLock,
  isMuted,
  onToggleMute,
  blueprintProgress,
  onTeleportToSpawn,
  onToggleAutoWalk,
  isAutoWalking = false,
  onToggleOnScreenControls,
  showOnScreenControls = false,
  onToggleFlight,
  onSetGameMode,
  onCompleteCurrentObjective,
  onGenerateCity,
  onStampSkyscraper,
  onStampTownhouse,
  onStampCar,
  onLayStraightRails,
  onLayPoweredRollerway,
  onSpawnMinecart,
  onClearMinecarts,
  onDismountMinecart,
  onAccelerateMinecart,
  onBrakeMinecart,
  onReverseMinecart,
  onTurboMinecart,
  onToggleMinecartCruise,
  onTriggerTrainHorn,
  onStampFountain,
  onGenerateRestaurant,
  onStampRestaurant,
  onOrderGourmetMeal,
  onToggleCoasterRide,
  onGenerateCoasterPark,
  onStampCoasterLoop,
  onStampFerrisWheel,
  onStampDropTower,
  onTriggerCoasterHorn,
  onToggleCoasterPerspective,
  onCycleHealthTier,
  onToggleGodMode,
  onToggleForcefield,
  onToggleInstaMine,
  onToggleMegaJump,
  onToggleSuperSpeed,
  onHealFull,
  onBlastMine,
  onTriggerSupermine,
  onTriggerLightning,
  onSupersonicDash,
  onSpawnCreeper,
  onSpawnSkeleton,
  onSpawnEnderman,
  onSpawnPig,
  onSpawnZombie,
  onSpawnPeopleCrowd,
}) => {
  const [activeItemName, setActiveItemName] = useState<string>('');
  const [showItemBanner, setShowItemBanner] = useState(false);
  const [isHurt, setIsHurt] = useState(false);
  const [prevHealth, setPrevHealth] = useState(stats.health);

  // Space Management State (Collapsible into buttons)
  const [showPowerToolsModal, setShowPowerToolsModal] = useState(false);
  const [powerToolsTab, setPowerToolsTab] = useState<'powers' | 'mobs' | 'bistro' | 'city' | 'coaster' | 'rails'>('powers');
  const [showObjectives, setShowObjectives] = useState(false); // Collapsed by default to keep space unobstructed
  const [zenMode, setZenMode] = useState(false); // Fullscreen clean mode
  const [dismissControlsBanner, setDismissControlsBanner] = useState(false);

  const selectedItem = inventory.hotbar[inventory.selectedSlot];

  useEffect(() => {
    if (stats.health < prevHealth) {
      setIsHurt(true);
      const timer = setTimeout(() => setIsHurt(false), 300);
      setPrevHealth(stats.health);
      return () => clearTimeout(timer);
    }
    setPrevHealth(stats.health);
  }, [stats.health, prevHealth]);

  useEffect(() => {
    if (selectedItem) {
      const name = selectedItem.type.replace(/_/g, ' ').toUpperCase();
      setActiveItemName(name);
      setShowItemBanner(true);
      const timer = setTimeout(() => setShowItemBanner(false), 2000);
      return () => clearTimeout(timer);
    } else {
      setShowItemBanner(false);
    }
  }, [inventory.selectedSlot, selectedItem]);

  // Format Time of Day
  const getTimeLabel = () => {
    if (timeOfDay < 0.15 || timeOfDay > 0.85) return { label: 'Dawn', isDay: true };
    if (timeOfDay >= 0.15 && timeOfDay <= 0.45) return { label: 'Day', isDay: true };
    if (timeOfDay > 0.45 && timeOfDay < 0.6) return { label: 'Sunset', isDay: false };
    return { label: 'Night', isDay: false };
  };
  const timeInfo = getTimeLabel();

  const completedObjectivesCount = currentLevel.objectives.filter((o) => o.completed).length;
  const totalObjectivesCount = currentLevel.objectives.length;

  // Zen Mode View
  if (zenMode) {
    return (
      <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 select-none">
        {/* Minimal Corner Restore Button */}
        <div className="pointer-events-auto flex items-center justify-end">
          <button
            id="restore-hud-zen-btn"
            onClick={() => setZenMode(false)}
            title="Restore HUD (Show All Bars & Tools)"
            className="flex items-center gap-2 rounded-full border border-white/20 bg-black/80 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xl backdrop-blur-md transition hover:border-[#a3e635] hover:text-[#a3e635] active:scale-95"
          >
            <Eye className="h-3.5 w-3.5 text-[#a3e635]" />
            <span>Show HUD</span>
          </button>
        </div>

        {/* Minimalist Center Crosshair */}
        <div className="relative flex flex-1 items-center justify-center pointer-events-none">
          <div className="relative h-4 w-4">
            <div className="absolute top-1.5 left-0 h-[2px] w-4 bg-[#a3e635] shadow-[0_0_4px_rgba(163,230,53,0.8)]" />
            <div className="absolute top-0 left-1.5 h-4 w-[2px] bg-[#a3e635] shadow-[0_0_4px_rgba(163,230,53,0.8)]" />
          </div>
        </div>

        {/* Minimalist Hotbar in Zen Mode */}
        <div className="pointer-events-auto flex justify-center">
          <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-black/60 p-1.5 backdrop-blur-md">
            {inventory.hotbar.map((item, index) => {
              const isSelected = inventory.selectedSlot === index;
              return (
                <button
                  key={index}
                  onClick={() => onSelectSlot(index)}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                    isSelected ? 'border-2 border-[#a3e635] bg-[#a3e635]/20 scale-105' : 'bg-white/5 opacity-60 hover:opacity-100'
                  }`}
                >
                  {item ? <span className="text-base">{getItemEmoji(item.type)}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-4 select-none">
      {/* Red Hurt Flash Vignette */}
      {isHurt && !stats.godMode && (
        <div className="pointer-events-none fixed inset-0 bg-red-600/25 transition-opacity duration-150" />
      )}

      {/* God Mode Aura Vignette */}
      {stats.godMode && (
        <div className="pointer-events-none fixed inset-0 ring-4 ring-inset ring-amber-400/30 shadow-[inset_0_0_80px_rgba(251,191,36,0.15)]" />
      )}

      {/* Top Header Bar - Clean Single Line */}
      <div className="pointer-events-auto flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Level Status & Badge */}
          <div className="flex items-center gap-2">
            <button
              id="hud-level-select-btn"
              onClick={onOpenLevelSelect}
              title="Select Level (100 Levels)"
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-[#0c0c0d]/90 px-3 py-1.5 text-xs font-bold text-white shadow-xl backdrop-blur-md transition hover:border-[#a3e635] hover:text-[#a3e635] active:scale-95"
            >
              <Compass className="h-3.5 w-3.5 text-[#a3e635]" />
              <span className="font-mono tracking-tight text-xs max-w-[140px] sm:max-w-[200px] truncate">{currentLevel.title}</span>
            </button>

            {/* Interactive Mode Switcher Pill */}
            {onSetGameMode ? (
              <button
                id="hud-game-mode-toggle-btn"
                onClick={() => {
                  const nextMode =
                    currentLevel.mode === 'creative'
                      ? 'survival'
                      : currentLevel.mode === 'survival'
                      ? 'architect'
                      : 'creative';
                  onSetGameMode(nextMode);
                }}
                title="Click to Switch Mode (Creative ✨ / Survival ⚔️ / Architect 👑)"
                className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider shadow-xl backdrop-blur-md transition active:scale-95 ${
                  currentLevel.mode === 'creative'
                    ? 'bg-lime-950/90 text-[#a3e635] border border-[#a3e635]/60 hover:bg-[#a3e635] hover:text-black shadow-[0_0_12px_rgba(163,230,53,0.3)]'
                    : currentLevel.mode === 'survival'
                    ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-800'
                    : 'bg-purple-950/90 text-purple-300 border border-purple-500/50 hover:bg-purple-800'
                }`}
              >
                <span>
                  {currentLevel.mode === 'creative'
                    ? '✨ Creative'
                    : currentLevel.mode === 'survival'
                    ? '⚔️ Survival'
                    : '👑 Architect'}
                </span>
                <span className="opacity-60 text-[8px] font-mono">▼</span>
              </button>
            ) : (
              <span
                className={`rounded px-2 py-1 text-[9px] font-black uppercase tracking-widest ${
                  currentLevel.mode === 'survival'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                    : currentLevel.mode === 'creative'
                    ? 'bg-lime-950/80 text-[#a3e635] border border-[#a3e635]/40'
                    : 'bg-purple-950 text-purple-300 border border-purple-500/40'
                }`}
              >
                {currentLevel.mode}
              </span>
            )}

            {/* Time of day indicator */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#0c0c0d]/90 px-2.5 py-1.5 text-xs font-mono font-medium text-white/80 shadow-xl backdrop-blur-md">
              {timeInfo.isDay ? (
                <Sun className="h-3 w-3 text-[#a3e635] animate-spin" style={{ animationDuration: '25s' }} />
              ) : (
                <Moon className="h-3 w-3 text-sky-300" />
              )}
              <span className="text-[10px] uppercase tracking-wider">{timeInfo.label}</span>
            </div>
          </div>

          {/* Right: Quick Action Controls & Main Power Matrix Button */}
          <div className="flex items-center gap-1.5">
            {/* ⭐ KEY BUTTON: Collapsible Powers & Spawners Menu Button */}
            <button
              id="hud-power-matrix-menu-btn"
              onClick={() => setShowPowerToolsModal((prev) => !prev)}
              title="Open Superpowers, Mob Spawners, Bistro, City & Coaster Tools"
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black uppercase tracking-wide shadow-xl backdrop-blur-md transition active:scale-95 ${
                showPowerToolsModal
                  ? 'border-[#a3e635] bg-[#a3e635] text-black ring-2 ring-[#a3e635]/50 shadow-[0_0_15px_rgba(163,230,53,0.5)]'
                  : stats.godMode || stats.isFlying || stats.instaMine
                  ? 'border-yellow-400 bg-yellow-950/80 text-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.4)]'
                  : 'border-[#a3e635]/60 bg-[#a3e635]/15 text-[#a3e635] hover:bg-[#a3e635] hover:text-black'
              }`}
            >
              <Zap className={`h-3.5 w-3.5 ${showPowerToolsModal ? 'text-black' : 'text-[#a3e635]'}`} />
              <span className="text-[11px] font-extrabold">⚡ Powers & Tools</span>
              <span className="text-[9px] opacity-75">{showPowerToolsModal ? '▲' : '▼'}</span>
            </button>

            {/* Objectives / Mandates Collapsible Pill Button */}
            <button
              id="hud-toggle-objectives-btn"
              onClick={() => setShowObjectives((prev) => !prev)}
              title={showObjectives ? 'Hide Quests / Objectives' : 'Show Quests / Objectives'}
              className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold shadow-xl backdrop-blur-md transition active:scale-95 ${
                showObjectives
                  ? 'border-white/30 bg-white/10 text-white'
                  : 'border-white/15 bg-[#0c0c0d]/90 text-white/80 hover:border-[#a3e635] hover:text-[#a3e635]'
              }`}
            >
              <Sparkles className="h-3 w-3 text-[#a3e635]" />
              <span className="text-[10px] uppercase tracking-wider font-mono">
                Mandates ({completedObjectivesCount}/{totalObjectivesCount})
              </span>
              {showObjectives ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {currentLevel.blueprint && (
              <button
                id="hud-blueprint-toggle-btn"
                onClick={onOpenBlueprintHUD}
                className="flex items-center gap-1.5 rounded-xl border border-purple-400/50 bg-purple-950/80 px-2.5 py-1.5 text-xs font-bold text-purple-300 shadow-xl backdrop-blur-md transition hover:bg-purple-900 active:scale-95"
              >
                <Layers className="h-3 w-3" />
                <span className="uppercase tracking-wider text-[10px]">Blueprint</span>
              </button>
            )}

            <button
              id="hud-recipes-btn"
              onClick={onOpenRecipes}
              title="Crafting Recipe Book (R)"
              className="flex items-center gap-1 rounded-xl border border-white/15 bg-[#0c0c0d]/90 px-2.5 py-1.5 text-xs font-semibold text-white/80 shadow-xl backdrop-blur-md transition hover:border-[#a3e635] hover:text-[#a3e635] active:scale-95"
            >
              <Wrench className="h-3 w-3 text-[#a3e635]" />
              <span className="hidden sm:inline uppercase text-[10px] tracking-wider">Recipes</span>
              <kbd className="hidden rounded border border-white/10 bg-white/5 px-1 font-mono text-[9px] text-white/40 md:inline">R</kbd>
            </button>

            <button
              id="hud-inventory-btn"
              onClick={onOpenInventory}
              title="Inventory & Crafting (E)"
              className="flex items-center gap-1 rounded-xl border border-white/15 bg-[#0c0c0d]/90 px-2.5 py-1.5 text-xs font-semibold text-white/80 shadow-xl backdrop-blur-md transition hover:border-[#a3e635] hover:text-[#a3e635] active:scale-95"
            >
              <Package className="h-3 w-3 text-[#a3e635]" />
              <span className="hidden sm:inline uppercase text-[10px] tracking-wider">Bag</span>
              <kbd className="hidden rounded border border-white/10 bg-white/5 px-1 font-mono text-[9px] text-white/40 md:inline">E</kbd>
            </button>

            {onToggleAutoWalk && (
              <button
                id="hud-autowalk-btn"
                onClick={onToggleAutoWalk}
                title="Toggle Auto-Walk (P)"
                className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-semibold shadow-xl backdrop-blur-md transition active:scale-95 ${
                  isAutoWalking
                    ? 'border-[#a3e635] bg-[#a3e635] text-black ring-1 ring-[#a3e635]'
                    : 'border-white/15 bg-[#0c0c0d]/90 text-white/80 hover:border-[#a3e635] hover:text-[#a3e635]'
                }`}
              >
                <Footprints className={`h-3 w-3 ${isAutoWalking ? 'text-black' : 'text-[#a3e635]'}`} />
                <span className="hidden md:inline uppercase text-[10px] tracking-wider">Auto</span>
              </button>
            )}

            {onTeleportToSpawn && (
              <button
                id="hud-unstuck-btn"
                onClick={onTeleportToSpawn}
                title="Unstuck / Teleport to Surface"
                className="flex items-center gap-1 rounded-xl border border-white/15 bg-[#0c0c0d]/90 px-2.5 py-1.5 text-xs font-semibold text-white/80 shadow-xl backdrop-blur-md transition hover:border-[#a3e635] hover:text-[#a3e635] active:scale-95"
              >
                <RotateCcw className="h-3 w-3 text-[#a3e635]" />
                <span className="hidden md:inline uppercase text-[10px] tracking-wider">Unstuck</span>
              </button>
            )}

            {onToggleOnScreenControls && (
              <button
                id="hud-touchpad-toggle-btn"
                onClick={onToggleOnScreenControls}
                title="Toggle On-Screen Movement Pad"
                className={`flex items-center gap-1 rounded-xl border px-2 py-1.5 text-xs font-semibold shadow-xl backdrop-blur-md transition active:scale-95 ${
                  showOnScreenControls
                    ? 'border-[#a3e635] bg-[#a3e635] text-black'
                    : 'border-white/15 bg-[#0c0c0d]/90 text-white/80 hover:border-[#a3e635] hover:text-[#a3e635]'
                }`}
              >
                <Gamepad2 className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              id="hud-lock-btn"
              onClick={onRequestPointerLock}
              title={isPointerLocked ? 'Mouse Locked to View (Press Esc to unlock)' : 'Click to Lock Mouse FPS Mode'}
              className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-semibold shadow-xl backdrop-blur-md transition active:scale-95 ${
                isPointerLocked
                  ? 'border-emerald-500/40 bg-emerald-950/80 text-emerald-300'
                  : 'border-[#a3e635]/40 bg-[#a3e635]/15 text-[#a3e635] hover:bg-[#a3e635] hover:text-black'
              }`}
            >
              {isPointerLocked ? <Lock className="h-3 w-3 text-emerald-400" /> : <Unlock className="h-3 w-3 text-[#a3e635]" />}
              <span className="hidden sm:inline uppercase text-[10px] tracking-wider font-mono">
                {isPointerLocked ? 'Locked' : 'Mouse'}
              </span>
            </button>

            <button
              id="hud-perspective-btn"
              onClick={onTogglePerspective}
              title="Toggle Camera (F5)"
              className="flex items-center gap-1 rounded-xl border border-white/15 bg-[#0c0c0d]/90 px-2 py-1.5 text-xs font-semibold text-white/80 shadow-xl backdrop-blur-md transition hover:border-[#a3e635] hover:text-[#a3e635] active:scale-95"
            >
              <Eye className="h-3.5 w-3.5 text-white/60" />
            </button>

            {/* Zen / Clean View Mode Button */}
            <button
              id="hud-zen-mode-btn"
              onClick={() => setZenMode(true)}
              title="Zen Mode: Hide HUD for full-screen view"
              className="rounded-xl border border-white/15 bg-[#0c0c0d]/90 p-1.5 text-white/70 shadow-xl backdrop-blur-md transition hover:border-[#a3e635] hover:text-[#a3e635] active:scale-95"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>

            <button
              id="hud-mute-btn"
              onClick={onToggleMute}
              className="rounded-xl border border-white/15 bg-[#0c0c0d]/90 p-1.5 text-white/80 shadow-xl backdrop-blur-md transition hover:border-[#a3e635] hover:text-[#a3e635] active:scale-95"
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5 text-red-400" /> : <Volume2 className="h-3.5 w-3.5 text-[#a3e635]" />}
            </button>

            <button
              id="hud-settings-btn"
              onClick={onOpenSettings}
              className="rounded-xl border border-white/15 bg-[#0c0c0d]/90 p-1.5 text-white/80 shadow-xl backdrop-blur-md transition hover:border-[#a3e635] hover:text-[#a3e635] active:scale-95"
            >
              <Menu className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ⭐ COLLAPSIBLE POWER MATRIX & SPAWNERS DRAWER / MODAL POPOVER            */}
        {/* ========================================================================= */}
        {showPowerToolsModal && (
          <div className="animate-fade-in relative z-30 flex flex-col rounded-2xl border border-white/20 bg-[#0c0c0d]/95 p-3.5 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl max-w-4xl">
            {/* Header & Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#a3e635]" />
                <span className="font-mono text-xs font-black uppercase tracking-wider text-white">
                  Powers, Spawners & Builders
                </span>
              </div>

              {/* Tab Category Switchers */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPowerToolsTab('powers')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase transition ${
                    powerToolsTab === 'powers'
                      ? 'bg-[#a3e635] text-black shadow-sm'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  ⚡ Powers
                </button>
                <button
                  onClick={() => setPowerToolsTab('mobs')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase transition ${
                    powerToolsTab === 'mobs'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  🐉 Mobs & Crowd
                </button>
                <button
                  onClick={() => setPowerToolsTab('bistro')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase transition ${
                    powerToolsTab === 'bistro'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  🍷 Bistro
                </button>
                <button
                  onClick={() => setPowerToolsTab('city')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase transition ${
                    powerToolsTab === 'city'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  🏙️ City
                </button>
                <button
                  onClick={() => setPowerToolsTab('coaster')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase transition ${
                    powerToolsTab === 'coaster'
                      ? 'bg-yellow-500 text-black shadow-sm'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  🎢 Coaster
                </button>
                <button
                  onClick={() => setPowerToolsTab('rails')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase transition ${
                    powerToolsTab === 'rails'
                      ? 'bg-amber-400 text-black shadow-sm'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  🚂 Rails
                </button>

                <button
                  onClick={() => setShowPowerToolsModal(false)}
                  className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white ml-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* TAB CONTENT */}
            <div className="pt-3">
              {/* TAB 1: SUPERPOWERS */}
              {powerToolsTab === 'powers' && (
                <div className="flex flex-wrap items-center gap-2">
                  {onToggleFlight && (
                    <button
                      id="power-btn-fly"
                      onClick={onToggleFlight}
                      title="Toggle Flight Mode (HotKey: F or Double Space)"
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black uppercase tracking-wider transition active:scale-95 ${
                        stats.isFlying
                          ? 'border-[#a3e635] bg-[#a3e635] text-black shadow-[0_0_12px_rgba(163,230,53,0.6)]'
                          : 'border-white/15 bg-white/5 text-[#a3e635] hover:border-[#a3e635]/50'
                      }`}
                    >
                      <Move className="h-3.5 w-3.5" />
                      <span>{stats.isFlying ? 'Flying ON (F)' : 'Fly (F)'}</span>
                    </button>
                  )}

                  {onTriggerSupermine && (
                    <button
                      id="power-btn-supermine"
                      onClick={onTriggerSupermine}
                      title="Supermine 5x5 Tunnel Drill Excavation (HotKey: M / X)"
                      className="flex items-center gap-1.5 rounded-xl border border-amber-500/60 bg-amber-950/80 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)] transition hover:border-amber-400 hover:bg-amber-900/90 active:scale-95"
                    >
                      <Wrench className="h-3.5 w-3.5 text-amber-400" />
                      <span>Supermine 5x5 (M)</span>
                    </button>
                  )}

                  {onTriggerLightning && (
                    <button
                      id="power-btn-lightning"
                      onClick={onTriggerLightning}
                      title="Summon Thunder & Lightning Strike (HotKey: K)"
                      className="flex items-center gap-1.5 rounded-xl border border-yellow-400/60 bg-yellow-950/80 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.4)] transition hover:border-yellow-300 hover:bg-yellow-900/90 active:scale-95"
                    >
                      <Zap className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span>Lightning Strike (K)</span>
                    </button>
                  )}

                  {onSupersonicDash && (
                    <button
                      id="power-btn-dash"
                      onClick={onSupersonicDash}
                      title="Supersonic Dash / Warp Forward (HotKey: Q)"
                      className="flex items-center gap-1.5 rounded-xl border border-sky-400/60 bg-sky-950/80 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.3)] transition hover:border-sky-300 hover:bg-sky-900/90 active:scale-95"
                    >
                      <Zap className="h-3.5 w-3.5 text-sky-400" />
                      <span>Sonic Dash (Q)</span>
                    </button>
                  )}

                  {onBlastMine && (
                    <button
                      id="power-btn-blastmine"
                      onClick={onBlastMine}
                      title="Explosive Blast Mine (3x3 Quarry Explosion)"
                      className="flex items-center gap-1.5 rounded-xl border border-rose-500/60 bg-rose-950/80 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)] transition hover:border-rose-400 hover:bg-rose-900/90 active:scale-95"
                    >
                      <Bomb className="h-3.5 w-3.5 text-rose-400" />
                      <span>Blast Mine 3x3</span>
                    </button>
                  )}

                  {onToggleGodMode && (
                    <button
                      id="power-btn-godmode"
                      onClick={onToggleGodMode}
                      title="Toggle God Mode (Invulnerable to damage)"
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black uppercase tracking-wider transition active:scale-95 ${
                        stats.godMode
                          ? 'border-amber-400 bg-amber-400 text-black shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                          : 'border-white/15 bg-white/5 text-amber-300 hover:border-amber-400/50'
                      }`}
                    >
                      <Shield className="h-3.5 w-3.5" />
                      <span>{stats.godMode ? 'God Shield ON' : 'God Shield'}</span>
                    </button>
                  )}

                  {onToggleInstaMine && (
                    <button
                      id="power-btn-instamine"
                      onClick={onToggleInstaMine}
                      title="Toggle Super Breaker (Instant 1-Hit Block Mining)"
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black uppercase tracking-wider transition active:scale-95 ${
                        stats.instaMine
                          ? 'border-cyan-400 bg-cyan-400 text-black shadow-[0_0_12px_rgba(34,211,238,0.6)]'
                          : 'border-white/15 bg-white/5 text-cyan-300 hover:border-cyan-400/50'
                      }`}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>{stats.instaMine ? 'Insta-Mine ON' : 'Insta-Mine'}</span>
                    </button>
                  )}

                  {onToggleMegaJump && (
                    <button
                      id="power-btn-megajump"
                      onClick={onToggleMegaJump}
                      title="Toggle 4x High Jump Power"
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black uppercase tracking-wider transition active:scale-95 ${
                        stats.megaJump
                          ? 'border-emerald-400 bg-emerald-400 text-black shadow-[0_0_12px_rgba(52,211,153,0.6)]'
                          : 'border-white/15 bg-white/5 text-emerald-300 hover:border-emerald-400/50'
                      }`}
                    >
                      <Move className="h-3.5 w-3.5" />
                      <span>{stats.megaJump ? 'Mega Jump ON' : 'Mega Jump'}</span>
                    </button>
                  )}

                  {onToggleSuperSpeed && (
                    <button
                      id="power-btn-superspeed"
                      onClick={onToggleSuperSpeed}
                      title="Toggle 3x Sprint Velocity"
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black uppercase tracking-wider transition active:scale-95 ${
                        stats.superSpeed
                          ? 'border-fuchsia-400 bg-fuchsia-400 text-black shadow-[0_0_12px_rgba(217,70,239,0.6)]'
                          : 'border-white/15 bg-white/5 text-fuchsia-300 hover:border-fuchsia-400/50'
                      }`}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>{stats.superSpeed ? 'Super Speed ON' : 'Super Speed'}</span>
                    </button>
                  )}

                  {onHealFull && (
                    <button
                      id="power-btn-healmax"
                      onClick={onHealFull}
                      title="Full Health & Hunger Recovery"
                      className="flex items-center gap-1.5 rounded-xl border border-rose-500/50 bg-rose-950/80 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-rose-300 hover:bg-rose-900 active:scale-95 transition"
                    >
                      <Heart className="h-3.5 w-3.5 fill-rose-400 text-rose-400" />
                      <span>Heal Max</span>
                    </button>
                  )}
                </div>
              )}

              {/* TAB 2: MOBS & POPULATION */}
              {powerToolsTab === 'mobs' && (
                <div className="flex flex-wrap items-center gap-2">
                  {onSpawnPeopleCrowd && (
                    <button
                      id="power-btn-people-crowd"
                      onClick={onSpawnPeopleCrowd}
                      title="Spawn 200 People / Villager Population Crowd across the world!"
                      className="flex items-center gap-1.5 rounded-xl border border-emerald-400/80 bg-emerald-950/90 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.5)] transition hover:border-emerald-300 hover:bg-emerald-900 active:scale-95"
                    >
                      <span>👥 Spawn 200 People Crowd</span>
                    </button>
                  )}

                  {onSpawnCreeper && (
                    <button
                      id="power-btn-creeper"
                      onClick={onSpawnCreeper}
                      title="Spawn Mega-Boom Creeper nearby (HotKey: C)"
                      className="flex items-center gap-1.5 rounded-xl border border-emerald-500/80 bg-emerald-950/90 px-2.5 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)] transition hover:border-emerald-300 hover:bg-emerald-900 active:scale-95"
                    >
                      <span className="inline-block h-2.5 w-2.5 rounded-xs bg-[#4aa044] animate-pulse" />
                      <span>💥 Mega Creeper (C)</span>
                    </button>
                  )}

                  {onSpawnSkeleton && (
                    <button
                      id="power-btn-skeleton"
                      onClick={onSpawnSkeleton}
                      title="Spawn Skeleton Archer nearby"
                      className="flex items-center gap-1.5 rounded-xl border border-slate-400/60 bg-slate-900/80 px-2.5 py-1.5 text-xs font-black uppercase tracking-wider text-slate-200 transition hover:border-slate-300 hover:bg-slate-800 active:scale-95"
                    >
                      <span className="inline-block h-2.5 w-2.5 rounded-xs bg-[#e2e8f0]" />
                      <span>Skeleton</span>
                    </button>
                  )}

                  {onSpawnEnderman && (
                    <button
                      id="power-btn-enderman"
                      onClick={onSpawnEnderman}
                      title="Spawn Mystic Enderman nearby"
                      className="flex items-center gap-1.5 rounded-xl border border-fuchsia-500/60 bg-fuchsia-950/80 px-2.5 py-1.5 text-xs font-black uppercase tracking-wider text-fuchsia-300 shadow-[0_0_8px_rgba(217,70,239,0.3)] transition hover:border-fuchsia-400 hover:bg-fuchsia-900/90 active:scale-95"
                    >
                      <span className="inline-block h-2.5 w-2.5 rounded-xs bg-[#d946ef]" />
                      <span>Enderman</span>
                    </button>
                  )}

                  {onSpawnPig && (
                    <button
                      id="power-btn-pig"
                      onClick={onSpawnPig}
                      title="Spawn Cute Pig nearby"
                      className="flex items-center gap-1.5 rounded-xl border border-pink-400/60 bg-pink-950/80 px-2.5 py-1.5 text-xs font-black uppercase tracking-wider text-pink-300 transition hover:border-pink-300 hover:bg-pink-900/90 active:scale-95"
                    >
                      <span className="inline-block h-2.5 w-2.5 rounded-xs bg-[#f472b6]" />
                      <span>Pig</span>
                    </button>
                  )}

                  {onSpawnZombie && (
                    <button
                      id="power-btn-zombie"
                      onClick={onSpawnZombie}
                      title="Spawn Zombie nearby"
                      className="flex items-center gap-1.5 rounded-xl border border-teal-600/60 bg-teal-950/80 px-2.5 py-1.5 text-xs font-black uppercase tracking-wider text-teal-300 transition hover:border-teal-400 hover:bg-teal-900/90 active:scale-95"
                    >
                      <span className="inline-block h-2.5 w-2.5 rounded-xs bg-[#0d9488]" />
                      <span>Zombie</span>
                    </button>
                  )}
                </div>
              )}

              {/* TAB 3: GOURMET BISTRO */}
              {powerToolsTab === 'bistro' && (
                <div className="flex flex-wrap items-center gap-2">
                  {onGenerateRestaurant && (
                    <button
                      id="power-btn-gen-restaurant"
                      onClick={onGenerateRestaurant}
                      title="Transform world into a luxury 5-Star Restaurant & Bistro Plaza!"
                      className="flex items-center gap-1.5 rounded-xl border border-rose-400/80 bg-rose-950/90 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.5)] transition hover:border-rose-300 hover:bg-rose-900 active:scale-95"
                    >
                      <UtensilsCrossed className="h-3.5 w-3.5 text-rose-400" />
                      <span>🍷 Gen Bistro Plaza Estate</span>
                    </button>
                  )}

                  {onStampRestaurant && (
                    <button
                      id="power-btn-stamp-restaurant"
                      onClick={onStampRestaurant}
                      title="Stamp 2-Story Furnished Luxury Restaurant with booths, kitchen, red carpet, and rooftop VIP lounge"
                      className="flex items-center gap-1.5 rounded-xl border border-amber-400/60 bg-amber-950/80 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-amber-300 transition hover:border-amber-300 hover:bg-amber-900 active:scale-95"
                    >
                      <span>🍽️ Stamp 2-Story Bistro</span>
                    </button>
                  )}

                  {onOrderGourmetMeal && (
                    <button
                      id="power-btn-order-meal"
                      onClick={onOrderGourmetMeal}
                      title="Order Chef Pierre's 5-Course Golden Feast! Fully restores health & hunger."
                      className="flex items-center gap-1.5 rounded-xl border border-yellow-400/70 bg-yellow-950/80 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.4)] transition hover:border-yellow-300 hover:bg-yellow-900 active:scale-95"
                    >
                      <ChefHat className="h-3.5 w-3.5 text-yellow-400" />
                      <span>👨‍🍳 Order 5-Course Feast</span>
                    </button>
                  )}
                </div>
              )}

              {/* TAB 4: CITY & METROPOLIS */}
              {powerToolsTab === 'city' && (
                <div className="flex flex-wrap items-center gap-2">
                  {onGenerateCity && (
                    <button
                      id="power-btn-gencity"
                      onClick={onGenerateCity}
                      title="Transform world into complete Voxel Megacity & Metropolis!"
                      className="flex items-center gap-1.5 rounded-xl border border-amber-400/80 bg-amber-950/90 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.4)] transition hover:border-amber-300 hover:bg-amber-900/90 active:scale-95"
                    >
                      <Building2 className="h-3.5 w-3.5 text-amber-400" />
                      <span>🏙️ Gen Full Megacity</span>
                    </button>
                  )}

                  {onStampSkyscraper && (
                    <button
                      id="power-btn-stamp-skyscraper"
                      onClick={onStampSkyscraper}
                      title="Stamp 18-Story Glass Skyscraper"
                      className="flex items-center gap-1.5 rounded-xl border border-cyan-400/60 bg-cyan-950/80 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-cyan-300 transition hover:border-cyan-300 hover:bg-cyan-900 active:scale-95"
                    >
                      <span>🏢 18-Story Skyscraper</span>
                    </button>
                  )}

                  {onStampTownhouse && (
                    <button
                      id="power-btn-stamp-townhouse"
                      onClick={onStampTownhouse}
                      title="Stamp Residential Townhouse"
                      className="flex items-center gap-1.5 rounded-xl border border-orange-400/60 bg-orange-950/80 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-orange-300 transition hover:border-orange-300 hover:bg-orange-900 active:scale-95"
                    >
                      <span>🏠 Townhouse</span>
                    </button>
                  )}

                  {onStampCar && (
                    <button
                      id="power-btn-stamp-car"
                      onClick={onStampCar}
                      title="Stamp Sports Car"
                      className="flex items-center gap-1.5 rounded-xl border border-red-500/60 bg-red-950/80 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-red-300 transition hover:border-red-400 hover:bg-red-900 active:scale-95"
                    >
                      <Car className="h-3.5 w-3.5" />
                      <span>🚗 Voxel Sports Car</span>
                    </button>
                  )}

                  {onStampFountain && (
                    <button
                      id="power-btn-stamp-fountain"
                      onClick={onStampFountain}
                      title="Stamp Grand Park Fountain"
                      className="flex items-center gap-1.5 rounded-xl border border-sky-400/60 bg-sky-950/80 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-sky-300 transition hover:border-sky-300 hover:bg-sky-900 active:scale-95"
                    >
                      <Droplets className="h-3.5 w-3.5" />
                      <span>⛲ Grand Fountain</span>
                    </button>
                  )}
                </div>
              )}

              {/* TAB 5: MEGA-COASTER */}
              {powerToolsTab === 'coaster' && (
                <div className="flex flex-wrap items-center gap-2">
                  {onToggleCoasterRide && (
                    <button
                      id="power-btn-coaster-ride"
                      onClick={onToggleCoasterRide}
                      title={stats.isRidingCoaster ? 'Dismount Cart' : 'Board Thunderbird Mega-Coaster'}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black uppercase tracking-wider transition active:scale-95 ${
                        stats.isRidingCoaster
                          ? 'border-rose-400 bg-rose-950 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse'
                          : 'border-yellow-400/80 bg-yellow-950/90 text-yellow-300 shadow-[0_0_12px_rgba(234,179,8,0.4)] hover:bg-yellow-900'
                      }`}
                    >
                      <span>{stats.isRidingCoaster ? '🛑 Exit Cart' : '🎢 Ride Thunderbird Coaster'}</span>
                    </button>
                  )}

                  {onGenerateCoasterPark && (
                    <button
                      id="power-btn-coaster-park"
                      onClick={onGenerateCoasterPark}
                      title="Generate complete Theme Park with Mega-Coaster, Ferris Wheel & Drop Tower!"
                      className="flex items-center gap-1.5 rounded-xl border border-purple-400/80 bg-purple-950/90 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.4)] transition hover:border-purple-300 hover:bg-purple-900 active:scale-95"
                    >
                      <span>🎡 Gen Theme Park</span>
                    </button>
                  )}

                  {onStampCoasterLoop && (
                    <button
                      id="power-btn-stamp-loop"
                      onClick={onStampCoasterLoop}
                      title="Stamp 360° Loop Structure"
                      className="flex items-center gap-1.5 rounded-xl border border-amber-400/60 bg-amber-950/80 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-amber-300 transition hover:border-amber-300 hover:bg-amber-900 active:scale-95"
                    >
                      <span>🌀 Stamp 360° Loop</span>
                    </button>
                  )}

                  {onStampFerrisWheel && (
                    <button
                      id="power-btn-stamp-ferris"
                      onClick={onStampFerrisWheel}
                      title="Stamp Giant Ferris Wheel"
                      className="flex items-center gap-1.5 rounded-xl border border-pink-400/60 bg-pink-950/80 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-pink-300 transition hover:border-pink-300 hover:bg-pink-900 active:scale-95"
                    >
                      <span>🎡 Ferris Wheel</span>
                    </button>
                  )}

                  {onStampDropTower && (
                    <button
                      id="power-btn-stamp-droptower"
                      onClick={onStampDropTower}
                      title="Stamp Free-Fall Drop Tower"
                      className="flex items-center gap-1.5 rounded-xl border border-teal-400/60 bg-teal-950/80 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-teal-300 transition hover:border-teal-300 hover:bg-teal-900 active:scale-95"
                    >
                      <span>🗼 Drop Tower</span>
                    </button>
                  )}
                </div>
              )}

              {/* TAB 6: MINECRAFT RAILS & BULLET TRAIN */}
              {powerToolsTab === 'rails' && (
                <div className="flex flex-wrap items-center gap-2">
                  {onSpawnMinecart && (
                    <button
                      id="power-btn-spawn-minecart"
                      onClick={onSpawnMinecart}
                      title="Spawn Shinkansen High-Speed Bullet Train"
                      className="flex items-center gap-1.5 rounded-xl border border-sky-400/80 bg-sky-950/80 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.35)] transition hover:border-sky-300 hover:bg-sky-900 active:scale-95"
                    >
                      <span>🚅 Spawn Bullet Train</span>
                    </button>
                  )}

                  {onLayPoweredRollerway && (
                    <button
                      id="power-btn-lay-powered-rollerway"
                      onClick={onLayPoweredRollerway}
                      title="Lay 32-Block 320km/h Shinkansen Booster Speedway"
                      className="flex items-center gap-1.5 rounded-xl border border-yellow-400/80 bg-yellow-950/90 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-yellow-300 shadow-[0_0_12px_rgba(234,179,8,0.4)] transition hover:border-yellow-300 hover:bg-yellow-900 active:scale-95"
                    >
                      <span>⚡ 32m Bullet Speedway</span>
                    </button>
                  )}

                  {onLayStraightRails && (
                    <button
                      id="power-btn-lay-straight-rails"
                      onClick={onLayStraightRails}
                      title="Lay 16-Block High-Speed Track Straight Ahead"
                      className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white/90 transition hover:border-white/40 hover:bg-white/10 active:scale-95"
                    >
                      <span>🛤️ 16m Straight Rails</span>
                    </button>
                  )}

                  {onClearMinecarts && (
                    <button
                      id="power-btn-clear-minecarts"
                      onClick={onClearMinecarts}
                      title="Clear all active trains"
                      className="flex items-center gap-1.5 rounded-xl border border-rose-500/50 bg-rose-950/60 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-rose-300 transition hover:border-rose-400 hover:bg-rose-900 active:scale-95"
                    >
                      <span>🧹 Clear Trains</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Middle Center: Crosshair, Item Name Banner & Subtle Controls Indicator */}
      <div className="relative flex flex-1 items-center justify-center pointer-events-none">
        {/* Sleek Minimalist Center Crosshair */}
        <div className="relative h-4 w-4">
          <div className="absolute top-1.5 left-0 h-[2px] w-4 bg-[#a3e635] shadow-[0_0_4px_rgba(163,230,53,0.8)]" />
          <div className="absolute top-0 left-1.5 h-4 w-[2px] bg-[#a3e635] shadow-[0_0_4px_rgba(163,230,53,0.8)]" />
        </div>

        {/* Selected Item Floating Banner */}
        {showItemBanner && activeItemName && (
          <div className="absolute bottom-20 rounded-lg border border-[#a3e635]/60 bg-[#0c0c0d]/95 px-4 py-1.5 font-mono text-xs font-bold tracking-[0.2em] text-[#a3e635] shadow-2xl backdrop-blur-md">
            {activeItemName}
          </div>
        )}

        {/* Non-blocking Dismissable Controls Reminder when Pointer is not locked */}
        {!isPointerLocked && !dismissControlsBanner && (
          <div className="pointer-events-auto absolute top-2 flex items-center gap-2.5 rounded-full border border-white/15 bg-[#0c0c0d]/90 py-1 pl-3.5 pr-2 text-xs text-white/90 shadow-xl backdrop-blur-md">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[#a3e635] animate-ping" />
            <span className="font-mono text-[10px] text-white/70">
              <strong className="text-white font-bold">WASD</strong> move • <strong className="text-[#a3e635]">Drag</strong> look
            </span>
            <button
              onClick={onRequestPointerLock}
              className="rounded-full bg-[#a3e635] px-2 py-0.5 font-mono text-[9px] font-black uppercase text-black transition hover:bg-white active:scale-95"
            >
              Lock Mouse
            </button>
            <button
              onClick={() => setDismissControlsBanner(true)}
              className="rounded-full p-0.5 text-white/40 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Top-Right Collapsible Level Objectives Card */}
      {showObjectives && (
        <div className="pointer-events-auto absolute top-16 right-3 sm:right-4 max-w-xs rounded-2xl border border-white/15 bg-[#0c0c0d]/95 p-3.5 text-xs text-white shadow-2xl backdrop-blur-md animate-fade-in">
          <div className="mb-2.5 flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[#a3e635]" />
              <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#a3e635]">
                Mandates
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onCompleteCurrentObjective && (
                <button
                  id="hud-skip-objective-btn"
                  onClick={onCompleteCurrentObjective}
                  title="Auto-Complete / Skip Objectives (Easy Level Pass)"
                  className="rounded-lg border border-[#a3e635]/40 bg-[#a3e635]/15 px-2 py-0.5 font-mono text-[9px] font-black uppercase text-[#a3e635] hover:bg-[#a3e635] hover:text-black active:scale-95 transition"
                >
                  ⚡ Skip
                </button>
              )}
              <button
                onClick={() => setShowObjectives(false)}
                className="rounded-md p-1 text-white/40 hover:text-white"
                title="Minimize Mandates"
              >
                <Minimize2 className="h-3 w-3" />
              </button>
            </div>
          </div>

          <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
            {currentLevel.objectives.map((obj) => (
              <li key={obj.id} className="flex items-start gap-2">
                <span
                  className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm text-[9px] font-black ${
                    obj.completed
                      ? 'bg-[#a3e635] text-black'
                      : 'border border-white/20 bg-white/5 text-white/40'
                  }`}
                >
                  {obj.completed ? '✓' : ''}
                </span>
                <div className="flex-1">
                  <span className={`text-[11px] leading-snug ${obj.completed ? 'line-through text-white/40' : 'text-white/90 font-medium'}`}>
                    {obj.text}
                  </span>
                  {!obj.completed && obj.targetCount > 1 && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-[2px] flex-1 overflow-hidden bg-white/10">
                        <div
                          className="h-full bg-[#a3e635] transition-all duration-300"
                          style={{
                            width: `${Math.min(100, (obj.currentCount / obj.targetCount) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="font-mono text-[9px] text-white/50">
                        {obj.currentCount}/{obj.targetCount}
                      </span>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Authentic Shinkansen Bullet Train Telemetry & Cockpit HUD Overlay */}
      {stats.isRidingMinecart && (
        <div className="pointer-events-auto mb-2 flex flex-col items-center gap-2 rounded-2xl border border-sky-400/80 bg-[#0c0c0d]/95 px-4 py-3 text-white shadow-[0_0_35px_rgba(56,189,248,0.4)] backdrop-blur-xl animate-fade-in max-w-lg mx-auto w-full">
          {/* Top Bar: Title, Track Mode, Speedometer */}
          <div className="flex w-full items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-sky-400 animate-ping" />
              <span className="font-mono text-xs font-black uppercase tracking-[0.2em] text-sky-300">
                🚅 SHINKANSEN BULLET TRAIN
              </span>
              <span className="rounded-full bg-sky-400/20 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-200">
                {stats.minecartTrackType || 'High-Speed Rail'}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 font-mono text-base font-black text-[#38bdf8]">
              <span>{((stats.minecartSpeed || 0) * 3.6).toFixed(1)}</span>
              <span className="text-[10px] text-white/70 font-bold">km/h</span>
              <span className="text-[11px] text-white/50 font-normal">
                ({(((stats.minecartSpeed || 0) * 3.6) * 0.621371).toFixed(0)} mph)
              </span>
            </div>
          </div>

          {/* Speed Progress Bar (Scaled for 450 km/h Maglev Bullet Train) */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-sky-400 via-yellow-400 to-rose-500 transition-all duration-100 shadow-[0_0_10px_rgba(56,189,248,0.7)]"
              style={{ width: `${Math.min(100, (((stats.minecartSpeed || 0) * 3.6) / 450) * 100)}%` }}
            />
          </div>

          {/* Interactive Bullet Train Driving Controls */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
            {/* Accelerate / Go Button */}
            <button
              id="minecart-btn-accel"
              onClick={onAccelerateMinecart}
              title="Drive Forward (Hold W / Tap to Accelerate)"
              className="flex items-center gap-1 rounded-xl border border-emerald-400/60 bg-emerald-500/20 px-3 py-1 font-bold text-emerald-300 shadow-md transition hover:bg-emerald-500/30 active:scale-95"
            >
              <span>▲ Go [W]</span>
            </button>

            {/* Cruise / Auto-Drive Toggle */}
            <button
              id="minecart-btn-cruise"
              onClick={onToggleMinecartCruise}
              title="Toggle Hands-Free Auto-Cruising at 260 km/h along the track"
              className={`flex items-center gap-1 rounded-xl border px-3 py-1 font-bold transition shadow-md active:scale-95 ${
                stats.minecartIsAutoCruise
                  ? 'border-cyan-400 bg-cyan-500/40 text-cyan-200 ring-2 ring-cyan-400/50'
                  : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
              }`}
            >
              <span>{stats.minecartIsAutoCruise ? '⚡ Cruise: ON' : '⏩ 260km/h Cruise'}</span>
            </button>

            {/* Turbo Boost Button */}
            <button
              id="minecart-btn-turbo"
              onClick={onTurboMinecart}
              title="Supercharged 450 km/h Hyper Maglev Bullet Speed!"
              className="flex items-center gap-1 rounded-xl border border-yellow-400/80 bg-yellow-500/25 px-3 py-1 font-bold text-yellow-300 shadow-[0_0_12px_rgba(234,179,8,0.35)] transition hover:bg-yellow-500/40 active:scale-95"
            >
              <span>🚀 450km/h Turbo</span>
            </button>

            {/* Shinkansen Train Horn */}
            {onTriggerTrainHorn && (
              <button
                id="bullet-btn-horn"
                onClick={onTriggerTrainHorn}
                title="Sound the Shinkansen Bullet Train Horn (H)"
                className="flex items-center gap-1 rounded-xl border border-sky-400/60 bg-sky-500/20 px-2.5 py-1 font-bold text-sky-300 shadow-md transition hover:bg-sky-500/30 active:scale-95"
              >
                <span>📢 Horn [H]</span>
              </button>
            )}

            {/* Reverse Button */}
            <button
              id="minecart-btn-reverse"
              onClick={onReverseMinecart}
              title="Reverse direction along track"
              className="flex items-center gap-1 rounded-xl border border-white/20 bg-white/5 px-2.5 py-1 font-bold text-white/80 transition hover:bg-white/10 active:scale-95"
            >
              <span>▼ Rev</span>
            </button>

            {/* Brake Button */}
            <button
              id="minecart-btn-brake"
              onClick={onBrakeMinecart}
              title="Apply Track Brakes [S]"
              className="flex items-center gap-1 rounded-xl border border-orange-400/50 bg-orange-500/20 px-2.5 py-1 font-bold text-orange-300 transition hover:bg-orange-500/30 active:scale-95"
            >
              <span>🛑 Brake [S]</span>
            </button>

            {/* Dismount Button */}
            <button
              id="minecart-btn-dismount"
              onClick={onDismountMinecart}
              title="Exit Train Safely (Space)"
              className="flex items-center gap-1 rounded-xl border border-rose-500/60 bg-rose-600/80 px-3 py-1 font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-rose-600 active:scale-95"
            >
              <span>🚪 Dismount [Space]</span>
            </button>
          </div>
        </div>
      )}

      {/* Rollercoaster Cockpit Telemetry HUD Overlay */}
      {stats.isRidingCoaster && (
        <div className="pointer-events-auto mb-2 flex flex-col items-center gap-2 rounded-2xl border border-yellow-400/50 bg-[#0c0c0d]/95 p-3 text-white shadow-[0_0_25px_rgba(234,179,8,0.3)] backdrop-blur-xl animate-fade-in max-w-lg mx-auto">
          {/* Header Track Section */}
          <div className="flex w-full items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-mono text-xs font-black uppercase tracking-[0.2em] text-yellow-400">
                THUNDERBIRD MEGA-COASTER
              </span>
            </div>
            <span className="rounded-full bg-yellow-400/20 px-2 py-0.5 font-mono text-[10px] font-bold text-yellow-300">
              {stats.coasterSection || 'Active Circuit'}
            </span>
          </div>

          {/* Metrics Grid: Speed, G-Force, Altitude */}
          <div className="grid w-full grid-cols-3 gap-2.5 py-1 text-center">
            {/* Speed Gauge */}
            <div className="flex flex-col items-center rounded-xl bg-white/5 p-1.5">
              <span className="text-[9px] uppercase font-bold tracking-wider text-white/50">Speed</span>
              <span className="font-mono text-base font-black text-[#a3e635]">
                {stats.coasterSpeed || 0} <span className="text-[10px] font-normal text-white/60">km/h</span>
              </span>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-[#a3e635] via-amber-400 to-rose-500 transition-all duration-100"
                  style={{ width: `${Math.min(100, ((stats.coasterSpeed || 0) / 115) * 100)}%` }}
                />
              </div>
            </div>

            {/* G-Force Readout */}
            <div className="flex flex-col items-center rounded-xl bg-white/5 p-1.5">
              <span className="text-[9px] uppercase font-bold tracking-wider text-white/50">G-Force</span>
              <span className={`font-mono text-base font-black ${
                (stats.coasterGForce || 1) >= 2.5
                  ? 'text-rose-400 animate-pulse'
                  : (stats.coasterGForce || 1) <= 0.4
                  ? 'text-cyan-300'
                  : 'text-amber-300'
              }`}>
                {stats.coasterGForce || 1.0} <span className="text-[10px] font-normal text-white/60">G</span>
              </span>
            </div>

            {/* Altitude Elevation */}
            <div className="flex flex-col items-center rounded-xl bg-white/5 p-1.5">
              <span className="text-[9px] uppercase font-bold tracking-wider text-white/50">Altitude</span>
              <span className="font-mono text-base font-black text-sky-400">
                {stats.coasterAltitude || 0} <span className="text-[10px] font-normal text-white/60">m</span>
              </span>
            </div>
          </div>

          {/* Cockpit Interactive Action Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {onTriggerCoasterHorn && (
              <button
                onClick={onTriggerCoasterHorn}
                title="Sound Coaster Air Horn (H)"
                className="flex items-center gap-1 rounded-lg border border-amber-400/50 bg-amber-950/80 px-2.5 py-1 font-mono text-[10px] font-bold text-amber-300 hover:bg-amber-900 active:scale-95 transition"
              >
                <span>🎺 Horn (H)</span>
              </button>
            )}

            {onToggleCoasterPerspective && (
              <button
                onClick={onToggleCoasterPerspective}
                title="Cycle Camera: 1st Person Cockpit, 3rd Person Chase, Cinematic Flyby (V)"
                className="flex items-center gap-1 rounded-lg border border-cyan-400/50 bg-cyan-950/80 px-2.5 py-1 font-mono text-[10px] font-bold text-cyan-300 hover:bg-cyan-900 active:scale-95 transition"
              >
                <span>🎥 Camera (V)</span>
              </button>
            )}

            {onToggleCoasterRide && (
              <button
                onClick={onToggleCoasterRide}
                title="Dismount / Exit Minecart (Space)"
                className="flex items-center gap-1 rounded-lg border border-rose-500/80 bg-rose-950 px-3 py-1 font-mono text-[10px] font-black uppercase text-rose-300 hover:bg-rose-900 active:scale-95 transition shadow-[0_0_10px_rgba(244,63,94,0.4)]"
              >
                <span>🛑 Exit Cart (Space)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom Area: Health, Hunger, XP & Hotbar */}
      <div className="pointer-events-auto flex flex-col items-center gap-1.5">
        {/* Survival Status Bars (Dynamic Multi-Tier Hearts & Drumsticks) */}
        {currentLevel.mode === 'survival' && (
          <div className="flex flex-col items-center gap-1 rounded-xl border border-white/15 bg-[#0c0c0d]/90 px-3.5 py-1.5 shadow-2xl backdrop-blur-md">
            {/* Header with HP Numbers and Boost Quick-Action */}
            <div className="flex w-full items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-rose-400 flex items-center gap-1">
                  <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                  {stats.health} / {stats.maxHealth} HP
                </span>
                {stats.godMode && (
                  <span className="rounded bg-amber-400 px-1.5 py-0.2 font-mono text-[8px] font-black uppercase text-black">
                    INVULNERABLE
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {onCycleHealthTier && (
                  <button
                    onClick={onCycleHealthTier}
                    className="flex items-center gap-1 text-[9px] font-bold text-[#a3e635] hover:underline"
                  >
                    <PlusCircle className="h-2.5 w-2.5" />
                    <span>More Hearts</span>
                  </button>
                )}
                {onHealFull && stats.health < stats.maxHealth && (
                  <button
                    onClick={onHealFull}
                    className="rounded bg-emerald-500/30 px-1.5 py-0.5 text-[8px] font-bold text-emerald-300 hover:bg-emerald-500/50"
                  >
                    Heal Max
                  </button>
                )}
              </div>
            </div>

            {/* Dynamic Multi-Row Hearts Grid */}
            <div className="flex flex-col gap-0.5">
              {Array.from({ length: Math.ceil(Math.ceil(stats.maxHealth / 2) / 10) }).map((_, rowIndex) => {
                const totalHeartsCount = Math.ceil(stats.maxHealth / 2);
                const startIdx = rowIndex * 10;
                const endIdx = Math.min(totalHeartsCount, (rowIndex + 1) * 10);
                const heartsInThisRow = endIdx - startIdx;

                return (
                  <div key={rowIndex} className="flex items-center gap-1">
                    {Array.from({ length: heartsInThisRow }).map((_, colIndex) => {
                      const heartIndex = startIdx + colIndex;
                      const hp = stats.health;
                      const isFull = hp >= (heartIndex + 1) * 2;
                      const isHalf = hp === heartIndex * 2 + 1;
                      
                      const tierColor =
                        rowIndex === 0
                          ? 'fill-rose-500 text-rose-500'
                          : rowIndex === 1
                          ? 'fill-amber-400 text-amber-400'
                          : rowIndex === 2
                          ? 'fill-emerald-400 text-emerald-400'
                          : 'fill-cyan-400 text-cyan-400';

                      return (
                        <div key={colIndex} className="relative h-3.5 w-3.5">
                          <Heart
                            className={`h-3.5 w-3.5 transition-all duration-150 ${
                              isFull
                                ? `${tierColor} drop-shadow-[0_0_4px_rgba(244,63,94,0.6)]`
                                : isHalf
                                ? `${tierColor} opacity-50`
                                : 'fill-neutral-900 text-white/20'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Hunger Drumsticks */}
            <div className="flex w-full items-center justify-between pt-0.5 border-t border-white/10">
              <span className="text-[9px] font-mono text-white/50 uppercase">Vitality</span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 10 }).map((_, i) => {
                  const hg = stats.hunger;
                  const isFull = hg >= (i + 1) * 2;
                  return (
                    <div
                      key={i}
                      className={`h-2 w-2 rounded-full border ${
                        isFull ? 'border-[#a3e635]/80 bg-[#a3e635]' : 'border-white/10 bg-white/5'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* XP Level Bar */}
        <div className="relative h-[2px] w-full max-w-sm overflow-hidden bg-white/10">
          <div
            className="h-full bg-[#a3e635] transition-all duration-300 shadow-[0_0_8px_rgba(163,230,53,0.8)]"
            style={{ width: `${(stats.xp % 10) * 10}%` }}
          />
        </div>

        {/* 9-Slot Hotbar */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-white/15 bg-[#0c0c0d]/95 p-1.5 shadow-2xl backdrop-blur-xl">
          {inventory.hotbar.map((item, index) => {
            const isSelected = inventory.selectedSlot === index;
            return (
              <button
                key={index}
                id={`hotbar-slot-${index}`}
                onClick={() => {
                  onSelectSlot(index);
                  soundManager.playStep();
                }}
                className={`relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl border text-xs font-bold transition ${
                  isSelected
                    ? 'border-2 border-[#a3e635] bg-[#a3e635]/15 shadow-[0_0_15px_rgba(163,230,53,0.4)] scale-105'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.06]'
                }`}
              >
                {/* Hotbar Slot Number */}
                <span className="absolute top-0.5 left-1 font-mono text-[8px] text-white/40">
                  {index + 1}
                </span>

                {/* Item Icon / Label */}
                {item ? (
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-base sm:text-lg">{getItemEmoji(item.type)}</span>
                    {item.count > 1 && (
                      <span className="absolute right-1 bottom-0.5 font-mono text-[9px] font-black text-[#a3e635] drop-shadow-[0_1px_2px_black]">
                        {item.count}
                      </span>
                    )}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export function getItemEmoji(type: ItemType): string {
  switch (type) {
    case 'grass': return '🌱';
    case 'dirt': return '🟫';
    case 'stone': return '🪨';
    case 'cobblestone': return '🧱';
    case 'mossy_cobblestone': return '🌿';
    case 'wood': return '🪵';
    case 'spruce_wood': return '🌲';
    case 'birch_wood': return '🪵';
    case 'planks': return '🪵';
    case 'leaves': return '🍃';
    case 'spruce_leaves': return '🌲';
    case 'glass': return '🪟';
    case 'sand': return '🏖️';
    case 'sandstone': return '🏛️';
    case 'gravel': return '🪨';
    case 'bedrock': return '⬛';
    case 'cactus': return '🌵';
    case 'snow': return '❄️';
    case 'ice': return '🧊';
    case 'chest': return '🧰';
    case 'farmland': return '🌾';
    case 'coal_ore': case 'coal': return '⚫';
    case 'iron_ore': case 'iron_ingot': return '⚙️';
    case 'gold_ore': case 'gold_ingot': return '🪙';
    case 'diamond_ore': case 'diamond': return '💎';
    case 'obsidian': return '🌌';
    case 'bricks': return '🧱';
    case 'bookshelf': return '📚';
    case 'crafting_table': return '🛠️';
    case 'furnace': return '🔥';
    case 'torch': return '🔦';
    case 'glowstone': return '💡';
    case 'tnt': return '🧨';
    case 'water': return '💧';
    case 'iron_block': return '🔩';
    case 'gold_block': return '👑';
    case 'diamond_block': return '🔷';
    case 'red_wool': return '🟥';
    case 'blue_wool': return '🟦';
    case 'yellow_wool': return '🟨';
    case 'stick': return '🥢';
    case 'wooden_pickaxe': case 'stone_pickaxe': case 'iron_pickaxe': case 'diamond_pickaxe': return '⛏️';
    case 'wooden_axe': case 'stone_axe': case 'iron_axe': return '🪓';
    case 'wooden_sword': case 'stone_sword': case 'iron_sword': case 'diamond_sword': return '🗡️';
    case 'bow': return '🏹';
    case 'arrow': return '🏹';
    case 'apple': case 'cooked_apple': return '🍎';
    case 'golden_apple': return '🍏';
    case 'bread': return '🍞';
    case 'raw_meat': case 'cooked_meat': case 'raw_porkchop': case 'cooked_porkchop': return '🥩';
    case 'gunpowder': return '💨';
    case 'bone': return '🦴';
    case 'rotten_flesh': return '🍖';
    case 'ender_pearl': return '🔮';
    case 'leather': return '🥋';
    case 'wool': return '🧶';
    case 'rail': return '🛤️';
    case 'powered_rail': return '⚡';
    case 'detector_rail': return '🛑';
    case 'activator_rail': return '🎛️';
    case 'minecart': return '🛒';
    default: return '📦';
  }
}
