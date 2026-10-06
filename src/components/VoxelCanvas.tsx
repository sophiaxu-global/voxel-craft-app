import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CameraPerspective, PlayerController } from '../engine/PlayerController';
import { VoxelWorld } from '../engine/VoxelWorld';
import { BlockType, InventoryState, ItemType, LevelConfig, PlayerStats } from '../types';
import { soundManager } from '../utils/audio';

interface VoxelCanvasProps {
  currentLevel: LevelConfig;
  inventory: InventoryState;
  onUpdateInventory: (inv: InventoryState) => void;
  onUpdateStats: (stats: PlayerStats) => void;
  onUpdateTimeOfDay: (time: number) => void;
  onBlockBroken: (type: BlockType) => void;
  onBlockPlaced: (type: BlockType) => void;
  onZombieAttack: () => void;
  perspective: CameraPerspective;
  isPointerLocked: boolean;
  setIsPointerLocked: (locked: boolean) => void;
  blueprintLayer: number;
  showBlueprintGhost: boolean;
  onUpdateBlueprintProgress: (progress: any) => void;
  mouseSensitivity: number;
  timeSpeed?: number;
  onPlayerControllerReady?: (player: PlayerController) => void;
  onOpenChest?: (chest: any) => void;
  onOpenCrafting?: () => void;
}

