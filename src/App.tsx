import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BlueprintAssistantHUD } from './components/BlueprintAssistantHUD';
import { ChestModal } from './components/ChestModal';
import { GameHUD } from './components/GameHUD';
import { InventoryModal } from './components/InventoryModal';
import { LevelSelectModal } from './components/LevelSelectModal';
import { RecipeBookModal } from './components/RecipeBookModal';
import { SettingsModal } from './components/SettingsModal';
import { TouchControls } from './components/TouchControls';
import { VictoryModal } from './components/VictoryModal';
import { VoxelCanvas } from './components/VoxelCanvas';
import { CameraPerspective, PlayerController } from './engine/PlayerController';
import { BlockType, ChestContainer, CraftingRecipe, InventoryState, ItemType, LevelConfig, PlayerStats } from './types';
import { soundManager } from './utils/audio';
import { LEVELS } from './utils/levels';

export default function App() {
  const playerControllerRef = useRef<PlayerController | null>(null);

  // Level & Progression State
  const [currentLevelId, setCurrentLevelId] = useState<number>(1);
  const [unlockedLevelIds, setUnlockedLevelIds] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8]);
  const [levelStars, setLevelStars] = useState<Record<number, number>>({});
  const [currentLevel, setCurrentLevel] = useState<LevelConfig>(() => {
    return JSON.parse(JSON.stringify(LEVELS[0]));
  });

  // Player Stats & Time
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    health: 20,
    maxHealth: 20,
    hunger: 20,
    maxHunger: 20,
    oxygen: 20,
    xp: 0,
    level: 1,
    isGrounded: true,
    isFlying: false,
    isSneaking: false,
    isSprinting: false,
  });
  const [timeOfDay, setTimeOfDay] = useState<number>(0.25); // 0.25 = Noon
  const [isAutoWalking, setIsAutoWalking] = useState<boolean>(false);
  const [isSprinting, setIsSprinting] = useState<boolean>(false);
  const [showOnScreenControls, setShowOnScreenControls] = useState<boolean>(false);

  // Camera & Interaction
  const [perspective, setPerspective] = useState<CameraPerspective>('first');
  const [isPointerLocked, setIsPointerLocked] = useState<boolean>(false);
  const [mouseSensitivity, setMouseSensitivity] = useState<number>(0.0022);

  // Audio
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.6);

  // Blueprint Controls
  const [blueprintLayer, setBlueprintLayer] = useState<number>(99);
  const [showBlueprintGhost, setShowBlueprintGhost] = useState<boolean>(true);
  const [blueprintProgress, setBlueprintProgress] = useState<{
    totalBlocks: number;
    correctBlocks: number;
    misplacedBlocks: number;
    accuracyPercent: number;
    blockTypeCounts: Record<string, { target: number; current: number }>;
  }>({
    totalBlocks: 0,
    correctBlocks: 0,
    misplacedBlocks: 0,
    accuracyPercent: 0,
    blockTypeCounts: {},
  });

  // Modal Views
  const [isInventoryOpen, setIsInventoryOpen] = useState<boolean>(false);
  const [isRecipeBookOpen, setIsRecipeBookOpen] = useState<boolean>(false);
  const [isLevelSelectOpen, setIsLevelSelectOpen] = useState<boolean>(false);
  const [isBlueprintHUDOpen, setIsBlueprintHUDOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isVictoryOpen, setIsVictoryOpen] = useState<boolean>(false);
  const [activeChest, setActiveChest] = useState<ChestContainer | null>(null);

  // Inventory State
  const [inventory, setInventory] = useState<InventoryState>(() => {
    const hotbar = new Array(9).fill(null);
    const main = new Array(27).fill(null);

    // Initial Starter Items for Level 1
    hotbar[0] = { id: 'wood_start', type: 'wood', count: 2 };
    hotbar[1] = { id: 'apple_start', type: 'apple', count: 3 };

    return { hotbar, main, selectedSlot: 0 };
  });

  // Load Level configuration & initialize items
  const loadLevel = useCallback((levelId: number) => {
    const template = LEVELS.find((l) => l.id === levelId) || LEVELS[0];
    const freshLevel: LevelConfig = JSON.parse(JSON.stringify(template));
    setCurrentLevelId(levelId);
    setCurrentLevel(freshLevel);
    setIsVictoryOpen(false);

    // Initialize Inventory for level mode
    const hotbar = new Array(9).fill(null);
    const main = new Array(27).fill(null);

    if (freshLevel.starterItems && freshLevel.starterItems.length > 0) {
      freshLevel.starterItems.forEach((it, idx) => {
        if (idx < 9) {
          hotbar[idx] = { id: `${it.type}_${Date.now()}_${idx}`, type: it.type, count: it.count };
        }
      });
    } else if (freshLevel.mode === 'creative' || freshLevel.mode === 'architect') {
      // Setup default creative building hotbar
      hotbar[0] = { id: 'c1', type: 'cobblestone', count: 64 };
      hotbar[1] = { id: 'c2', type: 'planks', count: 64 };
      hotbar[2] = { id: 'c3', type: 'glass', count: 64 };
      hotbar[3] = { id: 'c4', type: 'wood', count: 64 };
      hotbar[4] = { id: 'c5', type: 'torch', count: 64 };
      hotbar[5] = { id: 'c6', type: 'glowstone', count: 64 };
      hotbar[6] = { id: 'c7', type: 'bricks', count: 64 };
      hotbar[7] = { id: 'c8', type: 'obsidian', count: 64 };
      hotbar[8] = { id: 'c9', type: 'diamond_pickaxe', count: 1 };
    }

    setInventory({ hotbar, main, selectedSlot: 0 });
    setBlueprintLayer(99);
    setShowBlueprintGhost(true);
    if (freshLevel.blueprint) {
      setIsBlueprintHUDOpen(true);
    } else {
      setIsBlueprintHUDOpen(false);
    }
  }, []);

  // Check Objective Completion and Level Victory
  const checkLevelCompletion = useCallback((updatedLevel: LevelConfig) => {
    const allCompleted = updatedLevel.objectives.every((o) => o.completed);
    if (allCompleted && !isVictoryOpen) {
      // Award Stars (3 stars default for full completion)
      const stars = 3;
      setLevelStars((prev) => ({ ...prev, [updatedLevel.id]: stars }));

      // Unlock Next Level
      const nextId = updatedLevel.id + 1;
      if (nextId <= LEVELS.length && !unlockedLevelIds.includes(nextId)) {
        setUnlockedLevelIds((prev) => [...prev, nextId]);
      }

      setIsVictoryOpen(true);
    }
  }, [isVictoryOpen, unlockedLevelIds]);

  // Event: Block Broken
  const handleBlockBroken = useCallback((brokenType: BlockType) => {
    setCurrentLevel((prev) => {
      const next = { ...prev, objectives: [...prev.objectives] };
      let changed = false;

      next.objectives.forEach((obj) => {
        if (!obj.completed && obj.type === 'gather') {
          if (!obj.targetItem || obj.targetItem === brokenType || (obj.targetItem === 'cobblestone' && brokenType === 'stone') || (obj.targetItem === 'dirt' && brokenType === 'grass')) {
            obj.currentCount += 1;
            if (obj.currentCount >= obj.targetCount) {
              obj.completed = true;
            }
            changed = true;
          }
        }
      });

      if (changed) {
        checkLevelCompletion(next);
      }
      return next;
    });
  }, [checkLevelCompletion]);

  // Event: Block Placed
  const handleBlockPlaced = useCallback((placedType: BlockType) => {
    setCurrentLevel((prev) => {
      const next = { ...prev, objectives: [...prev.objectives] };
      let changed = false;

      next.objectives.forEach((obj) => {
        if (!obj.completed && obj.type === 'place') {
          obj.currentCount += 1;
          if (obj.currentCount >= obj.targetCount) {
            obj.completed = true;
          }
          changed = true;
        }
      });

      if (changed) {
        checkLevelCompletion(next);
      }
      return next;
    });
  }, [checkLevelCompletion]);

  // Event: Item Crafted
  const handleCraftEvent = useCallback((craftedItem: ItemType, count: number) => {
    setCurrentLevel((prev) => {
      const next = { ...prev, objectives: [...prev.objectives] };
      let changed = false;

      next.objectives.forEach((obj) => {
        if (!obj.completed && obj.type === 'craft') {
          if (obj.targetItem === craftedItem) {
            obj.currentCount += count;
            if (obj.currentCount >= obj.targetCount) {
              obj.completed = true;
            }
            changed = true;
          }
        }
      });

      if (changed) {
        checkLevelCompletion(next);
      }
      return next;
    });
  }, [checkLevelCompletion]);

  // Event: Item Smelted
  const handleSmeltEvent = useCallback((smeltedItem: ItemType, count: number) => {
    setCurrentLevel((prev) => {
      const next = { ...prev, objectives: [...prev.objectives] };
      let changed = false;

      next.objectives.forEach((obj) => {
        if (!obj.completed && obj.type === 'smelt') {
          if (obj.targetItem === smeltedItem) {
            obj.currentCount += count;
            if (obj.currentCount >= obj.targetCount) {
              obj.completed = true;
            }
            changed = true;
          }
        }
      });

      if (changed) {
        checkLevelCompletion(next);
      }
      return next;
    });
  }, [checkLevelCompletion]);

  // Event: Blueprint Progress Update
  const handleUpdateBlueprintProgress = useCallback((progress: any) => {
    setBlueprintProgress(progress);

    setCurrentLevel((prev) => {
      if (!prev.blueprint) return prev;
      const next = { ...prev, objectives: [...prev.objectives] };
      let changed = false;

      next.objectives.forEach((obj) => {
        if (obj.type === 'blueprint') {
          if (obj.targetItem && progress.blockTypeCounts[obj.targetItem]) {
            const current = progress.blockTypeCounts[obj.targetItem].current;
            if (current !== obj.currentCount) {
              obj.currentCount = current;
              if (obj.currentCount >= obj.targetCount) {
                obj.completed = true;
              }
              changed = true;
            }
          } else if (!obj.targetItem) {
            // Overall blueprint accuracy objective
            if (progress.accuracyPercent !== obj.currentCount) {
              obj.currentCount = progress.accuracyPercent;
              if (obj.currentCount >= obj.targetCount) {
                obj.completed = true;
              }
              changed = true;
            }
          }
        }
      });

      if (changed) {
        checkLevelCompletion(next);
      }
      return next;
    });
  }, [checkLevelCompletion]);

  // Movement & Interaction Handlers
  const handleDirectionPress = useCallback((key: string, isDown: boolean) => {
    if (playerControllerRef.current) {
      playerControllerRef.current.keys[key] = isDown;
      // Also map standard letter aliases
      if (key === 'KeyW') { playerControllerRef.current.keys['w'] = isDown; playerControllerRef.current.keys['W'] = isDown; }
      if (key === 'KeyA') { playerControllerRef.current.keys['a'] = isDown; playerControllerRef.current.keys['A'] = isDown; }
      if (key === 'KeyS') { playerControllerRef.current.keys['s'] = isDown; playerControllerRef.current.keys['S'] = isDown; }
      if (key === 'KeyD') { playerControllerRef.current.keys['d'] = isDown; playerControllerRef.current.keys['D'] = isDown; }
    }
  }, []);

  const handleJumpPress = useCallback((isDown: boolean) => {
    if (playerControllerRef.current) {
      playerControllerRef.current.keys['Space'] = isDown;
      playerControllerRef.current.keys[' '] = isDown;
    }
  }, []);

  const handleCrouchPress = useCallback((isDown: boolean) => {
    if (playerControllerRef.current) {
      playerControllerRef.current.keys['ShiftLeft'] = isDown;
      playerControllerRef.current.keys['Shift'] = isDown;
    }
  }, []);

  const handleMinePress = useCallback((isDown: boolean) => {
    if (playerControllerRef.current) {
      playerControllerRef.current.isMining = isDown;
      if (isDown) {
        playerControllerRef.current.triggerSwing();
      }
    }
  }, []);

  const handlePlacePress = useCallback(() => {
    if (playerControllerRef.current) {
      const activeItem = inventory.hotbar[inventory.selectedSlot]?.type || null;
      const placed = playerControllerRef.current.tryPlaceBlock(activeItem);
      if (placed) {
        handleBlockPlaced(placed.type);
        if (playerControllerRef.current.mode === 'survival') {
          setInventory((prev) => {
            const newInv = { ...prev, hotbar: [...prev.hotbar] };
            const item = newInv.hotbar[prev.selectedSlot];
            if (item) {
              item.count -= 1;
              if (item.count <= 0) {
                newInv.hotbar[prev.selectedSlot] = null;
              }
            }
            return newInv;
          });
        }
      }
    }
  }, [inventory, handleBlockPlaced]);

  const handleTeleportToSpawn = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.teleportToSafeSpawn();
      soundManager.playStep();
    }
  }, []);

  const handleToggleAutoWalk = useCallback(() => {
    if (playerControllerRef.current) {
      const next = playerControllerRef.current.toggleAutoWalk();
      setIsAutoWalking(next);
    }
  }, []);

  const handleToggleFlight = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.stats.isFlying = !playerControllerRef.current.stats.isFlying;
      setPlayerStats((prev) => ({ ...prev, isFlying: playerControllerRef.current!.stats.isFlying }));
      soundManager.playStep();
    } else {
      setPlayerStats((prev) => ({ ...prev, isFlying: !prev.isFlying }));
    }
  }, []);

  const handleSetGameMode = useCallback((newMode: 'survival' | 'creative' | 'architect') => {
    setCurrentLevel((prev) => ({
      ...prev,
      mode: newMode,
    }));

    if (playerControllerRef.current) {
      playerControllerRef.current.setGameMode(newMode);
      setPlayerStats((prev) => ({
        ...prev,
        isFlying: playerControllerRef.current!.stats.isFlying,
        godMode: playerControllerRef.current!.stats.godMode,
        instaMine: playerControllerRef.current!.stats.instaMine,
      }));
    }

    if (newMode === 'creative' || newMode === 'architect') {
      // Ensure player has rich building materials in hotbar if empty
      setInventory((prev) => {
        const hasBlocks = prev.hotbar.some((item) => item !== null);
        if (!hasBlocks) {
          const hotbar = new Array(9).fill(null);
          hotbar[0] = { id: 'c1', type: 'cobblestone', count: 64 };
          hotbar[1] = { id: 'c2', type: 'planks', count: 64 };
          hotbar[2] = { id: 'c3', type: 'glass', count: 64 };
          hotbar[3] = { id: 'c4', type: 'wood', count: 64 };
          hotbar[4] = { id: 'c5', type: 'torch', count: 64 };
          hotbar[5] = { id: 'c6', type: 'glowstone', count: 64 };
          hotbar[6] = { id: 'c7', type: 'bricks', count: 64 };
          hotbar[7] = { id: 'c8', type: 'obsidian', count: 64 };
          hotbar[8] = { id: 'c9', type: 'diamond_pickaxe', count: 1 };
          return { ...prev, hotbar };
        }
        return prev;
      });
    }

    soundManager.playCraft();
  }, []);

  const handleCompleteCurrentObjective = useCallback(() => {
    setCurrentLevel((prev) => {
      const next = { ...prev, objectives: [...prev.objectives] };
      const uncompleted = next.objectives.filter((o) => !o.completed);
      if (uncompleted.length > 0) {
        uncompleted[0].completed = true;
        uncompleted[0].currentCount = uncompleted[0].targetCount;
      } else {
        // Complete all
        next.objectives.forEach((o) => {
          o.completed = true;
          o.currentCount = o.targetCount;
        });
      }
      checkLevelCompletion(next);
      return next;
    });
    soundManager.playVictory();
  }, [checkLevelCompletion]);

  const handleToggleSprint = useCallback(() => {
    if (playerControllerRef.current) {
      const isS = !playerControllerRef.current.keys['ControlLeft'];
      playerControllerRef.current.keys['ControlLeft'] = isS;
      setIsSprinting(isS);
    }
  }, []);

  // Super Powers & Max Hearts Tier Upgrades
  const handleCycleHealthTier = useCallback(() => {
    if (playerControllerRef.current) {
      const currentMax = playerControllerRef.current.stats.maxHealth;
      // Cycle: 40 -> 60 -> 100 -> 40
      const nextMax = currentMax === 40 ? 60 : currentMax === 60 ? 100 : 40;
      playerControllerRef.current.setHealthTier(nextMax);
      setPlayerStats((prev) => ({
        ...prev,
        maxHealth: nextMax,
        health: nextMax,
      }));
    }
  }, []);

  const handleHealFull = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.healFull();
      setPlayerStats((prev) => ({
        ...prev,
        health: prev.maxHealth,
        hunger: prev.maxHunger,
      }));
    }
  }, []);

  const handleToggleGodMode = useCallback(() => {
    if (playerControllerRef.current) {
      const enabled = playerControllerRef.current.toggleGodMode();
      setPlayerStats((prev) => ({
        ...prev,
        godMode: enabled,
        health: prev.maxHealth,
        hunger: prev.maxHunger,
      }));
    }
  }, []);

  const handleToggleInstaMine = useCallback(() => {
    if (playerControllerRef.current) {
      const enabled = playerControllerRef.current.toggleFastMine();
      setPlayerStats((prev) => ({
        ...prev,
        instaMine: enabled,
      }));
    }
  }, []);

  const handleToggleMegaJump = useCallback(() => {
    if (playerControllerRef.current) {
      const enabled = playerControllerRef.current.toggleMegaJump();
      setPlayerStats((prev) => ({
        ...prev,
        megaJump: enabled,
      }));
    }
  }, []);

  const handleToggleSuperSpeed = useCallback(() => {
    if (playerControllerRef.current) {
      const enabled = playerControllerRef.current.toggleSuperSpeed();
      setPlayerStats((prev) => ({
        ...prev,
        superSpeed: enabled,
      }));
    }
  }, []);

  const handleBlastMine = useCallback(() => {
    if (playerControllerRef.current) {
      const brokenBlocks = playerControllerRef.current.blastMine();
      brokenBlocks.forEach((b) => handleBlockBroken(b.type));
    }
  }, [handleBlockBroken]);

  const handleTriggerSupermine = useCallback(() => {
    if (playerControllerRef.current) {
      const brokenBlocks = playerControllerRef.current.triggerSupermine();
      brokenBlocks.forEach((b) => handleBlockBroken(b.type));
    }
  }, [handleBlockBroken]);

  const handleTriggerLightning = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.triggerLightning();
    }
  }, []);

  const handleToggleForcefield = useCallback(() => {
    if (playerControllerRef.current) {
      const active = playerControllerRef.current.toggleForcefield();
      setPlayerStats((prev) => ({
        ...prev,
        forcefield: active,
      }));
    }
  }, []);

  const handleSupersonicDash = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.supersonicDash();
    }
  }, []);

  const handleSpawnCreeper = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.spawnCreeper();
    }
  }, []);

  const handleSpawnSkeleton = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.spawnSkeleton();
    }
  }, []);

  const handleSpawnEnderman = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.spawnEnderman();
    }
  }, []);

  const handleSpawnPig = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.spawnPig();
    }
  }, []);

  const handleSpawnZombie = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.spawnZombie();
    }
  }, []);

  const handleSpawnPeopleCrowd = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.spawnPeopleCrowd(200);
    }
  }, []);

  const handleGenerateCity = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.generateFullCity();
    }
  }, []);

  const handleGenerateRestaurant = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.generateFullRestaurantPlaza();
    }
  }, []);

  const handleStampRestaurant = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.stampRestaurantInFront();
    }
  }, []);

  const handleOrderGourmetMeal = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.orderGourmetMeal();
      setPlayerStats((prev) => ({
        ...prev,
        health: prev.maxHealth,
        hunger: prev.maxHunger,
      }));
    }
  }, []);

  const handleUnlockAllLevels = useCallback(() => {
    setUnlockedLevelIds(Array.from({ length: 100 }, (_, i) => i + 1));
    soundManager.playVictory();
  }, []);

  const handleStampSkyscraper = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.stampSkyscraperInFront(18);
    }
  }, []);

  const handleStampTownhouse = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.stampTownhouseInFront();
    }
  }, []);

  const handleStampCar = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.stampCarInFront('red');
    }
  }, []);

  const handleStampFountain = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.stampFountainInFront();
    }
  }, []);

  const handleToggleCoasterRide = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.toggleRollercoasterRide();
    }
  }, []);

  const handleGenerateCoasterPark = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.generateCoasterPark();
    }
  }, []);

  const handleStampCoasterLoop = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.stampCoasterLoopInFront();
    }
  }, []);

  const handleStampFerrisWheel = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.stampFerrisWheelInFront();
    }
  }, []);

  const handleStampDropTower = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.stampDropTowerInFront();
    }
  }, []);

  const handleTriggerCoasterHorn = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.triggerCoasterHorn();
    }
  }, []);

  const handleToggleCoasterPerspective = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.toggleCoasterPerspective();
    }
  }, []);

  const handleLayStraightRails = useCallback(() => {
    if (playerControllerRef.current) {
      const pc = playerControllerRef.current;
      pc.world.rails.layStraightRails(pc.position, pc.yaw, 16);
    }
  }, []);

  const handleLayPoweredRollerway = useCallback(() => {
    if (playerControllerRef.current) {
      const pc = playerControllerRef.current;
      pc.world.rails.layPoweredRollerway(pc.position, pc.yaw, 32);
    }
  }, []);

  const handleSpawnMinecart = useCallback(() => {
    if (playerControllerRef.current) {
      const pc = playerControllerRef.current;
      const nearest = pc.world.rails.findNearestRail(pc.position, 5.0);
      if (nearest) {
        pc.world.rails.spawnMinecart(nearest.x, nearest.y, nearest.z, true);
      } else {
        const fx = -Math.sin(pc.yaw);
        const fz = -Math.cos(pc.yaw);
        pc.world.rails.spawnMinecart(pc.position.x + fx * 1.5, pc.position.y, pc.position.z + fz * 1.5, true);
      }
    }
  }, []);

  const handleAccelerateMinecart = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.accelerateMinecart();
    }
  }, []);

  const handleBrakeMinecart = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.brakeMinecart();
    }
  }, []);

  const handleReverseMinecart = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.reverseMinecart();
    }
  }, []);

  const handleTurboMinecart = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.turboMinecart();
    }
  }, []);

  const handleToggleMinecartCruise = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.toggleMinecartCruise();
    }
  }, []);

  const handleTriggerTrainHorn = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.triggerTrainHorn();
    }
  }, []);

  const handleClearMinecarts = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.world.rails.clearMinecarts();
    }
  }, []);

  const handleDismountMinecart = useCallback(() => {
    if (playerControllerRef.current) {
      playerControllerRef.current.world.rails.dismountPlayer();
    }
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      if (e.code === 'KeyE') {
        setIsInventoryOpen((prev) => !prev);
      } else if (e.code === 'KeyR' && !e.ctrlKey) {
        setIsRecipeBookOpen((prev) => !prev);
      } else if (e.code === 'KeyB') {
        setIsBlueprintHUDOpen((prev) => !prev);
      } else if (e.code === 'KeyF') {
        handleToggleFlight();
      } else if (e.code === 'KeyP') {
        handleToggleAutoWalk();
      } else if (e.code === 'KeyU') {
        handleTeleportToSpawn();
      } else if (e.code === 'KeyM' || e.code === 'KeyX') {
        handleTriggerSupermine();
      } else if (e.code === 'KeyK') {
        handleTriggerLightning();
      } else if (e.code === 'KeyC') {
        handleSpawnCreeper();
      } else if (e.code === 'F5') {
        e.preventDefault();
        setPerspective((prev) =>
          prev === 'first' ? 'third' : prev === 'third' ? 'drone' : 'first'
        );
      } else if (e.code === 'Escape') {
        setIsSettingsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    handleToggleFlight,
    handleToggleAutoWalk,
    handleTeleportToSpawn,
    handleTriggerSupermine,
    handleTriggerLightning,
    handleSpawnCreeper,
  ]);

  // Audio Toggle
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundManager.setMuted(nextMuted);
  };

  const handleSetVolume = (vol: number) => {
    setVolume(vol);
    soundManager.setVolume(vol);
  };

  // Next Level Handler
  const handleNextLevel = () => {
    const nextId = currentLevelId + 1;
    if (nextId <= LEVELS.length) {
      loadLevel(nextId);
    }
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-neutral-950">
      {/* 3D Voxel World Viewport */}
      <VoxelCanvas
        currentLevel={currentLevel}
        inventory={inventory}
        onUpdateInventory={setInventory}
        onUpdateStats={setPlayerStats}
        onUpdateTimeOfDay={setTimeOfDay}
        onBlockBroken={handleBlockBroken}
        onBlockPlaced={handleBlockPlaced}
        onZombieAttack={() => {}}
        perspective={perspective}
        isPointerLocked={isPointerLocked}
        setIsPointerLocked={setIsPointerLocked}
        blueprintLayer={blueprintLayer}
        showBlueprintGhost={showBlueprintGhost}
        onUpdateBlueprintProgress={handleUpdateBlueprintProgress}
        mouseSensitivity={mouseSensitivity}
        timeSpeed={currentLevel.timeSpeed || 1.0}
        onPlayerControllerReady={(player) => {
          playerControllerRef.current = player;
        }}
        onOpenChest={(chest) => setIsPointerLocked(false) || setActiveChest(chest)}
        onOpenCrafting={() => setIsPointerLocked(false) || setIsRecipeBookOpen(true)}
      />

      {/* Main Game HUD (Hearts, Hunger, Hotbar, Objectives, Quick Buttons) */}
      <GameHUD
        stats={playerStats}
        inventory={inventory}
        onSelectSlot={(slot) => setInventory((prev) => ({ ...prev, selectedSlot: slot }))}
        currentLevel={currentLevel}
        perspective={perspective}
        onTogglePerspective={() =>
          setPerspective((prev) =>
            prev === 'first' ? 'third' : prev === 'third' ? 'drone' : 'first'
          )
        }
        onOpenInventory={() => setIsInventoryOpen(true)}
        onOpenRecipes={() => setIsRecipeBookOpen(true)}
        onOpenLevelSelect={() => setIsLevelSelectOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenBlueprintHUD={() => setIsBlueprintHUDOpen(true)}
        timeOfDay={timeOfDay}
        isPointerLocked={isPointerLocked}
        onRequestPointerLock={() => {
          const container = document.getElementById('voxel-canvas-container');
          if (container && container.querySelector('canvas')) {
            container.querySelector('canvas')!.requestPointerLock().catch(() => {});
          }
        }}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        blueprintProgress={
          currentLevel.blueprint
            ? {
                accuracyPercent: blueprintProgress.accuracyPercent,
                correctBlocks: blueprintProgress.correctBlocks,
                totalBlocks: blueprintProgress.totalBlocks,
              }
            : undefined
        }
        onTeleportToSpawn={handleTeleportToSpawn}
        onToggleAutoWalk={handleToggleAutoWalk}
        isAutoWalking={isAutoWalking}
        onToggleOnScreenControls={() => setShowOnScreenControls((prev) => !prev)}
        showOnScreenControls={showOnScreenControls}
        onToggleFlight={handleToggleFlight}
        onSetGameMode={handleSetGameMode}
        onCompleteCurrentObjective={handleCompleteCurrentObjective}
        onCycleHealthTier={handleCycleHealthTier}
        onToggleGodMode={handleToggleGodMode}
        onToggleForcefield={handleToggleForcefield}
        onToggleInstaMine={handleToggleInstaMine}
        onToggleMegaJump={handleToggleMegaJump}
        onToggleSuperSpeed={handleToggleSuperSpeed}
        onHealFull={handleHealFull}
        onBlastMine={handleBlastMine}
        onTriggerSupermine={handleTriggerSupermine}
        onTriggerLightning={handleTriggerLightning}
        onSupersonicDash={handleSupersonicDash}
        onSpawnCreeper={handleSpawnCreeper}
        onSpawnSkeleton={handleSpawnSkeleton}
        onSpawnEnderman={handleSpawnEnderman}
        onSpawnPig={handleSpawnPig}
        onSpawnZombie={handleSpawnZombie}
        onSpawnPeopleCrowd={handleSpawnPeopleCrowd}
        onGenerateRestaurant={handleGenerateRestaurant}
        onStampRestaurant={handleStampRestaurant}
        onOrderGourmetMeal={handleOrderGourmetMeal}
        onGenerateCity={handleGenerateCity}
        onStampSkyscraper={handleStampSkyscraper}
        onStampTownhouse={handleStampTownhouse}
        onStampCar={handleStampCar}
        onStampFountain={handleStampFountain}
        onToggleCoasterRide={handleToggleCoasterRide}
        onGenerateCoasterPark={handleGenerateCoasterPark}
        onStampCoasterLoop={handleStampCoasterLoop}
        onStampFerrisWheel={handleStampFerrisWheel}
        onStampDropTower={handleStampDropTower}
        onTriggerCoasterHorn={handleTriggerCoasterHorn}
        onToggleCoasterPerspective={handleToggleCoasterPerspective}
        onLayStraightRails={handleLayStraightRails}
        onLayPoweredRollerway={handleLayPoweredRollerway}
        onSpawnMinecart={handleSpawnMinecart}
        onClearMinecarts={handleClearMinecarts}
        onDismountMinecart={handleDismountMinecart}
        onAccelerateMinecart={handleAccelerateMinecart}
        onBrakeMinecart={handleBrakeMinecart}
        onReverseMinecart={handleReverseMinecart}
        onTurboMinecart={handleTurboMinecart}
        onToggleMinecartCruise={handleToggleMinecartCruise}
        onTriggerTrainHorn={handleTriggerTrainHorn}
      />

      {/* Touch & On-Screen Controls for Mobile / Tablets / Desktop */}
      <TouchControls
        onDirectionPress={handleDirectionPress}
        onJumpPress={handleJumpPress}
        onCrouchPress={handleCrouchPress}
        onMinePress={handleMinePress}
        onPlacePress={handlePlacePress}
        onOpenInventory={() => setIsInventoryOpen(true)}
        onToggleAutoWalk={handleToggleAutoWalk}
        isAutoWalking={isAutoWalking}
        onToggleFly={handleToggleFlight}
        isFlying={playerStats.isFlying}
        onToggleSprint={handleToggleSprint}
        isSprinting={isSprinting}
        alwaysShow={showOnScreenControls}
      />

      {/* Blueprint Assistant Guide HUD */}
      <BlueprintAssistantHUD
        isOpen={isBlueprintHUDOpen && !!currentLevel.blueprint}
        onClose={() => setIsBlueprintHUDOpen(false)}
        blueprint={currentLevel.blueprint || null}
        currentLayer={blueprintLayer}
        onSetLayer={setBlueprintLayer}
        showGhost={showBlueprintGhost}
        onToggleGhost={() => setShowBlueprintGhost((prev) => !prev)}
        progress={blueprintProgress}
      />

      {/* Inventory & Crafting Modal */}
      <InventoryModal
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        inventory={inventory}
        onUpdateInventory={setInventory}
        isCreativeMode={currentLevel.mode === 'creative' || currentLevel.mode === 'architect'}
        onCraftEvent={handleCraftEvent}
        onSmeltEvent={handleSmeltEvent}
      />

      {/* Crafting Recipe Codex */}
      <RecipeBookModal
        isOpen={isRecipeBookOpen}
        onClose={() => setIsRecipeBookOpen(false)}
        inventory={inventory}
      />

      {/* Level Selection & Progression Modal */}
      <LevelSelectModal
        isOpen={isLevelSelectOpen}
        onClose={() => setIsLevelSelectOpen(false)}
        currentLevelId={currentLevelId}
        unlockedLevelIds={unlockedLevelIds}
        onSelectLevel={loadLevel}
        levelStars={levelStars}
        onUnlockAllLevels={handleUnlockAllLevels}
      />

      {/* Victory Fanfare Modal */}
      <VictoryModal
        isOpen={isVictoryOpen}
        onClose={() => setIsVictoryOpen(false)}
        level={currentLevel}
        stars={levelStars[currentLevelId] || 3}
        onNextLevel={handleNextLevel}
        onReplayLevel={() => loadLevel(currentLevelId)}
        hasNextLevel={currentLevelId < LEVELS.length}
      />

      {/* Chest Container Loot & Storage Modal */}
      <ChestModal
        isOpen={!!activeChest}
        chest={activeChest}
        inventory={inventory}
        onClose={() => setActiveChest(null)}
        onUpdateInventory={setInventory}
        onUpdateChest={(updated) => {
          setActiveChest(updated);
          if (playerControllerRef.current) {
            playerControllerRef.current.world.setChestAt(updated.x, updated.y, updated.z, updated);
          }
        }}
      />

      {/* Settings & Keybindings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        timeOfDay={timeOfDay}
        onSetTimeOfDay={setTimeOfDay}
        isFlying={playerStats.isFlying}
        onToggleFlight={handleToggleFlight}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        volume={volume}
        onSetVolume={handleSetVolume}
        mouseSensitivity={mouseSensitivity}
        onSetMouseSensitivity={setMouseSensitivity}
        gameMode={currentLevel.mode}
        onSetGameMode={handleSetGameMode}
      />
    </main>
  );
}
