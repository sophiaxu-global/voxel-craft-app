import React, { useState } from 'react';
import { Flame, Package, Sparkles, Trash2, Wrench, X } from 'lucide-react';
import { BlockType, InventoryState, ItemStack, ItemType } from '../types';
import { soundManager } from '../utils/audio';
import { findMatchingRecipe, SMELTING_RECIPES } from '../utils/recipes';
import { getItemEmoji } from './GameHUD';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryState;
  onUpdateInventory: (inv: InventoryState) => void;
  isCreativeMode: boolean;
  onCraftEvent?: (craftedItem: ItemType, count: number) => void;
  onSmeltEvent?: (smeltedItem: ItemType, count: number) => void;
}

const ALL_CREATIVE_ITEMS: { type: ItemType; category: 'building' | 'natural' | 'tools' | 'functional' }[] = [
  { type: 'grass', category: 'natural' },
  { type: 'dirt', category: 'natural' },
  { type: 'stone', category: 'natural' },
  { type: 'cobblestone', category: 'building' },
  { type: 'mossy_cobblestone', category: 'building' },
  { type: 'wood', category: 'natural' },
  { type: 'spruce_wood', category: 'natural' },
  { type: 'birch_wood', category: 'natural' },
  { type: 'planks', category: 'building' },
  { type: 'leaves', category: 'natural' },
  { type: 'spruce_leaves', category: 'natural' },
  { type: 'glass', category: 'building' },
  { type: 'sand', category: 'natural' },
  { type: 'sandstone', category: 'building' },
  { type: 'gravel', category: 'natural' },
  { type: 'bedrock', category: 'natural' },
  { type: 'cactus', category: 'natural' },
  { type: 'snow', category: 'natural' },
  { type: 'ice', category: 'natural' },
  { type: 'bricks', category: 'building' },
  { type: 'iron_block', category: 'building' },
  { type: 'gold_block', category: 'building' },
  { type: 'diamond_block', category: 'building' },
  { type: 'bookshelf', category: 'functional' },
  { type: 'obsidian', category: 'building' },
  { type: 'chest', category: 'functional' },
  { type: 'farmland', category: 'natural' },
  { type: 'coal_ore', category: 'natural' },
  { type: 'iron_ore', category: 'natural' },
  { type: 'gold_ore', category: 'natural' },
  { type: 'diamond_ore', category: 'natural' },
  { type: 'crafting_table', category: 'functional' },
  { type: 'furnace', category: 'functional' },
  { type: 'torch', category: 'functional' },
  { type: 'glowstone', category: 'functional' },
  { type: 'tnt', category: 'functional' },
  { type: 'red_wool', category: 'building' },
  { type: 'blue_wool', category: 'building' },
  { type: 'yellow_wool', category: 'building' },
  { type: 'wooden_pickaxe', category: 'tools' },
  { type: 'stone_pickaxe', category: 'tools' },
  { type: 'iron_pickaxe', category: 'tools' },
  { type: 'diamond_pickaxe', category: 'tools' },
  { type: 'wooden_axe', category: 'tools' },
  { type: 'stone_axe', category: 'tools' },
  { type: 'iron_axe', category: 'tools' },
  { type: 'wooden_sword', category: 'tools' },
  { type: 'stone_sword', category: 'tools' },
  { type: 'iron_sword', category: 'tools' },
  { type: 'diamond_sword', category: 'tools' },
  { type: 'bow', category: 'tools' },
  { type: 'arrow', category: 'tools' },
  { type: 'stick', category: 'tools' },
  { type: 'iron_ingot', category: 'tools' },
  { type: 'gold_ingot', category: 'tools' },
  { type: 'diamond', category: 'tools' },
  { type: 'coal', category: 'natural' },
  { type: 'apple', category: 'natural' },
  { type: 'golden_apple', category: 'natural' },
  { type: 'bread', category: 'natural' },
  { type: 'raw_meat', category: 'natural' },
  { type: 'cooked_meat', category: 'natural' },
  { type: 'gunpowder', category: 'tools' },
  { type: 'bone', category: 'tools' },
  { type: 'rotten_flesh', category: 'natural' },
  { type: 'ender_pearl', category: 'tools' },
  { type: 'rail', category: 'functional' },
  { type: 'powered_rail', category: 'functional' },
  { type: 'detector_rail', category: 'functional' },
  { type: 'activator_rail', category: 'functional' },
  { type: 'minecart', category: 'tools' },
];

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onUpdateInventory,
  isCreativeMode,
  onCraftEvent,
  onSmeltEvent,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'crafting_table' | 'furnace' | 'creative'>(
    isCreativeMode ? 'creative' : 'inventory'
  );

  // 2x2 Crafting Grid
  const [craft2x2, setCraft2x2] = useState<(ItemType | null)[]>([null, null, null, null]);

  // 3x3 Crafting Grid
  const [craft3x3, setCraft3x3] = useState<(ItemType | null)[]>([
    null, null, null,
    null, null, null,
    null, null, null,
  ]);

  // Furnace State
  const [furnaceInput, setFurnaceInput] = useState<ItemType | null>('iron_ore');
  const [furnaceFuel, setFurnaceFuel] = useState<ItemType | null>('coal');
  const [isSmelting, setIsSmelting] = useState(false);
  const [smeltProgress, setSmeltProgress] = useState(0);

  // Creative Search Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [creativeCategory, setCreativeCategory] = useState<'all' | 'building' | 'natural' | 'tools' | 'functional'>('all');

  if (!isOpen) return null;

  // Evaluate 2x2 Recipe
  const recipe2x2 = findMatchingRecipe(craft2x2, 2);

  // Evaluate 3x3 Recipe
  const recipe3x3 = findMatchingRecipe(craft3x3, 3);

  // Helper to add item to player inventory
  const addItemToInventory = (type: ItemType, count: number) => {
    const newInv = { ...inventory, main: [...inventory.main], hotbar: [...inventory.hotbar] };

    // Try stacking in hotbar first
    for (let i = 0; i < newInv.hotbar.length; i++) {
      if (newInv.hotbar[i] && newInv.hotbar[i]!.type === type) {
        newInv.hotbar[i]!.count += count;
        onUpdateInventory(newInv);
        return;
      }
    }
    // Try empty hotbar slot
    for (let i = 0; i < newInv.hotbar.length; i++) {
      if (!newInv.hotbar[i]) {
        newInv.hotbar[i] = { id: `${type}_${Date.now()}`, type, count };
        onUpdateInventory(newInv);
        return;
      }
    }
    // Try main inventory
    for (let i = 0; i < newInv.main.length; i++) {
      if (!newInv.main[i]) {
        newInv.main[i] = { id: `${type}_${Date.now()}`, type, count };
        onUpdateInventory(newInv);
        return;
      }
    }
  };

  // Handle 2x2 Craft Action
  const handleCraft2x2 = () => {
    if (!recipe2x2) return;
    soundManager.playCraft();
    addItemToInventory(recipe2x2.result.type, recipe2x2.result.count);
    if (onCraftEvent) {
      onCraftEvent(recipe2x2.result.type, recipe2x2.result.count);
    }
    // Decrement grid
    setCraft2x2([null, null, null, null]);
  };

  // Handle 3x3 Craft Action
  const handleCraft3x3 = () => {
    if (!recipe3x3) return;
    soundManager.playCraft();
    addItemToInventory(recipe3x3.result.type, recipe3x3.result.count);
    if (onCraftEvent) {
      onCraftEvent(recipe3x3.result.type, recipe3x3.result.count);
    }
    setCraft3x3(new Array(9).fill(null));
  };

  // Handle Smelting in Furnace
  const handleSmelt = () => {
    if (!furnaceInput || !furnaceFuel) return;
    const recipe = SMELTING_RECIPES[furnaceInput];
    if (!recipe) return;

    setIsSmelting(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setSmeltProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsSmelting(false);
        setSmeltProgress(0);
        soundManager.playCraft();
        addItemToInventory(recipe.result, recipe.count);
        if (onSmeltEvent) {
          onSmeltEvent(recipe.result, recipe.count);
        }
      }
    }, 200);
  };

  // Filtered Creative Items
  const filteredCreativeItems = ALL_CREATIVE_ITEMS.filter((item) => {
    const matchesCategory = creativeCategory === 'all' || item.category === creativeCategory;
    const matchesSearch = item.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md select-none">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-white/15 bg-[#0c0c0d] shadow-2xl overflow-hidden">
        {/* Header Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="tab-inv-btn"
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'inventory'
                  ? 'border-2 border-[#a3e635] bg-[#a3e635]/15 text-[#a3e635] shadow-[0_0_10px_rgba(163,230,53,0.3)]'
                  : 'border border-white/10 text-white/40 hover:text-white hover:border-white/30'
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              <span>Survival & Crafting</span>
            </button>

            <button
              id="tab-crafting-table-btn"
              onClick={() => setActiveTab('crafting_table')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'crafting_table'
                  ? 'border-2 border-[#a3e635] bg-[#a3e635]/15 text-[#a3e635] shadow-[0_0_10px_rgba(163,230,53,0.3)]'
                  : 'border border-white/10 text-white/40 hover:text-white hover:border-white/30'
              }`}
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>3x3 Table</span>
            </button>

            <button
              id="tab-furnace-btn"
              onClick={() => setActiveTab('furnace')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'furnace'
                  ? 'border-2 border-[#a3e635] bg-[#a3e635]/15 text-[#a3e635] shadow-[0_0_10px_rgba(163,230,53,0.3)]'
                  : 'border border-white/10 text-white/40 hover:text-white hover:border-white/30'
              }`}
            >
              <Flame className="h-3.5 w-3.5 text-orange-400" />
              <span>Furnace</span>
            </button>

            {isCreativeMode && (
              <button
                id="tab-creative-palette-btn"
                onClick={() => setActiveTab('creative')}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                  activeTab === 'creative'
                    ? 'border-2 border-[#a3e635] bg-[#a3e635]/15 text-[#a3e635] shadow-[0_0_10px_rgba(163,230,53,0.3)]'
                    : 'border border-white/10 text-white/40 hover:text-white hover:border-white/30'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-[#a3e635]" />
                <span>Creative Palette</span>
              </button>
            )}
          </div>

          <button
            id="close-inventory-btn"
            onClick={onClose}
            className="rounded-xl border border-white/10 p-1.5 text-white/40 transition hover:border-[#a3e635] hover:text-[#a3e635]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: Survival Inventory & 2x2 Crafting */}
          {activeTab === 'inventory' && (
            <div className="space-y-5">
              {/* 2x2 Crafting Section */}
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#a3e635]">
                    2x2 Crafting Matrix
                  </div>
                  <p className="font-mono text-[11px] text-white/50">Combine raw materials to synthesize tools & components</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-white/10 bg-black/50 p-2">
                    {craft2x2.map((item, idx) => (
                      <button
                        key={idx}
                        id={`craft-2x2-slot-${idx}`}
                        onClick={() => {
                          const selected = inventory.hotbar[inventory.selectedSlot];
                          if (selected) {
                            const newG = [...craft2x2];
                            newG[idx] = newG[idx] ? null : selected.type;
                            setCraft2x2(newG);
                          }
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-sm hover:border-[#a3e635]"
                      >
                        {item ? getItemEmoji(item) : ''}
                      </button>
                    ))}
                  </div>

                  <span className="text-[#a3e635] font-bold">➔</span>

                  {/* Craft Result */}
                  <button
                    id="craft-2x2-result-btn"
                    disabled={!recipe2x2}
                    onClick={handleCraft2x2}
                    className={`flex h-12 w-12 flex-col items-center justify-center rounded-xl border text-sm font-bold transition ${
                      recipe2x2
                        ? 'border-2 border-[#a3e635] bg-[#a3e635]/20 text-[#a3e635] shadow-[0_0_15px_rgba(163,230,53,0.4)] hover:scale-105 active:scale-95'
                        : 'border-white/10 bg-white/[0.02] text-white/20 opacity-40'
                    }`}
                  >
                    {recipe2x2 ? (
                      <>
                        <span>{getItemEmoji(recipe2x2.result.type)}</span>
                        <span className="text-[9px] font-mono text-[#a3e635] font-bold">x{recipe2x2.result.count}</span>
                      </>
                    ) : (
                      '?'
                    )}
                  </button>
                </div>
              </div>

              {/* Main 27-slot Inventory */}
              <div>
                <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-[#a3e635]">
                  Storage Matrix (27 Slots)
                </h4>
                <div className="grid grid-cols-9 gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-3">
                  {inventory.main.map((item, idx) => (
                    <button
                      key={idx}
                      id={`main-slot-${idx}`}
                      onClick={() => {
                        const newInv = { ...inventory, main: [...inventory.main], hotbar: [...inventory.hotbar] };
                        const temp = newInv.hotbar[inventory.selectedSlot];
                        newInv.hotbar[inventory.selectedSlot] = newInv.main[idx];
                        newInv.main[idx] = temp;
                        onUpdateInventory(newInv);
                        soundManager.playStep();
                      }}
                      className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-sm hover:border-[#a3e635]"
                    >
                      {item ? (
                        <>
                          <span>{getItemEmoji(item.type)}</span>
                          {item.count > 1 && (
                            <span className="absolute right-0.5 bottom-0.5 font-mono text-[9px] font-black text-[#a3e635]">
                              {item.count}
                            </span>
                          )}
                        </>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hotbar Slots */}
              <div>
                <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-[#a3e635]">
                  Equipped Hotbar (9 Slots)
                </h4>
                <div className="grid grid-cols-9 gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-3">
                  {inventory.hotbar.map((item, idx) => (
                    <div
                      key={idx}
                      className={`relative flex h-10 w-10 items-center justify-center rounded-lg border text-sm ${
                        inventory.selectedSlot === idx
                          ? 'border-2 border-[#a3e635] bg-[#a3e635]/15 shadow-[0_0_10px_rgba(163,230,53,0.3)]'
                          : 'border-white/10 bg-white/[0.03]'
                      }`}
                    >
                      {item ? (
                        <>
                          <span>{getItemEmoji(item.type)}</span>
                          {item.count > 1 && (
                            <span className="absolute right-0.5 bottom-0.5 font-mono text-[9px] font-black text-[#a3e635]">
                              {item.count}
                            </span>
                          )}
                        </>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 3x3 Crafting Table */}
          {activeTab === 'crafting_table' && (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className="text-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#a3e635]">Advanced Assembly</div>
                <h3 className="text-lg font-black italic tracking-tight text-white">3x3 CRAFTING WORKBENCH</h3>
                <p className="font-mono text-xs text-white/50">Arrange item matrices to forge specialized equipment and architectures</p>
              </div>

              <div className="flex items-center gap-6">
                {/* 3x3 Grid */}
                <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/50 p-4 shadow-inner">
                  {craft3x3.map((item, idx) => (
                    <button
                      key={idx}
                      id={`craft-3x3-slot-${idx}`}
                      onClick={() => {
                        const selected = inventory.hotbar[inventory.selectedSlot];
                        if (selected) {
                          const newG = [...craft3x3];
                          newG[idx] = newG[idx] ? null : selected.type;
                          setCraft3x3(newG);
                        }
                      }}
                      className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] text-lg hover:border-[#a3e635] transition"
                    >
                      {item ? getItemEmoji(item) : ''}
                    </button>
                  ))}
                </div>

                <span className="text-2xl text-[#a3e635] font-bold">➔</span>

                {/* 3x3 Result */}
                <button
                  id="craft-3x3-result-btn"
                  disabled={!recipe3x3}
                  onClick={handleCraft3x3}
                  className={`flex h-16 w-16 flex-col items-center justify-center rounded-2xl border text-xl font-bold transition ${
                    recipe3x3
                      ? 'border-2 border-[#a3e635] bg-[#a3e635]/20 text-[#a3e635] shadow-[0_0_20px_rgba(163,230,53,0.4)] hover:scale-105 active:scale-95'
                      : 'border-white/10 bg-white/[0.02] text-white/20 opacity-40'
                  }`}
                >
                  {recipe3x3 ? (
                    <>
                      <span>{getItemEmoji(recipe3x3.result.type)}</span>
                      <span className="text-xs font-mono font-bold text-[#a3e635]">x{recipe3x3.result.count}</span>
                    </>
                  ) : (
                    '?'
                  )}
                </button>
              </div>

              {recipe3x3 && (
                <div className="rounded-xl bg-[#a3e635]/15 px-4 py-2 text-xs font-bold tracking-wide text-[#a3e635] border border-[#a3e635]/40">
                  Ready to construct: {recipe3x3.name}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Furnace Smelting */}
          {activeTab === 'furnace' && (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className="text-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#a3e635]">Thermal Refinement</div>
                <h3 className="text-lg font-black italic tracking-tight text-white">SMELTING FURNACE</h3>
                <p className="font-mono text-xs text-white/50">Refine raw minerals and minerals with fuel combustion</p>
              </div>

              <div className="flex items-center gap-6 rounded-2xl border border-white/10 bg-black/50 p-6">
                {/* Inputs Column */}
                <div className="flex flex-col items-center gap-3">
                  {/* Top Ore Slot */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] text-lg">
                    {furnaceInput ? getItemEmoji(furnaceInput) : '⛏️'}
                  </div>

                  {/* Flame Indicator */}
                  <Flame className={`h-6 w-6 ${isSmelting ? 'text-orange-500 animate-pulse' : 'text-white/20'}`} />

                  {/* Bottom Fuel Slot */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] text-lg">
                    {furnaceFuel ? getItemEmoji(furnaceFuel) : '⚫'}
                  </div>
                </div>

                {/* Smelt Progress Arrow */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-2xl text-[#a3e635] font-bold">➔</span>
                  {isSmelting && (
                    <div className="h-[2px] w-16 overflow-hidden bg-white/10">
                      <div className="h-full bg-[#a3e635] transition-all duration-200" style={{ width: `${smeltProgress}%` }} />
                    </div>
                  )}
                </div>

                {/* Output Slot */}
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.03] text-2xl">
                  {furnaceInput && SMELTING_RECIPES[furnaceInput]
                    ? getItemEmoji(SMELTING_RECIPES[furnaceInput].result)
                    : '?'}
                </div>
              </div>

              <button
                id="start-smelt-btn"
                disabled={isSmelting || !furnaceInput || !SMELTING_RECIPES[furnaceInput]}
                onClick={handleSmelt}
                className="rounded-xl bg-[#a3e635] px-8 py-3 text-xs font-black uppercase tracking-tight text-black shadow-lg transition hover:bg-white active:scale-95 disabled:opacity-30"
              >
                {isSmelting ? 'Thermal Reaction In Progress...' : 'Commence Smelting'}
              </button>
            </div>
          )}

          {/* TAB 4: Creative Mode Item Palette */}
          {activeTab === 'creative' && (
            <div className="space-y-4">
              {/* Category selector & Search bar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {(['all', 'building', 'natural', 'tools', 'functional'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCreativeCategory(cat)}
                      className={`rounded-xl px-3 py-1 text-xs font-bold uppercase tracking-wider transition ${
                        creativeCategory === cat
                          ? 'border-2 border-[#a3e635] bg-[#a3e635]/15 text-[#a3e635]'
                          : 'border border-white/10 text-white/40 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Filter elements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl border border-white/15 bg-black/50 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-[#a3e635] focus:outline-none"
                />
              </div>

              {/* Grid of Infinite Items */}
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-9 rounded-2xl border border-white/10 bg-black/40 p-3.5 max-h-64 overflow-y-auto">
                {filteredCreativeItems.map((item) => (
                  <button
                    key={item.type}
                    id={`creative-item-${item.type}`}
                    onClick={() => {
                      addItemToInventory(item.type, 64);
                      soundManager.playPlace();
                    }}
                    title={`Add 64x ${item.type.replace(/_/g, ' ')}`}
                    className="flex h-12 w-12 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] p-1 text-lg hover:border-[#a3e635] hover:bg-white/[0.06] active:scale-95 transition"
                  >
                    <span>{getItemEmoji(item.type)}</span>
                    <span className="truncate text-[8px] font-mono text-white/40 w-full text-center">
                      {item.type.replace(/_/g, ' ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
