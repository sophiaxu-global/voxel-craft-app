import * as THREE from 'three';
import { BlockType, GameMode, ItemType, MobEntity, PlayerStats } from '../types';
import { soundManager } from '../utils/audio';
import { getBlockMaterials } from '../utils/textures';
import { VoxelWorld } from './VoxelWorld';

export type CameraPerspective = 'first' | 'third' | 'drone';

export class PlayerController {
  public camera: THREE.PerspectiveCamera;
  public world: VoxelWorld;

  // Player position & physics
  public position = new THREE.Vector3(0, 10, 0);
  public velocity = new THREE.Vector3(0, 0, 0);
  public yaw: number = 0;
  public pitch: number = 0;

  public playerHeight = 1.8;
  public playerRadius = 0.3;
  public eyeHeight = 1.62;

  // Stats
  public stats: PlayerStats = {
    health: 40,
    maxHealth: 40,
    hunger: 20,
    maxHunger: 20,
    oxygen: 20,
    xp: 0,
    level: 1,
    isGrounded: false,
    isFlying: false,
    isSneaking: false,
    isSprinting: false,
    godMode: false,
    instaMine: false,
    superSpeed: false,
    megaJump: false,
    superRegen: true,
    extendedReach: true,
  };

  public mode: GameMode = 'survival';
  public perspective: CameraPerspective = 'first';

  // Input states
  public keys: Record<string, boolean> = {};
  public isMining: boolean = false;
  public miningProgress: number = 0; // 0.0 to 1.0
  public currentTargetBlock: THREE.Vector3 | null = null;
  public currentTargetType: BlockType = 'air';
  public isFastMine: boolean = false;
  public isTurboSpeed: boolean = false;
  public reachDistance: number = 14.0;
  private regenTimer: number = 0;

  // Forcefield visual mesh
  public forcefieldMesh!: THREE.Mesh;
  public isForcefieldActive: boolean = false;

  // Hand / Tool 3D Mesh
  public handGroup = new THREE.Group();
  public handMesh!: THREE.Mesh;
  public toolMesh!: THREE.Mesh;
  private swingProgress: number = 0;

  // Footstep timer
  private stepTimer: number = 0;

  // Third person & Drone parameters
  public thirdPersonDistance: number = 4.0;
  public thirdPersonMesh!: THREE.Group;

  constructor(camera: THREE.PerspectiveCamera, world: VoxelWorld) {
    this.camera = camera;
    this.world = world;

    this.initHandMesh();
    this.initThirdPersonMesh();
    this.initForcefieldMesh();
  }

