import React, { useState } from 'react';
import { BookOpen, Sparkles, Wrench, X } from 'lucide-react';
import { CraftingRecipe, InventoryState, ItemType } from '../types';
import { CRAFTING_RECIPES } from '../utils/recipes';
import { getItemEmoji } from './GameHUD';

interface RecipeBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickCraft?: (recipe: CraftingRecipe) => void;
  inventory: InventoryState;
}

export const RecipeBookModal: React.FC<RecipeBookModalProps> = ({
  isOpen,
  onClose,
  onQuickCraft,
  inventory,
}) => {
  const [category, setCategory] = useState<'all' | 'tools' | 'blocks' | 'materials'>('all');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredRecipes = CRAFTING_RECIPES.filter((r) => {
    const matchesCategory = category === 'all' || r.category === category;
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md select-none">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-white/15 bg-[#0c0c0d] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-[#a3e635]" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#a3e635]">Synthesis Codex</div>
              <h2 className="text-base font-black italic tracking-tight text-white">SCHEMATIC COMPENDIUM</h2>
            </div>
          </div>
          <button
            id="close-recipe-book-btn"
            onClick={onClose}
            className="rounded-xl border border-white/10 p-1.5 text-white/40 hover:border-[#a3e635] hover:text-[#a3e635]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-6 py-3">
          <div className="flex items-center gap-2">
            {(['all', 'tools', 'blocks', 'materials'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                  category === cat
                    ? 'bg-[#a3e635] text-black shadow-md'
                    : 'border border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search schematic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/40 px-3.5 py-1.5 text-xs font-mono text-white placeholder-white/30 focus:border-[#a3e635] focus:outline-none"
          />
        </div>

        {/* Recipe Grid List */}
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 overflow-y-auto max-h-[65vh]">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-md transition hover:border-[#a3e635]/60 hover:bg-white/[0.04]"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{getItemEmoji(recipe.result.type)}</span>
                  <div>
                    <h3 className="text-xs font-bold text-white">{recipe.name}</h3>
                    <span className="font-mono text-[10px] text-[#a3e635]">
                      Grid: {recipe.gridSize}x{recipe.gridSize} • Yields: x{recipe.result.count}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recipe Layout Preview */}
              <div className="my-2.5 flex items-center justify-center gap-3">
                <div
                  className={`grid gap-1 rounded-xl border border-white/10 bg-black/40 p-2 ${
                    recipe.gridSize === 2 ? 'grid-cols-2' : 'grid-cols-3'
                  }`}
                >
                  {recipe.pattern.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/5 bg-black/60 text-xs"
                    >
                      {item ? getItemEmoji(item) : ''}
                    </div>
                  ))}
                </div>

                <span className="font-mono text-[#a3e635] font-bold">➔</span>

                <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl border border-[#a3e635]/40 bg-[#a3e635]/15 text-base shadow-sm">
                  <span>{getItemEmoji(recipe.result.type)}</span>
                  <span className="font-mono text-[10px] font-bold text-[#a3e635]">x{recipe.result.count}</span>
                </div>
              </div>

              {onQuickCraft && (
                <button
                  onClick={() => onQuickCraft(recipe)}
                  className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:border-[#a3e635] hover:bg-[#a3e635] hover:text-black active:scale-95"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  <span>Synthesize</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
