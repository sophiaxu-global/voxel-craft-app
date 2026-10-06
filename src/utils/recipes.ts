import { CraftingRecipe, ItemType } from '../types';

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // Planks from Wood (2x2 or 3x3)
  {
    id: 'oak_planks',
    name: 'Oak Planks',
    gridSize: 2,
    pattern: ['wood', null, null, null],
    result: { type: 'planks', count: 4 },
    category: 'blocks',
  },
  // Sticks
  {
    id: 'sticks',
    name: 'Sticks',
    gridSize: 2,
    pattern: ['planks', null, 'planks', null],
    result: { type: 'stick', count: 4 },
    category: 'materials',
  },
  // Crafting Table
  {
    id: 'crafting_table',
    name: 'Crafting Table',
    gridSize: 2,
    pattern: ['planks', 'planks', 'planks', 'planks'],
    result: { type: 'crafting_table', count: 1 },
    category: 'blocks',
  },
  // Torch
  {
    id: 'torch',
    name: 'Torch',
    gridSize: 2,
    pattern: ['coal', null, 'stick', null],
    result: { type: 'torch', count: 4 },
    category: 'materials',
  },
  // Wooden Pickaxe (3x3)
  {
    id: 'wooden_pickaxe',
    name: 'Wooden Pickaxe',
    gridSize: 3,
    pattern: [
      'planks', 'planks', 'planks',
      null, 'stick', null,
      null, 'stick', null,
    ],
    result: { type: 'wooden_pickaxe', count: 1 },
    category: 'tools',
  },
  // Stone Pickaxe (3x3)
  {
    id: 'stone_pickaxe',
    name: 'Stone Pickaxe',
    gridSize: 3,
    pattern: [
      'cobblestone', 'cobblestone', 'cobblestone',
      null, 'stick', null,
      null, 'stick', null,
    ],
    result: { type: 'stone_pickaxe', count: 1 },
    category: 'tools',
  },
  // Iron Pickaxe (3x3)
  {
    id: 'iron_pickaxe',
    name: 'Iron Pickaxe',
    gridSize: 3,
    pattern: [
      'iron_ingot', 'iron_ingot', 'iron_ingot',
      null, 'stick', null,
      null, 'stick', null,
    ],
    result: { type: 'iron_pickaxe', count: 1 },
    category: 'tools',
  },
  // Diamond Pickaxe (3x3)
  {
    id: 'diamond_pickaxe',
    name: 'Diamond Pickaxe',
    gridSize: 3,
    pattern: [
      'diamond', 'diamond', 'diamond',
      null, 'stick', null,
      null, 'stick', null,
    ],
    result: { type: 'diamond_pickaxe', count: 1 },
    category: 'tools',
  },
  // Wooden Sword (3x3)
  {
    id: 'wooden_sword',
    name: 'Wooden Sword',
    gridSize: 3,
    pattern: [
      null, 'planks', null,
      null, 'planks', null,
      null, 'stick', null,
    ],
    result: { type: 'wooden_sword', count: 1 },
    category: 'tools',
  },
  // Stone Sword (3x3)
  {
    id: 'stone_sword',
    name: 'Stone Sword',
    gridSize: 3,
    pattern: [
      null, 'cobblestone', null,
      null, 'cobblestone', null,
      null, 'stick', null,
    ],
    result: { type: 'stone_sword', count: 1 },
    category: 'tools',
  },
  // Iron Sword (3x3)
  {
    id: 'iron_sword',
    name: 'Iron Sword',
    gridSize: 3,
    pattern: [
      null, 'iron_ingot', null,
      null, 'iron_ingot', null,
      null, 'stick', null,
    ],
    result: { type: 'iron_sword', count: 1 },
    category: 'tools',
  },
  // Wooden Axe (3x3)
  {
    id: 'wooden_axe',
    name: 'Wooden Axe',
    gridSize: 3,
    pattern: [
      'planks', 'planks', null,
      'planks', 'stick', null,
      null, 'stick', null,
    ],
    result: { type: 'wooden_axe', count: 1 },
    category: 'tools',
  },
  // Stone Axe (3x3)
  {
    id: 'stone_axe',
    name: 'Stone Axe',
    gridSize: 3,
    pattern: [
      'cobblestone', 'cobblestone', null,
      'cobblestone', 'stick', null,
      null, 'stick', null,
    ],
    result: { type: 'stone_axe', count: 1 },
    category: 'tools',
  },
  // Furnace (3x3)
  {
    id: 'furnace',
    name: 'Furnace',
    gridSize: 3,
    pattern: [
      'cobblestone', 'cobblestone', 'cobblestone',
      'cobblestone', null, 'cobblestone',
      'cobblestone', 'cobblestone', 'cobblestone',
    ],
    result: { type: 'furnace', count: 1 },
    category: 'blocks',
  },
  // Bookshelf (3x3)
  {
    id: 'bookshelf',
    name: 'Bookshelf',
    gridSize: 3,
    pattern: [
      'planks', 'planks', 'planks',
      'wood', 'wood', 'wood',
      'planks', 'planks', 'planks',
    ],
    result: { type: 'bookshelf', count: 1 },
    category: 'blocks',
  },
  // Bricks (2x2)
  {
    id: 'bricks',
    name: 'Bricks',
    gridSize: 2,
    pattern: ['dirt', 'sand', 'sand', 'dirt'],
    result: { type: 'bricks', count: 4 },
    category: 'blocks',
  },
  // Glowstone (2x2)
  {
    id: 'glowstone',
    name: 'Glowstone',
    gridSize: 2,
    pattern: ['torch', 'torch', 'torch', 'torch'],
    result: { type: 'glowstone', count: 1 },
    category: 'blocks',
  },
  // TNT (2x2 or 3x3)
  {
    id: 'tnt',
    name: 'TNT',
    gridSize: 2,
    pattern: ['sand', 'red_wool', 'red_wool', 'sand'],
    result: { type: 'tnt', count: 1 },
    category: 'blocks',
  },
  // Chest (3x3 ring of planks)
  {
    id: 'chest',
    name: 'Chest',
    gridSize: 3,
    pattern: [
      'planks', 'planks', 'planks',
      'planks', null, 'planks',
      'planks', 'planks', 'planks',
    ],
    result: { type: 'chest', count: 1 },
    category: 'blocks',
  },
  // Diamond Sword (3x3)
  {
    id: 'diamond_sword',
    name: 'Diamond Sword',
    gridSize: 3,
    pattern: [
      null, 'diamond', null,
      null, 'diamond', null,
      null, 'stick', null,
    ],
    result: { type: 'diamond_sword', count: 1 },
    category: 'tools',
  },
  // Bow (3x3)
  {
    id: 'bow',
    name: 'Bow',
    gridSize: 3,
    pattern: [
      null, 'stick', 'wool',
      'stick', null, 'wool',
      null, 'stick', 'wool',
    ],
    result: { type: 'bow', count: 1 },
    category: 'tools',
  },
  // Arrows (stick + iron_ingot)
  {
    id: 'arrow',
    name: 'Arrow',
    gridSize: 2,
    pattern: ['iron_ingot', null, 'stick', null],
    result: { type: 'arrow', count: 4 },
    category: 'tools',
  },
  // Sandstone (2x2 sand)
  {
    id: 'sandstone',
    name: 'Sandstone',
    gridSize: 2,
    pattern: ['sand', 'sand', 'sand', 'sand'],
    result: { type: 'sandstone', count: 1 },
    category: 'blocks',
  },
  // Spruce / Birch Planks from wood
  {
    id: 'spruce_planks',
    name: 'Spruce Planks',
    gridSize: 2,
    pattern: ['spruce_wood', null, null, null],
    result: { type: 'planks', count: 4 },
    category: 'blocks',
  },
  {
    id: 'birch_planks',
    name: 'Birch Planks',
    gridSize: 2,
    pattern: ['birch_wood', null, null, null],
    result: { type: 'planks', count: 4 },
    category: 'blocks',
  },
  // Golden Apple
  {
    id: 'golden_apple',
    name: 'Golden Apple',
    gridSize: 3,
    pattern: [
      'gold_ingot', 'gold_ingot', 'gold_ingot',
      'gold_ingot', 'apple', 'gold_ingot',
      'gold_ingot', 'gold_ingot', 'gold_ingot',
    ],
    result: { type: 'golden_apple', count: 1 },
    category: 'food',
  },
  // Bread (wheat/grain crafting)
  {
    id: 'bread',
    name: 'Bread',
    gridSize: 3,
    pattern: [
      null, null, null,
      'apple', 'apple', 'apple',
      null, null, null,
    ],
    result: { type: 'bread', count: 1 },
    category: 'food',
  },
  // Iron Block (3x3 iron ingots)
  {
    id: 'iron_block',
    name: 'Block of Iron',
    gridSize: 3,
    pattern: [
      'iron_ingot', 'iron_ingot', 'iron_ingot',
      'iron_ingot', 'iron_ingot', 'iron_ingot',
      'iron_ingot', 'iron_ingot', 'iron_ingot',
    ],
    result: { type: 'iron_block', count: 1 },
    category: 'blocks',
  },
  // Gold Block (3x3 gold ingots)
  {
    id: 'gold_block',
    name: 'Block of Gold',
    gridSize: 3,
    pattern: [
      'gold_ingot', 'gold_ingot', 'gold_ingot',
      'gold_ingot', 'gold_ingot', 'gold_ingot',
      'gold_ingot', 'gold_ingot', 'gold_ingot',
    ],
    result: { type: 'gold_block', count: 1 },
    category: 'blocks',
  },
  // Diamond Block (3x3 diamonds)
  {
    id: 'diamond_block',
    name: 'Block of Diamond',
    gridSize: 3,
    pattern: [
      'diamond', 'diamond', 'diamond',
      'diamond', 'diamond', 'diamond',
      'diamond', 'diamond', 'diamond',
    ],
    result: { type: 'diamond_block', count: 1 },
    category: 'blocks',
  },
  // Authentic Minecraft Rail (6 Iron Ingots + 1 Stick = 16 Rails)
  {
    id: 'rail',
    name: 'Rail (x16)',
    gridSize: 3,
    pattern: [
      'iron_ingot', null, 'iron_ingot',
      'iron_ingot', 'stick', 'iron_ingot',
      'iron_ingot', null, 'iron_ingot',
    ],
    result: { type: 'rail', count: 16 },
    category: 'tools',
  },
  // Powered Rail (6 Gold Ingots + 1 Stick + 1 Torch = 6 Powered Rails)
  {
    id: 'powered_rail',
    name: 'Powered Rail (x6)',
    gridSize: 3,
    pattern: [
      'gold_ingot', null, 'gold_ingot',
      'gold_ingot', 'stick', 'gold_ingot',
      'gold_ingot', 'torch', 'gold_ingot',
    ],
    result: { type: 'powered_rail', count: 6 },
    category: 'tools',
  },
  // Detector Rail (6 Iron Ingots + 1 Stone + 1 Stick = 6 Detector Rails)
  {
    id: 'detector_rail',
    name: 'Detector Rail (x6)',
    gridSize: 3,
    pattern: [
      'iron_ingot', null, 'iron_ingot',
      'iron_ingot', 'stone', 'iron_ingot',
      'iron_ingot', null, 'iron_ingot',
    ],
    result: { type: 'detector_rail', count: 6 },
    category: 'tools',
  },
  // Activator Rail (6 Iron Ingots + 2 Sticks + 1 Torch = 6 Activator Rails)
  {
    id: 'activator_rail',
    name: 'Activator Rail (x6)',
    gridSize: 3,
    pattern: [
      'iron_ingot', 'stick', 'iron_ingot',
      'iron_ingot', 'torch', 'iron_ingot',
      'iron_ingot', 'stick', 'iron_ingot',
    ],
    result: { type: 'activator_rail', count: 6 },
    category: 'tools',
  },
  // Minecart (5 Iron Ingots in U shape)
  {
    id: 'minecart',
    name: 'Minecart',
    gridSize: 3,
    pattern: [
      'iron_ingot', null, 'iron_ingot',
      'iron_ingot', 'iron_ingot', 'iron_ingot',
      null, null, null,
    ],
    result: { type: 'minecart', count: 1 },
    category: 'tools',
  },
  {
    id: 'minecart_bottom',
    name: 'Minecart',
    gridSize: 3,
    pattern: [
      null, null, null,
      'iron_ingot', null, 'iron_ingot',
      'iron_ingot', 'iron_ingot', 'iron_ingot',
    ],
    result: { type: 'minecart', count: 1 },
    category: 'tools',
  },
];

