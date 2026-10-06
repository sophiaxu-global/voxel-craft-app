import { BlueprintStructure, LevelConfig, LevelObjective } from '../types';

// --- BLUEPRINT GENERATORS FOR MILESTONE LEVELS ---

function generateBridgeBlueprint(): BlueprintStructure {
  const blocks: { x: number; y: number; z: number; type: any }[] = [];
  for (let y = 0; y <= 3; y++) {
    for (let z = -1; z <= 1; z++) {
      blocks.push({ x: -4, y, z, type: 'cobblestone' });
      blocks.push({ x: 4, y, z, type: 'cobblestone' });
    }
  }
  for (let z = -1; z <= 1; z++) {
    blocks.push({ x: -2, y: 1, z, type: 'stone' });
    blocks.push({ x: 2, y: 1, z, type: 'stone' });
    blocks.push({ x: -1, y: 2, z, type: 'stone' });
    blocks.push({ x: 1, y: 2, z, type: 'stone' });
    blocks.push({ x: 0, y: 2, z, type: 'stone' });
  }
  for (let x = -5; x <= 5; x++) {
    for (let z = -1; z <= 1; z++) {
      blocks.push({ x, y: 3, z, type: 'planks' });
    }
  }
  for (let x = -5; x <= 5; x++) {
    blocks.push({ x, y: 4, z: -1, type: x % 4 === 0 ? 'wood' : 'planks' });
    blocks.push({ x, y: 4, z: 1, type: x % 4 === 0 ? 'wood' : 'planks' });
  }
  blocks.push({ x: -5, y: 5, z: -1, type: 'torch' });
  blocks.push({ x: 5, y: 5, z: 1, type: 'torch' });

  return {
    id: 'ravine_bridge',
    name: 'Ravine Aqueduct Bridge',
    description: 'A fortified cantilever stone arch bridge across the gorge with wood decking & lanterns.',
    dimensions: { width: 11, height: 6, depth: 3 },
    blocks,
    previewIcon: '🌉',
  };
}

function generateWatchtowerBlueprint(): BlueprintStructure {
  const blocks: { x: number; y: number; z: number; type: any }[] = [];
  for (let x = -2; x <= 2; x++) {
    for (let z = -2; z <= 2; z++) {
      blocks.push({ x, y: 0, z, type: 'cobblestone' });
    }
  }
  for (let y = 1; y <= 7; y++) {
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        const isCorner = Math.abs(x) === 2 && Math.abs(z) === 2;
        const isWall = Math.abs(x) === 2 || Math.abs(z) === 2;
        if (isCorner) {
          blocks.push({ x, y, z, type: 'wood' });
        } else if (isWall) {
          if (x === 0 && z === 2 && (y === 1 || y === 2)) {
            // door
          } else if ((y === 3 || y === 6) && (x === 0 || z === 0)) {
            blocks.push({ x, y, z, type: 'glass' });
          } else {
            blocks.push({ x, y, z, type: 'cobblestone' });
          }
        }
      }
    }
  }
  for (let y of [4, 7]) {
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        if (!(x === 1 && z === 1)) blocks.push({ x, y, z, type: 'planks' });
      }
    }
  }
  for (let x = -2; x <= 2; x++) {
    for (let z = -2; z <= 2; z++) {
      if (Math.abs(x) === 2 || Math.abs(z) === 2) {
        if ((x + z) % 2 === 0) blocks.push({ x, y: 8, z, type: 'cobblestone' });
      }
    }
  }
  blocks.push({ x: 0, y: 8, z: 0, type: 'glowstone' });
  return {
    id: 'medieval_watchtower',
    name: 'Medieval Watchtower',
    description: 'A 3-story fortified stone tower with wood corner pillars, observation windows & battlements.',
    dimensions: { width: 5, height: 10, depth: 5 },
    blocks,
    previewIcon: '🏰',
  };
}

function generatePyramidBlueprint(): BlueprintStructure {
  const blocks: { x: number; y: number; z: number; type: any }[] = [];
  const baseSize = 5;
  for (let layer = 0; layer <= 4; layer++) {
    const r = baseSize - layer;
    const y = layer;
    for (let x = -r; x <= r; x++) {
      for (let z = -r; z <= r; z++) {
        const isBorder = Math.abs(x) === r || Math.abs(z) === r;
        if (layer === 4) {
          blocks.push({ x, y, z, type: 'gold_block' });
        } else if (isBorder) {
          blocks.push({ x, y, z, type: 'sand' });
        } else if (layer === 0) {
          blocks.push({ x, y, z, type: 'sand' });
        }
      }
    }
  }
  blocks.push({ x: 0, y: 5, z: 0, type: 'glowstone' });
  return {
    id: 'desert_pyramid',
    name: 'Golden Desert Sanctuary',
    description: 'A stepped sandstone pyramid crowned with a golden capstone and beacon altar.',
    dimensions: { width: 11, height: 6, depth: 11 },
    blocks,
    previewIcon: '🔺',
  };
}

function generateCoasterStationBlueprint(): BlueprintStructure {
  const blocks: { x: number; y: number; z: number; type: any }[] = [];
  for (let x = -3; x <= 3; x++) {
    for (let z = -3; z <= 3; z++) {
      blocks.push({ x, y: 0, z, type: 'planks' });
    }
  }
  for (const cx of [-3, 3]) {
    for (const cz of [-3, 3]) {
      for (let y = 1; y <= 4; y++) {
        blocks.push({ x: cx, y, z: cz, type: 'wood' });
      }
      blocks.push({ x: cx, y: 5, z: cz, type: 'torch' });
    }
  }
  for (let x = -3; x <= 3; x++) {
    for (let z = -3; z <= 3; z++) {
      blocks.push({ x, y: 5, z, type: (x + z) % 2 === 0 ? 'red_wool' : 'yellow_wool' });
    }
  }
  blocks.push({ x: 0, y: 4, z: 0, type: 'glowstone' });
  blocks.push({ x: 2, y: 1, z: -1, type: 'gold_ore' });
  blocks.push({ x: -2, y: 1, z: -1, type: 'crafting_table' });

  return {
    id: 'coaster_station',
    name: 'Mega-Coaster Station Depot',
    description: 'A decorated rollercoaster boarding terminal with red & yellow canopy, chandeliers, and turnstiles.',
    dimensions: { width: 7, height: 6, depth: 7 },
    blocks,
    previewIcon: '🎢',
  };
}

function generateSkyscraperBlueprint(): BlueprintStructure {
  const blocks: { x: number; y: number; z: number; type: any }[] = [];
  for (let y = 0; y <= 12; y++) {
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        const isCorner = Math.abs(x) === 3 && Math.abs(z) === 3;
        const isWall = Math.abs(x) === 3 || Math.abs(z) === 3;
        if (y === 0) {
          blocks.push({ x, y, z, type: isCorner ? 'obsidian' : 'stone' });
        } else if (y === 4 || y === 8) {
          if (isCorner) blocks.push({ x, y, z, type: 'obsidian' });
          else if (isWall) blocks.push({ x, y, z, type: 'stone' });
          else blocks.push({ x, y, z, type: 'planks' });
        } else if (y === 12) {
          if (isCorner) blocks.push({ x, y, z, type: 'obsidian' });
          else if (isWall) blocks.push({ x, y, z, type: 'stone' });
          else if (Math.abs(x) <= 1 && Math.abs(z) <= 1) {
            blocks.push({ x, y, z, type: (z === 0 || x === -1 || x === 1) ? 'yellow_wool' : 'stone' });
          } else {
            blocks.push({ x, y, z, type: 'stone' });
          }
        } else if (y < 12) {
          if (isCorner) blocks.push({ x, y, z, type: 'obsidian' });
          else if (isWall) blocks.push({ x, y, z, type: 'glass' });
        }
      }
    }
  }
  blocks.push({ x: 0, y: 3, z: 0, type: 'glowstone' });
  blocks.push({ x: 0, y: 7, z: 0, type: 'glowstone' });
  blocks.push({ x: 0, y: 11, z: 0, type: 'glowstone' });
  blocks.push({ x: 0, y: 13, z: 0, type: 'obsidian' });
  blocks.push({ x: 0, y: 14, z: 0, type: 'obsidian' });
  blocks.push({ x: 0, y: 15, z: 0, type: 'glowstone' });

  return {
    id: 'modern_skyscraper',
    name: 'Metropolis Glass Skyscraper',
    description: 'A 14-story modern high-rise tower featuring glass curtain walls, steel corner pillars, multi-floor plates, helipad & rooftop beacon.',
    dimensions: { width: 7, height: 16, depth: 7 },
    blocks,
    previewIcon: '🏙️',
  };
}

