import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Castle,
  ChevronLeft,
  ChevronRight,
  Compass,
  Flame,
  Globe,
  Layers,
  Lock,
  Pickaxe,
  Play,
  Rocket,
  Search,
  Sparkles,
  Star,
  Tv,
  Unlock,
  UtensilsCrossed,
  X,
  Zap,
} from 'lucide-react';
import { LevelConfig } from '../types';
import { LEVELS } from '../utils/levels';

interface LevelSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevelId: number;
  unlockedLevelIds: number[];
  onSelectLevel: (levelId: number) => void;
  levelStars: Record<number, number>; // levelId -> stars (1..3)
  onUnlockAllLevels?: () => void;
}

const CHAPTERS = [
  { id: 0, title: 'All 100 Levels', range: [1, 100], icon: Globe, color: 'text-[#a3e635]' },
  { id: 1, title: 'Ch 1: Wilderness Pioneers', range: [1, 10], icon: Compass, color: 'text-emerald-400' },
  { id: 2, title: 'Ch 2: Deep Caverns & Mines', range: [11, 20], icon: Pickaxe, color: 'text-amber-400' },
  { id: 3, title: 'Ch 3: Royal Kingdoms', range: [21, 30], icon: Castle, color: 'text-sky-400' },
  { id: 4, title: 'Ch 4: Nether Expeditions', range: [31, 40], icon: Flame, color: 'text-red-400' },
  { id: 5, title: 'Ch 5: Mega-Coaster Tycoon', range: [41, 50], icon: Zap, color: 'text-yellow-400' },
  { id: 6, title: 'Ch 6: Modern Metropolis', range: [51, 60], icon: Tv, color: 'text-cyan-400' },
  { id: 7, title: 'Ch 7: Culinary Empire', range: [61, 70], icon: UtensilsCrossed, color: 'text-rose-400' },
  { id: 8, title: 'Ch 8: Seven Ancient Wonders', range: [71, 80], icon: BookOpen, color: 'text-purple-400' },
  { id: 9, title: 'Ch 9: Redstone & Tech', range: [81, 90], icon: Rocket, color: 'text-orange-400' },
  { id: 10, title: 'Ch 10: Ender Realm Gods', range: [91, 100], icon: Sparkles, color: 'text-fuchsia-400' },
];

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  isOpen,
  onClose,
  currentLevelId,
  unlockedLevelIds,
  onSelectLevel,
  levelStars,
  onUnlockAllLevels,
}) => {
  const [selectedChapter, setSelectedChapter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'survival' | 'creative' | 'blueprint'>('all');

  const filteredLevels = useMemo(() => {
    return LEVELS.filter((level) => {
      // Chapter filter
      if (selectedChapter > 0) {
        const ch = CHAPTERS.find((c) => c.id === selectedChapter);
        if (ch && (level.id < ch.range[0] || level.id > ch.range[1])) {
          return false;
        }
      }

      // Mode filter
      if (filterMode === 'survival' && level.mode !== 'survival') return false;
      if (filterMode === 'creative' && level.mode !== 'creative' && level.mode !== 'architect') return false;
      if (filterMode === 'blueprint' && !level.blueprint) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = level.title.toLowerCase().includes(q);
        const matchSubtitle = level.subtitle.toLowerCase().includes(q);
        const matchDesc = level.description.toLowerCase().includes(q);
        const matchId = `level ${level.id}`.includes(q) || level.id.toString() === q;
        if (!matchTitle && !matchSubtitle && !matchDesc && !matchId) {
          return false;
        }
      }

      return true;
    });
  }, [selectedChapter, filterMode, searchQuery]);

  const totalUnlocked = unlockedLevelIds.length;
  const totalStarsCount = useMemo(() => {
    return Object.values(levelStars).reduce<number>((a, b) => (Number(a) || 0) + (Number(b) || 0), 0);
  }, [levelStars]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-md select-none">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-3xl border border-white/15 bg-[#0c0c0d] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <Compass className="h-6 w-6 text-[#a3e635]" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#a3e635]">Master 100-Level Campaign</span>
                <span className="rounded-full bg-[#a3e635]/20 px-2 py-0.5 text-[9px] font-mono font-bold text-[#a3e635]">
                  100 LEVELS
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black italic tracking-tight text-white">LEVELS & EXPEDITIONS</h2>
            </div>
          </div>

          {/* Quick Stats & Unlock All Button */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-white/80">
              <span className="text-[#a3e635] font-bold">Unlocked: {totalUnlocked}/100</span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1 text-yellow-300 font-bold">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                {totalStarsCount} Stars
              </span>
            </div>

            {onUnlockAllLevels && totalUnlocked < 100 && (
              <button
                id="unlock-all-levels-btn"
                onClick={onUnlockAllLevels}
                title="Sandbox Mode: Unlock all 100 levels immediately"
                className="flex items-center gap-1.5 rounded-xl border border-[#a3e635]/50 bg-[#a3e635]/15 px-3 py-1.5 text-xs font-black uppercase text-[#a3e635] transition hover:bg-[#a3e635] hover:text-black active:scale-95"
              >
                <Unlock className="h-3.5 w-3.5" />
                <span>Unlock All 100</span>
              </button>
            )}

            <button
              id="close-level-select-btn"
              onClick={onClose}
              className="rounded-xl border border-white/10 p-2 text-white/40 transition hover:border-[#a3e635] hover:text-[#a3e635]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar: Chapter Tabs & Search Bar */}
        <div className="border-b border-white/10 bg-white/[0.02] p-4 space-y-3">
          {/* Chapter Tabs Horizontal Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {CHAPTERS.map((ch) => {
              const Icon = ch.icon;
              const isSelected = selectedChapter === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChapter(ch.id)}
                  className={`flex items-center gap-1.5 shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                    isSelected
                      ? 'border border-[#a3e635] bg-[#a3e635] text-black shadow-md'
                      : 'border border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-black' : ch.color}`} />
                  <span>{ch.title}</span>
                </button>
              );
            })}
          </div>

          {/* Search and Mode Quick Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search input */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
              <input
                type="text"
                placeholder="Search 100 levels by name, milestone, or number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/50 py-1.5 pl-9 pr-3 text-xs text-white placeholder:text-white/40 focus:border-[#a3e635] focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Mode Filters */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilterMode('all')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase transition ${
                  filterMode === 'all' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterMode('survival')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase transition ${
                  filterMode === 'survival' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'text-white/50 hover:text-white'
                }`}
              >
                ⚔️ Survival
              </button>
              <button
                onClick={() => setFilterMode('creative')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase transition ${
                  filterMode === 'creative' ? 'bg-lime-950/80 text-[#a3e635] border border-[#a3e635]/40' : 'text-white/50 hover:text-white'
                }`}
              >
                ✨ Creative
              </button>
              <button
                onClick={() => setFilterMode('blueprint')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase transition ${
                  filterMode === 'blueprint' ? 'bg-purple-950 text-purple-300 border border-purple-500/40' : 'text-white/50 hover:text-white'
                }`}
              >
                📐 Blueprints
              </button>
            </div>
          </div>
        </div>

        {/* Level Cards Grid */}
        <div className="grid grid-cols-1 gap-3.5 p-4 sm:p-6 sm:grid-cols-2 lg:grid-cols-3 overflow-y-auto max-h-[62vh] scrollbar-thin">
          {filteredLevels.length === 0 ? (
            <div className="col-span-full py-12 text-center text-white/40">
              <p className="text-sm">No levels matched your filter or search query.</p>
              <button
                onClick={() => {
                  setSelectedChapter(0);
                  setSearchQuery('');
                  setFilterMode('all');
                }}
                className="mt-3 text-xs font-bold text-[#a3e635] underline"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            filteredLevels.map((level) => {
              const isUnlocked = unlockedLevelIds.includes(level.id);
              const isCurrent = level.id === currentLevelId;
              const stars = levelStars[level.id] || (isUnlocked && level.id < currentLevelId ? 3 : 0);

              return (
                <div
                  key={level.id}
                  className={`relative flex flex-col justify-between rounded-2xl border p-4 transition ${
                    isCurrent
                      ? 'border-2 border-[#a3e635] bg-[#a3e635]/10 shadow-[0_0_20px_rgba(163,230,53,0.25)]'
                      : isUnlocked
                      ? 'border-white/10 bg-white/[0.02] hover:border-[#a3e635]/60 hover:bg-white/[0.05]'
                      : 'border-white/5 bg-black/30 opacity-40'
                  }`}
                >
                  {/* Top Badge & Level Number */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                            level.mode === 'survival'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : level.mode === 'creative'
                              ? 'bg-lime-950/80 text-[#a3e635] border border-[#a3e635]/40'
                              : 'bg-purple-950 text-purple-300 border border-purple-500/40'
                          }`}
                        >
                          {level.mode === 'survival' ? '⚔️ Survival' : '✨ Creative'}
                        </span>
                        {level.blueprint && (
                          <span className="rounded-md bg-purple-950/80 border border-purple-500/40 px-1.5 py-0.5 text-[9px] font-mono text-purple-300">
                            📐 3D Ghost
                          </span>
                        )}
                      </div>

                      {/* Star Rating */}
                      {isUnlocked && (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < stars ? 'fill-[#a3e635] text-[#a3e635]' : 'text-white/10'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white line-clamp-1">{level.title}</h3>
                    <span className="font-mono text-[10px] text-[#a3e635] tracking-wide block truncate">{level.subtitle}</span>
                    <p className="mt-2 text-xs text-white/50 leading-relaxed line-clamp-2">{level.description}</p>
                  </div>

                  {/* Bottom Action Button */}
                  <div className="mt-4 pt-3 border-t border-white/10">
                    {isUnlocked ? (
                      <button
                        id={`select-level-${level.id}-btn`}
                        onClick={() => {
                          onSelectLevel(level.id);
                          onClose();
                        }}
                        className={`flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-black uppercase tracking-tight transition active:scale-95 ${
                          isCurrent
                            ? 'bg-[#a3e635] text-black shadow-lg hover:bg-white'
                            : 'border border-white/15 bg-white/[0.04] text-white hover:border-[#a3e635] hover:text-[#a3e635]'
                        }`}
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>{isCurrent ? 'Active Level' : 'Deploy Level'}</span>
                      </button>
                    ) : (
                      <div className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/5 bg-black/40 py-2 text-xs font-mono text-white/30">
                        <Lock className="h-3.5 w-3.5" />
                        <span>Locked (Complete #{level.id - 1})</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