// Check if grid matches a recipe
export function findMatchingRecipe(grid: (ItemType | null)[], gridSize: 2 | 3): CraftingRecipe | null {
  for (const recipe of CRAFTING_RECIPES) {
    if (recipe.gridSize === gridSize) {
      const match = recipe.pattern.every((expected, i) => {
        return (grid[i] || null) === expected;
      });
      if (match) return recipe;
    }
  }

  // Also check if 2x2 recipe can be crafted in 3x3 grid (top-left 2x2 corner)
  if (gridSize === 3) {
    for (const recipe of CRAFTING_RECIPES) {
      if (recipe.gridSize === 2) {
        // [0,1,2, 3,4,5, 6,7,8]
        const cornerMatches =
          (grid[0] || null) === recipe.pattern[0] &&
          (grid[1] || null) === recipe.pattern[1] &&
          (grid[3] || null) === recipe.pattern[2] &&
          (grid[4] || null) === recipe.pattern[3] &&
          grid[2] === null &&
          grid[5] === null &&
          grid[6] === null &&
          grid[7] === null &&
          grid[8] === null;

        if (cornerMatches) return recipe;
      }
    }
  }

  return null;
}

// Smelting recipes (Input item -> Output item)
export const SMELTING_RECIPES: Record<string, { result: ItemType; count: number }> = {
  iron_ore: { result: 'iron_ingot', count: 1 },
  gold_ore: { result: 'gold_ingot', count: 1 },
  raw_meat: { result: 'cooked_meat', count: 1 },
  apple: { result: 'cooked_apple', count: 1 },
  cobblestone: { result: 'stone', count: 1 },
  sand: { result: 'glass', count: 1 },
};