function generateRestaurantBlueprint(): BlueprintStructure {
  const blocks: { x: number; y: number; z: number; type: any }[] = [];
  for (let x = -4; x <= 4; x++) {
    for (let z = -4; z <= 4; z++) {
      if (Math.abs(x) <= 1 && z <= 1) {
        blocks.push({ x, y: 0, z, type: 'red_wool' });
      } else {
        blocks.push({ x, y: 0, z, type: (x + z) % 2 === 0 ? 'planks' : 'birch_wood' });
      }
    }
  }
  for (let y = 1; y <= 4; y++) {
    for (let x = -4; x <= 4; x++) {
      for (let z = -4; z <= 4; z++) {
        const isCorner = Math.abs(x) === 4 && Math.abs(z) === 4;
        const isWall = Math.abs(x) === 4 || Math.abs(z) === 4;
        const isFrontDoor = z === -4 && Math.abs(x) <= 1;

        if (isCorner) {
          blocks.push({ x, y, z, type: 'wood' });
        } else if (isFrontDoor) {
          if (y === 4) blocks.push({ x, y, z, type: 'wood' });
        } else if (isWall) {
          if (y === 1) blocks.push({ x, y, z, type: 'bricks' });
          else if (y === 2 || y === 3) blocks.push({ x, y, z, type: 'glass' });
          else blocks.push({ x, y, z, type: 'wood' });
        }
      }
    }
  }
  blocks.push({ x: 3, y: 1, z: 2, type: 'furnace' });
  blocks.push({ x: 3, y: 1, z: 3, type: 'furnace' });
  blocks.push({ x: 2, y: 1, z: 2, type: 'crafting_table' });
  blocks.push({ x: 2, y: 1, z: 3, type: 'chest' });
  blocks.push({ x: -3, y: 1, z: -2, type: 'red_wool' });
  blocks.push({ x: -3, y: 1, z: -1, type: 'wood' });
  blocks.push({ x: -3, y: 2, z: -1, type: 'torch' });
  blocks.push({ x: -3, y: 1, z: 0, type: 'red_wool' });
  blocks.push({ x: 2, y: 1, z: -2, type: 'crafting_table' });
  blocks.push({ x: 3, y: 1, z: -2, type: 'bookshelf' });
  for (let ax = -2; ax <= 2; ax++) {
    blocks.push({ x: ax, y: 4, z: -5, type: ax % 2 === 0 ? 'red_wool' : 'yellow_wool' });
  }
  for (let x = -4; x <= 4; x++) {
    for (let z = -4; z <= 4; z++) {
      blocks.push({ x, y: 5, z, type: 'planks' });
    }
  }
  blocks.push({ x: 0, y: 4, z: 0, type: 'glowstone' });
  blocks.push({ x: 0, y: 6, z: 0, type: 'wood' });
  blocks.push({ x: -1, y: 6, z: 0, type: 'red_wool' });
  blocks.push({ x: 1, y: 6, z: 0, type: 'red_wool' });
  blocks.push({ x: 0, y: 7, z: 0, type: 'wood' });
  blocks.push({ x: 0, y: 8, z: 0, type: 'yellow_wool' });
  blocks.push({ x: -1, y: 8, z: 0, type: 'red_wool' });
  blocks.push({ x: 1, y: 8, z: 0, type: 'red_wool' });
  blocks.push({ x: 0, y: 8, z: -1, type: 'red_wool' });
  blocks.push({ x: 0, y: 8, z: 1, type: 'red_wool' });
  blocks.push({ x: 0, y: 5, z: -4, type: 'gold_block' });
  blocks.push({ x: -1, y: 5, z: -4, type: 'glowstone' });
  blocks.push({ x: 1, y: 5, z: -4, type: 'glowstone' });

  return {
    id: 'gourmet_restaurant',
    name: 'The Golden Apple Gourmet Bistro',
    description: 'A 2-story luxury culinary restaurant with commercial kitchen furnaces, dining booths, red carpet, striped awning, and rooftop VIP parasol lounge.',
    dimensions: { width: 9, height: 9, depth: 9 },
    blocks,
    previewIcon: '🍽️',
  };
}

function generateLighthouseBlueprint(): BlueprintStructure {
  const blocks: { x: number; y: number; z: number; type: any }[] = [];
  for (let y = 0; y <= 10; y++) {
    const isRedBand = y === 2 || y === 3 || y === 6 || y === 7;
    const blockType = isRedBand ? 'red_wool' : 'stone';
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        if (Math.abs(x) + Math.abs(z) <= 3) {
          if (y === 0 || Math.abs(x) === 2 || Math.abs(z) === 2) {
            blocks.push({ x, y, z, type: blockType });
          }
        }
      }
    }
  }
  for (let x = -2; x <= 2; x++) {
    for (let z = -2; z <= 2; z++) {
      blocks.push({ x, y: 11, z, type: 'glass' });
    }
  }
  blocks.push({ x: 0, y: 11, z: 0, type: 'glowstone' });
  blocks.push({ x: 0, y: 12, z: 0, type: 'gold_block' });
  return {
    id: 'coastal_lighthouse',
    name: 'Beacon of Alexandria Lighthouse',
    description: 'A towering maritime lighthouse with alternating white stone and crimson bands, capped with a rotating beacon lantern.',
    dimensions: { width: 5, height: 13, depth: 5 },
    blocks,
    previewIcon: '🗼',
  };
}

function generateCastleKeepBlueprint(): BlueprintStructure {
  const blocks: { x: number; y: number; z: number; type: any }[] = [];
  for (let y = 0; y <= 5; y++) {
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        const isCorner = Math.abs(x) === 3 && Math.abs(z) === 3;
        const isWall = Math.abs(x) === 3 || Math.abs(z) === 3;
        if (y === 0) {
          blocks.push({ x, y, z, type: isCorner ? 'obsidian' : 'bricks' });
        } else if (isCorner) {
          blocks.push({ x, y, z, type: 'obsidian' });
        } else if (isWall) {
          if (z === 3 && Math.abs(x) <= 1 && y <= 2) {
            // Doorway
          } else if (y === 2 && (x === 0 || z === 0)) {
            blocks.push({ x, y, z, type: 'glass' });
          } else {
            blocks.push({ x, y, z, type: 'bricks' });
          }
        }
      }
    }
  }
  blocks.push({ x: -2, y: 1, z: -2, type: 'bookshelf' });
  blocks.push({ x: 2, y: 1, z: -2, type: 'crafting_table' });
  blocks.push({ x: 0, y: 5, z: 0, type: 'glowstone' });
  for (let x of [-3, 3]) {
    for (let z of [-3, 3]) {
      blocks.push({ x, y: 6, z, type: 'obsidian' });
      blocks.push({ x, y: 7, z, type: 'glowstone' });
    }
  }
  return {
    id: 'royal_castle_keep',
    name: 'Royal Citadel of Kings',
    description: 'An ancient fortified brick & obsidian keep with golden chandeliers, spires, and library sanctum.',
    dimensions: { width: 7, height: 8, depth: 7 },
    blocks,
    previewIcon: '👑',
  };
}