export const VoxelCanvas: React.FC<VoxelCanvasProps> = ({
  currentLevel,
  inventory,
  onUpdateInventory,
  onUpdateStats,
  onUpdateTimeOfDay,
  onBlockBroken,
  onBlockPlaced,
  onZombieAttack,
  perspective,
  isPointerLocked,
  setIsPointerLocked,
  blueprintLayer,
  showBlueprintGhost,
  onUpdateBlueprintProgress,
  mouseSensitivity,
  timeSpeed = 1.0,
  onPlayerControllerReady,
  onOpenChest,
  onOpenCrafting,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<VoxelWorld | null>(null);
  const playerRef = useRef<PlayerController | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const prevLevelIdRef = useRef<number>(currentLevel.id);
  const isDraggingRef = useRef<boolean>(false);
  const lastPointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [blastFlash, setBlastFlash] = useState<boolean>(false);

  // Sync active held item to 3D hand
  const activeItem = inventory.hotbar[inventory.selectedSlot]?.type || null;

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.updateHeldItem(activeItem);
    }
  }, [activeItem]);

  // Sync perspective
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setPerspective(perspective);
    }
  }, [perspective]);

  // Sync blueprint settings
  useEffect(() => {
    if (worldRef.current) {
      worldRef.current.blueprintLayerFilter = blueprintLayer;
      worldRef.current.showBlueprintGhost = showBlueprintGhost;
      worldRef.current.rebuildBlueprintGhost();
    }
  }, [blueprintLayer, showBlueprintGhost]);

  // Handle Level Switch & Terrain Reload
  useEffect(() => {
    if (worldRef.current && playerRef.current) {
      if (prevLevelIdRef.current !== currentLevel.id) {
        prevLevelIdRef.current = currentLevel.id;
        worldRef.current.generateTerrain(currentLevel.id);

        if (currentLevel.blueprint) {
          worldRef.current.setBlueprint(currentLevel.blueprint, new THREE.Vector3(0, 4, 0));
        } else {
          worldRef.current.setBlueprint(null);
        }

        // Reset player position safely on surface
        const spawnPos = worldRef.current.getSafeSpawnPosition(0, 6);
        playerRef.current.mode = currentLevel.mode;
        playerRef.current.stats.isFlying = currentLevel.allowFlight || false;
        playerRef.current.teleportTo(spawnPos.x, spawnPos.y, spawnPos.z);
      }
    }
  }, [currentLevel]);

  // Main Canvas & Engine Initialization
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x78a7ff);
    scene.fog = new THREE.FogExp2(0x78a7ff, 0.0035);

    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      500
    );
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Voxel World & Player Controller
    const world = new VoxelWorld(scene);
    worldRef.current = world;

    // Generate Initial World
    world.generateTerrain(currentLevel.id);
    if (currentLevel.blueprint) {
      world.setBlueprint(currentLevel.blueprint, new THREE.Vector3(0, 4, 0));
    }

    const player = new PlayerController(camera, world);
    player.mode = currentLevel.mode;
    player.stats.isFlying = currentLevel.allowFlight || false;
    
    // Spawn safely on top of the terrain surface
    const safeSpawn = world.getSafeSpawnPosition(0, 6);
    player.teleportTo(safeSpawn.x, safeSpawn.y, safeSpawn.z);
    playerRef.current = player;

    if (onPlayerControllerReady) {
      onPlayerControllerReady(player);
    }

    // Start ambient music
    soundManager.startAmbientMusic();

    // 3. Pointer Lock Listeners
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === renderer.domElement;
      setIsPointerLocked(isLocked);
    };
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    const handleCanvasClick = (e: MouseEvent) => {
      // Focus window for keyboard events
      window.focus();
      // Try pointer lock if not already locked
      if (document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock().catch(() => {});
      }
    };
    renderer.domElement.addEventListener('click', handleCanvasClick);

    // 4. Mouse & Drag Handlers (works with or without pointer lock!)
    const handlePointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY };

      if (e.button === 0) {
        // Left click: attack mob if targeted, or start mining block
        const hitMob = player.tryAttackMob();
        if (!hitMob) {
          player.isMining = true;
          player.triggerSwing();

          // If fast-mining or creative mode, instant break on click!
          if (player.isFastMine || player.mode === 'creative' || player.mode === 'architect') {
            const broken = player.instantMineTargetBlock();
            if (broken) {
              onBlockBroken(broken.type);
            }
          }
        }
      } else if (e.button === 2) {
        // Right click: interaction, eating, or placing block
        e.preventDefault();

        // 1. Check targeted block for special interactables (Chest, Crafting Table)
        if (player.currentTargetBlock && player.currentTargetType) {
          const targetType = player.currentTargetType;
          const tb = player.currentTargetBlock;

          if (targetType === 'chest' && onOpenChest) {
            const chestData = world.getChestAt(tb.x, tb.y, tb.z);
            soundManager.playChestOpen();
            onOpenChest(
              chestData || {
                id: `chest_${tb.x}_${tb.y}_${tb.z}`,
                x: tb.x,
                y: tb.y,
                z: tb.z,
                title: 'Chest',
                items: Array(27).fill(null),
              }
            );
            return;
          }

          if (targetType === 'crafting_table' && onOpenCrafting) {
            soundManager.playPop();
            onOpenCrafting();
            return;
          }
        }

        // 2. Check if held item is edible food
        const isFood =
          activeItem === 'apple' ||
          activeItem === 'golden_apple' ||
          activeItem === 'bread' ||
          activeItem === 'raw_meat' ||
          activeItem === 'cooked_meat' ||
          activeItem === 'raw_porkchop' ||
          activeItem === 'cooked_porkchop';

        if (isFood && activeItem) {
          soundManager.playEat();
          player.stats.hunger = Math.min(20, player.stats.hunger + (activeItem === 'golden_apple' ? 10 : 4));
          player.stats.health = Math.min(20, player.stats.health + (activeItem === 'golden_apple' ? 10 : 2));
          if (activeItem === 'golden_apple') {
            soundManager.playLevelUp();
          }
          if (player.mode === 'survival') {
            const newInv = { ...inventory, hotbar: [...inventory.hotbar] };
            const item = newInv.hotbar[inventory.selectedSlot];
            if (item) {
              item.count -= 1;
              if (item.count <= 0) {
                newInv.hotbar[inventory.selectedSlot] = null;
              }
              onUpdateInventory(newInv);
            }
          }
          return;
        }

        // 3. Otherwise, try placing block
        const placed = player.tryPlaceBlock(activeItem);
        if (placed) {
          onBlockPlaced(placed.type);
          if (player.mode === 'survival') {
            const newInv = { ...inventory, hotbar: [...inventory.hotbar] };
            const item = newInv.hotbar[inventory.selectedSlot];
            if (item) {
              item.count -= 1;
              if (item.count <= 0) {
                newInv.hotbar[inventory.selectedSlot] = null;
              }
              onUpdateInventory(newInv);
            }
          }
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    const handlePointerMove = (e: PointerEvent) => {
      if (document.pointerLockElement === renderer.domElement) {
        player.handleMouseMove(e.movementX, e.movementY, mouseSensitivity);
      } else if (isDraggingRef.current) {
        // Drag to look without pointer lock!
        const dx = e.clientX - lastPointerPosRef.current.x;
        const dy = e.clientY - lastPointerPosRef.current.y;
        player.handleMouseMove(dx, dy, mouseSensitivity);
        lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
      }
    };
    window.addEventListener('pointermove', handlePointerMove);

    const handlePointerUp = (e: PointerEvent) => {
      isDraggingRef.current = false;
      player.isMining = false;
    };
    window.addEventListener('pointerup', handlePointerUp);

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('contextmenu', handleContextMenu);

    const handleKeyDown = (e: KeyboardEvent) => {
      player.keys[e.code] = true;
      player.keys[e.key] = true;
      player.keys[e.key.toLowerCase()] = true;
      player.keys[e.key.toUpperCase()] = true;

      // Hotbar numbers 1-9
      if (e.code.startsWith('Digit')) {
        const num = parseInt(e.code.replace('Digit', ''));
        if (num >= 1 && num <= 9) {
          const newInv = { ...inventory, selectedSlot: num - 1 };
          onUpdateInventory(newInv);
          soundManager.playStep();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const handleKeyUp = (e: KeyboardEvent) => {
      player.keys[e.code] = false;
      player.keys[e.key] = false;
      player.keys[e.key.toLowerCase()] = false;
      player.keys[e.key.toUpperCase()] = false;
    };
    window.addEventListener('keyup', handleKeyUp);

    const handleWheel = (e: WheelEvent) => {
      const delta = Math.sign(e.deltaY);
      const newSlot = (inventory.selectedSlot + delta + 9) % 9;
      onUpdateInventory({ ...inventory, selectedSlot: newSlot });
      soundManager.playStep();
    };
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: true });

    // 5. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    // 6. Game Animation Loop
    let animationFrameId: number;
    let lastTime = performance.now();
    let statsThrottleTimer = 0;
    let explosionShakeTimer = 0;

    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      // Update Voxel World (day-night, mob AI, particles, arrows)
      const worldResult = world.update(delta, player.position, timeSpeed);

      // Forcefield updates & mob repulsion
      if (player.forcefieldMesh) {
        player.forcefieldMesh.position.set(
          player.position.x,
          player.position.y + 0.9,
          player.position.z
        );
        if (player.stats.forcefield) {
          player.forcefieldMesh.rotation.y += delta * 1.5;
          // Repel nearby mobs with energy wave
          for (const mob of world.mobs) {
            const mDist = Math.hypot(mob.x - player.position.x, mob.z - player.position.z);
            if (mDist < 3.0 && mob.type !== 'pig') {
              const pushAngle = Math.atan2(mob.x - player.position.x, mob.z - player.position.z);
              mob.x += Math.sin(pushAngle) * delta * 8;
              mob.z += Math.cos(pushAngle) * delta * 8;
            }
          }
        }
      }

      const isProtected = player.stats.godMode || player.stats.forcefield;

      if (worldResult.zombieAttacked && player.mode === 'survival' && !isProtected) {
        player.stats.health = Math.max(0, player.stats.health - 2);
        soundManager.playHurt();
        onZombieAttack();
      }

      if (worldResult.endermanAttacked && player.mode === 'survival' && !isProtected) {
        player.stats.health = Math.max(0, player.stats.health - 5);
        soundManager.playHurt();
        onZombieAttack();
      }

      if (worldResult.arrowHitPlayer) {
        if (!isProtected && player.mode === 'survival') {
          player.stats.health = Math.max(0, player.stats.health - worldResult.arrowDamage);
          soundManager.playHurt();
          onZombieAttack();
        } else {
          soundManager.playHit('stone');
        }
      }

      if (worldResult.creeperExploded) {
        explosionShakeTimer = 1.8;
        setBlastFlash(true);
        setTimeout(() => setBlastFlash(false), 550);

        if (player.mode === 'survival' && !isProtected) {
          player.stats.health = Math.max(0, player.stats.health - worldResult.explosionDamage);
          soundManager.playHurt();
          onZombieAttack();
        }
        if (worldResult.explosionKnockback) {
          player.velocity.add(worldResult.explosionKnockback);
          player.stats.isGrounded = false;
        }
      }

      // Handle 3D World Drop item pickup
      if (worldResult.collectedDrops && worldResult.collectedDrops.length > 0) {
        const newInv = { ...inventory, hotbar: [...inventory.hotbar], main: [...inventory.main] };
        let changed = false;

        for (const drop of worldResult.collectedDrops) {
          let added = false;
          // Try adding to existing hotbar slot
          for (let i = 0; i < newInv.hotbar.length; i++) {
            if (newInv.hotbar[i] && newInv.hotbar[i]!.type === drop.type) {
              newInv.hotbar[i]!.count += drop.count;
              added = true;
              changed = true;
              break;
            }
          }
          // Try empty hotbar slot
          if (!added) {
            for (let i = 0; i < newInv.hotbar.length; i++) {
              if (!newInv.hotbar[i]) {
                newInv.hotbar[i] = { id: `${drop.type}_${Date.now()}_${Math.random()}`, type: drop.type, count: drop.count };
                added = true;
                changed = true;
                break;
              }
            }
          }
          // Try main inventory
          if (!added) {
            for (let i = 0; i < newInv.main.length; i++) {
              if (newInv.main[i] && newInv.main[i]!.type === drop.type) {
                newInv.main[i]!.count += drop.count;
                added = true;
                changed = true;
                break;
              }
            }
          }
        }

        if (changed) {
          onUpdateInventory(newInv);
        }
      }

      // Update Player Physics, Mining, and Interaction
      const playerResult = player.update(delta, activeItem);

      if (playerResult.blockBroken) {
        onBlockBroken(playerResult.blockBroken.type);
        // Add to inventory if survival
        if (player.mode === 'survival') {
          const brokenType = playerResult.blockBroken.type;
          let droppedItem: ItemType = brokenType;
          if (brokenType === 'grass') droppedItem = 'dirt';
          if (brokenType === 'stone') droppedItem = 'cobblestone';
          if (brokenType === 'coal_ore') droppedItem = 'coal';
          if (brokenType === 'diamond_ore') droppedItem = 'diamond';

          // Add to inventory
          const newInv = { ...inventory, hotbar: [...inventory.hotbar], main: [...inventory.main] };
          let added = false;
          for (let i = 0; i < newInv.hotbar.length; i++) {
            if (newInv.hotbar[i] && newInv.hotbar[i]!.type === droppedItem) {
              newInv.hotbar[i]!.count += 1;
              added = true;
              break;
            }
          }
          if (!added) {
            for (let i = 0; i < newInv.hotbar.length; i++) {
              if (!newInv.hotbar[i]) {
                newInv.hotbar[i] = { id: `${droppedItem}_${Date.now()}`, type: droppedItem, count: 1 };
                added = true;
                break;
              }
            }
          }
          if (added) {
            onUpdateInventory(newInv);
          }
        }
      }

      // Sync Blueprint Evaluation if active
      if (world.activeBlueprint) {
        const bpProgress = world.evaluateBlueprintProgress();
        onUpdateBlueprintProgress(bpProgress);
      }

      // Sync HUD Stats periodically
      statsThrottleTimer += delta;
      if (statsThrottleTimer >= 0.2) {
        statsThrottleTimer = 0;
        onUpdateStats({ ...player.stats });
        onUpdateTimeOfDay(world.timeOfDay);
      }

      // Apply screen shake if active
      if (explosionShakeTimer > 0) {
        explosionShakeTimer -= delta;
        const norm = Math.max(0, explosionShakeTimer / 1.8);
        const intensity = norm * norm * 1.35;
        camera.position.x += (Math.random() - 0.5) * intensity;
        camera.position.y += (Math.random() - 0.5) * intensity;
        camera.position.z += (Math.random() - 0.5) * intensity;
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      soundManager.stopAmbientMusic();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      id="voxel-canvas-container"
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-sky-400 cursor-crosshair"
    >
      {blastFlash && (
        <div
          id="creeper-blast-flash-overlay"
          className="pointer-events-none absolute inset-0 z-50 bg-white/85 animate-pulse transition-opacity duration-500"
        />
      )}
    </div>
  );
};
