import React from 'react';
import { ChestContainer, InventoryState, ItemStack, ItemType } from '../types';
import { getItemEmoji } from './GameHUD';
import { soundManager } from '../utils/audio';

interface ChestModalProps {
  isOpen: boolean;
  chest: ChestContainer | null;
  inventory: InventoryState;
  onClose: () => void;
  onUpdateInventory: (inv: InventoryState) => void;
  onUpdateChest: (chest: ChestContainer) => void;
}

export const ChestModal: React.FC<ChestModalProps> = ({
  isOpen,
  chest,
  inventory,
  onClose,
  onUpdateInventory,
  onUpdateChest,
}) => {
  if (!isOpen || !chest) return null;

  // Handle transferring an item from chest to player inventory
  const handleChestItemClick = (index: number) => {
    const item = chest.items[index];
    if (!item) return;

    soundManager.playPop();

    // Clone inventories
    const newChestItems = [...chest.items];
    const newHotbar = [...inventory.hotbar];
    const newMain = [...inventory.main];

    // Try stacking with hotbar item
    let placed = false;
    for (let i = 0; i < newHotbar.length; i++) {
      if (newHotbar[i] && newHotbar[i]!.type === item.type) {
        newHotbar[i]!.count += item.count;
        newChestItems[index] = null;
        placed = true;
        break;
      }
    }

    // Try empty hotbar
    if (!placed) {
      for (let i = 0; i < newHotbar.length; i++) {
        if (!newHotbar[i]) {
          newHotbar[i] = { ...item };
          newChestItems[index] = null;
          placed = true;
          break;
        }
      }
    }

    // Try stacking with main inventory
    if (!placed) {
      for (let i = 0; i < newMain.length; i++) {
        if (newMain[i] && newMain[i]!.type === item.type) {
          newMain[i]!.count += item.count;
          newChestItems[index] = null;
          placed = true;
          break;
        }
      }
    }

    // Try empty main inventory
    if (!placed) {
      for (let i = 0; i < newMain.length; i++) {
        if (!newMain[i]) {
          newMain[i] = { ...item };
          newChestItems[index] = null;
          placed = true;
          break;
        }
      }
    }

    if (placed) {
      onUpdateChest({ ...chest, items: newChestItems });
      onUpdateInventory({ ...inventory, hotbar: newHotbar, main: newMain });
    }
  };

  // Handle transferring an item from player inventory into chest
  const handlePlayerItemClick = (source: 'hotbar' | 'main', index: number) => {
    const item = source === 'hotbar' ? inventory.hotbar[index] : inventory.main[index];
    if (!item) return;

    soundManager.playPop();

    const newChestItems = [...chest.items];
    const newHotbar = [...inventory.hotbar];
    const newMain = [...inventory.main];

    // Try stacking in chest
    let stored = false;
    for (let i = 0; i < newChestItems.length; i++) {
      if (newChestItems[i] && newChestItems[i]!.type === item.type) {
        newChestItems[i]!.count += item.count;
        if (source === 'hotbar') newHotbar[index] = null;
        else newMain[index] = null;
        stored = true;
        break;
      }
    }

    // Try empty slot in chest
    if (!stored) {
      for (let i = 0; i < newChestItems.length; i++) {
        if (!newChestItems[i]) {
          newChestItems[i] = { ...item };
          if (source === 'hotbar') newHotbar[index] = null;
          else newMain[index] = null;
          stored = true;
          break;
        }
      }
    }

    if (stored) {
      onUpdateChest({ ...chest, items: newChestItems });
      onUpdateInventory({ ...inventory, hotbar: newHotbar, main: newMain });
    }
  };

  const handleLootAll = () => {
    soundManager.playPop();
    const newChestItems = [...chest.items];
    const newHotbar = [...inventory.hotbar];
    const newMain = [...inventory.main];

    for (let ci = 0; ci < newChestItems.length; ci++) {
      const item = newChestItems[ci];
      if (!item) continue;

      let placed = false;
      // Hotbar stack
      for (let i = 0; i < newHotbar.length; i++) {
        if (newHotbar[i] && newHotbar[i]!.type === item.type) {
          newHotbar[i]!.count += item.count;
          newChestItems[ci] = null;
          placed = true;
          break;
        }
      }
      // Hotbar empty
      if (!placed) {
        for (let i = 0; i < newHotbar.length; i++) {
          if (!newHotbar[i]) {
            newHotbar[i] = { ...item };
            newChestItems[ci] = null;
            placed = true;
            break;
          }
        }
      }
      // Main stack
      if (!placed) {
        for (let i = 0; i < newMain.length; i++) {
          if (newMain[i] && newMain[i]!.type === item.type) {
            newMain[i]!.count += item.count;
            newChestItems[ci] = null;
            placed = true;
            break;
          }
        }
      }
      // Main empty
      if (!placed) {
        for (let i = 0; i < newMain.length; i++) {
          if (!newMain[i]) {
            newMain[i] = { ...item };
            newChestItems[ci] = null;
            placed = true;
            break;
          }
        }
      }
    }

    onUpdateChest({ ...chest, items: newChestItems });
    onUpdateInventory({ ...inventory, hotbar: newHotbar, main: newMain });
  };

  return (
    <div
      id="chest-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none"
      onClick={onClose}
    >
      <div
        id="chest-modal-container"
        className="w-full max-w-2xl bg-stone-900 border-4 border-amber-900/80 rounded-xl shadow-2xl overflow-hidden p-6 text-stone-100 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📦</span>
            <div>
              <h2 className="text-xl font-bold text-amber-400 tracking-wide font-mono">
                {chest.title || 'Chest'}
              </h2>
              <p className="text-xs text-stone-400 font-mono">Click item to transfer</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="loot-all-btn"
              onClick={handleLootAll}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold rounded text-xs transition active:scale-95 shadow font-mono"
            >
              Take All
            </button>
            <button
              id="close-chest-btn"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-100 transition active:scale-95"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 27-Slot Chest Inventory Grid */}
        <div className="bg-stone-950 p-4 rounded-lg border-2 border-stone-800">
          <h3 className="text-xs font-semibold text-stone-400 mb-2 font-mono uppercase tracking-wider">
            Chest Storage (27 Slots)
          </h3>
          <div className="grid grid-cols-9 gap-1.5">
            {chest.items.slice(0, 27).map((item, idx) => (
              <div
                key={`chest-slot-${idx}`}
                id={`chest-slot-${idx}`}
                onClick={() => handleChestItemClick(idx)}
                className={`w-12 h-12 rounded border-2 flex items-center justify-center relative cursor-pointer transition ${
                  item
                    ? 'bg-stone-800/90 border-amber-600/60 hover:border-amber-400 hover:bg-stone-700'
                    : 'bg-stone-900/50 border-stone-800 hover:border-stone-700'
                }`}
                title={item ? `${item.type.replace(/_/g, ' ')} (x${item.count})` : 'Empty'}
              >
                {item && (
                  <>
                    <span className="text-2xl drop-shadow">{getItemEmoji(item.type)}</span>
                    {item.count > 1 && (
                      <span className="absolute bottom-0.5 right-1 text-xs font-bold text-amber-300 font-mono drop-shadow">
                        {item.count}
                      </span>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Player Inventory (Main & Hotbar) */}
        <div className="bg-stone-950 p-4 rounded-lg border-2 border-stone-800">
          <h3 className="text-xs font-semibold text-stone-400 mb-2 font-mono uppercase tracking-wider">
            Player Inventory
          </h3>
          {/* Main Inventory 27 Slots */}
          <div className="grid grid-cols-9 gap-1.5 mb-3">
            {inventory.main.map((item, idx) => (
              <div
                key={`player-main-${idx}`}
                id={`player-main-${idx}`}
                onClick={() => handlePlayerItemClick('main', idx)}
                className={`w-12 h-12 rounded border-2 flex items-center justify-center relative cursor-pointer transition ${
                  item
                    ? 'bg-stone-800/90 border-stone-600 hover:border-stone-400 hover:bg-stone-700'
                    : 'bg-stone-900/50 border-stone-800 hover:border-stone-700'
                }`}
                title={item ? `${item.type.replace(/_/g, ' ')} (x${item.count})` : 'Empty'}
              >
                {item && (
                  <>
                    <span className="text-2xl drop-shadow">{getItemEmoji(item.type)}</span>
                    {item.count > 1 && (
                      <span className="absolute bottom-0.5 right-1 text-xs font-bold text-stone-200 font-mono drop-shadow">
                        {item.count}
                      </span>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Hotbar 9 Slots */}
          <h3 className="text-xs font-semibold text-stone-400 mb-1.5 font-mono uppercase tracking-wider">
            Hotbar
          </h3>
          <div className="grid grid-cols-9 gap-1.5">
            {inventory.hotbar.map((item, idx) => (
              <div
                key={`player-hotbar-${idx}`}
                id={`player-hotbar-${idx}`}
                onClick={() => handlePlayerItemClick('hotbar', idx)}
                className={`w-12 h-12 rounded border-2 flex items-center justify-center relative cursor-pointer transition ${
                  item
                    ? 'bg-stone-800/90 border-amber-500/80 hover:border-amber-300 hover:bg-stone-700'
                    : 'bg-stone-900/50 border-stone-800 hover:border-stone-700'
                }`}
                title={item ? `${item.type.replace(/_/g, ' ')} (x${item.count})` : 'Empty'}
              >
                {item && (
                  <>
                    <span className="text-2xl drop-shadow">{getItemEmoji(item.type)}</span>
                    {item.count > 1 && (
                      <span className="absolute bottom-0.5 right-1 text-xs font-bold text-amber-300 font-mono drop-shadow">
                        {item.count}
                      </span>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