function generateNetherShrineBlueprint(): BlueprintStructure {
  const blocks: { x: number; y: number; z: number; type: any }[] = [];
  for (let x = -3; x <= 3; x++) {
    for (let z = -3; z <= 3; z++) {
      blocks.push({ x, y: 0, z, type: (Math.abs(x) === 3 || Math.abs(z) === 3) ? 'obsidian' : 'netherrack' });
    }
  }
  for (let y = 1; y <= 5; y++) {
    blocks.push({ x: -2, y, z: 0, type: 'obsidian' });
    blocks.push({ x: 2, y, z: 0, type: 'obsidian' });
  }
  for (let x = -2; x <= 2; x++) {
    blocks.push({ x, y: 5, z: 0, type: 'obsidian' });
  }
  blocks.push({ x: -3, y: 1, z: -3, type: 'torch' });
  blocks.push({ x: 3, y: 1, z: -3, type: 'torch' });
  blocks.push({ x: -3, y: 1, z: 3, type: 'torch' });
  blocks.push({ x: 3, y: 1, z: 3, type: 'torch' });
  blocks.push({ x: 0, y: 1, z: 0, type: 'glowstone' });

  return {
    id: 'nether_portal_shrine',
    name: 'Nether Portal Altar Shrine',
    description: 'An obsidian inter-dimensional gateway altar surrounded by hellfire glowstones and ancient runes.',
    dimensions: { width: 7, height: 6, depth: 7 },
    blocks,
    previewIcon: '🔮',
  };
}