  private initForcefieldMesh() {
    const geo = new THREE.SphereGeometry(2.4, 20, 20);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      wireframe: true,
    });
    this.forcefieldMesh = new THREE.Mesh(geo, mat);
    this.forcefieldMesh.visible = false;
    this.world.scene.add(this.forcefieldMesh);
  }

  private initHandMesh() {
    // Player Hand (first-person right hand)
    const handGeo = new THREE.BoxGeometry(0.18, 0.45, 0.18);
    const handMat = new THREE.MeshLambertMaterial({ color: 0xd9a073 });
    this.handMesh = new THREE.Mesh(handGeo, handMat);
    this.handMesh.position.set(0.35, -0.3, -0.5);
    this.handMesh.rotation.set(0.3, -0.2, 0.1);

    // Active tool / block in hand
    const toolGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const toolMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
    this.toolMesh = new THREE.Mesh(toolGeo, toolMat);
    this.toolMesh.position.set(0.35, -0.2, -0.65);
    this.toolMesh.visible = false;

    this.handGroup.add(this.handMesh);
    this.handGroup.add(this.toolMesh);
    this.camera.add(this.handGroup);
  }

  private initThirdPersonMesh() {
    this.thirdPersonMesh = new THREE.Group();

    // Head
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xd9a073 })
    );
    head.position.y = 1.55;
    this.thirdPersonMesh.add(head);

    // Body (Cyan Shirt)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.7, 0.25),
      new THREE.MeshLambertMaterial({ color: 0x0099cc })
    );
    body.position.y = 0.95;
    this.thirdPersonMesh.add(body);

    // Arms
    const armL = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.65, 0.2),
      new THREE.MeshLambertMaterial({ color: 0xd9a073 })
    );
    armL.position.set(-0.35, 0.95, 0);
    this.thirdPersonMesh.add(armL);

    const armR = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.65, 0.2),
      new THREE.MeshLambertMaterial({ color: 0xd9a073 })
    );
    armR.position.set(0.35, 0.95, 0);
    this.thirdPersonMesh.add(armR);

    // Legs (Blue Jeans)
    const legL = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.65, 0.22),
      new THREE.MeshLambertMaterial({ color: 0x223366 })
    );
    legL.position.set(-0.13, 0.32, 0);
    this.thirdPersonMesh.add(legL);

    const legR = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.65, 0.22),
      new THREE.MeshLambertMaterial({ color: 0x223366 })
    );
    legR.position.set(0.13, 0.32, 0);
    this.thirdPersonMesh.add(legR);

    this.thirdPersonMesh.visible = false;
    this.world.scene.add(this.thirdPersonMesh);
  }

  public setPerspective(perspective: CameraPerspective) {
    this.perspective = perspective;
    if (perspective === 'first') {
      this.handGroup.visible = true;
      this.thirdPersonMesh.visible = false;
    } else if (perspective === 'third') {
      this.handGroup.visible = false;
      this.thirdPersonMesh.visible = true;
    } else {
      // Drone
      this.handGroup.visible = false;
      this.thirdPersonMesh.visible = true;
    }
  }

  public updateHeldItem(item: ItemType | null) {
    if (!item) {
      this.toolMesh.visible = false;
      return;
    }

    this.toolMesh.visible = true;
    // Update mesh geometry & material based on block vs tool
    if (
      item.includes('pickaxe') ||
      item.includes('axe') ||
      item.includes('sword') ||
      item === 'stick'
    ) {
      this.toolMesh.geometry.dispose();
      this.toolMesh.geometry = new THREE.BoxGeometry(0.08, 0.45, 0.08);
      const color = item.includes('diamond')
        ? 0x4dedf4
        : item.includes('iron')
        ? 0xd8d8d8
        : item.includes('stone')
        ? 0x888888
        : 0x9b673c;
      (this.toolMesh.material as THREE.MeshLambertMaterial).color.setHex(color);
    } else {
      // Cube block representation in hand
      this.toolMesh.geometry.dispose();
      this.toolMesh.geometry = new THREE.BoxGeometry(0.22, 0.22, 0.22);
      const mats = getBlockMaterials(item as BlockType);
      this.toolMesh.material = Array.isArray(mats) ? mats[0] : mats;
    }
  }

  public triggerSwing() {
    this.swingProgress = 1.0;
  }

  public handleMouseMove(movementX: number, movementY: number, sensitivity = 0.0022) {
    this.yaw -= movementX * sensitivity;
    this.pitch -= movementY * sensitivity;
    this.pitch = Math.max(-Math.PI / 2.05, Math.min(Math.PI / 2.05, this.pitch));
  }

  // Get Mining Speed multiplier depending on equipped item & block type
  public getMiningSpeed(heldItem: ItemType | null, blockType: BlockType): number {
    if (
      this.isFastMine ||
      this.stats.instaMine ||
      this.mode === 'creative' ||
      this.mode === 'architect'
    ) {
      return 100.0; // Instant break!
    }

    let baseTime = 0.25; // Super crisp base seconds
    if (blockType === 'wood' || blockType === 'planks') baseTime = 0.3;
    if (blockType === 'stone' || blockType === 'cobblestone') baseTime = 0.35;
    if (blockType === 'iron_ore' || blockType === 'coal_ore' || blockType === 'gold_ore') baseTime = 0.4;
    if (blockType === 'diamond_ore') baseTime = 0.5;
    if (blockType === 'obsidian') baseTime = 0.8;
    if (blockType === 'leaves' || blockType === 'glass') baseTime = 0.05;
    if (blockType === 'dirt' || blockType === 'grass' || blockType === 'sand') baseTime = 0.1;

    let toolMultiplier = 1.8;
    if (heldItem) {
      if (
        (blockType === 'stone' || blockType.includes('ore') || blockType === 'cobblestone' || blockType === 'bricks') &&
        heldItem.includes('pickaxe')
      ) {
        if (heldItem === 'wooden_pickaxe') toolMultiplier = 4.5;
        if (heldItem === 'stone_pickaxe') toolMultiplier = 8.5;
        if (heldItem === 'iron_pickaxe') toolMultiplier = 16.0;
        if (heldItem === 'diamond_pickaxe') toolMultiplier = 32.0;
      } else if (
        (blockType === 'wood' || blockType === 'planks' || blockType === 'bookshelf') &&
        heldItem.includes('axe')
      ) {
        if (heldItem === 'wooden_axe') toolMultiplier = 4.5;
        if (heldItem === 'stone_axe') toolMultiplier = 8.5;
        if (heldItem === 'iron_axe') toolMultiplier = 16.0;
      } else if (
        (blockType === 'dirt' || blockType === 'grass' || blockType === 'sand')
      ) {
        toolMultiplier = 3.5; // Digging soft terrain is super fast
      }
    } else {
      // Bare hand speed bonus for soft blocks
      if (blockType === 'dirt' || blockType === 'grass' || blockType === 'sand' || blockType === 'leaves') {
        toolMultiplier = 2.4;
      }
    }

    return Math.max(1.0, toolMultiplier / baseTime);
  }

  // Auto-walk state
  public autoWalk: boolean = false;

  // AABB Collision check
  public checkCollision(newPos: THREE.Vector3): boolean {
    const minX = Math.floor(newPos.x - this.playerRadius + 0.05);
    const maxX = Math.floor(newPos.x + this.playerRadius - 0.05);
    const minY = Math.floor(newPos.y + 0.02);
    const maxY = Math.floor(newPos.y + this.playerHeight - 0.08);
    const minZ = Math.floor(newPos.z - this.playerRadius + 0.05);
    const maxZ = Math.floor(newPos.z + this.playerRadius - 0.05);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const v = this.world.getVoxel(x, y, z);
          if (v !== 'air' && v !== 'water' && !v.includes('rail') && v !== 'torch') {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Teleport player safely to coordinate
  public teleportTo(x: number, y: number, z: number) {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
  }

  // Auto-unstuck player if inside blocks
  public unstuck() {
    if (this.checkCollision(this.position)) {
      for (let offset = 0.2; offset <= 12.0; offset += 0.4) {
        const nudged = this.position.clone();
        nudged.y += offset;
        if (!this.checkCollision(nudged)) {
          this.position.copy(nudged);
          this.velocity.y = 0;
          return;
        }
      }
    }
  }

  public update(
    delta: number,
    heldItem: ItemType | null
  ): {
    blockBroken: { pos: THREE.Vector3; type: BlockType } | null;
    placedBlock: { pos: THREE.Vector3; type: BlockType } | null;
  } {
    let blockBroken: { pos: THREE.Vector3; type: BlockType } | null = null;
    let placedBlock: { pos: THREE.Vector3; type: BlockType } | null = null;

    // Rollercoaster Riding Override
    if (this.world.rollercoaster && this.world.rollercoaster.isRiding) {
      const coasterResult = this.world.rollercoaster.update(delta, this.keys, this.camera);
      this.position.copy(this.world.rollercoaster.cartGroup.position);
      this.velocity.set(0, 0, 0);

      this.stats.isRidingCoaster = true;
      this.stats.coasterSpeed = coasterResult.speedKmh;
      this.stats.coasterGForce = coasterResult.gForce;
      this.stats.coasterSection = coasterResult.sectionName;
      this.stats.coasterAltitude = coasterResult.altitude;

      // Hide 1st-person hand while riding
      this.handGroup.visible = false;
      if (this.thirdPersonMesh) {
        this.thirdPersonMesh.visible = this.world.rollercoaster.perspective !== 'first';
        if (this.thirdPersonMesh.visible) {
          this.thirdPersonMesh.position.copy(this.position).add(new THREE.Vector3(0, 0.2, 0));
        }
      }

      return { blockBroken: null, placedBlock: null };
    } else {
      this.stats.isRidingCoaster = false;
      this.handGroup.visible = this.perspective === 'first';
      // Update ambient empty minecart if present
      if (this.world.rollercoaster) {
        this.world.rollercoaster.update(delta, {}, this.camera);
      }
    }

    // Minecraft Authentic Minecart Riding System
    if (this.world.rails) {
      const isFwd =
        this.autoWalk ||
        this.keys['KeyW'] ||
        this.keys['w'] ||
        this.keys['W'] ||
        this.keys['ArrowUp'];
      const isBack =
        this.keys['KeyS'] ||
        this.keys['s'] ||
        this.keys['S'] ||
        this.keys['ArrowDown'];
      const isRightKey =
        this.keys['KeyD'] ||
        this.keys['d'] ||
        this.keys['D'] ||
        this.keys['ArrowRight'];
      const isLeftKey =
        this.keys['KeyA'] ||
        this.keys['a'] ||
        this.keys['A'] ||
        this.keys['ArrowLeft'];
      const isJumpKey =
        this.keys['Space'] ||
        this.keys[' '] ||
        this.keys['Spacebar'];

      const railResult = this.world.rails.update(
        delta,
        {
          fwd: !!isFwd,
          back: !!isBack,
          left: !!isLeftKey,
          right: !!isRightKey,
          jump: !!isJumpKey,
        },
        this.position,
        this.yaw
      );

      this.stats.isRidingMinecart = railResult.isRiding;
      this.stats.minecartSpeed = railResult.currentSpeed;
      this.stats.minecartTrackType = railResult.trackType;
      this.stats.minecartIsAutoCruise = this.world.rails.isAutoCruise;

      if (railResult.isRiding) {
        this.velocity.set(0, 0, 0);

        // Sound Bullet Train Horn with 'H' key
        if (this.keys['KeyH'] || this.keys['h'] || this.keys['H']) {
          this.world.rails.playHorn();
          this.keys['KeyH'] = false;
          this.keys['h'] = false;
          this.keys['H'] = false;
        }

        const eyePos = new THREE.Vector3(
          this.position.x,
          this.position.y + this.eyeHeight - 0.25,
          this.position.z
        );

        if (this.perspective === 'first') {
          this.camera.position.copy(eyePos);
          this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
        } else if (this.perspective === 'third') {
          const camDir = new THREE.Vector3(
            -Math.sin(this.yaw) * Math.cos(this.pitch),
            Math.sin(this.pitch),
            -Math.cos(this.yaw) * Math.cos(this.pitch)
          ).normalize();
          const thirdPos = eyePos.clone().addScaledVector(camDir, -this.thirdPersonDistance);
          this.camera.position.copy(thirdPos);
          this.camera.lookAt(eyePos.x, eyePos.y, eyePos.z);
          if (this.thirdPersonMesh) {
            this.thirdPersonMesh.position.set(this.position.x, this.position.y - 0.2, this.position.z);
            this.thirdPersonMesh.rotation.y = this.yaw;
          }
        }

        // Raycasting still active in minecart for mining / placing
        const camDirection = new THREE.Vector3();
        this.camera.getWorldDirection(camDirection);
        const raycast = this.world.raycastVoxel(eyePos, camDirection, this.reachDistance);
        if (raycast.hit) {
          this.world.selectionBox.position.set(
            raycast.blockPos.x + 0.5,
            raycast.blockPos.y + 0.5,
            raycast.blockPos.z + 0.5
          );
          this.world.selectionBox.visible = true;
          this.currentTargetBlock = raycast.blockPos;
          this.currentTargetType = raycast.blockType;
        } else {
          this.world.selectionBox.visible = false;
          this.currentTargetBlock = null;
        }

        return { blockBroken: null, placedBlock: null };
      }
    }

    // Ensure player is not stuck in solid terrain
    this.unstuck();

    // 1. Movement Calculations
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    const isFwd =
      this.autoWalk ||
      this.keys['KeyW'] ||
      this.keys['w'] ||
      this.keys['W'] ||
      this.keys['ArrowUp'];
    const isBack =
      this.keys['KeyS'] ||
      this.keys['s'] ||
      this.keys['S'] ||
      this.keys['ArrowDown'];
    const isRightKey =
      this.keys['KeyD'] ||
      this.keys['d'] ||
      this.keys['D'] ||
      this.keys['ArrowRight'];
    const isLeftKey =
      this.keys['KeyA'] ||
      this.keys['a'] ||
      this.keys['A'] ||
      this.keys['ArrowLeft'];
    const isJumpKey =
      this.keys['Space'] ||
      this.keys[' '] ||
      this.keys['Spacebar'];
    const isCrouchKey =
      this.keys['ShiftLeft'] ||
      this.keys['ShiftRight'] ||
      this.keys['Shift'] ||
      this.keys['KeyC'] ||
      this.keys['c'] ||
      this.keys['C'];

    const moveDir = new THREE.Vector3(0, 0, 0);
    if (isFwd) moveDir.add(forward);
    if (isBack) moveDir.sub(forward);
    if (isRightKey) moveDir.add(right);
    if (isLeftKey) moveDir.sub(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
    }

    // Health Regeneration & God Mode logic
    if (this.stats.godMode) {
      this.stats.health = this.stats.maxHealth;
      this.stats.hunger = this.stats.maxHunger;
    } else if (this.stats.superRegen && this.mode === 'survival') {
      this.regenTimer += delta;
      if (this.regenTimer >= 0.8) {
        this.regenTimer = 0;
        if (this.stats.health < this.stats.maxHealth) {
          this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + 2);
        }
      }
    }

    const baseSpeed = this.stats.isFlying
      ? 16.0
      : this.stats.superSpeed || this.isTurboSpeed
      ? 14.5
      : this.stats.isSprinting
      ? 10.2
      : this.stats.isSneaking
      ? 3.2
      : 6.8;
    const speed = this.stats.superSpeed ? baseSpeed * 1.35 : baseSpeed;

    if (this.stats.isFlying) {
      // Flight physics
      this.velocity.x = moveDir.x * speed;
      this.velocity.z = moveDir.z * speed;
      this.velocity.y = 0;

      if (isJumpKey) this.velocity.y = 12.0;
      if (isCrouchKey) this.velocity.y = -12.0;

      this.position.addScaledVector(this.velocity, delta);
    } else {
      // Ground / Walking Physics with Gravity & Stepping assist
      this.velocity.x = moveDir.x * speed;
      this.velocity.z = moveDir.z * speed;

      // Jump (Standard or Mega Jump)
      if (isJumpKey && this.stats.isGrounded) {
        this.velocity.y = this.stats.megaJump ? 13.5 : 8.8;
        this.stats.isGrounded = false;
        soundManager.playStep();
      }

      // Apply Gravity
      this.velocity.y -= 22.0 * delta;
      this.velocity.y = Math.max(-25.0, this.velocity.y);

      // Attempt X movement
      const tryX = this.position.clone();
      tryX.x += this.velocity.x * delta;
      if (!this.checkCollision(tryX)) {
        this.position.x = tryX.x;
      } else {
        // Step-up assist (step over 1 to 1.2 block height smoothly without having to jump)
        for (let stepHeight = 0.5; stepHeight <= 1.25; stepHeight += 0.3) {
          const stepUp = tryX.clone();
          stepUp.y = Math.floor(this.position.y) + stepHeight;
          if (!this.checkCollision(stepUp)) {
            this.position.x = tryX.x;
            this.position.y = stepUp.y;
            break;
          }
        }
      }

      // Attempt Z movement
      const tryZ = this.position.clone();
      tryZ.z += this.velocity.z * delta;
      if (!this.checkCollision(tryZ)) {
        this.position.z = tryZ.z;
      } else {
        // Step-up assist
        for (let stepHeight = 0.5; stepHeight <= 1.25; stepHeight += 0.3) {
          const stepUp = tryZ.clone();
          stepUp.y = Math.floor(this.position.y) + stepHeight;
          if (!this.checkCollision(stepUp)) {
            this.position.z = tryZ.z;
            this.position.y = stepUp.y;
            break;
          }
        }
      }

      // Attempt Y movement
      const tryY = this.position.clone();
      tryY.y += this.velocity.y * delta;
      if (!this.checkCollision(tryY)) {
        this.position.y = tryY.y;
        this.stats.isGrounded = false;
      } else {
        if (this.velocity.y < 0) {
          this.stats.isGrounded = true;
          // Fall damage check (bypassed if in God Mode or Mega Jump)
          if (
            this.velocity.y < -19.0 &&
            this.mode === 'survival' &&
            !this.stats.godMode &&
            !this.stats.megaJump
          ) {
            const damage = Math.floor(Math.abs(this.velocity.y + 19.0) * 0.45);
            if (damage > 0) {
              this.stats.health = Math.max(0, this.stats.health - damage);
              soundManager.playHurt();
            }
          }
        }
        this.velocity.y = 0;
      }
    }

    // Footstep audio
    if (this.stats.isGrounded && moveDir.lengthSq() > 0) {
      this.stepTimer += delta * (this.stats.isSprinting || this.isTurboSpeed ? 2.8 : 2.0);
      if (this.stepTimer >= 1.0) {
        this.stepTimer = 0;
        soundManager.playStep();
      }
    }

    // 2. Camera Updates
    const eyePos = new THREE.Vector3(
      this.position.x,
      this.position.y + this.eyeHeight,
      this.position.z
    );

    if (this.perspective === 'first') {
      this.camera.position.copy(eyePos);
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');

      // Hand swing animation
      if (this.swingProgress > 0) {
        this.swingProgress -= delta * 6.0;
        const swingAngle = Math.sin(this.swingProgress * Math.PI) * 0.75;
        this.handMesh.rotation.x = 0.3 + swingAngle;
        this.toolMesh.rotation.x = swingAngle * 1.3;
      } else {
        this.handMesh.rotation.x = 0.3;
        this.toolMesh.rotation.x = 0;
      }
    } else if (this.perspective === 'third') {
      // Third Person Over-The-Shoulder Camera
      const camDir = new THREE.Vector3(
        -Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(this.pitch),
        -Math.cos(this.yaw) * Math.cos(this.pitch)
      ).normalize();

      const thirdPos = eyePos.clone().addScaledVector(camDir, -this.thirdPersonDistance);
      this.camera.position.copy(thirdPos);
      this.camera.lookAt(eyePos.x, eyePos.y, eyePos.z);

      this.thirdPersonMesh.position.set(this.position.x, this.position.y, this.position.z);
      this.thirdPersonMesh.rotation.y = this.yaw;
    } else {
      // Free Drone Flycam
      this.camera.position.copy(eyePos);
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      this.thirdPersonMesh.position.set(this.position.x, this.position.y, this.position.z);
      this.thirdPersonMesh.rotation.y = this.yaw;
    }

    // 3. Raycasting for targeted block (Generous Reach)
    const camDirection = new THREE.Vector3();
    this.camera.getWorldDirection(camDirection);
    const raycast = this.world.raycastVoxel(eyePos, camDirection, this.reachDistance);

    if (raycast.hit) {
      this.world.selectionBox.position.set(
        raycast.blockPos.x + 0.5,
        raycast.blockPos.y + 0.5,
        raycast.blockPos.z + 0.5
      );
      this.world.selectionBox.visible = true;
      this.currentTargetBlock = raycast.blockPos;
      this.currentTargetType = raycast.blockType;

      // 4. Mining Progress Logic
      if (this.isMining) {
        this.triggerSwing();
        const miningSpeed = this.getMiningSpeed(heldItem, raycast.blockType);
        this.miningProgress += delta * miningSpeed;

        const crackStage = Math.min(4, Math.floor(this.miningProgress * 5));
        this.world.updateBreakProgress(raycast.blockPos, crackStage);

        if (Math.random() < 0.3) {
          const matType = raycast.blockType.includes('wood') || raycast.blockType.includes('planks')
            ? 'wood'
            : raycast.blockType.includes('stone') || raycast.blockType.includes('ore') || raycast.blockType === 'cobblestone'
            ? 'stone'
            : 'dirt';
          soundManager.playHit(matType);
        }

        if (this.miningProgress >= 1.0) {
          // Block Destroyed!
          this.world.setVoxel(raycast.blockPos.x, raycast.blockPos.y, raycast.blockPos.z, 'air');
          this.world.spawnBreakParticles(raycast.blockPos, raycast.blockType);
          soundManager.playBreak();
          this.world.updateBreakProgress(null, -1);
          this.miningProgress = 0;

          blockBroken = {
            pos: raycast.blockPos,
            type: raycast.blockType,
          };
        }
      } else {
        this.miningProgress = 0;
        this.world.updateBreakProgress(null, -1);
      }
    } else {
      this.world.selectionBox.visible = false;
      this.world.updateBreakProgress(null, -1);
      this.currentTargetBlock = null;
      this.miningProgress = 0;
    }

    return { blockBroken, placedBlock };
  }

  // Attempt to place active block
  public tryPlaceBlock(heldItem: ItemType | null): { pos: THREE.Vector3; type: BlockType } | null {
    if (!heldItem) return null;

    const eyePos = new THREE.Vector3(
      this.position.x,
      this.position.y + this.eyeHeight,
      this.position.z
    );
    const camDirection = new THREE.Vector3();
    this.camera.getWorldDirection(camDirection);

    // 1. Board / Mount nearby Minecart if player clicked on or near one
    if (this.world.rails) {
      const targetLook = eyePos.clone().addScaledVector(camDirection, 2.5);
      let targetCart = this.world.rails.findNearestCart(targetLook, 2.6);
      if (!targetCart) {
        targetCart = this.world.rails.findNearestCart(this.position, 3.2);
      }
      if (targetCart && !this.world.rails.isPlayerRiding()) {
        this.world.rails.mountPlayer(targetCart.id);
        return null;
      }
    }

    // 2. Handle Minecart item placement
    if (heldItem === 'minecart') {
      const raycast = this.world.raycastVoxel(eyePos, camDirection, this.reachDistance);
      if (raycast.hit && this.world.rails) {
        const placePos = raycast.blockType.includes('rail') ? raycast.blockPos : raycast.adjacentPos;
        this.world.rails.spawnMinecart(placePos.x, placePos.y, placePos.z, true);
        this.triggerSwing();
        return { pos: placePos, type: 'rail' };
      }
      return null;
    }

    const isBlock = !(
      heldItem.includes('pickaxe') ||
      heldItem.includes('axe') ||
      heldItem.includes('sword') ||
      heldItem === 'stick' ||
      heldItem.includes('ingot') ||
      heldItem === 'coal' ||
      heldItem.includes('meat') ||
      heldItem.includes('apple')
    );

    if (!isBlock) return null;

    const raycast = this.world.raycastVoxel(eyePos, camDirection, this.reachDistance);
    if (!raycast.hit) return null;

    const targetPos = raycast.adjacentPos;

    // Prevent placing inside player's bounding box (except torches and rails)
    const playerMinX = this.position.x - this.playerRadius;
    const playerMaxX = this.position.x + this.playerRadius;
    const playerMinY = this.position.y;
    const playerMaxY = this.position.y + this.playerHeight;
    const playerMinZ = this.position.z - this.playerRadius;
    const playerMaxZ = this.position.z + this.playerRadius;

    const blockMinX = targetPos.x;
    const blockMaxX = targetPos.x + 1;
    const blockMinY = targetPos.y;
    const blockMaxY = targetPos.y + 1;
    const blockMinZ = targetPos.z;
    const blockMaxZ = targetPos.z + 1;

    const overlapsPlayer =
      playerMinX < blockMaxX &&
      playerMaxX > blockMinX &&
      playerMinY < blockMaxY &&
      playerMaxY > blockMinY &&
      playerMinZ < blockMaxZ &&
      playerMaxZ > blockMinZ;

    if (overlapsPlayer && heldItem !== 'torch' && !heldItem.includes('rail')) {
      return null;
    }

    this.world.setVoxel(targetPos.x, targetPos.y, targetPos.z, heldItem as BlockType);
    this.triggerSwing();
    soundManager.playPlace();

    return { pos: targetPos, type: heldItem as BlockType };
  }

  // Instant single-click mine trigger
  public instantMineTargetBlock(): { pos: THREE.Vector3; type: BlockType } | null {
    const eyePos = new THREE.Vector3(
      this.position.x,
      this.position.y + this.eyeHeight,
      this.position.z
    );
    const camDirection = new THREE.Vector3();
    this.camera.getWorldDirection(camDirection);

    const raycast = this.world.raycastVoxel(eyePos, camDirection, this.reachDistance);
    if (!raycast.hit) return null;

    this.triggerSwing();
    this.world.setVoxel(raycast.blockPos.x, raycast.blockPos.y, raycast.blockPos.z, 'air');
    this.world.spawnBreakParticles(raycast.blockPos, raycast.blockType);
    soundManager.playBreak();
    this.world.updateBreakProgress(null, -1);
    this.miningProgress = 0;

    return {
      pos: raycast.blockPos,
      type: raycast.blockType,
    };
  }

  public toggleFastMine(): boolean {
    this.isFastMine = !this.isFastMine;
    this.stats.instaMine = this.isFastMine;
    return this.isFastMine;
  }

  public toggleTurboSpeed(): boolean {
    this.isTurboSpeed = !this.isTurboSpeed;
    this.stats.superSpeed = this.isTurboSpeed;
    return this.isTurboSpeed;
  }

  public toggleGodMode(): boolean {
    this.stats.godMode = !this.stats.godMode;
    if (this.stats.godMode) {
      this.stats.health = this.stats.maxHealth;
      this.stats.hunger = this.stats.maxHunger;
      soundManager.playPowerUp();
    }
    return this.stats.godMode;
  }

  public toggleMegaJump(): boolean {
    this.stats.megaJump = !this.stats.megaJump;
    if (this.stats.megaJump) {
      soundManager.playPowerUp();
    }
    return this.stats.megaJump;
  }

  public toggleSuperSpeed(): boolean {
    this.stats.superSpeed = !this.stats.superSpeed;
    this.isTurboSpeed = this.stats.superSpeed;
    if (this.stats.superSpeed) {
      soundManager.playPowerUp();
    }
    return this.stats.superSpeed;
  }

  public toggleSuperRegen(): boolean {
    this.stats.superRegen = !this.stats.superRegen;
    return this.stats.superRegen;
  }

  public setHealthTier(maxHp: number) {
    this.stats.maxHealth = maxHp;
    this.stats.health = maxHp;
    soundManager.playPowerUp();
  }

  public healFull() {
    this.stats.health = this.stats.maxHealth;
    this.stats.hunger = this.stats.maxHunger;
    soundManager.playHeal();
  }

  public toggleFlight(): boolean {
    this.stats.isFlying = !this.stats.isFlying;
    if (this.stats.isFlying) {
      this.velocity.y = 0;
      soundManager.playPowerUp();
    }
    return this.stats.isFlying;
  }

  public setGameMode(newMode: GameMode) {
    this.mode = newMode;
    if (newMode === 'creative' || newMode === 'architect') {
      this.stats.isFlying = true;
      this.stats.godMode = true;
      this.stats.instaMine = true;
      this.isFastMine = true;
      this.reachDistance = 20.0;
      this.stats.health = this.stats.maxHealth;
      this.stats.hunger = this.stats.maxHunger;
      soundManager.playPowerUp();
    } else {
      this.reachDistance = 14.0;
      this.stats.isFlying = false;
      this.isFastMine = false;
      this.stats.instaMine = false;
    }
  }

  // 3x3 Blast Mine Strike: destroys a cubic cluster of blocks around targeted voxel!
  public blastMine(): { pos: THREE.Vector3; type: BlockType }[] {
    const eyePos = new THREE.Vector3(
      this.position.x,
      this.position.y + this.eyeHeight,
      this.position.z
    );
    const camDirection = new THREE.Vector3();
    this.camera.getWorldDirection(camDirection);

    const raycast = this.world.raycastVoxel(eyePos, camDirection, this.reachDistance);
    const center = raycast.hit
      ? raycast.blockPos
      : this.position
          .clone()
          .addScaledVector(camDirection, 3)
          .floor();

    this.triggerSwing();
    soundManager.playBlast();

    const broken: { pos: THREE.Vector3; type: BlockType }[] = [];
    const radius = 1; // 3x3x3 cube

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const bx = center.x + dx;
          const by = center.y + dy;
          const bz = center.z + dz;

          // Don't break bedrock/boundary below y=0
          if (by <= 0) continue;

          const blockType = this.world.getVoxel(bx, by, bz);
          if (blockType !== 'air' && blockType !== 'water') {
            const blockPos = new THREE.Vector3(bx, by, bz);
            this.world.setVoxel(bx, by, bz, 'air');
            this.world.spawnBreakParticles(blockPos, blockType);
            broken.push({ pos: blockPos, type: blockType });
          }
        }
      }
    }

    this.world.updateBreakProgress(null, -1);
    this.miningProgress = 0;
    return broken;
  }

  // Massive 5x5 Supermine Tunnel Excavation
  public triggerSupermine(): { type: BlockType }[] {
    const eyePos = new THREE.Vector3(
      this.position.x,
      this.position.y + this.eyeHeight,
      this.position.z
    );
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    const targetPos = this.currentTargetBlock
      ? this.currentTargetBlock
      : eyePos.clone().addScaledVector(camDir, 4);

    this.triggerSwing();
    const broken = this.world.triggerSupermineExcavate(targetPos, camDir);
    return broken;
  }

  // Thor's Lightning Strike Summon
  public triggerLightning(): { mobsHit: number } {
    const eyePos = new THREE.Vector3(
      this.position.x,
      this.position.y + this.eyeHeight,
      this.position.z
    );
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    const ray = this.world.raycastVoxel(eyePos, camDir, 35);
    const targetPos = ray.hit ? ray.blockPos : eyePos.clone().addScaledVector(camDir, 16);

    this.triggerSwing();
    return this.world.triggerLightningStrike(targetPos);
  }

  // Supersonic Rocket Dash
  public supersonicDash() {
    soundManager.playWhoosh();
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    this.velocity.x = camDir.x * 28;
    this.velocity.y = Math.max(camDir.y * 22, 6);
    this.velocity.z = camDir.z * 28;
    this.stats.isGrounded = false;
  }

  // Toggle Forcefield Energy Shield
  public toggleForcefield(): boolean {
    this.isForcefieldActive = !this.isForcefieldActive;
    this.stats.forcefield = this.isForcefieldActive;
    if (this.forcefieldMesh) {
      this.forcefieldMesh.visible = this.isForcefieldActive;
    }
    soundManager.playHeal();
    return this.isForcefieldActive;
  }

  // Spawn Skeleton
  public spawnSkeleton() {
    const camDirection = new THREE.Vector3();
    this.camera.getWorldDirection(camDirection);
    const spawnDist = 6.0;
    const targetX = this.position.x + camDirection.x * spawnDist;
    const targetZ = this.position.z + camDirection.z * spawnDist;
    
    const mob = this.world.spawnSkeleton(targetX, undefined, targetZ, this.position);
    soundManager.playPlace();
    return mob;
  }

  // Spawn Mystic Enderman
  public spawnEnderman() {
    const camDirection = new THREE.Vector3();
    this.camera.getWorldDirection(camDirection);
    const spawnDist = 6.0;
    const targetX = this.position.x + camDirection.x * spawnDist;
    const targetZ = this.position.z + camDirection.z * spawnDist;
    
    const mob = this.world.spawnEnderman(targetX, undefined, targetZ, this.position);
    soundManager.playTeleport();
    return mob;
  }

  // Spawn 200 People / Villager Population Crowd
  public spawnPeopleCrowd(count = 200) {
    const crowd = this.world.spawnPeopleCrowd(count, this.position);
    return crowd;
  }

  // Spawn Cute Pig
  public spawnPig() {
    const camDirection = new THREE.Vector3();
    this.camera.getWorldDirection(camDirection);
    const spawnDist = 4.0;
    const targetX = this.position.x + camDirection.x * spawnDist;
    const targetZ = this.position.z + camDirection.z * spawnDist;
    
    const mob = this.world.spawnPig(targetX, undefined, targetZ, this.position);
    soundManager.playPlace();
    return mob;
  }

  // Spawn Zombie
  public spawnZombie() {
    const camDirection = new THREE.Vector3();
    this.camera.getWorldDirection(camDirection);
    const spawnDist = 5.0;
    const targetX = this.position.x + camDirection.x * spawnDist;
    const targetZ = this.position.z + camDirection.z * spawnDist;
    
    const mob = this.world.spawnZombie(targetX, undefined, targetZ, this.position);
    soundManager.playPlace();
    return mob;
  }

  // Spawn Creeper in front of the player
  public spawnCreeper() {
    const camDirection = new THREE.Vector3();
    this.camera.getWorldDirection(camDirection);
    const spawnDist = 5.0;
    const targetX = this.position.x + camDirection.x * spawnDist;
    const targetZ = this.position.z + camDirection.z * spawnDist;
    
    const creeper = this.world.spawnCreeper(targetX, undefined, targetZ, this.position);
    soundManager.playPlace();
    return creeper;
  }

  // Attack targeted mob in front of player
  public tryAttackMob(damage = 8): MobEntity | null {
    const eyePos = new THREE.Vector3(
      this.position.x,
      this.position.y + this.eyeHeight,
      this.position.z
    );
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    for (const mob of this.world.mobs) {
      const mobPos = new THREE.Vector3(mob.x, mob.y + 0.8, mob.z);
      const toMob = mobPos.clone().sub(eyePos);
      const dist = toMob.length();

      if (dist <= this.reachDistance + 0.5) {
        toMob.normalize();
        const dot = camDir.dot(toMob);
        // Generous cone for crosshair aim
        if (dot > 0.82) {
          mob.health -= damage;
          soundManager.playHit('dirt');
          this.triggerSwing();

          // Slight knockback to mob
          mob.x += camDir.x * 0.8;
          mob.z += camDir.z * 0.8;

          return mob;
        }
      }
    }
    return null;
  }

  public toggleAutoWalk(): boolean {
    this.autoWalk = !this.autoWalk;
    return this.autoWalk;
  }

  public teleportToSafeSpawn() {
    const spawn = this.world.getSafeSpawnPosition(
      Math.round(this.position.x),
      Math.round(this.position.z)
    );
    this.teleportTo(spawn.x, spawn.y, spawn.z);
  }

  // City Generator & Interactive City Stampers
  public generateFullCity() {
    this.world.generateCityTerrain();
    soundManager.playVictory();
    const spawn = this.world.getSafeSpawnPosition(0, 6);
    this.teleportTo(spawn.x, Math.max(spawn.y, 3), spawn.z);
  }

  // Restaurant Generator & Interactive Restaurant Stampers
  public generateFullRestaurantPlaza() {
    this.world.generateRestaurantTerrain();
    soundManager.playRestaurantBell();
    soundManager.playVictory();
    this.teleportTo(0, 2, -4);
  }

  public stampRestaurantInFront() {
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const targetX = Math.round(this.position.x + camDir.x * 10);
    const targetZ = Math.round(this.position.z + camDir.z * 10);
    const groundY = Math.max(1, Math.round(this.position.y) - 1);
    this.world.stampRestaurant(targetX, groundY, targetZ);
    this.world.rebuildMeshes();
    soundManager.playRestaurantBell();
  }

  public orderGourmetMeal(): string {
    this.stats.health = this.stats.maxHealth;
    this.stats.hunger = this.stats.maxHunger;
    soundManager.playRestaurantBell();
    soundManager.playSizzle();
    soundManager.playEat();
    return 'Chef Pierre served a 5-Course Golden Feast! Health & Hunger fully restored.';
  }

  public stampSkyscraperInFront(height = 18) {
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const targetX = Math.round(this.position.x + camDir.x * 12);
    const targetZ = Math.round(this.position.z + camDir.z * 12);
    this.world.stampSkyscraper(targetX, targetZ, height);
    this.world.rebuildMeshes();
    soundManager.playCraft();
  }

  public stampTownhouseInFront() {
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const targetX = Math.round(this.position.x + camDir.x * 7);
    const targetZ = Math.round(this.position.z + camDir.z * 7);
    this.world.stampTownhouse(targetX, targetZ);
    this.world.rebuildMeshes();
    soundManager.playCraft();
  }

  public stampCarInFront(color: 'red' | 'blue' | 'yellow' = 'red') {
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const targetX = Math.round(this.position.x + camDir.x * 5);
    const targetZ = Math.round(this.position.z + camDir.z * 5);
    const groundY = Math.max(Math.round(this.position.y) - 1, 1);
    this.world.stampCar(targetX, groundY, targetZ, color);
    this.world.rebuildMeshes();
    soundManager.playPlace();
  }

  public stampFountainInFront() {
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const targetX = Math.round(this.position.x + camDir.x * 8);
    const targetZ = Math.round(this.position.z + camDir.z * 8);
    this.world.stampCivicParkAndFountain(targetX, targetZ);
    this.world.rebuildMeshes();
    soundManager.playCraft();
  }

  // Rollercoaster Controls & Stampers
  public boardRollercoaster() {
    if (!this.world.rollercoaster) {
      this.world.initRollercoaster();
    }
    this.world.rollercoaster!.boardCoaster();
    this.stats.isRidingCoaster = true;
  }

  public dismountRollercoaster() {
    if (this.world.rollercoaster) {
      this.world.rollercoaster.dismountCoaster();
      // Safely nudge player beside the track
      const cartPos = this.world.rollercoaster.cartGroup.position;
      this.teleportTo(cartPos.x + 1.5, cartPos.y + 0.5, cartPos.z);
    }
    this.stats.isRidingCoaster = false;
  }

  public toggleRollercoasterRide() {
    if (this.world.rollercoaster && this.world.rollercoaster.isRiding) {
      this.dismountRollercoaster();
    } else {
      this.boardRollercoaster();
    }
  }

  public triggerCoasterHorn() {
    if (this.world.rollercoaster) {
      this.world.rollercoaster.triggerHorn();
    } else {
      soundManager.playCoasterHorn();
    }
  }

  public toggleCoasterPerspective() {
    if (this.world.rollercoaster) {
      if (this.world.rollercoaster.perspective === 'first') {
        this.world.rollercoaster.perspective = 'third';
      } else if (this.world.rollercoaster.perspective === 'third') {
        this.world.rollercoaster.perspective = 'cinematic';
      } else {
        this.world.rollercoaster.perspective = 'first';
      }
    }
  }

  public generateCoasterPark() {
    this.world.generateCoasterTerrain();
    soundManager.playVictory();
    // Teleport to station entrance
    this.teleportTo(0, 8, -12);
  }

  public stampCoasterLoopInFront() {
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const targetX = Math.round(this.position.x + camDir.x * 10);
    const targetZ = Math.round(this.position.z + camDir.z * 10);
    const groundY = Math.max(1, Math.round(this.position.y));
    this.world.stampCoasterLoop(targetX, groundY, targetZ);
    soundManager.playCraft();
  }

  public stampFerrisWheelInFront() {
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const targetX = Math.round(this.position.x + camDir.x * 12);
    const targetZ = Math.round(this.position.z + camDir.z * 12);
    const groundY = Math.max(1, Math.round(this.position.y));
    this.world.stampFerrisWheel(targetX, groundY, targetZ);
    this.world.rebuildMeshes();
    soundManager.playCraft();
  }

  public stampDropTowerInFront() {
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const targetX = Math.round(this.position.x + camDir.x * 10);
    const targetZ = Math.round(this.position.z + camDir.z * 10);
    const groundY = Math.max(1, Math.round(this.position.y));
    this.world.stampDropTower(targetX, groundY, targetZ);
    this.world.rebuildMeshes();
    soundManager.playCraft();
  }

  // Minecart Driving Actions
  public accelerateMinecart(force?: number) {
    if (this.world.rails) this.world.rails.accelerateRidingCart(force);
  }

  public brakeMinecart() {
    if (this.world.rails) this.world.rails.brakeRidingCart();
  }

  public reverseMinecart() {
    if (this.world.rails) this.world.rails.reverseRidingCart();
  }

  public turboMinecart() {
    if (this.world.rails) this.world.rails.turboBoostRidingCart();
  }

  public toggleMinecartCruise(): boolean {
    if (this.world.rails) return this.world.rails.toggleCruise();
    return false;
  }

  public dismountMinecart() {
    if (this.world.rails) this.world.rails.dismountPlayer();
  }

  public triggerTrainHorn() {
    if (this.world.rails) this.world.rails.playHorn();
  }
}
