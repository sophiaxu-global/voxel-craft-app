export type GameMode = 'survival' | 'creative' | 'architect';

export type BlockType =
  | 'air'
  | 'grass'
  | 'dirt'
  | 'stone'
  | 'cobblestone'
  | 'mossy_cobblestone'
  | 'wood'
  | 'planks'
  | 'leaves'
  | 'glass'
  | 'sand'
  | 'sandstone'
  | 'gravel'
  | 'bedrock'
  | 'spruce_wood'
  | 'spruce_leaves'
  | 'birch_wood'
  | 'cactus'
  | 'snow'
  | 'ice'
  | 'chest'
  | 'farmland'
  | 'coal_ore'
  | 'iron_ore'
  | 'gold_ore'
  | 'diamond_ore'
  | 'obsidian'
  | 'bricks'
  | 'bookshelf'
  | 'crafting_table'
  | 'furnace'
  | 'torch'
  | 'glowstone'
  | 'tnt'
  | 'water'
  | 'iron_block'
  | 'gold_block'
  | 'diamond_block'
  | 'dragon_egg'
  | 'red_wool'
  | 'blue_wool'
  | 'yellow_wool'
  | 'rail'
  | 'powered_rail'
  | 'detector_rail'
  | 'activator_rail';

export type ItemType =
  | BlockType
  | 'minecart'
  | 'emerald'
  | 'stick'
  | 'wooden_pickaxe'
  | 'stone_pickaxe'
  | 'iron_pickaxe'
  | 'diamond_pickaxe'
  | 'wooden_axe'
  | 'stone_axe'
  | 'iron_axe'
  | 'wooden_sword'
  | 'stone_sword'
  | 'iron_sword'
  | 'diamond_sword'
  | 'iron_ingot'
  | 'gold_ingot'
  | 'diamond'
  | 'coal'
  | 'apple'
  | 'golden_apple'
  | 'bread'
  | 'cooked_apple'
  | 'raw_meat'
  | 'cooked_meat'
  | 'gunpowder'
  | 'bone'
  | 'arrow'
  | 'bow'
  | 'rotten_flesh'
  | 'ender_pearl'
  | 'leather'
  | 'raw_porkchop'
  | 'cooked_porkchop'
  | 'wool';

export interface ItemStack {
  id?: string;
  type: ItemType;
  count: number;
}

export interface InventoryState {
  hotbar: (ItemStack | null)[];
  main: (ItemStack | null)[];
  selectedSlot: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  gridSize: 2 | 3;
  pattern: (ItemType | null)[]; // 4 for 2x2, 9 for 3x3
  result: {
    type: ItemType;
    count: number;
  };
  category: 'tools' | 'blocks' | 'materials' | 'food';
}

export interface BlueprintBlock {
  x: number;
  y: number;
  z: number;
  type: BlockType;
}

export interface BlueprintStructure {
  id: string;
  name: string;
  description: string;
  dimensions: { width: number; height: number; depth: number };
  blocks: BlueprintBlock[];
  previewIcon: string;
}

export interface LevelObjective {
  id: string;
  text: string;
  type: 'gather' | 'craft' | 'place' | 'survive' | 'blueprint' | 'smelt';
  targetItem?: ItemType;
  targetCount: number;
  currentCount: number;
  completed: boolean;
}

export interface LevelConfig {
  id: number;
  title: string;
  subtitle: string;
  mode: GameMode;
  description: string;
  objectives: LevelObjective[];
  blueprint?: BlueprintStructure;
  worldSeed?: number;
  spawnPosition?: [number, number, number];
  starterItems?: { type: ItemType; count: number }[];
  timeSpeed?: number;
  allowFlight?: boolean;
  unlockedByDefault?: boolean;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  hunger: number;
  maxHunger: number;
  oxygen: number;
  xp: number;
  level: number;
  isGrounded: boolean;
  isFlying: boolean;
  isSneaking: boolean;
  isSprinting: boolean;
  godMode?: boolean;
  instaMine?: boolean;
  superSpeed?: boolean;
  megaJump?: boolean;
  superRegen?: boolean;
  extendedReach?: boolean;
  forcefield?: boolean;
  supermineDrill?: boolean;
  thunderBoltReady?: boolean;
  isRidingCoaster?: boolean;
  coasterSpeed?: number;
  coasterGForce?: number;
  coasterSection?: string;
  coasterAltitude?: number;
  isRidingMinecart?: boolean;
  minecartSpeed?: number;
  minecartTrackType?: string;
  minecartIsAutoCruise?: boolean;
}

export interface MinecartEntity {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  isRidden: boolean;
  speed: number;
  mesh?: any;
}

export interface CoasterRideState {
  isRiding: boolean;
  speedKmh: number;
  gForce: number;
  sectionName: string;
  altitude: number;
  isBoosting: boolean;
  isBraking: boolean;
  perspective: 'first' | 'third' | 'cinematic';
}

export interface MobEntity {
  id: string;
  type: 'zombie' | 'creeper' | 'skeleton' | 'enderman' | 'pig' | 'cow' | 'sheep' | 'villager';
  x: number;
  y: number;
  z: number;
  vx?: number;
  vy?: number;
  vz?: number;
  isGrounded?: boolean;
  health: number;
  maxHealth: number;
  rotation: number;
  headYaw?: number;
  headPitch?: number;
  mesh?: any;
  fuseTimer?: number;
  isFusing?: boolean;
  shootCooldown?: number;
  teleportCooldown?: number;
  heldBlock?: string;
  hurtTimer?: number;
  deathTimer?: number;
  isDead?: boolean;
  state?: 'idle' | 'chase' | 'flee' | 'strafe' | 'attack';
  idleTimer?: number;
  idleSoundTimer?: number;
  wanderAngle?: number;
  burnTimer?: number;
}

export interface ChestContainer {
  id: string;
  x: number;
  y: number;
  z: number;
  title: string;
  items: (ItemStack | null)[]; // 27 slots (9x3 chest grid)
}

export interface WorldDropEntity {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  mesh: any;
  life: number;
  count: number;
}

export interface ProjectileEntity {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  mesh: any;
  life: number;
}