function generateDragonSanctuaryBlueprint(): BlueprintStructure {
  const blocks: { x: number; y: number; z: number; type: any }[] = [];
  for (let x = -4; x <= 4; x++) {
    for (let z = -4; z <= 4; z++) {
      const dist = Math.hypot(x, z);
      if (dist <= 4) {
        blocks.push({ x, y: 0, z, type: dist <= 2 ? 'obsidian' : 'gold_block' });
      }
    }
  }
  for (const [px, pz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
    for (let y = 1; y <= 6; y++) {
      blocks.push({ x: px, y, z: pz, type: 'obsidian' });
    }
    blocks.push({ x: px, y: 7, z: pz, type: 'glowstone' });
  }
  blocks.push({ x: 0, y: 1, z: 0, type: 'gold_block' });
  blocks.push({ x: 0, y: 2, z: 0, type: 'obsidian' });
  blocks.push({ x: 0, y: 3, z: 0, type: 'glowstone' });

  return {
    id: 'dragon_sanctuary',
    name: 'Sanctuary of the Ender Dragon',
    description: 'The sacred obsidian ring temple where Ender Dragon lords summon celestial void breath.',
    dimensions: { width: 9, height: 8, depth: 9 },
    blocks,
    previewIcon: '🐉',
  };
}

// --- 100 LEVEL MASTER CONFIGURATION BUILDER ---

interface RawLevelData {
  id: number;
  title: string;
  subtitle: string;
  mode: 'survival' | 'creative' | 'architect';
  description: string;
  blueprint?: BlueprintStructure;
  starterItems?: { type: any; count: number }[];
  objectives: LevelObjective[];
}

const RAW_LEVELS: RawLevelData[] = [
  // === CHAPTER 1: THE FRONTIER PIONEERS (Levels 1 - 10) ===
  {
    id: 1,
    title: 'Level 1: The First Awakening',
    subtitle: 'Wilderness Survival Initiation',
    mode: 'survival',
    description: 'Harvest raw timber from ancient trees, shape crafting planks, and forge your primary workbench.',
    starterItems: [{ type: 'wood', count: 1 }, { type: 'apple', count: 3 }],
    objectives: [
      { id: 'gather_wood', text: 'Chop 4 Oak Wood blocks from trees', type: 'gather', targetItem: 'wood', targetCount: 4, currentCount: 0, completed: false },
      { id: 'craft_planks', text: 'Craft 8 Oak Planks', type: 'craft', targetItem: 'planks', targetCount: 8, currentCount: 0, completed: false },
      { id: 'craft_table', text: 'Craft a 3x3 Crafting Table', type: 'craft', targetItem: 'crafting_table', targetCount: 1, currentCount: 0, completed: false },
    ],
  },
  {
    id: 2,
    title: 'Level 2: The Miner’s Pickaxe',
    subtitle: 'Stone Age & Tools Upgrade',
    mode: 'survival',
    description: 'Craft wooden tools to quarry cobblestone and construct the legendary Stone Pickaxe.',
    starterItems: [{ type: 'planks', count: 8 }, { type: 'stick', count: 4 }],
    objectives: [
      { id: 'craft_wood_pickaxe', text: 'Craft a Wooden Pickaxe', type: 'craft', targetItem: 'wooden_pickaxe', targetCount: 1, currentCount: 0, completed: false },
      { id: 'gather_cobblestone', text: 'Quarry 6 Cobblestone blocks', type: 'gather', targetItem: 'cobblestone', targetCount: 6, currentCount: 0, completed: false },
      { id: 'craft_stone_pickaxe', text: 'Forge a Stone Pickaxe', type: 'craft', targetItem: 'stone_pickaxe', targetCount: 1, currentCount: 0, completed: false },
    ],
  },
  {
    id: 3,
    title: 'Level 3: Nightfall Fortress',
    subtitle: 'Shelter Before Monsters Spawn',
    mode: 'survival',
    description: 'Erect a sealed shelter and craft torches before the sun sets and zombies emerge.',
    starterItems: [{ type: 'cobblestone', count: 16 }, { type: 'wood', count: 4 }, { type: 'coal', count: 2 }],
    objectives: [
      { id: 'craft_furnace', text: 'Craft a Cooking & Smelting Furnace', type: 'craft', targetItem: 'furnace', targetCount: 1, currentCount: 0, completed: false },
      { id: 'craft_torches', text: 'Craft 4 Torches for night illumination', type: 'craft', targetItem: 'torch', targetCount: 4, currentCount: 0, completed: false },
      { id: 'place_walls', text: 'Place 12 Protective Wall blocks', type: 'place', targetCount: 12, currentCount: 0, completed: false },
    ],
  },
  {
    id: 4,
    title: 'Level 4: Ravine Aqueduct Bridge',
    subtitle: 'Architectural Blueprint Challenge',
    mode: 'creative',
    description: 'Follow the 3D holographic blueprint to construct a stone cantilever arch bridge spanning the canyon.',
    blueprint: generateBridgeBlueprint(),
    starterItems: [{ type: 'cobblestone', count: 32 }, { type: 'stone', count: 32 }, { type: 'planks', count: 32 }],
    objectives: [
      { id: 'place_bridge_pillars', text: 'Erect stone arch bridge pillars', type: 'blueprint', targetItem: 'cobblestone', targetCount: 12, currentCount: 0, completed: false },
      { id: 'lay_wood_deck', text: 'Lay plank roadway deck across span', type: 'blueprint', targetItem: 'planks', targetCount: 16, currentCount: 0, completed: false },
      { id: 'mount_lanterns', text: 'Install bridge guardrail lanterns', type: 'blueprint', targetItem: 'torch', targetCount: 2, currentCount: 0, completed: false },
    ],
  },
  {
    id: 5,
    title: 'Level 5: Medieval Watchtower',
    subtitle: 'Fortified High-Ground Outpost',
    mode: 'creative',
    description: 'Construct a 3-story fortified lookout tower with timber pillars, glass viewpoints, and parapets.',
    blueprint: generateWatchtowerBlueprint(),
    objectives: [
      { id: 'tower_foundation', text: 'Lay cobblestone foundation ring', type: 'blueprint', targetItem: 'cobblestone', targetCount: 16, currentCount: 0, completed: false },
      { id: 'timber_pillars', text: 'Raise oak wood corner pillars', type: 'blueprint', targetItem: 'wood', targetCount: 14, currentCount: 0, completed: false },
      { id: 'mount_beacon', text: 'Install rooftop glowstone beacon', type: 'blueprint', targetItem: 'glowstone', targetCount: 1, currentCount: 0, completed: false },
    ],
  },
  {
    id: 6,
    title: 'Level 6: Desert Gold Sanctuary',
    subtitle: 'Ancient Pharaoh Monuments',
    mode: 'creative',
    description: 'Construct a stepped sandstone pyramid crowned with golden capstones and eternal flames.',
    blueprint: generatePyramidBlueprint(),
    objectives: [
      { id: 'sandstone_base', text: 'Lay pyramid sandstone foundation', type: 'blueprint', targetItem: 'sand', targetCount: 24, currentCount: 0, completed: false },
      { id: 'gold_capstone', text: 'Crown sanctuary with gold blocks', type: 'blueprint', targetItem: 'gold_block', targetCount: 4, currentCount: 0, completed: false },
      { id: 'beacon_flame', text: 'Ignite celestial glowstone peak', type: 'blueprint', targetItem: 'glowstone', targetCount: 1, currentCount: 0, completed: false },
    ],
  },
  {
    id: 7,
    title: 'Level 7: Mega-Coaster Station Depot',
    subtitle: 'Theme Park Boarding Terminal',
    mode: 'creative',
    description: 'Build the grand carnival boarding station for the Thunderbird loop-de-loop rollercoaster.',
    blueprint: generateCoasterStationBlueprint(),
    objectives: [
      { id: 'station_floor', text: 'Build wooden platform deck', type: 'blueprint', targetItem: 'planks', targetCount: 16, currentCount: 0, completed: false },
      { id: 'striped_canopy', text: 'Weave carnival striped roof', type: 'blueprint', targetItem: 'red_wool', targetCount: 8, currentCount: 0, completed: false },
      { id: 'station_lighting', text: 'Install ticket chandelier', type: 'blueprint', targetItem: 'glowstone', targetCount: 1, currentCount: 0, completed: false },
    ],
  },
  {
    id: 8,
    title: 'Level 8: Metropolis Glass Skyscraper',
    subtitle: 'Modern High-Rise Engineering',
    mode: 'creative',
    description: 'Construct a 14-story commercial office skyscraper with glass curtain walls and rooftop helipad.',
    blueprint: generateSkyscraperBlueprint(),
    objectives: [
      { id: 'curtain_walls', text: 'Install high-rise glass curtain walls', type: 'blueprint', targetItem: 'glass', targetCount: 20, currentCount: 0, completed: false },
      { id: 'steel_columns', text: 'Reinforce obsidian structural columns', type: 'blueprint', targetItem: 'obsidian', targetCount: 12, currentCount: 0, completed: false },
      { id: 'helipad_beacon', text: 'Complete rooftop helipad beacon', type: 'blueprint', targetItem: 'glowstone', targetCount: 2, currentCount: 0, completed: false },
    ],
  },
  {
    id: 9,
    title: 'Level 9: The Golden Apple Gourmet Bistro',
    subtitle: '5-Star Restaurant & VIP Lounge',
    mode: 'creative',
    description: 'Design and operate a luxury voxel restaurant with commercial kitchens, dining booths, and rooftop patio.',
    blueprint: generateRestaurantBlueprint(),
    objectives: [
      { id: 'dining_booths', text: 'Construct velvet dining booths & carpet aisle', type: 'blueprint', targetItem: 'red_wool', targetCount: 6, currentCount: 0, completed: false },
      { id: 'kitchen_furnaces', text: 'Install commercial kitchen furnaces', type: 'blueprint', targetItem: 'furnace', targetCount: 2, currentCount: 0, completed: false },
      { id: 'rooftop_parasol', text: 'Mount rooftop parasol & chandeliers', type: 'blueprint', targetItem: 'glowstone', targetCount: 1, currentCount: 0, completed: false },
    ],
  },
  {
    id: 10,
    title: 'Level 10: Frontier Master Pioneer',
    subtitle: 'Chapter 1 Grand Milestone',
    mode: 'survival',
    description: 'Demonstrate total frontier mastery: gather iron, construct an advanced base, and smelt ingots.',
    starterItems: [{ type: 'stone_pickaxe', count: 1 }, { type: 'bread', count: 5 }, { type: 'torch', count: 8 }],
    objectives: [
      { id: 'gather_iron', text: 'Mine 6 raw Iron Ore veins', type: 'gather', targetItem: 'iron_ore', targetCount: 6, currentCount: 0, completed: false },
      { id: 'smelt_iron', text: 'Smelt 4 pure Iron Ingots in furnace', type: 'smelt', targetItem: 'iron_ingot', targetCount: 4, currentCount: 0, completed: false },
      { id: 'craft_iron_pickaxe', text: 'Craft an Iron Pickaxe', type: 'craft', targetItem: 'iron_pickaxe', targetCount: 1, currentCount: 0, completed: false },
      { id: 'place_homestead', text: 'Fortify settlement with 20 blocks', type: 'place', targetCount: 20, currentCount: 0, completed: false },
    ],
  },

  // === CHAPTER 2: DEEP CAVERNS & METALLURGY (Levels 11 - 20) ===
  {
    id: 11,
    title: 'Level 11: Iron Vein Expedition',
    subtitle: 'Underground Ore Excavation',
    mode: 'survival',
    description: 'Descend into subterranean limestone caverns to extract iron veins.',
    starterItems: [{ type: 'stone_pickaxe', count: 1 }, { type: 'torch', count: 12 }],
    objectives: [
      { id: 'mine_iron_ore', text: 'Mine 8 Iron Ore blocks', type: 'gather', targetItem: 'iron_ore', targetCount: 8, currentCount: 0, completed: false },
      { id: 'gather_coal', text: 'Mine 8 Coal blocks for fuel', type: 'gather', targetItem: 'coal', targetCount: 8, currentCount: 0, completed: false },
    ],
  },
  {
    id: 12,
    title: 'Level 12: High-Heat Smeltery',
    subtitle: 'Industrial Metallurgical Foundry',
    mode: 'survival',
    description: 'Construct twin furnaces and smelt high-grade iron ingots.',
    starterItems: [{ type: 'cobblestone', count: 24 }, { type: 'coal', count: 8 }],
    objectives: [
      { id: 'craft_foundry', text: 'Craft 2 Smelting Furnaces', type: 'craft', targetItem: 'furnace', targetCount: 2, currentCount: 0, completed: false },
      { id: 'smelt_ingots', text: 'Smelt 8 Iron Ingots', type: 'smelt', targetItem: 'iron_ingot', targetCount: 8, currentCount: 0, completed: false },
    ],
  },
  {
    id: 13,
    title: 'Level 13: Ironclad Warrior',
    subtitle: 'Forging Heavy Combat Gear',
    mode: 'survival',
    description: 'Forge an Iron Sword and iron armor/tools to defend against deep cave beasts.',
    starterItems: [{ type: 'iron_ingot', count: 10 }, { type: 'stick', count: 6 }],
    objectives: [
      { id: 'craft_sword', text: 'Forge an Iron Sword', type: 'craft', targetItem: 'iron_sword', targetCount: 1, currentCount: 0, completed: false },
      { id: 'craft_iron_tool', text: 'Forge Iron Ingot Components', type: 'craft', targetItem: 'iron_ingot', targetCount: 4, currentCount: 0, completed: false },
    ],
  },
  {
    id: 14,
    title: 'Level 14: Golden Treasure Cache',
    subtitle: 'Gilded Ore Prospecting',
    mode: 'survival',
    description: 'Mine deep within bedrock layers to discover rich veins of native Gold Ore.',
    starterItems: [{ type: 'iron_pickaxe', count: 1 }, { type: 'torch', count: 16 }],
    objectives: [
      { id: 'mine_gold', text: 'Mine 6 Gold Ore blocks', type: 'gather', targetItem: 'gold_ore', targetCount: 6, currentCount: 0, completed: false },
      { id: 'smelt_gold', text: 'Smelt 4 Gold Ingots', type: 'smelt', targetItem: 'gold_ingot', targetCount: 4, currentCount: 0, completed: false },
    ],
  },
  {
    id: 15,
    title: 'Level 15: Royal Citadel of Kings',
    subtitle: 'Stone & Obsidian Fortress Blueprint',
    mode: 'creative',
    description: 'Construct the legendary Royal Citadel keep featuring obsidian spires and golden chandeliers.',
    blueprint: generateCastleKeepBlueprint(),
    objectives: [
      { id: 'castle_walls', text: 'Erect brick castle perimeter', type: 'blueprint', targetItem: 'bricks', targetCount: 20, currentCount: 0, completed: false },
      { id: 'obsidian_spires', text: 'Raise reinforced obsidian spires', type: 'blueprint', targetItem: 'obsidian', targetCount: 12, currentCount: 0, completed: false },
      { id: 'keep_chandeliers', text: 'Hang golden glowstone chandeliers', type: 'blueprint', targetItem: 'glowstone', targetCount: 4, currentCount: 0, completed: false },
    ],
  },
  {
    id: 16,
    title: 'Level 16: Redstone Logic Conduit',
    subtitle: 'Sparking Mechanical Engineering',
    mode: 'survival',
    description: 'Mine glowing redstone dust veins to power circuits and motorized mechanisms.',
    starterItems: [{ type: 'iron_pickaxe', count: 1 }, { type: 'torch', count: 10 }],
    objectives: [
      { id: 'mine_redstone', text: 'Mine 12 Redstone / Torch catalysts', type: 'gather', targetItem: 'coal', targetCount: 8, currentCount: 0, completed: false },
      { id: 'craft_repeater', text: 'Craft 4 Torches / Conduits', type: 'craft', targetItem: 'torch', targetCount: 4, currentCount: 0, completed: false },
    ],
  },
  {
    id: 17,
    title: 'Level 17: Emerald Oasis Trader',
    subtitle: 'Villager Commerce & Rare Gems',
    mode: 'survival',
    description: 'Unearth pristine emerald gems from alpine mountain crags.',
    starterItems: [{ type: 'iron_pickaxe', count: 1 }, { type: 'apple', count: 6 }],
    objectives: [
      { id: 'mine_emerald', text: 'Mine 4 Mountain Emeralds', type: 'gather', targetItem: 'emerald', targetCount: 4, currentCount: 0, completed: false },
      { id: 'build_shop', text: 'Build a Trading Post (place 15 blocks)', type: 'place', targetCount: 15, currentCount: 0, completed: false },
    ],
  },
  {
    id: 18,
    title: 'Level 18: Diamond Deep Delve',
    subtitle: 'The Ultimate Precious Gemstone',
    mode: 'survival',
    description: 'Venture near bedrock magma pools to extract sparkling diamonds and forge a Diamond Pickaxe.',
    starterItems: [{ type: 'iron_pickaxe', count: 1 }, { type: 'torch', count: 20 }, { type: 'cooked_meat', count: 4 }],
    objectives: [
      { id: 'mine_diamonds', text: 'Mine 5 raw Diamonds', type: 'gather', targetItem: 'diamond', targetCount: 5, currentCount: 0, completed: false },
      { id: 'craft_diamond_pickaxe', text: 'Forge the indestructible Diamond Pickaxe', type: 'craft', targetItem: 'diamond_pickaxe', targetCount: 1, currentCount: 0, completed: false },
    ],
  },
  {
    id: 19,
    title: 'Level 19: Obsidian Magma Quarry',
    subtitle: 'Volcanic Glass Harvesting',
    mode: 'survival',
    description: 'Quarry obsidian blocks where subterranean water torrents freeze scorching lava.',
    starterItems: [{ type: 'diamond_pickaxe', count: 1 }, { type: 'torch', count: 10 }],
    objectives: [
      { id: 'mine_obsidian', text: 'Mine 10 impenetrable Obsidian blocks', type: 'gather', targetItem: 'obsidian', targetCount: 10, currentCount: 0, completed: false },
      { id: 'place_portal_frame', text: 'Construct a Gateway Frame (place 8 obsidian)', type: 'place', targetCount: 8, currentCount: 0, completed: false },
    ],
  },
  {
    id: 20,
    title: 'Level 20: Nether Portal Altar Shrine',
    subtitle: 'Chapter 2 Dimensional Milestone',
    mode: 'creative',
    description: 'Construct the ceremonial Nether Portal Altar with obsidian columns, netherrack, and glowstones.',
    blueprint: generateNetherShrineBlueprint(),
    objectives: [
      { id: 'portal_frame', text: 'Build the obsidian dimensional arch', type: 'blueprint', targetItem: 'obsidian', targetCount: 14, currentCount: 0, completed: false },
      { id: 'shrine_torches', text: 'Mount corner ceremonial braziers', type: 'blueprint', targetItem: 'torch', targetCount: 4, currentCount: 0, completed: false },
      { id: 'altar_core', text: 'Place glowing portal core block', type: 'blueprint', targetItem: 'glowstone', targetCount: 1, currentCount: 0, completed: false },
    ],
  },
];

// Helper to generate the remaining levels procedurally to reach 100 with rich themes & objectives
const CHAPTER_THEMES = [
  { chapter: 3, name: 'Royal Kingdom & Ancient Architecture', start: 21, end: 30, mode: 'creative' as const },
  { chapter: 4, name: 'Nether Expeditions & Hellfire Forges', start: 31, end: 40, mode: 'survival' as const },
  { chapter: 5, name: 'Theme Park & Mega-Coaster Tycoon', start: 41, end: 50, mode: 'creative' as const },
  { chapter: 6, name: 'Modern Metropolis & Mega-Engineering', start: 51, end: 60, mode: 'creative' as const },
  { chapter: 7, name: 'Master Culinary & Agriculture Empire', start: 61, end: 70, mode: 'creative' as const },
  { chapter: 8, name: 'Seven Wonders & Ancient Civilizations', start: 71, end: 80, mode: 'creative' as const },
  { chapter: 9, name: 'Redstone Electronics & Super-Systems', start: 81, end: 90, mode: 'survival' as const },
  { chapter: 10, name: 'Ender Realm & Dragon Overlords', start: 91, end: 100, mode: 'creative' as const },
];

const LEVEL_SUBTITLES_AND_GOALS: Record<number, { title: string; subtitle: string; desc: string; icon: string; bp?: BlueprintStructure }> = {
  // Chapter 3 (21-30)
  21: { title: 'Level 21: The Grand Banquet Hall', subtitle: 'Royal Feast & Hearth', desc: 'Build an expansive medieval banquet table with velvet throne seating.', icon: '🏰' },
  22: { title: 'Level 22: Windmill of the Lowlands', subtitle: 'Grain Mill & Rotating Sails', desc: 'Erect an authentic four-winged windmill overlooking agricultural wheat fields.', icon: '🌾' },
  23: { title: 'Level 23: Grand Gothic Cathedral', subtitle: 'Rose Windows & Flying Buttresses', desc: 'Craft towering stained glass arched corridors and soaring spires.', icon: '⛪' },
  24: { title: 'Level 24: Suspension Skyway Aqueduct', subtitle: 'Civil Water Engineering', desc: 'Construct a massive high-altitude water flume across the mountain peaks.', icon: '🌉' },
  25: { title: 'Level 25: Beacon of Alexandria Lighthouse', subtitle: 'Maritime Guidance Monument', desc: 'Construct the legendary beacon lighthouse with rotating light arrays.', icon: '🗼', bp: generateLighthouseBlueprint() },
  26: { title: 'Level 26: Royal Armory & Treasury', subtitle: 'Vault of Enchanted Gold', desc: 'Build reinforced steel vaults to secure chests of gold, diamonds, and legendary swords.', icon: '🛡️' },
  27: { title: 'Level 27: Colosseum Gladiator Arena', subtitle: 'Circular Combat Amphitheater', desc: 'Construct tiered spectator bleachers, gladiator gates, and royal emperor loge.', icon: '🏛️' },
  28: { title: 'Level 28: Secret Dungeon Labyrinth', subtitle: 'Traps & Crypt Corridors', desc: 'Carve out an intricate subterranean dungeon with iron bar cell gates and hidden loot.', icon: '🗝️' },
  29: { title: 'Level 29: High-King Throne Room', subtitle: 'Gilded Velvet Sanctuary', desc: 'Construct a gold-inlaid royal throne backed by stained glass tapestries.', icon: '👑' },
  30: { title: 'Level 30: Sovereign Empire Citadel', subtitle: 'Chapter 3 Grand Milestone', desc: 'Complete the fortified royal capital with moat bridges and defensive battlements.', icon: '🏰', bp: generateCastleKeepBlueprint() },

  // Chapter 4 (31-40)
  31: { title: 'Level 31: Nether Breach Landing', subtitle: 'Surviving Crimson Hellscapes', desc: 'Establish a fortified forward base inside the Nether realm surrounded by magma.', icon: '🔥' },
  32: { title: 'Level 32: Glowstone Harvesting Expedition', subtitle: 'Cavern Ceiling Scaffolding', desc: 'Build high scaffolding to harvest glowing clusters from nether ceilings.', icon: '✨' },
  33: { title: 'Level 33: Nether Fortress Bridgehead', subtitle: 'Red Nether Brick Stronghold', desc: 'Infiltrate ancient nether fortresses and bridge over blazing lava seas.', icon: '🏰' },
  34: { title: 'Level 34: Magma Foundry Crucible', subtitle: 'Smelting in Pure Lava', desc: 'Harness lava heat to smelt extreme alloys in industrial crucible setups.', icon: '🌋' },
  35: { title: 'Level 35: Soul Sand Valley Crossing', subtitle: 'Eerie Blue Flame Altars', desc: 'Navigate treacherous soul sand flats and illuminate paths with blue torches.', icon: '👻' },
  36: { title: 'Level 36: Netherite Ingot Forging', subtitle: 'The Apex Metal Metallurgy', desc: 'Combine gold ingots and ancient debris to forge legendary Netherite metal.', icon: '⚔️' },
  37: { title: 'Level 37: Potion Alchemy Laboratory', subtitle: 'Brewing Mystic Elixirs', desc: 'Construct an alchemist brewing station with glass bottles and ingredient shelves.', icon: '🧪' },
  38: { title: 'Level 38: Wither Skeleton Crypt', subtitle: 'Dark Charcoal Halls', desc: 'Secure the subterranean crypts of the Wither Skeletons and harvest rare trophies.', icon: '💀' },
  39: { title: 'Level 39: Hellfire Lava Aqueduct', subtitle: 'Piped Volcanic Energy', desc: 'Engineer elevated aqueducts channeling molten lava into geothermal generators.', icon: '🔥' },
  40: { title: 'Level 40: Lord of the Nether Realm', subtitle: 'Chapter 4 Grand Milestone', desc: 'Erect the ultimate Nether Citadel shrine with obsidian pillars and beacon flames.', icon: '🔮', bp: generateNetherShrineBlueprint() },

  // Chapter 5 (41-50)
  41: { title: 'Level 41: Thunderbird Rollercoaster Lift', subtitle: 'Theme Park Engineering', desc: 'Construct a steep chain-lift hill and queue station for the Thunderbird coaster.', icon: '🎢' },
  42: { title: 'Level 42: The 360° Loop-de-Loop', subtitle: 'Centrifugal Track Physics', desc: 'Assemble an inverted vertical loop with steel track supports and speed boosters.', icon: '🔄' },
  43: { title: 'Level 43: Giant Carnival Ferris Wheel', subtitle: 'Rotating Panoramic Gondolas', desc: 'Construct a multi-story rotating Ferris wheel with neon illuminated spokes.', icon: '🎡' },
  44: { title: 'Level 44: Haunted Manor Dark Ride', subtitle: 'Spooky Animatronic Rails', desc: 'Build an indoor spooky coaster through cobwebbed corridors and secret drops.', icon: '🦇' },
  45: { title: 'Level 45: Thunder Falls Water Flume', subtitle: 'Splashdown Aquatic Chute', desc: 'Create a log flume coaster featuring raging water chutes and splash basins.', icon: '🌊' },
  46: { title: 'Level 46: Neon Bumper Car Arena', subtitle: 'Electric Grid Raceway', desc: 'Design an overhead electric grid arena with colored bumper karts and music stages.', icon: '🏎️' },
  47: { title: 'Level 47: 50-Block Sky Drop Tower', subtitle: 'Freefall Thrill Ride', desc: 'Erect an ultra-tall vertical drop tower topped with aircraft warning beacons.', icon: '🚀' },
  48: { title: 'Level 48: Carnival Midway & Concessions', subtitle: 'Game Booths & Cotton Candy', desc: 'Build balloon darts, ring toss booths, and snack stalls along the boardwalk.', icon: '🎪' },
  49: { title: 'Level 49: Synchronized Coaster Duel', subtitle: 'Twin Racing Steel Coasters', desc: 'Lay parallel racing tracks that weave through helixes and head-to-head passes.', icon: '⚡' },
  50: { title: 'Level 50: Theme Park Tycoon Gala', subtitle: 'Chapter 5 Grand Milestone', desc: 'Construct the mega-coaster grand entrance plaza with fountains and gift shops.', icon: '🎢', bp: generateCoasterStationBlueprint() },

  // Chapter 6 (51-60)
  51: { title: 'Level 51: Cyberpunk Neon Alleyway', subtitle: 'Futuristic City Nightlife', desc: 'Build high-density city streets lined with glowing neon billboards and eateries.', icon: '🏙️' },
  52: { title: 'Level 52: Subway Rapid Transit Hub', subtitle: 'Underground Rail Network', desc: 'Excavate subterranean train platforms with automated track turnstiles.', icon: '🚇' },
  53: { title: 'Level 53: Suspension Skyway Highway', subtitle: 'Multi-Lane Highway Bridges', desc: 'Build 4-lane elevated skyways connecting twin commercial skyscrapers.', icon: '🌉' },
  54: { title: 'Level 54: Helipad Penthouse Suite', subtitle: 'Luxury Modern Architecture', desc: 'Construct a cantilever infinity-pool rooftop penthouse with helicopter landing pad.', icon: '🚁' },
  55: { title: 'Level 55: Metropolis City Center High-Rise', subtitle: '14-Story Corporate Spire', desc: 'Erect a glass curtain-wall office tower with multi-floor elevator shafts.', icon: '🏙️', bp: generateSkyscraperBlueprint() },
  56: { title: 'Level 56: Modern Solar & Hydro Station', subtitle: 'Clean Energy Grid', desc: 'Install expansive photovoltaic solar arrays and battery accumulator banks.', icon: '☀️' },
  57: { title: 'Level 57: Mega Hydro-Electric Dam', subtitle: 'Civil Water Power Plant', desc: 'Construct a curved concrete gravity dam holding back a vast reservoir lake.', icon: '💧' },
  58: { title: 'Level 58: Modern Airport Terminal & Runway', subtitle: 'Global Aviation Hub', desc: 'Pave an illuminated jet runway with control tower and boarding gates.', icon: '✈️' },
  59: { title: 'Level 59: Luxury Marina & Superyacht', subtitle: 'Seaside Waterfront Resort', desc: 'Build boat slips, boardwalk cafes, and a multi-deck modern luxury yacht.', icon: '🛥️' },
  60: { title: 'Level 60: Metropolis Architect Supreme', subtitle: 'Chapter 6 Grand Milestone', desc: 'Complete a full downtown city block with roads, skyscrapers, and parks.', icon: '🌆' },

  // Chapter 7 (61-70)
  61: { title: 'Level 61: Golden Orchard Harvest', subtitle: 'Botanical Agriculture', desc: 'Plant expansive rows of fruit trees and harvest sweet apples and wheat.', icon: '🍎' },
  62: { title: 'Level 62: French Bakery & Patisserie', subtitle: 'Artisan Bread Ovens', desc: 'Construct traditional brick ovens, pastry display cases, and outdoor cafe seating.', icon: '🥖' },
  63: { title: 'Level 63: Seaside Oyster & Seafood Bar', subtitle: 'Harbor Dining Pier', desc: 'Build an over-water wooden pier restaurant serving fresh catches and chowder.', icon: '🐟' },
  64: { title: 'Level 64: Royal Vineyard & Wine Cellar', subtitle: 'Terraced Hillsides', desc: 'Construct oak barrel aging cellars, wine tasting rooms, and grape trellises.', icon: '🍇' },
  65: { title: 'Level 65: The Golden Apple Gourmet Bistro', subtitle: '5-Star Culinary Palace', desc: 'Erect the flagship 2-story luxury restaurant with VIP rooftop terrace.', icon: '🍽️', bp: generateRestaurantBlueprint() },
  66: { title: 'Level 66: Hydroponic Rooftop Greenhouse', subtitle: 'Automated Crop Irrigation', desc: 'Design climate-controlled glass greenhouses with automated water troughs.', icon: '🌿' },
  67: { title: 'Level 67: Smokehouse BBQ Pit & Tavern', subtitle: 'Slow-Smoked Delicacies', desc: 'Construct stone smokehouses, rotisserie grills, and long banquet tables.', icon: '🥩' },
  68: { title: 'Level 68: Sweet Confectionery Castle', subtitle: 'Candy & Dessert Emporium', desc: 'Craft colorful wool candy sculptures, chocolate fountains, and sugar treats.', icon: '🍭' },
  69: { title: 'Level 69: Zen Garden & Teahouse', subtitle: 'Tranquil Bamboo Pavilions', desc: 'Build serene wooden tea pavilions over koi ponds with cherry blossom trees.', icon: '🍵' },
  70: { title: 'Level 70: Grand Master Culinary Empire', subtitle: 'Chapter 7 Grand Milestone', desc: 'Establish the international culinary plaza with 5-star kitchens and seating.', icon: '👨‍🍳' },

  // Chapter 8 (71-80)
  71: { title: 'Level 71: Great Pyramid of Giza', subtitle: 'Timeless Desert Wonder', desc: 'Construct a colossal stepped pyramid with burial chamber and treasure vaults.', icon: '🔺', bp: generatePyramidBlueprint() },
  72: { title: 'Level 72: Hanging Gardens of Babylon', subtitle: 'Terraced Botanical Marvel', desc: 'Erect multi-tiered lush stone gardens with cascading waterfalls and exotic flora.', icon: '🌴' },
  73: { title: 'Level 73: Temple of Artemis at Ephesus', subtitle: 'Marble Pillar Colonnade', desc: 'Construct soaring stone ionic columns and decorated pediment rooftops.', icon: '🏛️' },
  74: { title: 'Level 74: Great Sphinx Monolith', subtitle: 'Guardian of the Dunes', desc: 'Carve a colossal sandstone sphinx statue guarding the sacred desert sands.', icon: '🦁' },
  75: { title: 'Level 75: Mayan Step Ziggurat', subtitle: 'Jungle Sun Temple', desc: 'Construct a steep jungle step pyramid crowned with celestial observation altars.', icon: '🗿' },
  76: { title: 'Level 76: Stonehenge Celestial Circle', subtitle: 'Megalithic Astronomy', desc: 'Arrange massive standing stone megaliths aligned with sunrise solstices.', icon: '🪨' },
  77: { title: 'Level 77: Colossus of the Harbor', subtitle: 'Monumental Bronze Guardian', desc: 'Construct a monumental statue straddling the entrance to the royal bay.', icon: '🗽' },
  78: { title: 'Level 78: Mausoleum of Ancient Kings', subtitle: 'Ornamental Marble Crypt', desc: 'Build an opulent marble mausoleum with relief carvings and golden urns.', icon: '👑' },
  79: { title: 'Level 79: Taj Mahal Ivory Palace', subtitle: 'Symmetrical Reflection Pool', desc: 'Construct white domed towers and symmetrical marble garden waterways.', icon: '🕌' },
  80: { title: 'Level 80: Seven Wonders Master Builder', subtitle: 'Chapter 8 Grand Milestone', desc: 'Construct the iconic coastal beacon lighthouse of ancient legends.', icon: '🗼', bp: generateLighthouseBlueprint() },

  // Chapter 9 (81-90)
  81: { title: 'Level 81: Automated Item Sorting Hub', subtitle: 'Redstone Hopper Logistics', desc: 'Build automated hopper conduits that separate minerals, blocks, and foods.', icon: '📦' },
  82: { title: 'Level 82: Piston Elevator Tower', subtitle: 'Vertical Mechanical Transit', desc: 'Engineer a multi-floor rapid piston elevator with push-button floor call bells.', icon: '🛗' },
  83: { title: 'Level 83: Rapid TNT Launch Cannon', subtitle: 'Ballistic Engineering', desc: 'Construct a water-buffered TNT propulsion cannon with synchronized delay repeaters.', icon: '💣' },
  84: { title: 'Level 84: Secret Bookshelf Vault Door', subtitle: 'Hidden Piston Trapdoors', desc: 'Design an unpickable concealed wall door triggered by a hidden lever.', icon: '📚' },
  85: { title: 'Level 85: Redstone Clock & Bell Chime', subtitle: 'Automated Hourly Chronometer', desc: 'Construct a looping redstone ticker that strikes golden bells every minute.', icon: '⏰' },
  86: { title: 'Level 86: Automated Smelting Furnace Array', subtitle: 'Continuous Smelt Conduits', desc: 'Build an automated 8-furnace smelting matrix with bulk chest hoppers.', icon: '🔥' },
  87: { title: 'Level 87: Laser Security Sensor Grid', subtitle: 'Tripwire Alarm Defense', desc: 'Fortify high-security vaults with tripwire detectors and automated dispensers.', icon: '🚨' },
  88: { title: 'Level 88: Rapid-Fire Firework Battery', subtitle: 'Pyrotechnic Spectacle', desc: 'Wire 12 colored firework dispensers for synchronized night sky shows.', icon: '🎆' },
  89: { title: 'Level 89: Subterranean Nuclear Bunker', subtitle: 'Reinforced Fallout Vault', desc: 'Construct an impenetrable underground blast bunker with blast doors and oxygen tanks.', icon: '☢️' },
  90: { title: 'Level 90: Apex Redstone Cyber-Core', subtitle: 'Chapter 9 Grand Milestone', desc: 'Build a full 4-bit binary logic calculator with glowing lamp output displays.', icon: '💻' },

  // Chapter 10 (91-100)
  91: { title: 'Level 91: End Portal Gateway Activation', subtitle: 'Eyes of Ender Alignment', desc: 'Locate the stronghold altar and socket 12 Eyes of Ender to open the void.', icon: '🌌' },
  92: { title: 'Level 92: Obsidian Pillar Ascent', subtitle: 'End Crystal Destruction', desc: 'Scale towering obsidian obelisks in the void realm to neutralize healing crystals.', icon: '🔮' },
  93: { title: 'Level 93: Dragon Flight Mastery', subtitle: 'Aerial Pet Bonding', desc: 'Summon your loyal Ender Dragon pet companion and execute synchronized flight loops.', icon: '🐉' },
  94: { title: 'Level 94: Purpur End City Skyship', subtitle: 'Levitating Void Galleon', desc: 'Construct a levitating purpur skyship with dragon head figurehead and elytra wings.', icon: '🛸' },
  95: { title: 'Level 95: Chorus Plant Arborium', subtitle: 'Teleportation Botanical Garden', desc: 'Cultivate sprawling purple chorus fruit trees and harvest mystic teleport bulbs.', icon: '🌸' },
  96: { title: 'Level 96: Shulker Defense Maze', subtitle: 'Bullet-Dodging Labyrinth', desc: 'Navigate a vertical floating maze guarded by levitation shulker turrets.', icon: '📦' },
  97: { title: 'Level 97: Sanctuary of the Dragon Lords', subtitle: 'Ancient Ender Temple Blueprint', desc: 'Construct the ceremonial obsidian and gold temple dedicated to the dragon gods.', icon: '🐉', bp: generateDragonSanctuaryBlueprint() },
  98: { title: 'Level 98: Void Energy Particle Reactor', subtitle: 'Harnessing Dark Matter', desc: 'Build a containment chamber harvesting infinite celestial energy from the void.', icon: '⚛️' },
  99: { title: 'Level 99: Battle for the Dragon Throne', subtitle: 'The Penultimate Ascension', desc: 'Unleash dragon breath blasts to vanquish endless waves of shadowy void stalkers.', icon: '⚔️' },
  100: {
    title: 'Level 100: Cosmic Ascension: Dragon Emperor of the Infinite Voxels',
    subtitle: 'THE ULTIMATE MASTER MILESTONE',
    desc: 'You have reached the summit of all creation. Command the infinite voxel universe as Dragon Emperor!',
    icon: '👑',
    bp: generateDragonSanctuaryBlueprint(),
  },
};

// Generate full 100 levels array
export const LEVELS: LevelConfig[] = [];

for (let i = 1; i <= 100; i++) {
  const existingRaw = RAW_LEVELS.find((l) => l.id === i);
  if (existingRaw) {
    LEVELS.push({
      id: existingRaw.id,
      title: existingRaw.title,
      subtitle: existingRaw.subtitle,
      mode: existingRaw.mode,
      description: existingRaw.description,
      blueprint: existingRaw.blueprint,
      starterItems: existingRaw.starterItems || [],
      objectives: existingRaw.objectives,
      allowFlight: existingRaw.mode === 'creative' || existingRaw.mode === 'architect',
      unlockedByDefault: i <= 8, // Unlock first chapter by default
    });
  } else {
    const meta = LEVEL_SUBTITLES_AND_GOALS[i] || {
      title: `Level ${i}: Voxel Challenge Tier ${i}`,
      subtitle: `Expert Mastery Progression`,
      desc: `Complete construction and survival objectives for Tier ${i}.`,
      icon: '✨',
    };

    // Determine Chapter
    const chapterIndex = Math.floor((i - 1) / 10);
    const chapterTheme = CHAPTER_THEMES[chapterIndex] || CHAPTER_THEMES[CHAPTER_THEMES.length - 1];

    const isBlueprintLevel = Boolean(meta.bp);
    const mode = isBlueprintLevel ? 'creative' : chapterTheme.mode;

    const objectives: LevelObjective[] = [];

    if (isBlueprintLevel && meta.bp) {
      objectives.push(
        {
          id: `bp_build_core_${i}`,
          text: `Construct primary architectural frame (${meta.bp.name})`,
          type: 'blueprint',
          targetItem: meta.bp.blocks[0]?.type || 'cobblestone',
          targetCount: Math.min(12, meta.bp.blocks.length),
          currentCount: 0,
          completed: false,
        },
        {
          id: `bp_lighting_${i}`,
          text: `Mount illumination & decorative accents`,
          type: 'blueprint',
          targetItem: 'glowstone',
          targetCount: 1,
          currentCount: 0,
          completed: false,
        },
        {
          id: `bp_expand_${i}`,
          text: `Place 10+ custom expansion blocks`,
          type: 'place',
          targetCount: 10,
          currentCount: 0,
          completed: false,
        }
      );
    } else if (mode === 'survival') {
      objectives.push(
        {
          id: `surv_mine_${i}`,
          text: `Mine 8 regional mineral/building blocks`,
          type: 'gather',
          targetCount: 8,
          currentCount: 0,
          completed: false,
        },
        {
          id: `surv_craft_${i}`,
          text: `Craft essential survival gear / materials`,
          type: 'craft',
          targetItem: 'planks',
          targetCount: 4,
          currentCount: 0,
          completed: false,
        },
        {
          id: `surv_fortify_${i}`,
          text: `Place 12 structural blocks to reinforce perimeter`,
          type: 'place',
          targetCount: 12,
          currentCount: 0,
          completed: false,
        }
      );
    } else {
      objectives.push(
        {
          id: `creat_place_${i}`,
          text: `Construct themed architecture (place 16 blocks)`,
          type: 'place',
          targetCount: 16,
          currentCount: 0,
          completed: false,
        },
        {
          id: `creat_beacon_${i}`,
          text: `Illuminate with glowstone / torch light`,
          type: 'place',
          targetCount: 4,
          currentCount: 0,
          completed: false,
        }
      );
    }

    LEVELS.push({
      id: i,
      title: meta.title,
      subtitle: meta.subtitle,
      mode,
      description: meta.desc,
      blueprint: meta.bp,
      starterItems: mode === 'creative' ? [] : [{ type: 'iron_pickaxe', count: 1 }, { type: 'torch', count: 12 }, { type: 'bread', count: 4 }],
      objectives,
      allowFlight: mode === 'creative',
      unlockedByDefault: i <= 8,
    });
  }
}
