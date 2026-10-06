import * as THREE from 'three';
import { BlockType, BlueprintStructure, ChestContainer, ItemType, MobEntity, ProjectileEntity, WorldDropEntity } from '../types';
import { getBlockMaterials, getBreakCrackTexture } from '../utils/textures';
import { RollercoasterTrack } from './Rollercoaster';
import { MinecraftRailSystem } from './MinecraftRails';
import {
  getZombieFaceTexture,
  getZombieBodyTexture,
  getZombieLegTexture,
  getSkeletonFaceTexture,
  getSkeletonBodyTexture,
  getCreeperFaceTexture,
  getCreeperCamoTexture,
  getEndermanFaceTexture,
  getEndermanDarkTexture,
  getPigFaceTexture,
  getPigSkinTexture,
  getCowFaceTexture,
  getCowBodyTexture,
  getSheepFaceTexture,
  getSheepWoolTexture,
  getVillagerFaceTexture,
  getVillagerRobeTexture,
} from '../utils/mobTextures';
import { soundManager } from '../utils/audio';

export interface VoxelRaycastResult {
  hit: boolean;
  blockPos: THREE.Vector3;
  faceNormal: THREE.Vector3;
  adjacentPos: THREE.Vector3;
  blockType: BlockType;
  distance: number;
}

export interface WorldUpdateResult {
  zombieAttacked: boolean;
  creeperExploded: boolean;
  explosionDamage: number;
  explosionKnockback: THREE.Vector3 | null;
  arrowHitPlayer: boolean;
  arrowDamage: number;
  endermanAttacked: boolean;
  collectedDrops?: { type: ItemType; count: number }[];
}

export class VoxelWorld {
  public scene: THREE.Scene;
  public worldSize: number = 240; // -120 to +120 (Colossal Continental Giant Island)
  public voxels = new Map<string, BlockType>();
  public chests = new Map<string, ChestContainer>();

  // Instanced Meshes for each BlockType
  private instancedMeshes = new Map<BlockType, THREE.InstancedMesh>();
  private instanceCapacity = 131072;
  private blockPositions = new Map<BlockType, THREE.Vector3[]>();

  // Blueprint Ghost Mesh Group
  public blueprintGroup = new THREE.Scene();
  public activeBlueprint: BlueprintStructure | null = null;
  public blueprintOrigin = new THREE.Vector3(0, 5, 0);
  public blueprintLayerFilter: number = 99; // Show all layers by default
  public showBlueprintGhost: boolean = true;

  // Day-Night Cycle
  public timeOfDay: number = 0.25; // 0.0 = Sunrise, 0.25 = Noon, 0.5 = Sunset, 0.75 = Midnight
  public dayLengthSeconds: number = 180; // 3 minutes full day-night
  public sunLight!: THREE.DirectionalLight;
  public ambientLight!: THREE.AmbientLight;
  public sunMesh!: THREE.Mesh;
  public moonMesh!: THREE.Mesh;
  public starsGroup!: THREE.Points;

  // Selection Wireframe & Crack Box
  public selectionBox!: THREE.LineSegments;
  public crackMesh!: THREE.Mesh;

  // Particle System
  public particleGroup = new THREE.Group();
  private particles: {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
  }[] = [];

  // Projectiles (Skeleton Arrows)
  public projectiles: ProjectileEntity[] = [];
  public projectileGroup = new THREE.Group();

  // World Item Drops
  public worldDrops: WorldDropEntity[] = [];
  public worldDropGroup = new THREE.Group();

  // Mobs
  public mobs: MobEntity[] = [];
  private mobMeshes = new Map<string, THREE.Group>();

  // Rollercoaster Track Engine
  public rollercoaster: RollercoasterTrack | null = null;

  // Minecraft Authentic Rails & Minecart System
  public rails!: MinecraftRailSystem;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initLightingAndSky();
    this.initSelectionAndCrackMeshes();
    this.rails = new MinecraftRailSystem(this.scene, this);
    this.scene.add(this.particleGroup);
    this.scene.add(this.projectileGroup);
    this.scene.add(this.worldDropGroup);
    this.scene.add(this.blueprintGroup);
  }

  private initLightingAndSky() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    this.sunLight.position.set(60, 90, 60);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 450;
    this.sunLight.shadow.camera.left = -135;
    this.sunLight.shadow.camera.right = 135;
    this.sunLight.shadow.camera.top = 135;
    this.sunLight.shadow.camera.bottom = -135;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.scene.add(this.sunLight);

    // Sun Visual (Bright Yellow Cube)
    const sunGeo = new THREE.BoxGeometry(10, 10, 10);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffea42 });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunMesh);

    // Moon Visual (Pale White-Silver Cube)
    const moonGeo = new THREE.BoxGeometry(9, 9, 9);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xe6eef8 });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.scene.add(this.moonMesh);

    // Starfield covering the grand sky
    const starGeo = new THREE.BufferGeometry();
    const starCount = 800;
    const starCoords: number[] = [];
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 260;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      starCoords.push(x, y, z);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.8 });
    this.starsGroup = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starsGroup);
  }

  private initSelectionAndCrackMeshes() {
    // 1x1 Wireframe box
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.005, 1.005, 1.005));
    this.selectionBox = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
    );
    this.selectionBox.visible = false;
    this.scene.add(this.selectionBox);

    // Crack Box for mining animation
    const crackGeo = new THREE.BoxGeometry(1.008, 1.008, 1.008);
    const crackMat = new THREE.MeshBasicMaterial({
      map: getBreakCrackTexture(0),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    this.crackMesh = new THREE.Mesh(crackGeo, crackMat);
    this.crackMesh.visible = false;
    this.scene.add(this.crackMesh);
  }

  public getVoxel(x: number, y: number, z: number): BlockType {
    const key = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    return this.voxels.get(key) || 'air';
  }

  public getHighestSolidVoxel(x: number, z: number, maxSearchY = 32): number {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    for (let y = maxSearchY; y >= -8; y--) {
      const type = this.getVoxel(ix, y, iz);
      if (type !== 'air' && type !== 'water') {
        return y;
      }
    }
    return 3;
  }

  public getSafeSpawnPosition(targetX = 0, targetZ = 6): THREE.Vector3 {
    // Look around target location for a clear spot without trees/leaves
    for (let radius = 0; radius <= 8; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const x = targetX + dx;
          const z = targetZ + dz;
          const highY = this.getHighestSolidVoxel(x, z);
          // Check if space above is 2 blocks of air
          const above1 = this.getVoxel(x, highY + 1, z);
          const above2 = this.getVoxel(x, highY + 2, z);
          if ((above1 === 'air' || above1 === 'water') && (above2 === 'air' || above2 === 'water')) {
            return new THREE.Vector3(x + 0.5, highY + 1.05, z + 0.5);
          }
        }
      }
    }
    return new THREE.Vector3(targetX + 0.5, 8.05, targetZ + 0.5);
  }

  public setVoxel(x: number, y: number, z: number, type: BlockType, rebuild = true) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);
    const key = `${ix},${iy},${iz}`;

    if (type === 'air') {
      this.voxels.delete(key);
    } else {
      this.voxels.set(key, type);
    }

    if (rebuild) {
      this.rebuildMeshes();
    }
  }

  public clearWorld() {
    this.voxels.clear();
    this.chests.clear();
    this.blockPositions.clear();
    this.instancedMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    });
    this.instancedMeshes.clear();
    this.clearMobs();
    if (this.rails) {
      this.rails.clearMinecarts();
    }
  }

  public getChestAt(x: number, y: number, z: number): ChestContainer | undefined {
    const key = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    return this.chests.get(key);
  }

  public setChestAt(x: number, y: number, z: number, chest: ChestContainer) {
    const key = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    this.chests.set(key, chest);
  }

  // Check if a voxel has at least one exposed face (not surrounded on all 6 sides by solid opaque blocks)
  public isBlockVisible(x: number, y: number, z: number, type: BlockType): boolean {
    if (type === 'glass' || type === 'water' || type === 'leaves' || type === 'torch' || type.includes('rail')) {
      return true;
    }
    const isTransparentOrAir = (bx: number, by: number, bz: number) => {
      const neighbor = this.voxels.get(`${bx},${by},${bz}`);
      return !neighbor || neighbor === 'air' || neighbor === 'water' || neighbor === 'glass' || neighbor === 'leaves' || neighbor === 'torch' || neighbor.includes('rail');
    };

    return (
      isTransparentOrAir(x + 1, y, z) ||
      isTransparentOrAir(x - 1, y, z) ||
      isTransparentOrAir(x, y + 1, z) ||
      isTransparentOrAir(x, y - 1, z) ||
      isTransparentOrAir(x, y, z + 1) ||
      isTransparentOrAir(x, y, z - 1)
    );
  }

  // Procedural Terrain Generation (Authentic Minecraft World: Grand Radius 48 with Multi-Biome, Caves, Villages, Desert Temples, and Dungeons)
  public generateTerrain(levelId: number = 1) {
    if (levelId === 7) {
      this.generateCityTerrain();
      return;
    }
    if (levelId === 8) {
      this.generateCoasterTerrain();
      return;
    }

    this.clearWorld();
    const radius = 115; // Colossal 231x231 Giant Continental Island!

    const isRavineLevel = levelId === 3;
    const isWatchtowerLevel = levelId === 4;
    const isCastleLevel = levelId === 5;

    // 1. First Pass: Heightmap & Biomes across the Colossal Island
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const distFromCenter = Math.hypot(x, z);

        // Biome climate calculation across wide continent
        // Desert in South-West, Taiga in North-West, Plains/Forest in Center/East, Mountains in North
        const tempNoise = Math.sin(x * 0.025) * 0.5 + Math.cos(z * 0.025) * 0.5;
        const isDesert = tempNoise < -0.28 && (x < 18 && z < 18);
        const isTaiga = tempNoise > 0.32 || (z < -35 && x > -40);
        const isMountains = (z < -20 && x < -25) || (x > 45 && z > 35);

        // Natural undulating terrain with mountain ridges, rolling hills, and riverbeds
        let height = Math.floor(
          3 +
          Math.sin(x * 0.04) * 4.5 +
          Math.cos(z * 0.04) * 4.5 +
          Math.sin((x + z) * 0.02) * 3.2 +
          Math.cos((x - z) * 0.025) * 2.2
        );

        if (isDesert) {
          // Rolling vast desert sand dunes
          height = Math.floor(2 + Math.sin(x * 0.05) * 3.2 + Math.cos(z * 0.05) * 3.2);
        } else if (isMountains) {
          // Towering snowy mountain peaks
          height = Math.floor(10 + Math.sin(x * 0.05) * 8.5 + Math.cos(z * 0.05) * 8.5);
        }

        // Colossal Island Coastal Falloff:
        // Land slopes gently down into sandy beaches and blue ocean towards outer edge
        if (distFromCenter > radius * 0.74) {
          const edgeFraction = (distFromCenter - radius * 0.74) / (radius * 0.26);
          const falloff = Math.min(1.0, edgeFraction);
          height = Math.floor(height * (1.0 - falloff) - falloff * 5);
        }

        // Level-specific topography
        if (isRavineLevel) {
          const ravineDist = Math.abs(x - Math.sin(z * 0.08) * 4);
          if (ravineDist < 3.5) {
            height = -2; // Deep gorge bottom
          } else if (ravineDist < 6) {
            height = 1;
          } else {
            height = Math.max(3, height);
          }
        } else if (isWatchtowerLevel) {
          if (distFromCenter < 12) {
            height = Math.floor(5 + (12 - distFromCenter) * 0.5);
          }
        } else if (isCastleLevel) {
          if (distFromCenter < 16) {
            height = 3;
          }
        }

        const isCoastBeach = height <= 1 && height >= -1 && distFromCenter > radius * 0.65;

        // Fill blocks from bedrock (-4) up to surface
        for (let y = -4; y <= height; y++) {
          if (y === -4) {
            // Unbreakable Bedrock floor
            this.setVoxel(x, y, z, 'bedrock', false);
          } else if (y === height && y >= 0) {
            if (isCoastBeach || isDesert) {
              this.setVoxel(x, y, z, 'sand', false);
            } else if (isTaiga && height >= 7) {
              this.setVoxel(x, y, z, 'snow', false);
            } else if (isMountains && height >= 10) {
              this.setVoxel(x, y, z, Math.random() < 0.6 ? 'snow' : 'ice', false);
            } else if (isMountains && height >= 7) {
              this.setVoxel(x, y, z, 'stone', false);
            } else {
              this.setVoxel(x, y, z, 'grass', false);
            }
          } else if (y >= height - 2 && y >= 0) {
            if (isCoastBeach || isDesert) {
              this.setVoxel(x, y, z, y === height - 1 ? 'sand' : 'sandstone', false);
            } else {
              this.setVoxel(x, y, z, 'dirt', false);
            }
          } else {
            // Subterranean Stone with rich authentic ore veins
            const oreRand = Math.random();
            if (oreRand < 0.045 && y < height - 2) {
              this.setVoxel(x, y, z, 'coal_ore', false);
            } else if (oreRand < 0.075 && y < height - 3) {
              this.setVoxel(x, y, z, 'iron_ore', false);
            } else if (oreRand < 0.088 && y <= -1) {
              this.setVoxel(x, y, z, 'gold_ore', false);
            } else if (oreRand < 0.098 && y <= -2) {
              this.setVoxel(x, y, z, 'diamond_ore', false);
            } else if (oreRand < 0.11) {
              this.setVoxel(x, y, z, 'gravel', false);
            } else {
              this.setVoxel(x, y, z, 'stone', false);
            }
          }
        }

        // Water in deep valleys/seas if below y = 0
        if (height < 0) {
          for (let wy = height + 1; wy <= 0; wy++) {
            this.setVoxel(x, wy, z, 'water', false);
          }
          // Sandy/gravel seabed
          this.setVoxel(x, height, z, Math.random() < 0.5 ? 'sand' : 'gravel', false);
        }

        // Trees, Cacti & Flora generation across the biomes
        if (height >= 0 && !isRavineLevel) {
          if (isDesert) {
            // Cactus pillars (1 to 3 tall)
            if (distFromCenter > 4 && Math.random() < 0.018 && height < 7) {
              this.generateCactus(x, height + 1, z);
            }
          } else if (isTaiga) {
            // Spruce / Pine Trees
            if (distFromCenter > 5 && Math.random() < 0.024 && height < 9) {
              this.generateSpruceTree(x, height + 1, z);
            }
          } else if (!isMountains) {
            // Plains & Forest Trees (Oak & Birch)
            if (distFromCenter > 5 && Math.random() < 0.022 && height < 8) {
              if (Math.random() < 0.35) {
                this.generateBirchTree(x, height + 1, z);
              } else {
                this.generateOakTree(x, height + 1, z);
              }
            } else if (distFromCenter > 3 && Math.random() < 0.02) {
              // Wild flowers
              const flowerColors: BlockType[] = ['red_wool', 'yellow_wool', 'blue_wool'];
              this.setVoxel(x, height + 1, z, flowerColors[Math.floor(Math.random() * flowerColors.length)], false);
            }
          }
        }
      }
    }

    // 2. Subterranean Cave Worm Carver (Natural winding tunnels through the continent)
    for (let c = 0; c < 10; c++) {
      let cx = (Math.random() - 0.5) * 110;
      let cy = -2 + Math.random() * 5;
      let cz = (Math.random() - 0.5) * 110;
      let dir = new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 2).normalize();

      for (let step = 0; step < 36; step++) {
        cx += dir.x * 1.6;
        cy += dir.y * 1.1;
        cz += dir.z * 1.6;
        dir.x += (Math.random() - 0.5) * 0.45;
        dir.z += (Math.random() - 0.5) * 0.45;
        dir.normalize();

        const caveRadius = 2.0 + Math.sin(step * 0.3) * 0.8;
        const icx = Math.floor(cx);
        const icy = Math.floor(cy);
        const icz = Math.floor(cz);

        for (let dx = -Math.ceil(caveRadius); dx <= Math.ceil(caveRadius); dx++) {
          for (let dy = -Math.ceil(caveRadius); dy <= Math.ceil(caveRadius); dy++) {
            for (let dz = -Math.ceil(caveRadius); dz <= Math.ceil(caveRadius); dz++) {
              if (Math.hypot(dx, dy, dz) <= caveRadius) {
                const bx = icx + dx;
                const by = icy + dy;
                const bz = icz + dz;
                if (by > -4 && by < 12) {
                  this.setVoxel(bx, by, bz, 'air', false);
                }
              }
            }
          }
        }
      }
    }

    // 3. Stamp Natural Minecraft Structures
    if (levelId === 1 || levelId === 2) {
      // Authentic NPC Village in Plains (around X=18, Z=18)
      const villageBaseY = this.getHighestSolidVoxel(18, 18);
      this.stampVillage(18, villageBaseY, 18);

      // Authentic Sandstone Desert Temple (around X=-26, Z=-26)
      const templeBaseY = this.getHighestSolidVoxel(-26, -26);
      this.stampDesertTemple(-26, templeBaseY, -26);

      // Authentic Subterranean Dungeon (around X=-12, Y=-2, Z=12)
      this.stampDungeon(-12, -2, 12);
    }

    // 4. Ambient Mob Population (Real authentic Minecraft wildlife)
    if (levelId === 1) {
      for (let i = 0; i < 4; i++) {
        this.spawnSheep();
        this.spawnCow();
        this.spawnPig();
      }
      this.spawnCreeper();
      this.spawnSkeleton();
      this.spawnZombie();
    }

    this.rebuildMeshes();
  }

  // --- TREE GENERATOR ALIAS ---
  public generateTree(x: number, y: number, z: number) {
    this.generateOakTree(x, y, z);
  }

  // --- OAK TREE GENERATOR ---
  private generateOakTree(x: number, y: number, z: number) {
    const trunkHeight = 4 + Math.floor(Math.random() * 3);
    for (let ty = 0; ty < trunkHeight; ty++) {
      this.setVoxel(x, y + ty, z, 'wood', false);
    }
    const topY = y + trunkHeight - 1;
    for (let ly = -2; ly <= 1; ly++) {
      const radius = ly === 1 ? 1 : 2;
      for (let lx = -radius; lx <= radius; lx++) {
        for (let lz = -radius; lz <= radius; lz++) {
          if (lx === 0 && lz === 0 && ly < 1) continue;
          if (Math.abs(lx) === 2 && Math.abs(lz) === 2 && Math.random() < 0.4) continue;
          this.setVoxel(x + lx, topY + ly, z + lz, 'leaves', false);
        }
      }
    }
  }

  // --- BIRCH TREE GENERATOR ---
  private generateBirchTree(x: number, y: number, z: number) {
    const trunkHeight = 5 + Math.floor(Math.random() * 2);
    for (let ty = 0; ty < trunkHeight; ty++) {
      this.setVoxel(x, y + ty, z, 'birch_wood', false);
    }
    const topY = y + trunkHeight - 1;
    for (let ly = -2; ly <= 1; ly++) {
      const radius = ly === 1 ? 1 : 2;
      for (let lx = -radius; lx <= radius; lx++) {
        for (let lz = -radius; lz <= radius; lz++) {
          if (lx === 0 && lz === 0 && ly < 1) continue;
          if (Math.abs(lx) === 2 && Math.abs(lz) === 2 && Math.random() < 0.3) continue;
          this.setVoxel(x + lx, topY + ly, z + lz, 'leaves', false);
        }
      }
    }
  }

  // --- SPRUCE / PINE TREE GENERATOR ---
  private generateSpruceTree(x: number, y: number, z: number) {
    const trunkHeight = 6 + Math.floor(Math.random() * 3);
    for (let ty = 0; ty < trunkHeight; ty++) {
      this.setVoxel(x, y + ty, z, 'spruce_wood', false);
    }
    // Conical pine foliage
    const topY = y + trunkHeight;
    this.setVoxel(x, topY, z, 'spruce_leaves', false);
    this.setVoxel(x, topY + 1, z, 'spruce_leaves', false);

    for (let lx = -1; lx <= 1; lx++) {
      for (let lz = -1; lz <= 1; lz++) {
        this.setVoxel(x + lx, topY - 1, z + lz, 'spruce_leaves', false);
      }
    }
    for (let lx = -2; lx <= 2; lx++) {
      for (let lz = -2; lz <= 2; lz++) {
        if (Math.abs(lx) === 2 && Math.abs(lz) === 2 && Math.random() < 0.5) continue;
        this.setVoxel(x + lx, topY - 3, z + lz, 'spruce_leaves', false);
      }
    }
  }

  // --- CACTUS GENERATOR ---
  private generateCactus(x: number, y: number, z: number) {
    const cHeight = 2 + Math.floor(Math.random() * 2);
    for (let cy = 0; cy < cHeight; cy++) {
      this.setVoxel(x, y + cy, z, 'cactus', false);
    }
  }

  // --- 1. NPC VILLAGE STAMP (Plains Village with Houses, Farms, Well, & Villagers) ---
  public stampVillage(cx: number, cy: number, cz: number) {
    // A. Village Water Well (Center)
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const isRim = Math.abs(dx) === 2 || Math.abs(dz) === 2;
        this.setVoxel(cx + dx, cy, cz + dz, isRim ? 'cobblestone' : 'water', false);
        this.setVoxel(cx + dx, cy - 1, cz + dz, isRim ? 'cobblestone' : 'water', false);
        this.setVoxel(cx + dx, cy - 2, cz + dz, 'cobblestone', false);
      }
    }
    // Well corner pillars & roof
    const wellCorners = [{ x: -2, z: -2 }, { x: 2, z: -2 }, { x: -2, z: 2 }, { x: 2, z: 2 }];
    for (const c of wellCorners) {
      for (let py = 1; py <= 3; py++) {
        this.setVoxel(cx + c.x, cy + py, cz + c.z, 'wood', false);
      }
    }
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        this.setVoxel(cx + dx, cy + 4, cz + dz, 'planks', false);
      }
    }

    // B. Gravel Pathways
    for (let p = -14; p <= 14; p++) {
      this.setVoxel(cx + p, cy, cz + 3, 'gravel', false);
      this.setVoxel(cx + p, cy, cz + 4, 'gravel', false);
      this.setVoxel(cx + 3, cy, cz + p, 'gravel', false);
      this.setVoxel(cx + 4, cy, cz + p, 'gravel', false);
    }

    // C. Villager House 1 (Residential Cottage at X+7, Z+7)
    const h1x = cx + 7;
    const h1z = cz + 7;
    for (let dx = 0; dx <= 4; dx++) {
      for (let dz = 0; dz <= 4; dz++) {
        for (let dy = 0; dy <= 4; dy++) {
          const isEdge = dx === 0 || dx === 4 || dz === 0 || dz === 4;
          const isCorner = (dx === 0 || dx === 4) && (dz === 0 || dz === 4);
          if (dy === 0) {
            this.setVoxel(h1x + dx, cy + dy, h1z + dz, 'cobblestone', false); // Floor
          } else if (dy === 4) {
            this.setVoxel(h1x + dx, cy + dy, h1z + dz, 'planks', false); // Ceiling
          } else if (isCorner) {
            this.setVoxel(h1x + dx, cy + dy, h1z + dz, 'wood', false); // Corner logs
          } else if (isEdge) {
            // Doorway at front (dx=2, dz=0)
            if (dx === 2 && dz === 0 && (dy === 1 || dy === 2)) {
              this.setVoxel(h1x + dx, cy + dy, h1z + dz, 'air', false);
            } else if ((dx === 0 || dx === 4) && dz === 2 && dy === 2) {
              this.setVoxel(h1x + dx, cy + dy, h1z + dz, 'glass', false); // Window
            } else {
              this.setVoxel(h1x + dx, cy + dy, h1z + dz, 'planks', false);
            }
          } else {
            this.setVoxel(h1x + dx, cy + dy, h1z + dz, 'air', false); // Inside room
          }
        }
      }
    }
    // Interior Furniture & Cottage Chest
    this.setVoxel(h1x + 1, cy + 1, h1z + 3, 'bookshelf', false);
    this.setVoxel(h1x + 3, cy + 1, h1z + 3, 'crafting_table', false);
    this.setVoxel(h1x + 1, cy + 1, h1z + 1, 'chest', false);
    this.setChestAt(h1x + 1, cy + 1, h1z + 1, {
      id: `village_chest_1_${Date.now()}`,
      x: h1x + 1,
      y: cy + 1,
      z: h1z + 1,
      title: 'Villager Chest',
      items: [
        { type: 'bread', count: 4 },
        { type: 'apple', count: 3 },
        { type: 'iron_ingot', count: 2 },
        { type: 'stick', count: 8 },
        null, null, null, null, null,
        null, { type: 'wooden_pickaxe', count: 1 }, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null, null,
      ],
    });

    // D. Villager House 2 (Blacksmith Workshop at X-9, Z+7)
    const h2x = cx - 9;
    const h2z = cz + 7;
    for (let dx = 0; dx <= 5; dx++) {
      for (let dz = 0; dz <= 5; dz++) {
        for (let dy = 0; dy <= 4; dy++) {
          const isEdge = dx === 0 || dx === 5 || dz === 0 || dz === 5;
          if (dy === 0) {
            this.setVoxel(h2x + dx, cy + dy, h2z + dz, 'stone', false);
          } else if (dy === 4) {
            this.setVoxel(h2x + dx, cy + dy, h2z + dz, 'cobblestone', false);
          } else if (isEdge) {
            if (dx === 2 && dz === 0 && (dy === 1 || dy === 2)) {
              this.setVoxel(h2x + dx, cy + dy, h2z + dz, 'air', false); // Open doorway
            } else {
              this.setVoxel(h2x + dx, cy + dy, h2z + dz, 'cobblestone', false);
            }
          } else {
            this.setVoxel(h2x + dx, cy + dy, h2z + dz, 'air', false);
          }
        }
      }
    }
    // Blacksmith Anvil, Furnaces & Legendary Blacksmith Chest
    this.setVoxel(h2x + 1, cy + 1, h2z + 4, 'furnace', false);
    this.setVoxel(h2x + 2, cy + 1, h2z + 4, 'furnace', false);
    this.setVoxel(h2x + 4, cy + 1, h2z + 4, 'iron_block', false);
    this.setVoxel(h2x + 4, cy + 1, h2z + 1, 'chest', false);
    this.setChestAt(h2x + 4, cy + 1, h2z + 1, {
      id: `blacksmith_chest_${Date.now()}`,
      x: h2x + 4,
      y: cy + 1,
      z: h2z + 1,
      title: 'Blacksmith Chest',
      items: [
        { type: 'diamond', count: 3 },
        { type: 'iron_ingot', count: 7 },
        { type: 'gold_ingot', count: 4 },
        { type: 'iron_sword', count: 1 },
        { type: 'iron_pickaxe', count: 1 },
        { type: 'bread', count: 5 },
        null, null, null,
        null, null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null, null,
      ],
    });

    // E. Village Farm Crops (Water canal flanked by farmland at X+7, Z-8)
    const fx = cx + 7;
    const fz = cz - 8;
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -4; dz <= 4; dz++) {
        const isBorder = Math.abs(dx) === 3 || Math.abs(dz) === 4;
        if (isBorder) {
          this.setVoxel(fx + dx, cy, fz + dz, 'wood', false);
        } else if (dx === 0) {
          this.setVoxel(fx + dx, cy, fz + dz, 'water', false); // Irrigation water canal
        } else {
          this.setVoxel(fx + dx, cy, fz + dz, 'farmland', false); // Moist farmland
        }
      }
    }

    // F. Street Lamp Posts with Torches
    const lamps = [{ x: cx + 5, z: cz + 5 }, { x: cx - 5, z: cz + 5 }, { x: cx + 5, z: cz - 5 }];
    for (const lp of lamps) {
      this.setVoxel(lp.x, cy + 1, lp.z, 'wood', false);
      this.setVoxel(lp.x, cy + 2, lp.z, 'wood', false);
      this.setVoxel(lp.x, cy + 3, lp.z, 'glowstone', false);
    }

    // G. Spawn Authentic NPC Villagers!
    this.spawnVillager(cx + 4, cy + 1, cz + 4);
    this.spawnVillager(h1x + 2, cy + 1, h1z + 2);
    this.spawnVillager(h2x + 2, cy + 1, h2z + 2);
  }

  // --- 2. AUTHENTIC DESERT TEMPLE STAMP (Sandstone Pyramid, Secret Trap & 4 Loot Chests) ---
  public stampDesertTemple(cx: number, cy: number, cz: number) {
    const size = 11;
    const half = Math.floor(size / 2);

    // Stepped Sandstone Pyramid
    for (let layer = 0; layer < 6; layer++) {
      const curSize = size - layer * 2;
      const curHalf = Math.floor(curSize / 2);
      for (let dx = -curHalf; dx <= curHalf; dx++) {
        for (let dz = -curHalf; dz <= curHalf; dz++) {
          this.setVoxel(cx + dx, cy + layer, cz + dz, 'sandstone', false);
        }
      }
    }

    // Hollow out inner sacred chamber
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        for (let dy = 1; dy <= 4; dy++) {
          this.setVoxel(cx + dx, cy + dy, cz + dz, 'air', false);
        }
      }
    }

    // Temple Entrance Emblem Floor
    this.setVoxel(cx, cy, cz, 'blue_wool', false); // Center blue wool trigger block
    this.setVoxel(cx + 1, cy, cz, 'sandstone', false);
    this.setVoxel(cx - 1, cy, cz, 'sandstone', false);
    this.setVoxel(cx, cy, cz + 1, 'sandstone', false);
    this.setVoxel(cx, cy, cz - 1, 'sandstone', false);

    // Dual Front Towers
    const towerCoords = [{ x: cx - 6, z: cz - 4 }, { x: cx + 6, z: cz - 4 }];
    for (const t of towerCoords) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          for (let dy = 0; dy <= 8; dy++) {
            this.setVoxel(t.x + dx, cy + dy, t.z + dz, 'sandstone', false);
          }
        }
      }
      this.setVoxel(t.x, cy + 9, t.z, 'blue_wool', false);
    }

    // SECRET UNDERGROUND TREASURE VAULT & TNT TRAP PIT!
    const pitDepth = 4;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = -pitDepth; dy < 0; dy++) {
          this.setVoxel(cx + dx, cy + dy, cz + dz, 'air', false);
        }
      }
    }

    // TNT beneath floor trap
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        this.setVoxel(cx + dx, cy - pitDepth - 1, cz + dz, 'tnt', false);
      }
    }

    // 4 Legendary Desert Temple Loot Chests
    const chestLocations = [
      { x: cx - 2, z: cz, title: 'Temple Vault Chest North' },
      { x: cx + 2, z: cz, title: 'Temple Vault Chest South' },
      { x: cx, z: cz - 2, title: 'Temple Vault Chest West' },
      { x: cx, z: cz + 2, title: 'Temple Vault Chest East' },
    ];

    chestLocations.forEach((c, idx) => {
      this.setVoxel(c.x, cy - pitDepth, c.z, 'chest', false);
      this.setChestAt(c.x, cy - pitDepth, c.z, {
        id: `temple_chest_${idx}_${Date.now()}`,
        x: c.x,
        y: cy - pitDepth,
        z: c.z,
        title: c.title,
        items: [
          { type: 'diamond', count: 2 + idx },
          { type: 'golden_apple', count: 1 },
          { type: 'gold_ingot', count: 5 },
          { type: 'iron_ingot', count: 6 },
          { type: 'bone', count: 8 },
          { type: 'gunpowder', count: 4 },
          { type: 'bow', count: 1 },
          { type: 'arrow', count: 16 },
          null,
          null, null, null, null, null, null, null, null, null,
          null, null, null, null, null, null, null, null, null,
        ],
      });
    });
  }

  // --- 3. SUBTERRANEAN DUNGEON STAMP (Mossy Cobblestone, Monster Spawner, 2 Loot Chests) ---
  public stampDungeon(cx: number, cy: number, cz: number) {
    // 7x7 Room
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        for (let dy = 0; dy <= 4; dy++) {
          const isWall = Math.abs(dx) === 3 || Math.abs(dz) === 3 || dy === 0 || dy === 4;
          if (isWall) {
            const block: BlockType = Math.random() < 0.6 ? 'mossy_cobblestone' : 'cobblestone';
            this.setVoxel(cx + dx, cy + dy, cz + dz, block, false);
          } else {
            this.setVoxel(cx + dx, cy + dy, cz + dz, 'air', false);
          }
        }
      }
    }

    // Center Spawner Cage (Obsidian with Fire Torch)
    this.setVoxel(cx, cy + 1, cz, 'obsidian', false);
    this.setVoxel(cx, cy + 2, cz, 'torch', false);

    // 2 Dungeon Loot Chests
    this.setVoxel(cx - 2, cy + 1, cz, 'chest', false);
    this.setChestAt(cx - 2, cy + 1, cz, {
      id: `dungeon_chest_1_${Date.now()}`,
      x: cx - 2,
      y: cy + 1,
      z: cz,
      title: 'Dungeon Chest',
      items: [
        { type: 'golden_apple', count: 1 },
        { type: 'diamond', count: 1 },
        { type: 'iron_ingot', count: 4 },
        { type: 'bone', count: 6 },
        { type: 'gunpowder', count: 5 },
        null, null, null, null,
        null, null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null, null,
      ],
    });

    this.setVoxel(cx + 2, cy + 1, cz, 'chest', false);
    this.setChestAt(cx + 2, cy + 1, cz, {
      id: `dungeon_chest_2_${Date.now()}`,
      x: cx + 2,
      y: cy + 1,
      z: cz,
      title: 'Dungeon Chest',
      items: [
        { type: 'bread', count: 3 },
        { type: 'iron_sword', count: 1 },
        { type: 'gold_ingot', count: 3 },
        { type: 'arrow', count: 12 },
        null, null, null, null, null,
        null, null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null, null,
      ],
    });
  }

  // Generate Complete Voxel Megacity (Expanded Metropolis: Radius 46)
  public generateCityTerrain() {
    this.clearWorld();
    const radius = 46;

    // 1. Base Bedrock & Deep Earth
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        for (let y = -4; y <= -1; y++) {
          this.setVoxel(x, y, z, 'stone', false);
        }
        // Default surface
        this.setVoxel(x, 0, z, 'grass', false);
      }
    }

    // 2. Multi-Avenue Road Network & Sidewalks (Center + Perimeter Avenues)
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const isMainNSRoad = Math.abs(x) <= 3;
        const isMainEWRoad = Math.abs(z) <= 3;
        const isSideNSRoad1 = Math.abs(x - 26) <= 2;
        const isSideNSRoad2 = Math.abs(x + 26) <= 2;
        const isSideEWRoad1 = Math.abs(z - 26) <= 2;
        const isSideEWRoad2 = Math.abs(z + 26) <= 2;

        const isRoad = isMainNSRoad || isMainEWRoad || isSideNSRoad1 || isSideNSRoad2 || isSideEWRoad1 || isSideEWRoad2;

        const isMainNSSidewalk = (Math.abs(x) === 4 || Math.abs(x) === 5) && !isRoad;
        const isMainEWSidewalk = (Math.abs(z) === 4 || Math.abs(z) === 5) && !isRoad;
        const isSideSidewalk = (Math.abs(Math.abs(x) - 26) === 3 || Math.abs(Math.abs(z) - 26) === 3) && !isRoad;

        if (isRoad) {
          // Asphalt road surface at y = 0
          if ((x === 0 || z === 0 || x === 26 || x === -26 || z === 26 || z === -26) && (Math.abs(x) > 3 || Math.abs(z) > 3)) {
            this.setVoxel(x, 0, z, 'yellow_wool', false); // Double yellow divider line
          } else {
            this.setVoxel(x, 0, z, 'stone', false);
          }
        } else if (isMainNSSidewalk || isMainEWSidewalk || isSideSidewalk) {
          // Raised Paved Sidewalk at y = 1
          this.setVoxel(x, 0, z, 'stone', false);
          this.setVoxel(x, 1, z, 'cobblestone', false);
        }
      }
    }

    // 3. Street Lamps along All Major Sidewalks
    const lampCoords = [
      { x: -5, z: -35 }, { x: -5, z: -20 }, { x: -5, z: -8 }, { x: -5, z: 8 }, { x: -5, z: 20 }, { x: -5, z: 35 },
      { x: 5, z: -35 }, { x: 5, z: -20 }, { x: 5, z: -8 }, { x: 5, z: 8 }, { x: 5, z: 20 }, { x: 5, z: 35 },
      { x: -35, z: -5 }, { x: -20, z: -5 }, { x: -8, z: -5 }, { x: 8, z: -5 }, { x: 20, z: -5 }, { x: 35, z: -5 },
      { x: -35, z: 5 }, { x: -20, z: 5 }, { x: -8, z: 5 }, { x: 8, z: 5 }, { x: 20, z: 5 }, { x: 35, z: 5 },
      { x: 23, z: -15 }, { x: 23, z: 15 }, { x: -23, z: -15 }, { x: -23, z: 15 },
    ];
    for (const lamp of lampCoords) {
      this.stampStreetLamp(lamp.x, 1, lamp.z);
    }

    // 4. Traffic Lights at Central and Side Intersections
    this.stampTrafficLight(-4, 1, -4);
    this.stampTrafficLight(4, 1, -4);
    this.stampTrafficLight(-4, 1, 4);
    this.stampTrafficLight(4, 1, 4);
    this.stampTrafficLight(23, 1, 23);
    this.stampTrafficLight(-23, 1, -23);

    // 5. Quadrant 1 (North-West): 18-Story Aether Glass Skyscraper + Modern Plaza
    this.stampSkyscraper(-14, -14, 20);
    this.stampSkyscraper(-34, -14, 14);
    this.stampTownhouse(-14, -34);

    // 6. Quadrant 2 (North-East): 15-Story Solaris Stepped High-Rise + Financial Tower
    this.stampSteppedSkyscraper(14, -14, 16);
    this.stampSteppedSkyscraper(34, -14, 12);
    this.stampTownhouse(34, -34);

    // 7. Quadrant 3 (South-East): 14-Story Obsidian Corporate Center & Rooftop Pool
    this.stampObsidianTower(14, 14, 15);
    this.stampObsidianTower(34, 14, 11);
    this.stampTownhouse(34, 34);

    // 8. Quadrant 4 (South-West): Metropolitan Civic Plaza & Grand Fountain + Amphitheater
    this.stampCivicParkAndFountain(-14, 14);
    this.stampSteppedSkyscraper(-34, 34, 13);
    this.stampTownhouse(-14, 34);

    // 9. Extra Urban Townhouses & Districts
    this.stampTownhouse(14, 34);
    this.stampTownhouse(-34, 14);

    // 10. City Vehicles on Avenues
    this.stampCar(2, 1, 10, 'red');
    this.stampCar(-2, 1, -12, 'blue');
    this.stampCar(28, 1, 14, 'blue');
    this.stampCar(-28, 1, -16, 'red');
    this.stampBus(-2, 1, 18);
    this.stampBus(2, 1, -24);

    // 11. Subway / Metro Station Entrance
    this.stampSubwayEntrance(5, 1, 9);
    this.stampSubwayEntrance(-5, 1, -20);

    this.rebuildMeshes();
  }

  // Stamp a Modern Street Light
  public stampStreetLamp(x: number, baseY: number, z: number) {
    this.setVoxel(x, baseY + 1, z, 'obsidian', false);
    this.setVoxel(x, baseY + 2, z, 'obsidian', false);
    this.setVoxel(x, baseY + 3, z, 'obsidian', false);
    this.setVoxel(x, baseY + 4, z, 'stone', false);
    this.setVoxel(x, baseY + 4, z > 0 ? z - 1 : z + 1, 'glowstone', false);
  }

  // Stamp a Traffic Light
  public stampTrafficLight(x: number, baseY: number, z: number) {
    this.setVoxel(x, baseY + 1, z, 'obsidian', false);
    this.setVoxel(x, baseY + 2, z, 'obsidian', false);
    this.setVoxel(x, baseY + 3, z, 'obsidian', false);
    this.setVoxel(x, baseY + 4, z, 'red_wool', false); // Red Light
    this.setVoxel(x, baseY + 3, x > 0 ? x - 1 : x + 1, 'yellow_wool', false); // Amber
    this.setVoxel(x, baseY + 2, x > 0 ? x - 1 : x + 1, 'glowstone', false); // Green
  }

  // Stamp an 18-Story Aether Glass Skyscraper
  public stampSkyscraper(centerX: number, centerZ: number, height: number = 18) {
    const halfWidth = 4; // 9x9 footprint
    const minX = centerX - halfWidth;
    const maxX = centerX + halfWidth;
    const minZ = centerZ - halfWidth;
    const maxZ = centerZ + halfWidth;

    // Foundation
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        this.setVoxel(x, 1, z, 'stone', false);
      }
    }

    // Floors and Walls
    for (let y = 2; y <= height; y++) {
      const isFloor = y % 4 === 0;
      const isRoof = y === height;

      for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
          const isCorner = (x === minX || x === maxX) && (z === minZ || z === maxZ);
          const isWall = x === minX || x === maxX || z === minZ || z === maxZ;

          if (isRoof) {
            // Helipad Roof
            if (isCorner || isWall) {
              this.setVoxel(x, y, z, 'stone', false);
            } else {
              const relX = x - centerX;
              const relZ = z - centerZ;
              // 'H' in yellow wool on helipad
              if (Math.abs(relX) <= 1 && Math.abs(relZ) <= 1 && (relZ === 0 || relX === -1 || relX === 1)) {
                this.setVoxel(x, y, z, 'yellow_wool', false);
              } else {
                this.setVoxel(x, y, z, 'stone', false);
              }
            }
          } else if (isFloor) {
            // Office floor plate
            if (isCorner) {
              this.setVoxel(x, y, z, 'obsidian', false);
            } else if (isWall) {
              this.setVoxel(x, y, z, 'stone', false);
            } else {
              this.setVoxel(x, y, z, 'planks', false);
            }
          } else if (isCorner) {
            // Steel/Obsidian Corner Pillar
            this.setVoxel(x, y, z, 'obsidian', false);
          } else if (isWall) {
            // Ground lobby entrance
            if (y <= 3 && z === maxZ && Math.abs(x - centerX) <= 1) {
              if (y === 3) this.setVoxel(x, y, z, 'glass', false);
              // Entrance air
            } else {
              this.setVoxel(x, y, z, 'glass', false);
            }
          }
        }
      }

      // Interior Glowstone Chandeliers every floor
      if (y % 4 === 3) {
        this.setVoxel(centerX, y, centerZ, 'glowstone', false);
      }
    }

    // Ground Floor Lobby Reception Desk
    this.setVoxel(centerX - 1, 2, centerZ, 'crafting_table', false);
    this.setVoxel(centerX, 2, centerZ, 'bookshelf', false);
    this.setVoxel(centerX + 1, 2, centerZ, 'bookshelf', false);

    // Rooftop Antenna Mast with Flashing Beacon
    for (let ay = 1; ay <= 5; ay++) {
      this.setVoxel(centerX, height + ay, centerZ, 'obsidian', false);
    }
    this.setVoxel(centerX, height + 6, centerZ, 'glowstone', false); // Aircraft Warning Beacon
  }

  // Stamp Solaris Stepped Skyscraper
  public stampSteppedSkyscraper(centerX: number, centerZ: number, height: number = 15) {
    // 1. Base Podium (9x9, y = 1..5)
    for (let y = 1; y <= 5; y++) {
      for (let x = centerX - 4; x <= centerX + 4; x++) {
        for (let z = centerZ - 4; z <= centerZ + 4; z++) {
          const isOuter = x === centerX - 4 || x === centerX + 4 || z === centerZ - 4 || z === centerZ + 4;
          if (y === 1 || y === 5) {
            this.setVoxel(x, y, z, 'bricks', false);
          } else if (isOuter) {
            this.setVoxel(x, y, z, (y === 3 || y === 4) ? 'glass' : 'bricks', false);
          }
        }
      }
    }

    // 2. Middle Tier with Sky Gardens (7x7, y = 6..10)
    for (let y = 6; y <= 10; y++) {
      for (let x = centerX - 3; x <= centerX + 3; x++) {
        for (let z = centerZ - 3; z <= centerZ + 3; z++) {
          const isOuter = x === centerX - 3 || x === centerX + 3 || z === centerZ - 3 || z === centerZ + 3;
          if (y === 6 || y === 10) {
            this.setVoxel(x, y, z, 'stone', false);
          } else if (isOuter) {
            this.setVoxel(x, y, z, 'glass', false);
          }
        }
      }
    }

    // Sky Gardens Foliage on Lower Balcony (y = 6)
    this.setVoxel(centerX - 4, 6, centerZ - 4, 'leaves', false);
    this.setVoxel(centerX + 4, 6, centerZ - 4, 'leaves', false);
    this.setVoxel(centerX - 4, 6, centerZ + 4, 'leaves', false);
    this.setVoxel(centerX + 4, 6, centerZ + 4, 'leaves', false);

    // 3. Top Tier Tower (5x5, y = 11..height)
    for (let y = 11; y <= height; y++) {
      for (let x = centerX - 2; x <= centerX + 2; x++) {
        for (let z = centerZ - 2; z <= centerZ + 2; z++) {
          const isOuter = x === centerX - 2 || x === centerX + 2 || z === centerZ - 2 || z === centerZ + 2;
          if (y === height) {
            this.setVoxel(x, y, z, 'gold_ore', false);
          } else if (isOuter) {
            this.setVoxel(x, y, z, 'glass', false);
          }
        }
      }
    }

    // Rooftop Spire & Beacon
    this.setVoxel(centerX, height + 1, centerZ, 'glowstone', false);
    this.setVoxel(centerX, height + 2, centerZ, 'obsidian', false);
    this.setVoxel(centerX, height + 3, centerZ, 'glowstone', false);
  }

  // Stamp Obsidian Corporate Center with Rooftop Pool
  public stampObsidianTower(centerX: number, centerZ: number, height: number = 14) {
    const half = 3; // 7x7
    for (let y = 1; y <= height; y++) {
      for (let x = centerX - half; x <= centerX + half; x++) {
        for (let z = centerZ - half; z <= centerZ + half; z++) {
          const isCorner = Math.abs(x - centerX) === half && Math.abs(z - centerZ) === half;
          const isWall = Math.abs(x - centerX) === half || Math.abs(z - centerZ) === half;

          if (y === 1) {
            this.setVoxel(x, y, z, 'obsidian', false);
          } else if (y === height) {
            // Rooftop Swimming Pool Terrace
            if (isWall) {
              this.setVoxel(x, y, z, 'obsidian', false);
            } else if (Math.abs(x - centerX) <= 1 && Math.abs(z - centerZ) <= 1) {
              this.setVoxel(x, y - 1, z, 'glowstone', false); // Underwater light
              this.setVoxel(x, y, z, 'water', false); // Pool water
            } else {
              this.setVoxel(x, y, z, 'planks', false); // Sun deck
            }
          } else if (isCorner) {
            this.setVoxel(x, y, z, 'obsidian', false);
          } else if (isWall) {
            this.setVoxel(x, y, z, y % 3 === 0 ? 'gold_ore' : 'glass', false);
          } else if (y % 4 === 0) {
            this.setVoxel(x, y, z, 'planks', false);
          }
        }
      }
    }

    // Rooftop Terrace Lounge Torches
    this.setVoxel(centerX - half, height + 1, centerZ - half, 'torch', false);
    this.setVoxel(centerX + half, height + 1, centerZ - half, 'torch', false);
    this.setVoxel(centerX - half, height + 1, centerZ + half, 'torch', false);
    this.setVoxel(centerX + half, height + 1, centerZ + half, 'torch', false);
  }

  // Stamp Metropolitan Civic Plaza & Grand Fountain
  public stampCivicParkAndFountain(centerX: number, centerZ: number) {
    const radius = 6;
    // 1. Manicured Park Grass & Paved Plaza Walkways
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      for (let z = centerZ - radius; z <= centerZ + radius; z++) {
        const isDiagonalPath = Math.abs(x - centerX) === Math.abs(z - centerZ);
        const isBorder = Math.abs(x - centerX) === radius || Math.abs(z - centerZ) === radius;

        if (isDiagonalPath || isBorder) {
          this.setVoxel(x, 1, z, 'cobblestone', false);
        } else {
          this.setVoxel(x, 1, z, 'grass', false);
        }
      }
    }

    // 2. Grand Central Fountain (5x5 basin)
    for (let x = centerX - 2; x <= centerX + 2; x++) {
      for (let z = centerZ - 2; z <= centerZ + 2; z++) {
        const isEdge = Math.abs(x - centerX) === 2 || Math.abs(z - centerZ) === 2;
        if (isEdge) {
          this.setVoxel(x, 2, z, 'stone', false);
        } else {
          this.setVoxel(x, 1, z, 'glowstone', false); // Glowing bottom
          this.setVoxel(x, 2, z, 'water', false); // Water in basin
        }
      }
    }

    // Center Spire with cascading water
    this.setVoxel(centerX, 2, centerZ, 'stone', false);
    this.setVoxel(centerX, 3, centerZ, 'stone', false);
    this.setVoxel(centerX, 4, centerZ, 'glowstone', false);
    this.setVoxel(centerX, 5, centerZ, 'water', false);

    // 3. Park Benches and Shade Trees
    this.setVoxel(centerX - 4, 2, centerZ, 'wood', false);
    this.setVoxel(centerX - 4, 2, centerZ + 1, 'planks', false);
    this.setVoxel(centerX + 4, 2, centerZ, 'wood', false);
    this.setVoxel(centerX + 4, 2, centerZ + 1, 'planks', false);

    // Trees at park corners
    this.generateTree(centerX - 4, 2, centerZ - 4);
    this.generateTree(centerX + 4, 2, centerZ + 4);

    // Street Coffee Kiosk with Striped Wool Canopy
    this.stampCoffeeKiosk(centerX - 4, 2, centerZ + 4);
  }

  // Stamp Coffee / Street Food Kiosk
  public stampCoffeeKiosk(x: number, y: number, z: number) {
    this.setVoxel(x, y, z, 'wood', false);
    this.setVoxel(x + 1, y, z, 'crafting_table', false);
    this.setVoxel(x, y + 1, z, 'torch', false);
    // Canopy
    this.setVoxel(x, y + 2, z, 'red_wool', false);
    this.setVoxel(x + 1, y + 2, z, 'yellow_wool', false);
    this.setVoxel(x, y + 2, z + 1, 'yellow_wool', false);
    this.setVoxel(x + 1, y + 2, z + 1, 'red_wool', false);
  }

  // Stamp a 2-Story Residential Townhouse
  public stampTownhouse(centerX: number, centerZ: number) {
    for (let y = 1; y <= 6; y++) {
      for (let x = centerX - 2; x <= centerX + 2; x++) {
        for (let z = centerZ - 2; z <= centerZ + 2; z++) {
          const isOuter = Math.abs(x - centerX) === 2 || Math.abs(z - centerZ) === 2;
          if (y === 1) {
            this.setVoxel(x, y, z, 'cobblestone', false);
          } else if (y === 4) {
            this.setVoxel(x, y, z, 'planks', false);
          } else if (y === 6) {
            // Pitched Roof
            if (Math.abs(x - centerX) <= 1) {
              this.setVoxel(x, y, z, 'wood', false);
            }
          } else if (isOuter) {
            if ((y === 2 || y === 5) && (x === centerX || z === centerZ)) {
              this.setVoxel(x, y, z, 'glass', false); // Windows
            } else {
              this.setVoxel(x, y, z, 'bricks', false);
            }
          }
        }
      }
    }
    // Furnishings & Chimney
    this.setVoxel(centerX, 2, centerZ - 1, 'bookshelf', false);
    this.setVoxel(centerX + 1, 2, centerZ - 1, 'crafting_table', false);
    this.setVoxel(centerX - 1, 2, centerZ + 1, 'glowstone', false);
    this.setVoxel(centerX + 2, 7, centerZ + 2, 'cobblestone', false);
    this.setVoxel(centerX + 2, 8, centerZ + 2, 'torch', false); // Chimney smoke
  }

  // Stamp a Voxel Sports Car
  public stampCar(x: number, y: number, z: number, color: 'red' | 'blue' | 'yellow' = 'red') {
    const woolType = color === 'red' ? 'red_wool' : color === 'blue' ? 'blue_wool' : 'yellow_wool';
    // 4 Obsidian Wheels
    this.setVoxel(x - 1, y, z - 1, 'obsidian', false);
    this.setVoxel(x + 1, y, z - 1, 'obsidian', false);
    this.setVoxel(x - 1, y, z + 1, 'obsidian', false);
    this.setVoxel(x + 1, y, z + 1, 'obsidian', false);

    // Chassis & Body
    this.setVoxel(x, y, z - 1, 'stone', false);
    this.setVoxel(x, y, z, woolType, false);
    this.setVoxel(x, y, z + 1, 'stone', false);

    this.setVoxel(x - 1, y + 1, z - 1, woolType, false);
    this.setVoxel(x, y + 1, z - 1, woolType, false);
    this.setVoxel(x + 1, y + 1, z - 1, woolType, false);

    this.setVoxel(x, y + 1, z, 'glass', false); // Windshield
    this.setVoxel(x - 1, y + 1, z, 'glass', false);
    this.setVoxel(x + 1, y + 1, z, 'glass', false);

    this.setVoxel(x - 1, y + 1, z + 1, woolType, false);
    this.setVoxel(x, y + 1, z + 1, woolType, false);
    this.setVoxel(x + 1, y + 1, z + 1, woolType, false);

    // Headlights (Glowstone) & Taillights (Red Wool / Torch)
    this.setVoxel(x - 1, y + 1, z - 2, 'glowstone', false);
    this.setVoxel(x + 1, y + 1, z - 2, 'glowstone', false);
    this.setVoxel(x - 1, y + 1, z + 2, 'red_wool', false);
    this.setVoxel(x + 1, y + 1, z + 2, 'red_wool', false);
  }

  // Stamp a Yellow City Transit Bus
  public stampBus(x: number, y: number, z: number) {
    // 6 Wheels
    for (let dz of [-2, 0, 2]) {
      this.setVoxel(x - 1, y, z + dz, 'obsidian', false);
      this.setVoxel(x + 1, y, z + dz, 'obsidian', false);
    }
    // Floor
    for (let dz = -3; dz <= 3; dz++) {
      this.setVoxel(x, y, z + dz, 'stone', false);
      this.setVoxel(x - 1, y + 1, z + dz, 'yellow_wool', false);
      this.setVoxel(x, y + 1, z + dz, 'yellow_wool', false);
      this.setVoxel(x + 1, y + 1, z + dz, 'yellow_wool', false);
      // Windows
      if (Math.abs(dz) <= 2) {
        this.setVoxel(x - 1, y + 2, z + dz, 'glass', false);
        this.setVoxel(x + 1, y + 2, z + dz, 'glass', false);
      } else {
        this.setVoxel(x - 1, y + 2, z + dz, 'yellow_wool', false);
        this.setVoxel(x + 1, y + 2, z + dz, 'yellow_wool', false);
      }
      this.setVoxel(x, y + 2, z + dz, 'glowstone', false); // Interior lighting
      // Roof
      this.setVoxel(x - 1, y + 3, z + dz, 'yellow_wool', false);
      this.setVoxel(x, y + 3, z + dz, 'yellow_wool', false);
      this.setVoxel(x + 1, y + 3, z + dz, 'yellow_wool', false);
    }
    // Headlights
    this.setVoxel(x - 1, y + 1, z - 4, 'glowstone', false);
    this.setVoxel(x + 1, y + 1, z - 4, 'glowstone', false);
  }

  // Stamp Subway / Metro Entrance
  public stampSubwayEntrance(x: number, y: number, z: number) {
    // Entrance canopy arch
    this.setVoxel(x, y, z, 'obsidian', false);
    this.setVoxel(x + 2, y, z, 'obsidian', false);
    this.setVoxel(x, y + 1, z, 'obsidian', false);
    this.setVoxel(x + 2, y + 1, z, 'obsidian', false);
    this.setVoxel(x + 1, y + 2, z, 'glowstone', false); // Glowing "M" Metro sign
    this.setVoxel(x, y + 2, z, 'blue_wool', false);
    this.setVoxel(x + 2, y + 2, z, 'blue_wool', false);

    // Stairs leading down
    for (let step = 0; step < 4; step++) {
      this.setVoxel(x + 1, y - step, z + step + 1, 'cobblestone', false);
      this.setVoxel(x + 1, y - step + 1, z + step + 1, 'air', false);
      this.setVoxel(x + 1, y - step + 2, z + step + 1, 'air', false);
    }
    // Underground station platform
    for (let px = x - 2; px <= x + 4; px++) {
      for (let pz = z + 4; pz <= z + 9; pz++) {
        this.setVoxel(px, y - 4, pz, 'stone', false);
        this.setVoxel(px, y - 3, pz, 'air', false);
        this.setVoxel(px, y - 2, pz, 'air', false);
        this.setVoxel(px, y - 1, pz, 'stone', false);
      }
    }
    this.setVoxel(x + 1, y - 2, z + 6, 'glowstone', false);
  }

  // --- GRAND GOURMET RESTAURANT & BISTRO ROYALE ---
  public stampRestaurant(cx: number, cy: number, cz: number) {
    const halfW = 7; // 15 wide: cx - 7 to cx + 7
    const halfD = 6; // 13 deep: cz - 6 to cz + 6
    const minX = cx - halfW;
    const maxX = cx + halfW;
    const minZ = cz - halfD;
    const maxZ = cz + halfD;

    // 1. Clear building envelope and lay solid foundation
    for (let x = minX - 1; x <= maxX + 1; x++) {
      for (let z = minZ - 1; z <= maxZ + 1; z++) {
        for (let y = cy + 1; y <= cy + 10; y++) {
          this.setVoxel(x, y, z, 'air', false);
        }
      }
    }

    // 2. Ground Floor (y = cy) - Checkered Birch/Oak Wood Flooring with Crimson Carpet Runner
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const isCarpetAisle = Math.abs(x - cx) <= 1 && z <= cz + 2;
        const isKitchen = x >= cx + 1 && z >= cz + 2;
        const isPatio = z === minZ;

        if (isCarpetAisle) {
          this.setVoxel(x, cy, z, 'red_wool', false); // Crimson welcome runner
        } else if (isKitchen) {
          this.setVoxel(x, cy, z, (x + z) % 2 === 0 ? 'stone' : 'cobblestone', false); // Commercial kitchen tile
        } else if (isPatio) {
          this.setVoxel(x, cy, z, 'cobblestone', false); // Outdoor entrance patio
        } else {
          this.setVoxel(x, cy, z, (x + z) % 2 === 0 ? 'planks' : 'birch_wood', false); // Polished dining floor
        }
      }
    }

    // 3. Structural Walls & Pillars (y = cy + 1 to cy + 4)
    for (let y = cy + 1; y <= cy + 4; y++) {
      for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
          const isCorner = (x === minX || x === maxX) && (z === minZ || z === maxZ);
          const isWall = x === minX || x === maxX || z === minZ || z === maxZ;
          const isFrontEntrance = z === minZ && Math.abs(x - cx) <= 1;

          if (isCorner) {
            // Oak Wood Corner Columns
            this.setVoxel(x, y, z, 'wood', false);
          } else if (isFrontEntrance) {
            if (y === cy + 4) {
              this.setVoxel(x, y, z, 'wood', false); // Door lintel
            }
            // Open door below
          } else if (isWall) {
            if (y === cy + 1) {
              this.setVoxel(x, y, z, 'bricks', false); // Wainscot brick base
            } else if (y === cy + 2 || y === cy + 3) {
              // Large dining hall picture windows
              if ((x === minX || x === maxX) && Math.abs(z - cz) <= 4) {
                this.setVoxel(x, y, z, 'glass', false);
              } else if (z === minZ || z === maxZ) {
                this.setVoxel(x, y, z, 'glass', false);
              } else {
                this.setVoxel(x, y, z, 'bricks', false);
              }
            } else {
              this.setVoxel(x, y, z, 'wood', false); // Top wall beam
            }
          }
        }
      }
    }

    // Front Entrance Canopy / Striped Bistro Awning (Red & Yellow Wool)
    for (let ax = cx - 3; ax <= cx + 3; ax++) {
      const isRed = ax % 2 === 0;
      this.setVoxel(ax, cy + 4, minZ - 1, isRed ? 'red_wool' : 'yellow_wool', false);
      this.setVoxel(ax, cy + 3, minZ - 2, isRed ? 'red_wool' : 'yellow_wool', false);
    }
    // Entrance Welcome Lanterns & Planters
    this.setVoxel(cx - 2, cy + 1, minZ - 1, 'leaves', false);
    this.setVoxel(cx + 2, cy + 1, minZ - 1, 'leaves', false);
    this.setVoxel(cx - 2, cy + 2, minZ, 'glowstone', false);
    this.setVoxel(cx + 2, cy + 2, minZ, 'glowstone', false);

    // Glowing Neon Restaurant Sign ("BISTRO") at y = cy + 5 front
    this.setVoxel(cx - 2, cy + 5, minZ, 'glowstone', false);
    this.setVoxel(cx - 1, cy + 5, minZ, 'yellow_wool', false);
    this.setVoxel(cx, cy + 5, minZ, 'gold_block', false);
    this.setVoxel(cx + 1, cy + 5, minZ, 'yellow_wool', false);
    this.setVoxel(cx + 2, cy + 5, minZ, 'glowstone', false);

    // 4. Hostess / Reception Counter & Cash Register (x = cx + 2, z = cz - 4)
    this.setVoxel(cx + 2, cy + 1, cz - 4, 'crafting_table', false); // Cash register / ordering terminal
    this.setVoxel(cx + 3, cy + 1, cz - 4, 'bookshelf', false); // Menu catalog & reservations
    this.setVoxel(cx + 2, cy + 2, cz - 4, 'torch', false);
    // Tip & Revenue Chest
    this.setVoxel(cx + 3, cy + 1, cz - 5, 'chest', false);
    this.setChestAt(cx + 3, cy + 1, cz - 5, {
      id: `restaurant_register_${Date.now()}`,
      x: cx + 3,
      y: cy + 1,
      z: cz - 5,
      title: 'Restaurant Cash Register & Tips',
      items: [
        { type: 'gold_ingot', count: 12 },
        { type: 'emerald', count: 8 },
        { type: 'diamond', count: 2 },
        { type: 'bread', count: 5 },
        null, null, null, null, null,
        null, null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null, null,
      ],
    });

    // 5. Private Dining Booths (Left Wing: x = minX + 1 .. cx - 2)
    // Booth 1 (Front Left: z = cz - 4)
    this.setVoxel(minX + 1, cy + 1, cz - 4, 'red_wool', false); // West seat
    this.setVoxel(minX + 2, cy + 1, cz - 4, 'wood', false); // Table
    this.setVoxel(minX + 2, cy + 2, cz - 4, 'torch', false); // Table candle
    this.setVoxel(minX + 3, cy + 1, cz - 4, 'red_wool', false); // East seat

    // Booth 2 (Middle Left: z = cz - 1)
    this.setVoxel(minX + 1, cy + 1, cz - 1, 'red_wool', false);
    this.setVoxel(minX + 2, cy + 1, cz - 1, 'wood', false);
    this.setVoxel(minX + 2, cy + 2, cz - 1, 'gold_block', false); // Golden platter
    this.setVoxel(minX + 3, cy + 1, cz - 1, 'red_wool', false);

    // Booth 3 (Rear Left: z = cz + 2)
    this.setVoxel(minX + 1, cy + 1, cz + 2, 'red_wool', false);
    this.setVoxel(minX + 2, cy + 1, cz + 2, 'wood', false);
    this.setVoxel(minX + 2, cy + 2, cz + 2, 'torch', false);
    this.setVoxel(minX + 3, cy + 1, cz + 2, 'red_wool', false);

    // 6. Central Family Banquet Table (x = cx - 1 .. cx + 1, z = cz - 1 .. cz + 1)
    for (let bx = cx - 1; bx <= cx + 1; bx++) {
      for (let bz = cz - 1; bz <= cz + 1; bz++) {
        if (bx === cx && bz === cz) {
          this.setVoxel(bx, cy + 1, bz, 'bookshelf', false); // Centerpiece
          this.setVoxel(bx, cy + 2, bz, 'torch', false);
        } else {
          this.setVoxel(bx, cy + 1, bz, 'planks', false);
        }
      }
    }
    // Banquet Chairs
    this.setVoxel(cx - 2, cy + 1, cz, 'red_wool', false);
    this.setVoxel(cx + 2, cy + 1, cz, 'red_wool', false);
    this.setVoxel(cx, cy + 1, cz - 2, 'red_wool', false);
    this.setVoxel(cx, cy + 1, cz + 2, 'red_wool', false);

    // Hanging Dining Room Chandeliers
    this.setVoxel(cx, cy + 4, cz, 'glowstone', false);
    this.setVoxel(minX + 2, cy + 4, cz - 1, 'glowstone', false);

    // 7. Beverage / Cocktail Bar Counter (Rear-Left: x = minX + 1 .. cx - 2, z = cz + 4 .. cz + 5)
    for (let bx = minX + 1; bx <= cx - 2; bx++) {
      this.setVoxel(bx, cy + 1, cz + 4, 'wood', false); // Bar counter
      this.setVoxel(bx, cy + 1, cz + 3, 'red_wool', false); // Bar stools
    }
    // Beverage Tap & Condiment Shelves
    this.setVoxel(minX + 1, cy + 2, cz + 5, 'glowstone', false);
    this.setVoxel(minX + 2, cy + 1, cz + 5, 'bookshelf', false);
    this.setVoxel(minX + 3, cy + 1, cz + 5, 'glass', false);

    // 8. Commercial Master Chef's Kitchen (Rear-Right: x = cx + 1 .. maxX - 1, z = cz + 2 .. maxZ - 1)
    // Kitchen Divider Wall with Serving Pass Hatch
    for (let kx = cx + 1; kx <= maxX - 1; kx++) {
      this.setVoxel(kx, cy + 1, cz + 2, 'bricks', false);
      if (kx === cx + 2 || kx === cx + 3) {
        this.setVoxel(kx, cy + 2, cz + 2, 'air', false); // Serving hatch window
      } else {
        this.setVoxel(kx, cy + 2, cz + 2, 'bricks', false);
      }
    }

    // Row of 3 High-Heat Cooking Furnaces against back wall
    this.setVoxel(maxX - 1, cy + 1, cz + 3, 'furnace', false);
    this.setVoxel(maxX - 1, cy + 1, cz + 4, 'furnace', false);
    this.setVoxel(maxX - 1, cy + 1, cz + 5, 'furnace', false);

    // Kitchen Prep Island & Food Cutting Board
    this.setVoxel(cx + 3, cy + 1, cz + 4, 'crafting_table', false);
    this.setVoxel(cx + 4, cy + 1, cz + 4, 'crafting_table', false);
    this.setVoxel(cx + 3, cy + 2, cz + 4, 'torch', false);

    // Cauldron / Water Basin Dishwashing Sink
    this.setVoxel(maxX - 2, cy + 1, maxZ - 1, 'cobblestone', false);
    this.setVoxel(maxX - 3, cy + 1, maxZ - 1, 'water', false);
    this.setVoxel(maxX - 4, cy + 1, maxZ - 1, 'cobblestone', false);

    // Master Gourmet Kitchen Pantry (Chest packed with gourmet steaks, golden apples, bread, porkchops!)
    this.setVoxel(cx + 1, cy + 1, maxZ - 1, 'chest', false);
    this.setChestAt(cx + 1, cy + 1, maxZ - 1, {
      id: `restaurant_pantry_${Date.now()}`,
      x: cx + 1,
      y: cy + 1,
      z: maxZ - 1,
      title: "Chef Pierre's Gourmet Food Pantry",
      items: [
        { type: 'cooked_meat', count: 16 },
        { type: 'cooked_porkchop', count: 16 },
        { type: 'golden_apple', count: 6 },
        { type: 'bread', count: 24 },
        { type: 'cooked_apple', count: 12 },
        { type: 'apple', count: 16 },
        { type: 'coal', count: 20 },
        { type: 'iron_ingot', count: 8 },
        null, null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null, null,
      ],
    });

    // Kitchen Exhaust Chimney Smoke Vent
    for (let vy = 1; vy <= 7; vy++) {
      this.setVoxel(maxX - 1, cy + vy, cz + 5, 'stone', false);
    }
    this.setVoxel(maxX - 1, cy + 8, cz + 5, 'torch', false); // Chimney smoke

    // 9. 2nd Floor / VIP Rooftop Terrace & Sky Lounge (y = cy + 5)
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        this.setVoxel(x, cy + 5, z, 'planks', false); // Terrace wood deck
      }
    }

    // Access Staircase (from ground floor to roof)
    for (let s = 0; s < 5; s++) {
      this.setVoxel(minX + 1, cy + s, minZ + s + 1, 'cobblestone', false);
      this.setVoxel(minX + 1, cy + s + 1, minZ + s + 1, 'air', false);
      this.setVoxel(minX + 1, cy + s + 2, minZ + s + 1, 'air', false);
    }

    // Terrace Glass Railings & Glowing Corner Lantern Posts (y = cy + 6)
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const isBorder = x === minX || x === maxX || z === minZ || z === maxZ;
        const isCorner = (x === minX || x === maxX) && (z === minZ || z === maxZ);
        if (isCorner) {
          this.setVoxel(x, cy + 6, z, 'wood', false);
          this.setVoxel(x, cy + 7, z, 'glowstone', false); // Corner lanterns
        } else if (isBorder) {
          this.setVoxel(x, cy + 6, z, 'glass', false); // Safety glass railing
        }
      }
    }

    // Rooftop Al Fresco Dining Tables with Striped Parasol Umbrellas
    // Umbrella Table 1 (North-East: x = cx + 3, z = cz - 2)
    this.setVoxel(cx + 3, cy + 6, cz - 2, 'wood', false); // Table
    this.setVoxel(cx + 2, cy + 6, cz - 2, 'yellow_wool', false); // Chair
    this.setVoxel(cx + 4, cy + 6, cz - 2, 'yellow_wool', false); // Chair
    this.setVoxel(cx + 3, cy + 7, cz - 2, 'wood', false); // Parasol pole
    this.setVoxel(cx + 3, cy + 8, cz - 2, 'red_wool', false); // Parasol top
    this.setVoxel(cx + 2, cy + 8, cz - 2, 'yellow_wool', false);
    this.setVoxel(cx + 4, cy + 8, cz - 2, 'yellow_wool', false);
    this.setVoxel(cx + 3, cy + 8, cz - 3, 'yellow_wool', false);
    this.setVoxel(cx + 3, cy + 8, cz - 1, 'yellow_wool', false);

    // Umbrella Table 2 (South-West: x = cx - 3, z = cz + 2)
    this.setVoxel(cx - 3, cy + 6, cz + 2, 'wood', false);
    this.setVoxel(cx - 4, cy + 6, cz + 2, 'red_wool', false);
    this.setVoxel(cx - 2, cy + 6, cz + 2, 'red_wool', false);
    this.setVoxel(cx - 3, cy + 7, cz + 2, 'wood', false);
    this.setVoxel(cx - 3, cy + 8, cz + 2, 'yellow_wool', false);
    this.setVoxel(cx - 4, cy + 8, cz + 2, 'red_wool', false);
    this.setVoxel(cx - 2, cy + 8, cz + 2, 'red_wool', false);
    this.setVoxel(cx - 3, cy + 8, cz + 1, 'red_wool', false);
    this.setVoxel(cx - 3, cy + 8, cz + 3, 'red_wool', false);

    // Romantic VIP Rooftop Lounge Booth (x = cx + 3 .. cx + 5, z = cz + 3 .. cz + 5)
    for (let lx = cx + 3; lx <= cx + 5; lx++) {
      for (let lz = cz + 3; lz <= cz + 5; lz++) {
        if (lx === cx + 4 && lz === cz + 4) {
          this.setVoxel(lx, cy + 6, lz, 'gold_block', false);
          this.setVoxel(lx, cy + 7, lz, 'torch', false);
        } else {
          this.setVoxel(lx, cy + 6, lz, 'red_wool', false);
        }
      }
    }

    // 10. Spawn Restaurant Crew & Dining Customers
    // A. Head Chef NPC ("Chef Pierre" in kitchen)
    const chef = this.spawnVillager(cx + 3, cy + 1, cz + 5);
    // B. Waiters
    this.spawnVillager(cx, cy + 1, cz - 3);
    this.spawnVillager(cx + 3, cy + 6, cz);
    // C. Dining Guests seated at tables
    this.spawnVillager(minX + 1, cy + 1, cz - 4);
    this.spawnVillager(minX + 1, cy + 1, cz - 1);
    this.spawnVillager(cx - 2, cy + 1, cz);
    this.spawnVillager(cx - 3, cy + 6, cz + 2);

    // Restaurant open audio cues
    soundManager.playRestaurantBell();
    soundManager.playSizzle();

    return { cx, cy, cz };
  }

  // Generate Scenic Gourmet Restaurant Plaza & Estate
  public generateRestaurantTerrain() {
    this.clearWorld();
    const radius = 42;

    // 1. Base Rolling Estate Grounds & Cobblestone Walkways
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        for (let y = -4; y <= -1; y++) {
          this.setVoxel(x, y, z, 'stone', false);
        }
        // Base grass & garden walkways
        const isMainAvenue = Math.abs(x) <= 3 && z <= -6;
        const isCircularPlaza = Math.hypot(x, z) <= 16;
        if (isMainAvenue || isCircularPlaza) {
          this.setVoxel(x, 0, z, 'cobblestone', false);
        } else {
          this.setVoxel(x, 0, z, 'grass', false);
        }
      }
    }

    // 2. Central Gourmet Restaurant & Bistro Structure at (0, 1, 4)
    this.stampRestaurant(0, 1, 4);

    // 3. Front Garden Fountains and Lanterns
    this.stampCivicParkAndFountain(-22, -18);
    this.stampCivicParkAndFountain(22, -18);

    // 4. Street Lamps along the Welcome Boulevard
    for (let pz = -36; pz <= -10; pz += 10) {
      this.stampStreetLamp(-4, 0, pz);
      this.stampStreetLamp(4, 0, pz);
    }

    // 5. Surrounding Orchard Trees & Flower Beds
    const treeCoords = [
      { x: -16, z: 8 }, { x: -22, z: 14 }, { x: -18, z: 24 },
      { x: 16, z: 8 }, { x: 22, z: 14 }, { x: 18, z: 24 },
      { x: -14, z: -28 }, { x: 14, z: -28 },
    ];
    for (const t of treeCoords) {
      this.generateTree(t.x, 1, t.z);
    }

    // 6. Customer Parking & Sports Cars
    this.stampCar(-10, 0, -22, 'red');
    this.stampCar(10, 0, -22, 'yellow');
    this.stampCar(-10, 0, -14, 'blue');

    this.rebuildMeshes();
  }

  // Initialize or Reset Rollercoaster Track System
  public initRollercoaster(): RollercoasterTrack {
    if (this.rollercoaster) {
      this.scene.remove(this.rollercoaster.trackGroup);
      this.scene.remove(this.rollercoaster.supportGroup);
      this.scene.remove(this.rollercoaster.sleeperGroup);
      this.scene.remove(this.rollercoaster.cartGroup);
      this.scene.remove(this.rollercoaster.sparkGroup);
    }
    this.rollercoaster = new RollercoasterTrack(this.scene, this);
    return this.rollercoaster;
  }

  // Generate Quantum Coaster Canyon & Theme Park (Expanded Grounds: Radius 46)
  public generateCoasterTerrain() {
    this.clearWorld();
    const radius = 46;

    // 1. Base Terrain, Canyon Chasm, and Elevated Plaza
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        // Deep Canyon under Giga Drop & Loop (x > 15 && z < 0)
        const isCanyonChasm = (x >= 12 && z <= 5) || (z <= -15 && x >= -10);
        const isSplashLake = (x >= -8 && x <= 14 && z >= 18 && z <= 26) || (x >= 20 && x <= 36 && z >= 20 && z <= 34);
        const isTunnelMountain = (x >= 14 && x <= 22 && z >= -8 && z <= 18) || (x >= -36 && x <= -20 && z >= -30 && z <= -10);

        if (isCanyonChasm) {
          // Deep canyon bed
          for (let y = -4; y <= 0; y++) {
            this.setVoxel(x, y, z, 'stone', false);
          }
          this.setVoxel(x, 1, z, Math.random() > 0.3 ? 'cobblestone' : 'sand', false);
        } else if (isSplashLake) {
          // Lake basin with water
          for (let y = -4; y <= 0; y++) {
            this.setVoxel(x, y, z, 'stone', false);
          }
          this.setVoxel(x, 1, z, 'sand', false);
          this.setVoxel(x, 2, z, 'water', false);
          this.setVoxel(x, 3, z, 'water', false);
        } else if (isTunnelMountain) {
          // Mountain ridge with hollow tunnel inside
          for (let y = -4; y <= 8; y++) {
            const isTunnelHole = y >= 1 && y <= 5 && Math.abs(x - 18) <= 2;
            if (isTunnelHole) {
              // Air cavity for coaster tunnel
            } else {
              this.setVoxel(x, y, z, y >= 7 ? 'grass' : 'stone', false);
            }
          }
        } else {
          // Park grounds & plazas
          for (let y = -4; y <= 4; y++) {
            this.setVoxel(x, y, z, 'stone', false);
          }
          this.setVoxel(x, 5, z, 'grass', false);
        }
      }
    }

    // 2. Paved Theme Park Main Street & Walkways
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const isMainPlaza = Math.abs(x) <= 4 && z >= -35 && z <= 30;
        const isCrossWay = Math.abs(z) <= 3 && Math.abs(x) <= 35;
        const isPerimeterWalk = (Math.abs(x) === 30 || Math.abs(z) === 30) && Math.abs(x) <= 32 && Math.abs(z) <= 32;

        if (isMainPlaza || isCrossWay || isPerimeterWalk) {
          this.setVoxel(x, 5, z, 'cobblestone', false);
          this.setVoxel(x, 6, z, (x + z) % 2 === 0 ? 'stone' : 'cobblestone', false);
        }
      }
    }

    // 3. Grand Coaster Station Building (x: -4..4, z: -14..-6, y: 6..12)
    this.stampCoasterStation(0, 6, -10);

    // 4. Giant Amusement Ferris Wheels
    this.stampFerrisWheel(-16, 6, -16);
    this.stampFerrisWheel(-26, 6, 20);

    // 5. Free-Fall Drop Towers
    this.stampDropTower(-16, 6, 16);
    this.stampDropTower(26, 6, -16);

    // 6. Concession Stands (Popcorn & Cotton Candy)
    this.stampCarnivalStand(-6, 7, -4, 'popcorn');
    this.stampCarnivalStand(6, 7, -4, 'cotton_candy');
    this.stampCarnivalStand(-6, 7, 8, 'cotton_candy');
    this.stampCarnivalStand(6, 7, 8, 'popcorn');

    // 7. Tunnel Neon Wool Rings inside Cavern
    for (let tz = 0; tz <= 16; tz += 3) {
      this.stampTunnelArch(18, 2, tz, tz % 6 === 0 ? 'blue_wool' : 'yellow_wool');
    }

    // 8. Park Trees, Benches, and Street Lanterns
    const lanternSpots = [
      { x: -4, z: -30 }, { x: 4, z: -30 },
      { x: -4, z: -16 }, { x: 4, z: -16 },
      { x: -4, z: -2 }, { x: 4, z: -2 },
      { x: -4, z: 10 }, { x: 4, z: 10 },
      { x: -4, z: 25 }, { x: 4, z: 25 },
      { x: -16, z: 0 }, { x: -26, z: 0 },
      { x: 16, z: 0 }, { x: 26, z: 0 },
    ];
    for (const spot of lanternSpots) {
      this.stampStreetLamp(spot.x, 6, spot.z);
    }

    this.generateTree(-10, 6, 10);
    this.generateTree(-14, 6, -6);
    this.generateTree(10, 6, 10);
    this.generateTree(24, 6, 12);
    this.generateTree(-24, 6, -20);

    // 9. Initialize & Build 3D Rollercoaster System
    this.initRollercoaster();

    this.rebuildMeshes();
  }

  // Stamp Grand Coaster Station
  public stampCoasterStation(centerX: number, baseY: number, centerZ: number) {
    const halfW = 4;
    const halfD = 4;

    // Platform Base
    for (let x = centerX - halfW; x <= centerX + halfW; x++) {
      for (let z = centerZ - halfD; z <= centerZ + halfD; z++) {
        this.setVoxel(x, baseY, z, 'planks', false);
        this.setVoxel(x, baseY + 1, z, 'planks', false);
      }
    }

    // Station Corner Support Pillars
    const corners = [
      { x: centerX - halfW, z: centerZ - halfD },
      { x: centerX + halfW, z: centerZ - halfD },
      { x: centerX - halfW, z: centerZ + halfD },
      { x: centerX + halfW, z: centerZ + halfD },
    ];
    for (const c of corners) {
      for (let y = baseY + 2; y <= baseY + 6; y++) {
        this.setVoxel(c.x, y, c.z, 'wood', false);
      }
      this.setVoxel(c.x, baseY + 7, c.z, 'torch', false);
    }

    // Striped Station Awning Roof (Red & Yellow Wool)
    for (let x = centerX - halfW; x <= centerX + halfW; x++) {
      for (let z = centerZ - halfD; z <= centerZ + halfD; z++) {
        const isRed = (x + z) % 2 === 0;
        this.setVoxel(x, baseY + 6, z, isRed ? 'red_wool' : 'yellow_wool', false);
      }
    }

    // Station Turnstiles & Ticket Booth
    this.setVoxel(centerX - 2, baseY + 2, centerZ - 2, 'crafting_table', false);
    this.setVoxel(centerX - 2, baseY + 2, centerZ - 1, 'bookshelf', false);
    this.setVoxel(centerX - 2, baseY + 3, centerZ - 1, 'torch', false);
    this.setVoxel(centerX + 2, baseY + 2, centerZ - 2, 'gold_ore', false); // Turnstile
    this.setVoxel(centerX, baseY + 5, centerZ, 'glowstone', false); // Center Chandelier
  }

  // Stamp Giant Ferris Wheel
  public stampFerrisWheel(centerX: number, baseY: number, centerZ: number) {
    // 1. Support A-Frame
    for (let dy = 0; dy <= 8; dy++) {
      this.setVoxel(centerX - 3 + Math.floor(dy * 0.3), baseY + dy, centerZ - 1, 'obsidian', false);
      this.setVoxel(centerX + 3 - Math.floor(dy * 0.3), baseY + dy, centerZ - 1, 'obsidian', false);
      this.setVoxel(centerX - 3 + Math.floor(dy * 0.3), baseY + dy, centerZ + 1, 'obsidian', false);
      this.setVoxel(centerX + 3 - Math.floor(dy * 0.3), baseY + dy, centerZ + 1, 'obsidian', false);
    }

    // Center Axle Hub
    const hubY = baseY + 9;
    this.setVoxel(centerX, hubY, centerZ, 'glowstone', false);

    // 8 Radial Spokes & Colored Gondolas
    const radius = 6;
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    const colors: BlockType[] = ['red_wool', 'blue_wool', 'yellow_wool', 'gold_ore'];

    angles.forEach((deg, idx) => {
      const rad = (deg * Math.PI) / 180;
      for (let r = 1; r <= radius; r++) {
        const sx = Math.round(centerX + Math.cos(rad) * r);
        const sy = Math.round(hubY + Math.sin(rad) * r);
        if (r === radius) {
          // Gondola Basket
          const col = colors[idx % colors.length];
          this.setVoxel(sx, sy, centerZ, col, false);
          this.setVoxel(sx, sy - 1, centerZ, 'glass', false);
        } else {
          // Spoke
          this.setVoxel(sx, sy, centerZ, 'wood', false);
        }
      }
    });
  }

  // Stamp Free-Fall Drop Tower
  public stampDropTower(centerX: number, baseY: number, centerZ: number) {
    const towerHeight = 24;
    // 1. Base Foundation
    for (let x = centerX - 2; x <= centerX + 2; x++) {
      for (let z = centerZ - 2; z <= centerZ + 2; z++) {
        this.setVoxel(x, baseY, z, 'cobblestone', false);
      }
    }

    // 2. Tower Column
    for (let y = baseY + 1; y <= baseY + towerHeight; y++) {
      this.setVoxel(centerX, y, centerZ, 'obsidian', false);
      this.setVoxel(centerX + 1, y, centerZ, 'stone', false);
      this.setVoxel(centerX - 1, y, centerZ, 'stone', false);
      this.setVoxel(centerX, y, centerZ + 1, 'stone', false);
      this.setVoxel(centerX, y, centerZ - 1, 'stone', false);

      // Warning lights along tower
      if (y % 6 === 0) {
        this.setVoxel(centerX + 1, y, centerZ, 'glowstone', false);
      }
    }

    // 3. Drop Gondola Ring at Mid-height
    const gondolaY = baseY + 12;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (Math.abs(dx) === 2 || Math.abs(dz) === 2) {
          this.setVoxel(centerX + dx, gondolaY, centerZ + dz, 'yellow_wool', false);
        }
      }
    }

    // 4. Summit Spire & Aircraft Beacon
    this.setVoxel(centerX, baseY + towerHeight + 1, centerZ, 'glowstone', false);
    this.setVoxel(centerX, baseY + towerHeight + 2, centerZ, 'obsidian', false);
    this.setVoxel(centerX, baseY + towerHeight + 3, centerZ, 'glowstone', false);
  }

  // Stamp Carnival Concession Stand
  public stampCarnivalStand(x: number, y: number, z: number, type: 'popcorn' | 'cotton_candy') {
    // Counter
    this.setVoxel(x, y, z, 'wood', false);
    this.setVoxel(x + 1, y, z, 'crafting_table', false);
    this.setVoxel(x, y + 1, z, 'bookshelf', false);

    // Awning Poles
    this.setVoxel(x - 1, y, z - 1, 'wood', false);
    this.setVoxel(x + 2, y, z - 1, 'wood', false);
    this.setVoxel(x - 1, y + 1, z - 1, 'wood', false);
    this.setVoxel(x + 2, y + 1, z - 1, 'wood', false);

    // Striped Canopy
    const primary = type === 'popcorn' ? 'red_wool' : 'blue_wool';
    const secondary = type === 'popcorn' ? 'yellow_wool' : 'red_wool';

    for (let dx = -1; dx <= 2; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        this.setVoxel(x + dx, y + 2, z + dz, (dx + dz) % 2 === 0 ? primary : secondary, false);
      }
    }
    this.setVoxel(x, y + 1, z + 1, 'torch', false);
  }

  // Stamp Neon Glowing Tunnel Ring
  public stampTunnelArch(centerX: number, baseY: number, centerZ: number, color: BlockType = 'blue_wool') {
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = 0; dy <= 4; dy++) {
        const isArch = Math.abs(dx) === 3 || dy === 4;
        if (isArch) {
          this.setVoxel(centerX + dx, baseY + dy, centerZ, color, false);
        }
      }
    }
    this.setVoxel(centerX, baseY + 4, centerZ, 'glowstone', false);
  }

  // Stamp Inverted Rollercoaster Loop in Voxel World
  public stampCoasterLoop(centerX: number, baseY: number, centerZ: number) {
    const loopRadius = 5;
    for (let angle = 0; angle < 360; angle += 15) {
      const rad = (angle * Math.PI) / 180;
      const lx = Math.round(centerX + Math.cos(rad) * loopRadius);
      const ly = Math.round(baseY + loopRadius + Math.sin(rad) * loopRadius);
      this.setVoxel(lx, ly, centerZ, 'cobblestone', false);
      this.setVoxel(lx, ly + 1, centerZ, 'gold_ore', false);
    }
    this.rebuildMeshes();
  }

  // Rebuild Instanced Meshes
  public rebuildMeshes() {
    this.blockPositions.clear();

    // Group active voxels by BlockType, keeping only visible surface/exposed voxels
    this.voxels.forEach((type, key) => {
      if (type === 'air') return;
      const [x, y, z] = key.split(',').map(Number);
      if (!this.isBlockVisible(x, y, z, type)) return;

      if (!this.blockPositions.has(type)) {
        this.blockPositions.set(type, []);
      }
      this.blockPositions.get(type)!.push(new THREE.Vector3(x, y, z));
    });

    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const railGeometry = new THREE.BoxGeometry(0.98, 0.05, 0.98);
    const matrix = new THREE.Matrix4();
    const dummy = new THREE.Object3D();

    const isRailType = (t: string) => t.includes('rail');
    const isRailNeighbor = (bx: number, by: number, bz: number) => {
      const v = this.voxels.get(`${bx},${by},${bz}`);
      return v ? isRailType(v) : false;
    };

    // Update or create InstancedMesh for each type
    this.blockPositions.forEach((positions, type) => {
      let instancedMesh = this.instancedMeshes.get(type);
      const isRail = isRailType(type);
      const geom = isRail ? railGeometry : boxGeometry;

      if (!instancedMesh || instancedMesh.count < positions.length) {
        if (instancedMesh) {
          this.scene.remove(instancedMesh);
          instancedMesh.geometry.dispose();
        }
        const materials = getBlockMaterials(type);
        const capacity = Math.max(this.instanceCapacity, positions.length + 8192);
        instancedMesh = new THREE.InstancedMesh(geom, materials, capacity);
        instancedMesh.castShadow = true;
        instancedMesh.receiveShadow = true;
        this.scene.add(instancedMesh);
        this.instancedMeshes.set(type, instancedMesh);
      }

      instancedMesh.count = positions.length;

      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        if (isRail) {
          dummy.position.set(pos.x + 0.5, pos.y + 0.025, pos.z + 0.5);
          dummy.rotation.set(0, 0, 0);

          const hasEast = isRailNeighbor(pos.x + 1, pos.y, pos.z) || isRailNeighbor(pos.x + 1, pos.y - 1, pos.z);
          const hasWest = isRailNeighbor(pos.x - 1, pos.y, pos.z) || isRailNeighbor(pos.x - 1, pos.y - 1, pos.z);
          const hasNorth = isRailNeighbor(pos.x, pos.y, pos.z - 1) || isRailNeighbor(pos.x, pos.y - 1, pos.z - 1);
          const hasSouth = isRailNeighbor(pos.x, pos.y, pos.z + 1) || isRailNeighbor(pos.x, pos.y - 1, pos.z + 1);

          const slopeNorth = isRailNeighbor(pos.x, pos.y + 1, pos.z - 1);
          const slopeSouth = isRailNeighbor(pos.x, pos.y + 1, pos.z + 1);
          const slopeEast = isRailNeighbor(pos.x + 1, pos.y + 1, pos.z);
          const slopeWest = isRailNeighbor(pos.x - 1, pos.y + 1, pos.z);

          if (slopeNorth) {
            dummy.rotation.x = -0.6;
            dummy.position.y += 0.35;
          } else if (slopeSouth) {
            dummy.rotation.x = 0.6;
            dummy.position.y += 0.35;
          } else if (slopeEast) {
            dummy.rotation.y = Math.PI / 2;
            dummy.rotation.x = 0.6;
            dummy.position.y += 0.35;
          } else if (slopeWest) {
            dummy.rotation.y = Math.PI / 2;
            dummy.rotation.x = -0.6;
            dummy.position.y += 0.35;
          } else if ((hasEast || hasWest) && !hasNorth && !hasSouth) {
            dummy.rotation.y = Math.PI / 2;
          }

          dummy.updateMatrix();
          instancedMesh.setMatrixAt(i, dummy.matrix);
        } else {
          matrix.setPosition(pos.x + 0.5, pos.y + 0.5, pos.z + 0.5);
          instancedMesh.setMatrixAt(i, matrix);
        }
      }
      instancedMesh.instanceMatrix.needsUpdate = true;
    });

    // Hide any unused instanced meshes
    this.instancedMeshes.forEach((mesh, type) => {
      if (!this.blockPositions.has(type) || this.blockPositions.get(type)!.length === 0) {
        mesh.count = 0;
        mesh.instanceMatrix.needsUpdate = true;
      }
    });
  }

  // Raycast to find targeted block
  public raycastVoxel(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance = 6): VoxelRaycastResult {
    let t = 0;
    const step = 0.05;
    const current = new THREE.Vector3();
    let lastAir = new THREE.Vector3();

    while (t < maxDistance) {
      current.copy(origin).addScaledVector(direction, t);
      const bx = Math.floor(current.x);
      const by = Math.floor(current.y);
      const bz = Math.floor(current.z);

      const block = this.getVoxel(bx, by, bz);

      if (block !== 'air' && block !== 'water') {
        const normal = new THREE.Vector3(
          lastAir.x - bx,
          lastAir.y - by,
          lastAir.z - bz
        );
        // Normalize to dominant axis
        if (Math.abs(normal.x) >= Math.abs(normal.y) && Math.abs(normal.x) >= Math.abs(normal.z)) {
          normal.set(Math.sign(normal.x), 0, 0);
        } else if (Math.abs(normal.y) >= Math.abs(normal.x) && Math.abs(normal.y) >= Math.abs(normal.z)) {
          normal.set(0, Math.sign(normal.y), 0);
        } else {
          normal.set(0, 0, Math.sign(normal.z));
        }

        return {
          hit: true,
          blockPos: new THREE.Vector3(bx, by, bz),
          faceNormal: normal,
          adjacentPos: new THREE.Vector3(bx + normal.x, by + normal.y, bz + normal.z),
          blockType: block,
          distance: t,
        };
      }

      lastAir.set(bx, by, bz);
      t += step;
    }

    return {
      hit: false,
      blockPos: new THREE.Vector3(),
      faceNormal: new THREE.Vector3(),
      adjacentPos: new THREE.Vector3(),
      blockType: 'air',
      distance: maxDistance,
    };
  }

  // Update break progress visual
  public updateBreakProgress(blockPos: THREE.Vector3 | null, stage: number) {
    if (!blockPos || stage < 0) {
      this.crackMesh.visible = false;
      return;
    }

    this.crackMesh.position.set(blockPos.x + 0.5, blockPos.y + 0.5, blockPos.z + 0.5);
    (this.crackMesh.material as THREE.MeshBasicMaterial).map = getBreakCrackTexture(
      Math.min(4, Math.max(0, stage))
    );
    (this.crackMesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
    this.crackMesh.visible = true;
  }

  // Spawn particle debris when block breaks
  public spawnBreakParticles(pos: THREE.Vector3, type: BlockType) {
    const pGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const materials = getBlockMaterials(type);
    const mat = Array.isArray(materials) ? materials[0] : materials;

    for (let i = 0; i < 12; i++) {
      const mesh = new THREE.Mesh(pGeo, mat);
      mesh.position.set(
        pos.x + 0.5 + (Math.random() - 0.5) * 0.7,
        pos.y + 0.5 + (Math.random() - 0.5) * 0.7,
        pos.z + 0.5 + (Math.random() - 0.5) * 0.7
      );
      this.particleGroup.add(mesh);

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          Math.random() * 3 + 1,
          (Math.random() - 0.5) * 4
        ),
        life: 0,
        maxLife: 0.5 + Math.random() * 0.3,
      });
    }
  }

  // Spawn a custom colored particle (used for bullet train sparks and trails)
  public spawnCustomParticle(pos: THREE.Vector3, vel: THREE.Vector3, color: number, size = 0.1, maxLife = 0.4) {
    const geo = new THREE.BoxGeometry(size, size, size);
    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this.particleGroup.add(mesh);
    this.particles.push({
      mesh,
      velocity: vel,
      life: 0,
      maxLife,
    });
  }

  // Blueprint Hologram Manager
  public setBlueprint(blueprint: BlueprintStructure | null, origin = new THREE.Vector3(0, 4, 0)) {
    this.activeBlueprint = blueprint;
    this.blueprintOrigin.copy(origin);
    this.rebuildBlueprintGhost();
  }

  public rebuildBlueprintGhost() {
    // Clear previous ghost meshes
    while (this.blueprintGroup.children.length > 0) {
      const obj = this.blueprintGroup.children[0];
      this.blueprintGroup.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    }

    if (!this.activeBlueprint || !this.showBlueprintGhost) return;

    const boxGeo = new THREE.BoxGeometry(0.98, 0.98, 0.98);

    this.activeBlueprint.blocks.forEach((b) => {
      if (b.y > this.blueprintLayerFilter) return;

      const wx = this.blueprintOrigin.x + b.x;
      const wy = this.blueprintOrigin.y + b.y;
      const wz = this.blueprintOrigin.z + b.z;

      const currentWorldVoxel = this.getVoxel(wx, wy, wz);
      const isAlreadyBuilt = currentWorldVoxel === b.type;
      if (isAlreadyBuilt) return; // Don't show ghost if already correctly built

      const isMisplaced = currentWorldVoxel !== 'air' && currentWorldVoxel !== b.type;

      // Holographic glowing ghost block
      const ghostMat = new THREE.MeshBasicMaterial({
        color: isMisplaced ? 0xff2222 : 0x00e5ff,
        wireframe: true,
        transparent: true,
        opacity: isMisplaced ? 0.8 : 0.45,
      });

      const mesh = new THREE.Mesh(boxGeo, ghostMat);
      mesh.position.set(wx + 0.5, wy + 0.5, wz + 0.5);
      this.blueprintGroup.add(mesh);
    });
  }

  // Calculate blueprint build accuracy & counts
  public evaluateBlueprintProgress(): {
    totalBlocks: number;
    correctBlocks: number;
    misplacedBlocks: number;
    accuracyPercent: number;
    blockTypeCounts: Record<string, { target: number; current: number }>;
  } {
    if (!this.activeBlueprint) {
      return { totalBlocks: 0, correctBlocks: 0, misplacedBlocks: 0, accuracyPercent: 0, blockTypeCounts: {} };
    }

    let correct = 0;
    let misplaced = 0;
    const total = this.activeBlueprint.blocks.length;
    const typeCounts: Record<string, { target: number; current: number }> = {};

    this.activeBlueprint.blocks.forEach((b) => {
      if (!typeCounts[b.type]) {
        typeCounts[b.type] = { target: 0, current: 0 };
      }
      typeCounts[b.type].target += 1;

      const wx = this.blueprintOrigin.x + b.x;
      const wy = this.blueprintOrigin.y + b.y;
      const wz = this.blueprintOrigin.z + b.z;

      const v = this.getVoxel(wx, wy, wz);
      if (v === b.type) {
        correct++;
        typeCounts[b.type].current += 1;
      } else if (v !== 'air') {
        misplaced++;
      }
    });

    const accuracy = total > 0 ? Math.floor((correct / total) * 100) : 0;
    return {
      totalBlocks: total,
      correctBlocks: correct,
      misplacedBlocks: misplaced,
      accuracyPercent: accuracy,
      blockTypeCounts: typeCounts,
    };
  }

  // Helper: Create Floating Health Bar above mob
  private createHealthBar(): THREE.Group {
    const group = new THREE.Group();
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x330000, side: THREE.DoubleSide });
    const fillMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide });

    const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.08), bgMat);
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(0.53, 0.06), fillMat);
    fill.position.z = 0.005;

    group.add(bg);
    group.add(fill);
    group.userData = { fill, bg };
    return group;
  }

  // Helper: Create 6-sided materials array with a face texture on front (+Z) and texture/color on others
  private createPartMaterials(frontTexture: THREE.CanvasTexture, sideTexture?: THREE.CanvasTexture, defaultColor: number = 0xffffff): THREE.Material[] {
    const sideMat = sideTexture
      ? new THREE.MeshLambertMaterial({ map: sideTexture })
      : new THREE.MeshLambertMaterial({ color: defaultColor });
    const frontMat = new THREE.MeshLambertMaterial({ map: frontTexture });

    // In Three.js BoxGeometry: [right (+X), left (-X), top (+Y), bottom (-Y), front (+Z), back (-Z)]
    return [sideMat, sideMat, sideMat, sideMat, frontMat, sideMat];
  }

  // Spawn hostile night mobs
  public spawnNightMobs(playerPos: THREE.Vector3) {
    if (this.mobs.length >= 10) return;

    const roll = Math.random();
    if (roll < 0.28) {
      this.spawnCreeper(undefined, undefined, undefined, playerPos);
    } else if (roll < 0.55) {
      this.spawnSkeleton(undefined, undefined, undefined, playerPos);
    } else if (roll < 0.82) {
      this.spawnZombie(undefined, undefined, undefined, playerPos);
    } else {
      this.spawnEnderman(undefined, undefined, undefined, playerPos);
    }
  }

  // Spawn passive day mobs (Pigs, Cows, Sheep)
  public spawnPassiveMobs(playerPos: THREE.Vector3) {
    const passiveCount = this.mobs.filter((m) => m.type === 'pig' || m.type === 'cow' || m.type === 'sheep').length;
    if (passiveCount >= 6) return;

    const roll = Math.random();
    if (roll < 0.35) {
      this.spawnPig(undefined, undefined, undefined, playerPos);
    } else if (roll < 0.7) {
      this.spawnCow(undefined, undefined, undefined, playerPos);
    } else {
      this.spawnSheep(undefined, undefined, undefined, playerPos);
    }
  }

  // --- 1. ZOMBIE (Realistic Textured Model with Arm/Leg pivots & Head Tracking) ---
  public spawnZombie(targetX?: number, targetY?: number, targetZ?: number, playerPos?: THREE.Vector3) {
    let x: number;
    let z: number;
    if (targetX !== undefined && targetZ !== undefined) {
      x = Math.floor(targetX);
      z = Math.floor(targetZ);
    } else {
      const refPos = playerPos || new THREE.Vector3(0, 5, 0);
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 8;
      x = Math.floor(refPos.x + Math.cos(angle) * dist);
      z = Math.floor(refPos.z + Math.sin(angle) * dist);
    }

    let y = targetY !== undefined ? targetY : 12;
    if (targetY === undefined) {
      while (y > -3 && this.getVoxel(x, y, z) === 'air') {
        y--;
      }
      y++;
    }

    const mobId = `zombie_${Date.now()}_${Math.random()}`;
    const mob: MobEntity = {
      id: mobId,
      type: 'zombie',
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      health: 20,
      maxHealth: 20,
      rotation: 0,
      headYaw: 0,
      headPitch: 0,
      state: 'chase',
      idleSoundTimer: 3 + Math.random() * 4,
    };

    const group = new THREE.Group();

    // Head Pivot Group
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 1.45, 0);
    const headMats = this.createPartMaterials(getZombieFaceTexture(), undefined, 0x386634);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), headMats);
    head.position.set(0, 0.25, 0);
    headPivot.add(head);
    group.add(headPivot);

    // Body (Torso with Cyan/Teal Shirt)
    const bodyMat = new THREE.MeshLambertMaterial({ map: getZombieBodyTexture() });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.68, 0.25), bodyMat);
    body.position.set(0, 0.98, 0);
    group.add(body);

    // Left Arm (Pivot at shoulder)
    const armMat = new THREE.MeshLambertMaterial({ color: 0x3d703b });
    const armLPivot = new THREE.Group();
    armLPivot.position.set(-0.35, 1.25, 0);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.18), armMat);
    armL.position.set(0, -0.28, 0);
    armLPivot.rotation.x = Math.PI / 2; // Forward outstretched zombie pose
    armLPivot.add(armL);
    group.add(armLPivot);

    // Right Arm (Pivot at shoulder)
    const armRPivot = new THREE.Group();
    armRPivot.position.set(0.35, 1.25, 0);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.18), armMat);
    armR.position.set(0, -0.28, 0);
    armRPivot.rotation.x = Math.PI / 2;
    armRPivot.add(armR);
    group.add(armRPivot);

    // Left Leg (Pivot at hip)
    const legMat = new THREE.MeshLambertMaterial({ map: getZombieLegTexture() });
    const legLPivot = new THREE.Group();
    legLPivot.position.set(-0.13, 0.64, 0);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.64, 0.2), legMat);
    legL.position.set(0, -0.32, 0);
    legLPivot.add(legL);
    group.add(legLPivot);

    // Right Leg (Pivot at hip)
    const legRPivot = new THREE.Group();
    legRPivot.position.set(0.13, 0.64, 0);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.64, 0.2), legMat);
    legR.position.set(0, -0.32, 0);
    legRPivot.add(legR);
    group.add(legRPivot);

    // Floating Health Bar
    const healthBar = this.createHealthBar();
    healthBar.position.set(0, 1.85, 0);
    group.add(healthBar);

    group.userData = {
      head: headPivot,
      body,
      armL: armLPivot,
      armR: armRPivot,
      legL: legLPivot,
      legR: legRPivot,
      healthBar,
      baseMaterials: [headMats, bodyMat, armMat, legMat],
    };

    group.position.set(x + 0.5, y, z + 0.5);
    this.scene.add(group);
    this.mobMeshes.set(mobId, group);
    this.mobs.push(mob);
    return mob;
  }

  // --- 2. CREEPER (Iconic Camo Textured Quadruped with Swelling Fuse) ---
  public spawnCreeper(targetX?: number, targetY?: number, targetZ?: number, playerPos?: THREE.Vector3) {
    let x: number;
    let z: number;
    if (targetX !== undefined && targetZ !== undefined) {
      x = Math.floor(targetX);
      z = Math.floor(targetZ);
    } else {
      const refPos = playerPos || new THREE.Vector3(0, 5, 0);
      const angle = Math.random() * Math.PI * 2;
      const dist = 8 + Math.random() * 6;
      x = Math.floor(refPos.x + Math.cos(angle) * dist);
      z = Math.floor(refPos.z + Math.sin(angle) * dist);
    }

    let y = targetY !== undefined ? targetY : 12;
    if (targetY === undefined) {
      while (y > -3 && this.getVoxel(x, y, z) === 'air') {
        y--;
      }
      y++;
    }

    const mobId = `creeper_${Date.now()}_${Math.random()}`;
    const mob: MobEntity = {
      id: mobId,
      type: 'creeper',
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      health: 20,
      maxHealth: 20,
      rotation: 0,
      headYaw: 0,
      headPitch: 0,
      fuseTimer: 0,
      isFusing: false,
      state: 'chase',
    };

    const group = new THREE.Group();
    const camoTexture = getCreeperCamoTexture();
    const camoMat = new THREE.MeshLambertMaterial({ map: camoTexture });
    const headMats = this.createPartMaterials(getCreeperFaceTexture(), camoTexture);

    // Head Pivot
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 1.25, 0);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), headMats);
    head.position.set(0, 0.25, 0);
    headPivot.add(head);
    group.add(headPivot);

    // Torso
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.68, 0.26), camoMat);
    body.position.set(0, 0.78, 0);
    group.add(body);

    // 4 Quadruped Legs
    const legFLPivot = new THREE.Group();
    legFLPivot.position.set(-0.12, 0.36, 0.14);
    const legFL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 0.18), camoMat);
    legFL.position.set(0, -0.18, 0);
    legFLPivot.add(legFL);
    group.add(legFLPivot);

    const legFRPivot = new THREE.Group();
    legFRPivot.position.set(0.12, 0.36, 0.14);
    const legFR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 0.18), camoMat);
    legFR.position.set(0, -0.18, 0);
    legFRPivot.add(legFR);
    group.add(legFRPivot);

    const legBLPivot = new THREE.Group();
    legBLPivot.position.set(-0.12, 0.36, -0.14);
    const legBL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 0.18), camoMat);
    legBL.position.set(0, -0.18, 0);
    legBLPivot.add(legBL);
    group.add(legBLPivot);

    const legBRPivot = new THREE.Group();
    legBRPivot.position.set(0.12, 0.36, -0.14);
    const legBR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 0.18), camoMat);
    legBR.position.set(0, -0.18, 0);
    legBRPivot.add(legBR);
    group.add(legBRPivot);

    // Floating Health Bar
    const healthBar = this.createHealthBar();
    healthBar.position.set(0, 1.65, 0);
    group.add(healthBar);

    group.userData = {
      head: headPivot,
      body,
      legFL: legFLPivot,
      legFR: legFRPivot,
      legBL: legBLPivot,
      legBR: legBRPivot,
      healthBar,
      baseMaterials: [headMats, camoMat],
    };

    group.position.set(x + 0.5, y, z + 0.5);
    this.scene.add(group);
    this.mobMeshes.set(mobId, group);
    this.mobs.push(mob);
    return mob;
  }

  // --- 3. SKELETON (Bone Archer with 3D Bow aiming & Ribcage Texture) ---
  public spawnSkeleton(targetX?: number, targetY?: number, targetZ?: number, playerPos?: THREE.Vector3) {
    let x: number;
    let z: number;
    if (targetX !== undefined && targetZ !== undefined) {
      x = Math.floor(targetX);
      z = Math.floor(targetZ);
    } else {
      const refPos = playerPos || new THREE.Vector3(0, 5, 0);
      const angle = Math.random() * Math.PI * 2;
      const dist = 12 + Math.random() * 8;
      x = Math.floor(refPos.x + Math.cos(angle) * dist);
      z = Math.floor(refPos.z + Math.sin(angle) * dist);
    }

    let y = targetY !== undefined ? targetY : 12;
    if (targetY === undefined) {
      while (y > -3 && this.getVoxel(x, y, z) === 'air') {
        y--;
      }
      y++;
    }

    const mobId = `skeleton_${Date.now()}_${Math.random()}`;
    const mob: MobEntity = {
      id: mobId,
      type: 'skeleton',
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      health: 20,
      maxHealth: 20,
      rotation: 0,
      headYaw: 0,
      headPitch: 0,
      shootCooldown: 1.5,
      state: 'strafe',
      idleSoundTimer: 4 + Math.random() * 4,
    };

    const group = new THREE.Group();
    const boneMat = new THREE.MeshLambertMaterial({ color: 0xdfded8 });
    const bowWoodMat = new THREE.MeshLambertMaterial({ color: 0x7c4722 });
    const bowStringMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });

    // Skull Head
    const headMats = this.createPartMaterials(getSkeletonFaceTexture(), undefined, 0xd0cfc8);
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 1.45, 0);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), headMats);
    head.position.set(0, 0.24, 0);
    headPivot.add(head);
    group.add(headPivot);

    // Ribcage Body
    const bodyMat = new THREE.MeshLambertMaterial({ map: getSkeletonBodyTexture() });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.65, 0.22), bodyMat);
    body.position.set(0, 0.98, 0);
    group.add(body);

    // Thin Bone Arms
    const armLPivot = new THREE.Group();
    armLPivot.position.set(-0.3, 1.25, 0);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), boneMat);
    armL.position.set(0, -0.28, 0);
    armLPivot.add(armL);
    group.add(armLPivot);

    // Right Arm with 3D Bow
    const armRPivot = new THREE.Group();
    armRPivot.position.set(0.3, 1.25, 0);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), boneMat);
    armR.position.set(0, -0.28, 0);
    armRPivot.add(armR);

    // 3D Bow in Right Hand
    const bowGroup = new THREE.Group();
    const bowStave = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.58, 0.06), bowWoodMat);
    const bowString = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.54, 0.02), bowStringMat);
    bowString.position.z = -0.06;
    bowGroup.add(bowStave);
    bowGroup.add(bowString);
    bowGroup.position.set(0, -0.4, 0.2);
    bowGroup.rotation.x = Math.PI / 3;
    armRPivot.add(bowGroup);
    armRPivot.rotation.x = Math.PI / 3;

    group.add(armRPivot);

    // Thin Bone Legs
    const legLPivot = new THREE.Group();
    legLPivot.position.set(-0.12, 0.64, 0);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.64, 0.13), boneMat);
    legL.position.set(0, -0.32, 0);
    legLPivot.add(legL);
    group.add(legLPivot);

    const legRPivot = new THREE.Group();
    legRPivot.position.set(0.12, 0.64, 0);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.64, 0.13), boneMat);
    legR.position.set(0, -0.32, 0);
    legRPivot.add(legR);
    group.add(legRPivot);

    // Floating Health Bar
    const healthBar = this.createHealthBar();
    healthBar.position.set(0, 1.85, 0);
    group.add(healthBar);

    group.userData = {
      head: headPivot,
      body,
      armL: armLPivot,
      armR: armRPivot,
      legL: legLPivot,
      legR: legRPivot,
      bow: bowGroup,
      healthBar,
      baseMaterials: [headMats, bodyMat, boneMat, bowWoodMat],
    };

    group.position.set(x + 0.5, y, z + 0.5);
    this.scene.add(group);
    this.mobMeshes.set(mobId, group);
    this.mobs.push(mob);
    return mob;
  }

  // --- 4. ENDERMAN (2.9m Silhouette, Glowing Eyes, 3D Held Block, Teleportation) ---
  public spawnEnderman(targetX?: number, targetY?: number, targetZ?: number, playerPos?: THREE.Vector3) {
    let x: number;
    let z: number;
    if (targetX !== undefined && targetZ !== undefined) {
      x = Math.floor(targetX);
      z = Math.floor(targetZ);
    } else {
      const refPos = playerPos || new THREE.Vector3(0, 5, 0);
      const angle = Math.random() * Math.PI * 2;
      const dist = 14 + Math.random() * 8;
      x = Math.floor(refPos.x + Math.cos(angle) * dist);
      z = Math.floor(refPos.z + Math.sin(angle) * dist);
    }

    let y = targetY !== undefined ? targetY : 12;
    if (targetY === undefined) {
      while (y > -3 && this.getVoxel(x, y, z) === 'air') {
        y--;
      }
      y++;
    }

    const mobId = `enderman_${Date.now()}_${Math.random()}`;
    const mob: MobEntity = {
      id: mobId,
      type: 'enderman',
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      health: 40,
      maxHealth: 40,
      rotation: 0,
      headYaw: 0,
      headPitch: 0,
      teleportCooldown: 2.0,
      state: 'chase',
      idleSoundTimer: 5 + Math.random() * 5,
    };

    const group = new THREE.Group();
    const darkTexture = getEndermanDarkTexture();
    const darkMat = new THREE.MeshLambertMaterial({ map: darkTexture });
    const headMats = this.createPartMaterials(getEndermanFaceTexture(), darkTexture);

    // Head Pivot (at 2.45m)
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 2.45, 0);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), headMats);
    head.position.set(0, 0.21, 0);
    headPivot.add(head);
    group.add(headPivot);

    // Slender Body (0.36 x 0.85 x 0.2)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.85, 0.2), darkMat);
    body.position.set(0, 1.95, 0);
    group.add(body);

    // Long Slender Arms holding block forward
    const armLPivot = new THREE.Group();
    armLPivot.position.set(-0.25, 2.3, 0);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.35, 0.1), darkMat);
    armL.position.set(0, -0.65, 0);
    armLPivot.rotation.x = Math.PI / 4;
    armLPivot.add(armL);
    group.add(armLPivot);

    const armRPivot = new THREE.Group();
    armRPivot.position.set(0.25, 2.3, 0);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.35, 0.1), darkMat);
    armR.position.set(0, -0.65, 0);
    armRPivot.rotation.x = Math.PI / 4;
    armRPivot.add(armR);
    group.add(armRPivot);

    // 3D Grass/Dirt Block held in hands
    const blockMat = new THREE.MeshLambertMaterial({ color: 0x48bb78 });
    const heldBlock = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), blockMat);
    heldBlock.position.set(0, 1.6, 0.45);
    group.add(heldBlock);

    // Long Legs
    const legLPivot = new THREE.Group();
    legLPivot.position.set(-0.1, 1.5, 0);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.5, 0.11), darkMat);
    legL.position.set(0, -0.75, 0);
    legLPivot.add(legL);
    group.add(legLPivot);

    const legRPivot = new THREE.Group();
    legRPivot.position.set(0.1, 1.5, 0);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.5, 0.11), darkMat);
    legR.position.set(0, -0.75, 0);
    legRPivot.add(legR);
    group.add(legRPivot);

    // Floating Health Bar
    const healthBar = this.createHealthBar();
    healthBar.position.set(0, 2.95, 0);
    group.add(healthBar);

    group.userData = {
      head: headPivot,
      body,
      armL: armLPivot,
      armR: armRPivot,
      legL: legLPivot,
      legR: legRPivot,
      heldBlock,
      healthBar,
      baseMaterials: [headMats, darkMat, blockMat],
    };

    group.position.set(x + 0.5, y, z + 0.5);
    this.scene.add(group);
    this.mobMeshes.set(mobId, group);
    this.mobs.push(mob);
    return mob;
  }

  // --- 5. PIG (Passive Mob: 3D Snout, Curly Tail, Oinks, Pork Drops) ---
  public spawnPig(targetX?: number, targetY?: number, targetZ?: number, playerPos?: THREE.Vector3) {
    let x: number;
    let z: number;
    if (targetX !== undefined && targetZ !== undefined) {
      x = Math.floor(targetX);
      z = Math.floor(targetZ);
    } else {
      const refPos = playerPos || new THREE.Vector3(0, 5, 0);
      const angle = Math.random() * Math.PI * 2;
      const dist = 6 + Math.random() * 6;
      x = Math.floor(refPos.x + Math.cos(angle) * dist);
      z = Math.floor(refPos.z + Math.sin(angle) * dist);
    }

    let y = targetY !== undefined ? targetY : 12;
    if (targetY === undefined) {
      while (y > -3 && this.getVoxel(x, y, z) === 'air') {
        y--;
      }
      y++;
    }

    const mobId = `pig_${Date.now()}_${Math.random()}`;
    const mob: MobEntity = {
      id: mobId,
      type: 'pig',
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      health: 10,
      maxHealth: 10,
      rotation: Math.random() * Math.PI * 2,
      headYaw: 0,
      headPitch: 0,
      state: 'idle',
      idleTimer: 2 + Math.random() * 3,
      idleSoundTimer: 4 + Math.random() * 5,
    };

    const group = new THREE.Group();
    const skinTexture = getPigSkinTexture();
    const skinMat = new THREE.MeshLambertMaterial({ map: skinTexture });
    const snoutMat = new THREE.MeshLambertMaterial({ color: 0xde6f80 });
    const headMats = this.createPartMaterials(getPigFaceTexture(), skinTexture);

    // Head Pivot
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.65, 0.35);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.44, 0.44), headMats);
    head.position.set(0, 0, 0.05);
    headPivot.add(head);

    // Protruding 3D Snout
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.1), snoutMat);
    snout.position.set(0, -0.06, 0.3);
    headPivot.add(snout);
    group.add(headPivot);

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.48, 0.8), skinMat);
    body.position.set(0, 0.54, 0);
    group.add(body);

    // Cute curly tail on the rear
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.06), snoutMat);
    tail.position.set(0, 0.65, -0.42);
    tail.rotation.x = -Math.PI / 4;
    group.add(tail);

    // 4 Quadruped Legs
    const legFLPivot = new THREE.Group();
    legFLPivot.position.set(-0.18, 0.32, 0.26);
    const legFL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.32, 0.16), skinMat);
    legFL.position.set(0, -0.16, 0);
    legFLPivot.add(legFL);
    group.add(legFLPivot);

    const legFRPivot = new THREE.Group();
    legFRPivot.position.set(0.18, 0.32, 0.26);
    const legFR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.32, 0.16), skinMat);
    legFR.position.set(0, -0.16, 0);
    legFRPivot.add(legFR);
    group.add(legFRPivot);

    const legBLPivot = new THREE.Group();
    legBLPivot.position.set(-0.18, 0.32, -0.26);
    const legBL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.32, 0.16), skinMat);
    legBL.position.set(0, -0.16, 0);
    legBLPivot.add(legBL);
    group.add(legBLPivot);

    const legBRPivot = new THREE.Group();
    legBRPivot.position.set(0.18, 0.32, -0.26);
    const legBR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.32, 0.16), skinMat);
    legBR.position.set(0, -0.16, 0);
    legBRPivot.add(legBR);
    group.add(legBRPivot);

    // Floating Health Bar
    const healthBar = this.createHealthBar();
    healthBar.position.set(0, 1.05, 0);
    group.add(healthBar);

    group.userData = {
      head: headPivot,
      body,
      legFL: legFLPivot,
      legFR: legFRPivot,
      legBL: legBLPivot,
      legBR: legBRPivot,
      healthBar,
      baseMaterials: [headMats, skinMat, snoutMat],
    };

    group.position.set(x + 0.5, y, z + 0.5);
    this.scene.add(group);
    this.mobMeshes.set(mobId, group);
    this.mobs.push(mob);
    return mob;
  }

  // --- 6. COW (Spotted Hide, Horns, Udder, Moos, Leather & Beef Drops) ---
  public spawnCow(targetX?: number, targetY?: number, targetZ?: number, playerPos?: THREE.Vector3) {
    let x: number;
    let z: number;
    if (targetX !== undefined && targetZ !== undefined) {
      x = Math.floor(targetX);
      z = Math.floor(targetZ);
    } else {
      const refPos = playerPos || new THREE.Vector3(0, 5, 0);
      const angle = Math.random() * Math.PI * 2;
      const dist = 7 + Math.random() * 6;
      x = Math.floor(refPos.x + Math.cos(angle) * dist);
      z = Math.floor(refPos.z + Math.sin(angle) * dist);
    }

    let y = targetY !== undefined ? targetY : 12;
    if (targetY === undefined) {
      while (y > -3 && this.getVoxel(x, y, z) === 'air') {
        y--;
      }
      y++;
    }

    const mobId = `cow_${Date.now()}_${Math.random()}`;
    const mob: MobEntity = {
      id: mobId,
      type: 'cow',
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      health: 14,
      maxHealth: 14,
      rotation: Math.random() * Math.PI * 2,
      headYaw: 0,
      headPitch: 0,
      state: 'idle',
      idleTimer: 2 + Math.random() * 4,
      idleSoundTimer: 5 + Math.random() * 6,
    };

    const group = new THREE.Group();
    const cowBodyTexture = getCowBodyTexture();
    const bodyMat = new THREE.MeshLambertMaterial({ map: cowBodyTexture });
    const hornMat = new THREE.MeshLambertMaterial({ color: 0x999999 });
    const udderMat = new THREE.MeshLambertMaterial({ color: 0xf3a4b0 });
    const headMats = this.createPartMaterials(getCowFaceTexture(), cowBodyTexture);

    // Head Pivot
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.85, 0.42);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.46, 0.46), headMats);
    head.position.set(0, 0, 0.05);
    headPivot.add(head);

    // 2 Horns
    const hornL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.08), hornMat);
    hornL.position.set(-0.25, 0.26, 0.02);
    headPivot.add(hornL);

    const hornR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.08), hornMat);
    hornR.position.set(0.25, 0.26, 0.02);
    headPivot.add(hornR);

    // Muzzle / Snout
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.1), hornMat);
    muzzle.position.set(0, -0.1, 0.31);
    headPivot.add(muzzle);
    group.add(headPivot);

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.54, 0.9), bodyMat);
    body.position.set(0, 0.65, 0);
    group.add(body);

    // Udder under belly
    const udder = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.28), udderMat);
    udder.position.set(0, 0.34, -0.18);
    group.add(udder);

    // 4 Legs
    const legFLPivot = new THREE.Group();
    legFLPivot.position.set(-0.2, 0.4, 0.3);
    const legFL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.18), bodyMat);
    legFL.position.set(0, -0.2, 0);
    legFLPivot.add(legFL);
    group.add(legFLPivot);

    const legFRPivot = new THREE.Group();
    legFRPivot.position.set(0.2, 0.4, 0.3);
    const legFR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.18), bodyMat);
    legFR.position.set(0, -0.2, 0);
    legFRPivot.add(legFR);
    group.add(legFRPivot);

    const legBLPivot = new THREE.Group();
    legBLPivot.position.set(-0.2, 0.4, -0.3);
    const legBL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.18), bodyMat);
    legBL.position.set(0, -0.2, 0);
    legBLPivot.add(legBL);
    group.add(legBLPivot);

    const legBRPivot = new THREE.Group();
    legBRPivot.position.set(0.2, 0.4, -0.3);
    const legBR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.18), bodyMat);
    legBR.position.set(0, -0.2, 0);
    legBRPivot.add(legBR);
    group.add(legBRPivot);

    // Health Bar
    const healthBar = this.createHealthBar();
    healthBar.position.set(0, 1.25, 0);
    group.add(healthBar);

    group.userData = {
      head: headPivot,
      body,
      legFL: legFLPivot,
      legFR: legFRPivot,
      legBL: legBLPivot,
      legBR: legBRPivot,
      healthBar,
      baseMaterials: [headMats, bodyMat, hornMat, udderMat],
    };

    group.position.set(x + 0.5, y, z + 0.5);
    this.scene.add(group);
    this.mobMeshes.set(mobId, group);
    this.mobs.push(mob);
    return mob;
  }

  // --- 7. SHEEP (Fluffy Wool Coat, Baas, Wool Drop) ---
  public spawnSheep(targetX?: number, targetY?: number, targetZ?: number, playerPos?: THREE.Vector3) {
    let x: number;
    let z: number;
    if (targetX !== undefined && targetZ !== undefined) {
      x = Math.floor(targetX);
      z = Math.floor(targetZ);
    } else {
      const refPos = playerPos || new THREE.Vector3(0, 5, 0);
      const angle = Math.random() * Math.PI * 2;
      const dist = 7 + Math.random() * 6;
      x = Math.floor(refPos.x + Math.cos(angle) * dist);
      z = Math.floor(refPos.z + Math.sin(angle) * dist);
    }

    let y = targetY !== undefined ? targetY : 12;
    if (targetY === undefined) {
      while (y > -3 && this.getVoxel(x, y, z) === 'air') {
        y--;
      }
      y++;
    }

    const mobId = `sheep_${Date.now()}_${Math.random()}`;
    const mob: MobEntity = {
      id: mobId,
      type: 'sheep',
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      health: 12,
      maxHealth: 12,
      rotation: Math.random() * Math.PI * 2,
      headYaw: 0,
      headPitch: 0,
      state: 'idle',
      idleTimer: 2 + Math.random() * 4,
      idleSoundTimer: 4 + Math.random() * 5,
    };

    const group = new THREE.Group();
    const woolTexture = getSheepWoolTexture();
    const woolMat = new THREE.MeshLambertMaterial({ map: woolTexture });
    const legMat = new THREE.MeshLambertMaterial({ color: 0xdecbb4 });
    const headMats = this.createPartMaterials(getSheepFaceTexture(), woolTexture);

    // Head Pivot
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.78, 0.38);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), headMats);
    head.position.set(0, 0, 0.05);
    headPivot.add(head);
    group.add(headPivot);

    // Fluffy Wool Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.58, 0.9), woolMat);
    body.position.set(0, 0.62, 0);
    group.add(body);

    // 4 Legs
    const legFLPivot = new THREE.Group();
    legFLPivot.position.set(-0.19, 0.36, 0.28);
    const legFL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.16), legMat);
    legFL.position.set(0, -0.18, 0);
    legFLPivot.add(legFL);
    group.add(legFLPivot);

    const legFRPivot = new THREE.Group();
    legFRPivot.position.set(0.19, 0.36, 0.28);
    const legFR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.16), legMat);
    legFR.position.set(0, -0.18, 0);
    legFRPivot.add(legFR);
    group.add(legFRPivot);

    const legBLPivot = new THREE.Group();
    legBLPivot.position.set(-0.19, 0.36, -0.28);
    const legBL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.16), legMat);
    legBL.position.set(0, -0.18, 0);
    legBLPivot.add(legBL);
    group.add(legBLPivot);

    const legBRPivot = new THREE.Group();
    legBRPivot.position.set(0.19, 0.36, -0.28);
    const legBR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.16), legMat);
    legBR.position.set(0, -0.18, 0);
    legBRPivot.add(legBR);
    group.add(legBRPivot);

    // Health Bar
    const healthBar = this.createHealthBar();
    healthBar.position.set(0, 1.18, 0);
    group.add(healthBar);

    group.userData = {
      head: headPivot,
      body,
      legFL: legFLPivot,
      legFR: legFRPivot,
      legBL: legBLPivot,
      legBR: legBRPivot,
      healthBar,
      baseMaterials: [headMats, woolMat, legMat],
    };

    group.position.set(x + 0.5, y, z + 0.5);
    this.scene.add(group);
    this.mobMeshes.set(mobId, group);
    this.mobs.push(mob);
    return mob;
  }

  // --- 8. VILLAGER (Authentic NPC: Big Nose, Unibrow, Robes, Folded Arms, "Hrmm" Sound) ---
  public spawnVillager(targetX?: number, targetY?: number, targetZ?: number, playerPos?: THREE.Vector3) {
    let x: number;
    let z: number;
    if (targetX !== undefined && targetZ !== undefined) {
      x = Math.floor(targetX);
      z = Math.floor(targetZ);
    } else {
      const refPos = playerPos || new THREE.Vector3(0, 5, 0);
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * 5;
      x = Math.floor(refPos.x + Math.cos(angle) * dist);
      z = Math.floor(refPos.z + Math.sin(angle) * dist);
    }

    let y = targetY !== undefined ? targetY : 12;
    if (targetY === undefined) {
      while (y > -3 && this.getVoxel(x, y, z) === 'air') {
        y--;
      }
      y++;
    }

    const mobId = `villager_${Date.now()}_${Math.random()}`;
    const mob: MobEntity = {
      id: mobId,
      type: 'villager',
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      health: 20,
      maxHealth: 20,
      rotation: Math.random() * Math.PI * 2,
      headYaw: 0,
      headPitch: 0,
      state: 'idle',
      idleTimer: 2 + Math.random() * 4,
      idleSoundTimer: 3 + Math.random() * 6,
    };

    const group = new THREE.Group();
    const robeTexture = getVillagerRobeTexture();
    const robeMat = new THREE.MeshLambertMaterial({ map: robeTexture });
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xbd8565 });
    const headMats = this.createPartMaterials(getVillagerFaceTexture(), robeTexture);

    // Head Pivot (at 1.35m)
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 1.35, 0);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.54, 0.48), headMats);
    head.position.set(0, 0.27, 0);
    headPivot.add(head);

    // Iconic Protruding Villager 3D Nose
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.14), skinMat);
    nose.position.set(0, 0.16, 0.3);
    headPivot.add(nose);
    group.add(headPivot);

    // Robe Torso / Body (0.5 x 0.72 x 0.34)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.72, 0.34), robeMat);
    body.position.set(0, 0.95, 0);
    group.add(body);

    // Folded Robe Arms in front
    const armsPivot = new THREE.Group();
    armsPivot.position.set(0, 0.98, 0.16);
    const armsCrossed = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.24, 0.2), robeMat);
    armsCrossed.position.set(0, 0, 0);
    armsPivot.add(armsCrossed);
    group.add(armsPivot);

    // Legs
    const legLPivot = new THREE.Group();
    legLPivot.position.set(-0.13, 0.6, 0);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), robeMat);
    legL.position.set(0, -0.3, 0);
    legLPivot.add(legL);
    group.add(legLPivot);

    const legRPivot = new THREE.Group();
    legRPivot.position.set(0.13, 0.6, 0);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), robeMat);
    legR.position.set(0, -0.3, 0);
    legRPivot.add(legR);
    group.add(legRPivot);

    // Floating Health Bar
    const healthBar = this.createHealthBar();
    healthBar.position.set(0, 2.05, 0);
    group.add(healthBar);

    group.userData = {
      head: headPivot,
      body,
      armL: armsPivot,
      legL: legLPivot,
      legR: legRPivot,
      healthBar,
      baseMaterials: [headMats, robeMat, skinMat],
    };

    group.position.set(x + 0.5, y, z + 0.5);
    this.scene.add(group);
    this.mobMeshes.set(mobId, group);
    this.mobs.push(mob);
    return mob;
  }

  // --- SPAWN MASSIVE PEOPLE / VILLAGER POPULATION (200 NPCs) ---
  public spawnPeopleCrowd(count: number = 200, centerPos?: THREE.Vector3) {
    const center = centerPos || new THREE.Vector3(0, 5, 0);
    const spawned: MobEntity[] = [];
    for (let i = 0; i < count; i++) {
      const radius = 3 + Math.sqrt(Math.random()) * 45;
      const angle = (i / count) * Math.PI * 2 * 10 + Math.random() * 0.4;
      const x = Math.round(center.x + Math.cos(angle) * radius);
      const z = Math.round(center.z + Math.sin(angle) * radius);
      let y = 14;
      while (y > -3 && this.getVoxel(x, y, z) === 'air') {
        y--;
      }
      y++;
      const villager = this.spawnVillager(x, y, z);
      spawned.push(villager);
    }
    soundManager.playVillagerHrmm();
    return spawned;
  }

  // --- REALISTIC 3D ITEM DROP SYSTEM ---
  public spawnWorldDrop(type: ItemType, pos: THREE.Vector3, count: number = 1) {
    const dropGroup = new THREE.Group();
    let color = 0xffffff;
    if (type === 'rotten_flesh') color = 0x933322;
    else if (type === 'bone') color = 0xeeeeee;
    else if (type === 'arrow') color = 0x887766;
    else if (type === 'gunpowder') color = 0x475569;
    else if (type === 'ender_pearl') color = 0x059669;
    else if (type === 'leather') color = 0xa16207;
    else if (type === 'raw_porkchop' || type === 'raw_meat') color = 0xf43f5e;
    else if (type === 'cooked_porkchop' || type === 'cooked_meat') color = 0x78350f;
    else if (type === 'wool') color = 0xf8fafc;
    else if (type === 'iron_ingot') color = 0xd1d5db;
    else if (type === 'gold_ingot') color = 0xfacc15;
    else if (type === 'diamond') color = 0x38bdf8;
    else if (type === 'coal') color = 0x1e293b;
    else if (type === 'bread') color = 0xd97706;
    else if (type === 'apple') color = 0xef4444;
    else if (type === 'golden_apple') color = 0xfbbf24;
    else if (type === 'emerald') color = 0x10b981;

    // Mini 3D rotating drop cube
    const dropMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.24, 0.24),
      new THREE.MeshLambertMaterial({ color })
    );
    dropGroup.add(dropMesh);

    // Glowing core or outline
    const core = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    dropGroup.add(core);

    dropGroup.position.copy(pos);
    this.worldDropGroup.add(dropGroup);

    const dropEntity: WorldDropEntity = {
      id: `drop_${Date.now()}_${Math.random()}`,
      type,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      vx: (Math.random() - 0.5) * 3,
      vy: 3.2 + Math.random() * 1.5,
      vz: (Math.random() - 0.5) * 3,
      mesh: dropGroup,
      life: 0,
      count,
    };

    this.worldDrops.push(dropEntity);
  }

  // --- DAMAGE MOB & KNOCKBACK PHYSICS ---
  public damageMob(mobId: string, damage: number, hitDirection?: THREE.Vector3): boolean {
    const mob = this.mobs.find((m) => m.id === mobId);
    if (!mob || mob.isDead) return false;

    mob.health = Math.max(0, mob.health - damage);
    mob.hurtTimer = 0.26;

    // Apply knockback velocity
    if (hitDirection) {
      mob.vx = hitDirection.x * 6;
      mob.vz = hitDirection.z * 6;
      mob.vy = 3.8;
    } else {
      mob.vy = 3.0;
    }

    // Play species-specific hurt audio
    if (mob.type === 'zombie') soundManager.playZombieHurt();
    else if (mob.type === 'skeleton') soundManager.playSkeletonHurt();
    else if (mob.type === 'creeper') soundManager.playCreeperHurt();
    else if (mob.type === 'enderman') soundManager.playEndermanScreech();
    else if (mob.type === 'pig') soundManager.playPigSqueal();
    else if (mob.type === 'cow') soundManager.playCowMoo();
    else if (mob.type === 'sheep') soundManager.playSheepBaa();

    // Aggro or Flee state
    if (mob.type === 'pig' || mob.type === 'cow' || mob.type === 'sheep') {
      mob.state = 'flee';
      mob.idleTimer = 4.0;
    } else if (mob.type === 'enderman') {
      mob.state = 'chase';
    }

    // Hit impact blood/dust particles
    for (let i = 0; i < 8; i++) {
      const pGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
      const pMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.set(
        mob.x + (Math.random() - 0.5) * 0.4,
        mob.y + 0.8 + (Math.random() - 0.5) * 0.4,
        mob.z + (Math.random() - 0.5) * 0.4
      );
      this.particleGroup.add(pMesh);
      this.particles.push({
        mesh: pMesh,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3 + 1, (Math.random() - 0.5) * 4),
        life: 0,
        maxLife: 0.35,
      });
    }

    return true;
  }

  // Shoot Arrow from Skeleton
  public shootArrow(origin: THREE.Vector3, target: THREE.Vector3) {
    soundManager.playArrowShoot();

    const dir = target.clone().sub(origin).normalize();
    const arrowGroup = new THREE.Group();

    // Shaft
    const shaft = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.05, 0.55),
      new THREE.MeshLambertMaterial({ color: 0xc89d66 })
    );
    arrowGroup.add(shaft);

    // Arrowhead
    const tip = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.09, 0.12),
      new THREE.MeshLambertMaterial({ color: 0x777777 })
    );
    tip.position.z = 0.32;
    arrowGroup.add(tip);

    arrowGroup.position.copy(origin);
    arrowGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);

    this.projectileGroup.add(arrowGroup);

    const proj: ProjectileEntity = {
      id: `arrow_${Date.now()}_${Math.random()}`,
      x: origin.x,
      y: origin.y,
      z: origin.z,
      vx: dir.x * 20,
      vy: dir.y * 20 + 1.2,
      vz: dir.z * 20,
      mesh: arrowGroup,
      life: 0,
    };

    this.projectiles.push(proj);
  }

  // THOR'S LIGHTNING STRIKE POWER!
  public triggerLightningStrike(targetPos: THREE.Vector3): { mobsHit: number } {
    soundManager.playThunder();

    const topY = 42;
    const bottomY = Math.max(0, targetPos.y);

    // 1. Vertical Glowing Lightning Mesh Bolt
    const height = topY - bottomY;
    const boltGeo = new THREE.CylinderGeometry(0.25, 0.5, height, 6);
    const boltMat = new THREE.MeshBasicMaterial({ color: 0x99f6e4 });
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    bolt.position.set(targetPos.x, bottomY + height / 2, targetPos.z);
    this.scene.add(bolt);

    // Inner bright core
    const coreGeo = new THREE.CylinderGeometry(0.12, 0.25, height, 6);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(targetPos.x, bottomY + height / 2, targetPos.z);
    this.scene.add(core);

    // Fade and remove lightning bolt after 160ms
    setTimeout(() => {
      this.scene.remove(bolt);
      this.scene.remove(core);
      boltGeo.dispose();
      boltMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
    }, 160);

    // 2. Electric Ground Sparks
    for (let i = 0; i < 30; i++) {
      const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() < 0.6 ? 0x38bdf8 : 0xffffff,
      });
      const spark = new THREE.Mesh(geo, mat);
      spark.position.set(targetPos.x, targetPos.y + 0.4, targetPos.z);
      this.particleGroup.add(spark);

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 4;
      this.particles.push({
        mesh: spark,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.random() * 10 + 3,
          Math.sin(angle) * speed
        ),
        life: 0,
        maxLife: 0.6,
      });
    }

    // 3. Shockwave ground crater
    const cx = Math.floor(targetPos.x);
    const cy = Math.floor(targetPos.y);
    const cz = Math.floor(targetPos.z);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const bx = cx + dx;
          const by = cy + dy;
          const bz = cz + dz;
          if (by <= 0) continue;
          const block = this.getVoxel(bx, by, bz);
          if (block !== 'air' && block !== 'water') {
            this.setVoxel(bx, by, bz, 'air');
            this.spawnBreakParticles(new THREE.Vector3(bx, by, bz), block);
          }
        }
      }
    }

    // 4. Vaporize or Heavy Damage all hostile mobs within 7 blocks!
    let mobsHit = 0;
    for (const mob of this.mobs) {
      const dist = Math.hypot(mob.x - targetPos.x, mob.y - targetPos.y, mob.z - targetPos.z);
      if (dist <= 7.0) {
        mob.health -= 50; // Instantly obliterates zombies/creepers/skeletons!
        mobsHit++;
      }
    }

    return { mobsHit };
  }

  // MASSIVE 5x5 SUPERMINE TUNNEL DRILL
  public triggerSupermineExcavate(origin: THREE.Vector3, aimDirection: THREE.Vector3): { type: BlockType }[] {
    soundManager.playSupermine();

    const brokenBlocks: { type: BlockType }[] = [];
    const dir = aimDirection.clone().normalize();

    // Determine primary excavation axis
    const absX = Math.abs(dir.x);
    const absY = Math.abs(dir.y);
    const absZ = Math.abs(dir.z);

    const startX = Math.floor(origin.x);
    const startY = Math.floor(origin.y);
    const startZ = Math.floor(origin.z);

    // Excavate a 5x5 tunnel 4 blocks deep in the aim direction!
    const depth = 4;
    const halfWidth = 2; // -2 to +2 = 5 blocks wide

    for (let d = 0; d <= depth; d++) {
      const centerX = Math.floor(startX + dir.x * d);
      const centerY = Math.floor(startY + dir.y * d);
      const centerZ = Math.floor(startZ + dir.z * d);

      for (let u = -halfWidth; u <= halfWidth; u++) {
        for (let v = -halfWidth; v <= halfWidth; v++) {
          let bx = centerX;
          let by = centerY;
          let bz = centerZ;

          if (absY >= absX && absY >= absZ) {
            // Digging primarily Up/Down: expand along X and Z
            bx += u;
            bz += v;
          } else if (absX >= absZ) {
            // Digging primarily along X: expand along Y and Z
            by += u;
            bz += v;
          } else {
            // Digging primarily along Z: expand along X and Y
            bx += u;
            by += v;
          }

          if (by <= 0) continue; // Keep bedrock intact

          const type = this.getVoxel(bx, by, bz);
          if (type !== 'air' && type !== 'water') {
            this.setVoxel(bx, by, bz, 'air');
            brokenBlocks.push({ type });

            // Spawn particles for edge and random center blocks
            if (Math.random() < 0.35 || u === -halfWidth || u === halfWidth) {
              this.spawnBreakParticles(new THREE.Vector3(bx, by, bz), type);
            }
          }
        }
      }
    }

    return brokenBlocks;
  }

  public clearMobs() {
    this.mobMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
    });
    this.mobMeshes.clear();
    this.mobs = [];
  }

  // Explode Creeper with colossal shockwaves and massive 10-block crater destruction!
  private triggerCreeperExplosion(mob: MobEntity, mesh: THREE.Group, playerPos: THREE.Vector3): {
    damage: number;
    knockback: THREE.Vector3 | null;
  } {
    soundManager.playMegaBlast();

    const cx = Math.floor(mob.x);
    const cy = Math.floor(mob.y);
    const cz = Math.floor(mob.z);
    const centerVec = new THREE.Vector3(mob.x, mob.y + 0.5, mob.z);

    // 1. Colossal 10-Block Crater Destruction (Spherical/elliptical crater bowl)
    const radius = 10;
    const r2 = radius * radius;
    let destroyedCount = 0;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const distSq = dx * dx + dy * dy * 1.35 + dz * dz;
          if (distSq <= r2 + 1) {
            const bx = cx + dx;
            const by = cy + dy;
            const bz = cz + dz;
            if (by <= -4) continue; // Keep bedrock intact

            const blockType = this.getVoxel(bx, by, bz);
            if (blockType !== 'air' && blockType !== 'water' && blockType !== 'bedrock') {
              this.setVoxel(bx, by, bz, 'air', false);
              destroyedCount++;
              if (Math.random() < 0.12) {
                this.spawnBreakParticles(new THREE.Vector3(bx, by, bz), blockType);
              }
            }
          }
        }
      }
    }

    // Instantly rebuild terrain meshes so the giant crater is immediately carved
    if (destroyedCount > 0) {
      this.rebuildMeshes();
    }

    // 2. Massive Fiery Smoke, Sparks & Shockwave Particle Cloud (260+ particles)
    for (let i = 0; i < 265; i++) {
      const pScale = 0.35 + Math.random() * 0.45;
      const geo = new THREE.BoxGeometry(pScale, pScale, pScale);
      const randType = Math.random();
      const color =
        randType < 0.28
          ? 0xff1100 // deep magma flame
          : randType < 0.55
          ? 0xff9900 // blazing fire
          : randType < 0.75
          ? 0xffea00 // nuclear plasma yellow
          : randType < 0.88
          ? 0xffffff // white shockwave spark
          : 0x222222; // thick billowing smoke
      const mat = new THREE.MeshBasicMaterial({ color });
      const particle = new THREE.Mesh(geo, mat);
      particle.position.copy(centerVec);
      this.particleGroup.add(particle);

      const speed = 10 + Math.random() * 32;
      const phi = Math.random() * Math.PI * 2;
      const theta = (Math.random() - 0.25) * Math.PI;
      const vel = new THREE.Vector3(
        Math.cos(phi) * Math.cos(theta) * speed,
        Math.sin(theta) * speed + Math.random() * 9,
        Math.sin(phi) * Math.cos(theta) * speed
      );
      this.particles.push({
        mesh: particle,
        velocity: vel,
        life: 0,
        maxLife: 1.4 + Math.random() * 1.2,
      });
    }

    // 3. Expanding Glowing Shockwave Dome Ring
    try {
      const shockGeo = new THREE.SphereGeometry(1.5, 16, 16);
      const shockMat = new THREE.MeshBasicMaterial({
        color: 0xffbb44,
        transparent: true,
        opacity: 0.85,
        wireframe: true,
      });
      const shockMesh = new THREE.Mesh(shockGeo, shockMat);
      shockMesh.position.copy(centerVec);
      this.scene.add(shockMesh);

      let shockLife = 0;
      const animateShock = () => {
        shockLife += 0.04;
        const scale = 1.0 + shockLife * 24.0;
        shockMesh.scale.set(scale, scale * 0.8, scale);
        shockMat.opacity = Math.max(0, 0.85 * (1.0 - shockLife / 0.75));
        if (shockLife < 0.75) {
          requestAnimationFrame(animateShock);
        } else {
          this.scene.remove(shockMesh);
          shockGeo.dispose();
          shockMat.dispose();
        }
      };
      requestAnimationFrame(animateShock);
    } catch {
      // Fallback
    }

    // 4. Player Distance & Massive Seismic Knockback (Up to 24 blocks radius)
    const dist = Math.hypot(playerPos.x - mob.x, playerPos.y - mob.y, playerPos.z - mob.z);
    let damage = 0;
    let knockback: THREE.Vector3 | null = null;
    const blastRange = 24;

    if (dist < blastRange) {
      damage = Math.max(12, Math.floor((1 - dist / blastRange) * 85));
      const dir = new THREE.Vector3(
        playerPos.x - mob.x,
        playerPos.y - mob.y + 2.5,
        playerPos.z - mob.z
      ).normalize();
      knockback = dir.multiplyScalar(Math.max(18, (1 - dist / blastRange) * 48));
    }

    // Clean up creeper mesh
    this.scene.remove(mesh);
    this.mobMeshes.delete(mob.id);

    return { damage, knockback };
  }

  // Update World Loop
  public update(delta: number, playerPos: THREE.Vector3, timeSpeed = 1.0): WorldUpdateResult {
    let zombieAttacked = false;

    // Day-Night progression: Long Day (~85%), Short Night (~15%)
    const currentSunAngle = this.timeOfDay * Math.PI * 2 - Math.PI / 2;
    const currentSunHeight = Math.sin(currentSunAngle);
    // Day speed is 0.3x (very long enjoyable daytime), Night speed is 3.5x (brief swift night)
    const dayNightRate = currentSunHeight >= -0.1 ? 0.3 : 3.5;
    this.timeOfDay = (this.timeOfDay + (delta / this.dayLengthSeconds) * timeSpeed * dayNightRate) % 1.0;
    const sunAngle = this.timeOfDay * Math.PI * 2 - Math.PI / 2;

    // Sun & Moon Positions
    const sunDist = 70;
    this.sunMesh.position.set(
      playerPos.x + Math.cos(sunAngle) * sunDist,
      Math.sin(sunAngle) * sunDist,
      playerPos.z + 10
    );
    this.sunLight.position.copy(this.sunMesh.position);

    this.moonMesh.position.set(
      playerPos.x - Math.cos(sunAngle) * sunDist,
      -Math.sin(sunAngle) * sunDist,
      playerPos.z + 10
    );

    // Dynamic Sky and Lighting Color
    const isDay = Math.sin(sunAngle) > 0;
    const sunHeight = Math.sin(sunAngle);

    if (sunHeight > 0.2) {
      // Day
      this.scene.background = new THREE.Color(0x78a7ff);
      this.ambientLight.intensity = 0.65;
      this.sunLight.intensity = 1.2;
      this.sunLight.color.setHex(0xfffaed);
      this.starsGroup.visible = false;
    } else if (sunHeight > -0.1) {
      // Sunset / Sunrise
      this.scene.background = new THREE.Color(0xd4754b);
      this.ambientLight.intensity = 0.4;
      this.sunLight.intensity = 0.6;
      this.sunLight.color.setHex(0xffaa44);
      this.starsGroup.visible = true;
    } else {
      // Night
      this.scene.background = new THREE.Color(0x060814);
      this.ambientLight.intensity = 0.2;
      this.sunLight.intensity = 0.2;
      this.sunLight.color.setHex(0x94b4ff);
      this.starsGroup.visible = true;

      // Spawn Night Zombie
      if (Math.random() < 0.01) {
        this.spawnNightMobs(playerPos);
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;
      p.velocity.y -= 9.8 * delta; // Gravity
      p.mesh.position.addScaledVector(p.velocity, delta);

      if (p.life >= p.maxLife) {
        this.particleGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.particles.splice(i, 1);
      }
    }

    // Update Projectiles (Skeleton Arrows)
    let arrowHitPlayer = false;
    let arrowDamage = 0;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life += delta;
      p.vy -= 9.8 * delta * 0.4; // Arc gravity

      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;

      p.mesh.position.set(p.x, p.y, p.z);
      const velDir = new THREE.Vector3(p.vx, p.vy, p.vz).normalize();
      p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), velDir);

      // Hit player check (eye to feet box)
      const pDist = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);
      const pYDist = Math.abs(p.y - (playerPos.y + 0.8));

      if (pDist < 0.65 && pYDist < 1.0) {
        arrowHitPlayer = true;
        arrowDamage = 4;
        this.projectileGroup.remove(p.mesh);
        p.mesh.traverse((c: any) => {
          if (c.geometry) c.geometry.dispose();
        });
        this.projectiles.splice(i, 1);
        continue;
      }

      // Hit block terrain check
      const bx = Math.floor(p.x);
      const by = Math.floor(p.y);
      const bz = Math.floor(p.z);
      if (this.getVoxel(bx, by, bz) !== 'air' || p.life > 4.0) {
        this.projectileGroup.remove(p.mesh);
        p.mesh.traverse((c: any) => {
          if (c.geometry) c.geometry.dispose();
        });
        this.projectiles.splice(i, 1);
        continue;
      }
    }

    // 5. Update 3D World Item Drops (Physics, Bobbing, Magnet Pickup)
    const collectedDrops: { type: ItemType; count: number }[] = [];
    for (let i = this.worldDrops.length - 1; i >= 0; i--) {
      const drop = this.worldDrops[i];
      drop.life += delta;

      // Drop physics
      drop.vy -= 12 * delta;
      drop.x += drop.vx * delta;
      drop.y += drop.vy * delta;
      drop.z += drop.vz * delta;
      drop.vx *= 1 - delta * 2;
      drop.vz *= 1 - delta * 2;

      // Ground collision
      const groundY = Math.floor(drop.y);
      if (this.getVoxel(drop.x, groundY, drop.z) !== 'air') {
        drop.y = groundY + 1.1;
        drop.vy = 0;
      }

      // Bobbing & Rotation
      drop.mesh.position.set(drop.x, drop.y + Math.sin(drop.life * 4) * 0.05, drop.z);
      drop.mesh.rotation.y += delta * 2.5;

      // Player magnet vacuum (within 2.2m)
      const pDist = Math.hypot(playerPos.x - drop.x, playerPos.y + 0.5 - drop.y, playerPos.z - drop.z);
      if (pDist < 2.5) {
        const pullSpeed = (2.5 - pDist) * 7 * delta;
        drop.x += (playerPos.x - drop.x) * pullSpeed;
        drop.y += (playerPos.y + 0.5 - drop.y) * pullSpeed;
        drop.z += (playerPos.z - drop.z) * pullSpeed;

        if (pDist < 0.65) {
          // Collected!
          soundManager.playItemPop();
          collectedDrops.push({ type: drop.type, count: drop.count });
          this.worldDropGroup.remove(drop.mesh);
          drop.mesh.traverse((c: any) => {
            if (c.geometry) c.geometry.dispose();
          });
          this.worldDrops.splice(i, 1);
          continue;
        }
      }

      // Despawn after 120s
      if (drop.life > 120) {
        this.worldDropGroup.remove(drop.mesh);
        this.worldDrops.splice(i, 1);
      }
    }

    // 6. Update Mobs with Realistic Physics, AI, Kinematic Animation & Head Tracking
    let creeperExploded = false;
    let explosionDamage = 0;
    let explosionKnockback: THREE.Vector3 | null = null;
    let endermanAttacked = false;

    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i];
      const mesh = this.mobMeshes.get(mob.id);

      if (!mesh) continue;

      // A. Death Sequence Animation (Tilts sideways, poofs, drops loot)
      if (mob.isDead || mob.health <= 0) {
        if (!mob.isDead) {
          mob.isDead = true;
          mob.deathTimer = 0.45;
          soundManager.playMobDeath();
        }

        mob.deathTimer = (mob.deathTimer || 0.45) - delta;

        // Sideways topple rotation
        mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, Math.PI / 2, delta * 12);
        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, mob.y - 0.3, delta * 8);

        // Flash red during death
        mesh.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mat = (child as THREE.Mesh).material as THREE.MeshLambertMaterial;
            if (mat && mat.emissive) mat.emissive.setHex(0xaa0000);
          }
        });

        if (mob.deathTimer <= 0) {
          // Smoke poof particles
          for (let p = 0; p < 16; p++) {
            const pGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
            const pMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
            const pMesh = new THREE.Mesh(pGeo, pMat);
            pMesh.position.set(
              mob.x + (Math.random() - 0.5) * 0.6,
              mob.y + 0.5 + (Math.random() - 0.5) * 0.5,
              mob.z + (Math.random() - 0.5) * 0.6
            );
            this.particleGroup.add(pMesh);
            this.particles.push({
              mesh: pMesh,
              velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                Math.random() * 2.5 + 0.5,
                (Math.random() - 0.5) * 3
              ),
              life: 0,
              maxLife: 0.45,
            });
          }

          // Authentic Loot Drops
          const dropPos = new THREE.Vector3(mob.x, mob.y + 0.5, mob.z);
          if (mob.type === 'zombie') {
            this.spawnWorldDrop('rotten_flesh', dropPos, 1 + Math.floor(Math.random() * 2));
            if (Math.random() < 0.15) this.spawnWorldDrop('iron_ingot', dropPos, 1);
          } else if (mob.type === 'skeleton') {
            this.spawnWorldDrop('bone', dropPos, 1 + Math.floor(Math.random() * 2));
            this.spawnWorldDrop('arrow', dropPos, 1 + Math.floor(Math.random() * 3));
          } else if (mob.type === 'creeper') {
            this.spawnWorldDrop('gunpowder', dropPos, 1 + Math.floor(Math.random() * 2));
          } else if (mob.type === 'enderman') {
            this.spawnWorldDrop('ender_pearl', dropPos, 1);
          } else if (mob.type === 'pig') {
            this.spawnWorldDrop('raw_porkchop', dropPos, 1 + Math.floor(Math.random() * 2));
          } else if (mob.type === 'cow') {
            this.spawnWorldDrop('leather', dropPos, 1);
            this.spawnWorldDrop('raw_meat', dropPos, 1 + Math.floor(Math.random() * 2));
          } else if (mob.type === 'sheep') {
            this.spawnWorldDrop('wool', dropPos, 1 + Math.floor(Math.random() * 2));
          }

          this.scene.remove(mesh);
          this.mobMeshes.delete(mob.id);
          this.mobs.splice(i, 1);
        }
        continue;
      }

      // B. Daylight Burning for Undead (Zombies & Skeletons)
      if ((mob.type === 'zombie' || mob.type === 'skeleton') && sunHeight > 0.25) {
        const topBlockY = Math.floor(mob.y) + 2;
        if (this.getVoxel(mob.x, topBlockY, mob.z) === 'air') {
          mob.health -= delta * 4;
          mob.hurtTimer = 0.1;

          // Fire particles
          if (Math.random() < 0.3) {
            const fireGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const fireMat = new THREE.MeshBasicMaterial({ color: Math.random() < 0.5 ? 0xf97316 : 0xfacc15 });
            const fire = new THREE.Mesh(fireGeo, fireMat);
            fire.position.set(
              mob.x + (Math.random() - 0.5) * 0.4,
              mob.y + 1.2 + Math.random() * 0.5,
              mob.z + (Math.random() - 0.5) * 0.4
            );
            this.particleGroup.add(fire);
            this.particles.push({
              mesh: fire,
              velocity: new THREE.Vector3(0, 1.5 + Math.random(), 0),
              life: 0,
              maxLife: 0.3,
            });
          }
        }
      }

      const dx = playerPos.x - mob.x;
      const dy = playerPos.y - mob.y;
      const dz = playerPos.z - mob.z;
      const dist = Math.hypot(dx, dz);
      const totalDist = Math.hypot(dx, dy, dz);

      // C. Periodic Ambient Species Sounds (Distance Attenuation)
      mob.idleSoundTimer = (mob.idleSoundTimer || 5) - delta;
      if (mob.idleSoundTimer <= 0) {
        mob.idleSoundTimer = 4 + Math.random() * 6;
        if (dist < 18) {
          if (mob.type === 'zombie') soundManager.playZombieGroan();
          else if (mob.type === 'skeleton') soundManager.playSkeletonRattle();
          else if (mob.type === 'enderman') soundManager.playEndermanMurmur();
          else if (mob.type === 'pig') soundManager.playPigOink();
          else if (mob.type === 'cow') soundManager.playCowMoo();
          else if (mob.type === 'sheep') soundManager.playSheepBaa();
          else if (mob.type === 'villager') soundManager.playVillagerHrmm();
        }
      }

      // D. Velocity Physics & Step Traversal
      mob.vx = (mob.vx || 0) * (1 - delta * 5);
      mob.vz = (mob.vz || 0) * (1 - delta * 5);
      mob.vy = (mob.vy || 0) - 18 * delta;

      // Obstacle detection ahead for natural step-jumping
        const moveAngle = mob.rotation;
        const forwardX = mob.x + Math.sin(moveAngle) * 0.5;
        const forwardZ = mob.z + Math.cos(moveAngle) * 0.5;
        const kneeBlock = this.getVoxel(forwardX, Math.floor(mob.y), forwardZ);
        const headBlock = this.getVoxel(forwardX, Math.floor(mob.y) + 1, forwardZ);

        if (kneeBlock !== 'air' && kneeBlock !== 'water' && headBlock === 'air' && (mob.isGrounded || (mob.vy || 0) <= 0.1)) {
          mob.vy = 5.2; // Natural step hop!
          mob.isGrounded = false;
        }

        // Apply displacement
        mob.x += (mob.vx || 0) * delta;
        mob.y += (mob.vy || 0) * delta;
        mob.z += (mob.vz || 0) * delta;

        // Ground check
        const groundVoxelY = Math.floor(mob.y);
        if (this.getVoxel(mob.x, groundVoxelY, mob.z) !== 'air') {
          mob.y = groundVoxelY + 1;
          mob.vy = 0;
          mob.isGrounded = true;
        } else {
          mob.isGrounded = false;
        }

      // E. SPECIFIC AI BEHAVIORS

      // 1. CREEPER
      if (mob.type === 'creeper') {
        if (totalDist <= 3.6) {
          if (!mob.isFusing) {
            mob.isFusing = true;
            mob.fuseTimer = 0;
            soundManager.playCreeperHiss();
          }

          mob.fuseTimer = (mob.fuseTimer || 0) + delta;
          const fuseProgress = Math.min(1.0, mob.fuseTimer / 1.35);
          const flashFreq = 14 + fuseProgress * 30;
          const isFlash = Math.sin(mob.fuseTimer * flashFreq) > 0;
          // Colossal swelling boom anticipation: swells up to 3.5x original size!
          const swellScale = 1.0 + fuseProgress * 2.5 + (isFlash ? 0.35 : 0);
          mesh.scale.set(swellScale, swellScale, swellScale);

          // Trembling high-pressure vibration
          if (fuseProgress > 0.4) {
            mesh.position.x = mob.x + (Math.random() - 0.5) * 0.12 * fuseProgress;
            mesh.position.z = mob.z + (Math.random() - 0.5) * 0.12 * fuseProgress;
          }

          mesh.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mat = (child as THREE.Mesh).material as THREE.MeshLambertMaterial;
              if (mat && mat.emissive) mat.emissive.setHex(isFlash ? 0xffffff : 0x441111);
            }
          });

          if (mob.fuseTimer >= 1.35) {
            const expl = this.triggerCreeperExplosion(mob, mesh, playerPos);
            creeperExploded = true;
            explosionDamage = Math.max(explosionDamage, expl.damage);
            if (expl.knockback) explosionKnockback = expl.knockback;
            this.mobs.splice(i, 1);
            continue;
          }
        } else if (mob.isFusing && totalDist > 5.0) {
          mob.isFusing = false;
          mob.fuseTimer = 0;
          mesh.scale.set(1, 1, 1);
          mesh.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mat = (child as THREE.Mesh).material as THREE.MeshLambertMaterial;
              if (mat && mat.emissive) mat.emissive.setHex(0x000000);
            }
          });
        }

        if (!mob.isFusing && dist < 22 && dist > 1.2) {
          const speed = 2.1 * delta;
          mob.x += (dx / dist) * speed;
          mob.z += (dz / dist) * speed;
          mob.rotation = Math.atan2(dx, dz);
        }
      }

      // 2. SKELETON
      else if (mob.type === 'skeleton') {
        mob.shootCooldown = (mob.shootCooldown || 1.5) - delta;
        mob.rotation = Math.atan2(dx, dz);

        if (dist > 13 && dist < 22) {
          const speed = 1.7 * delta;
          mob.x += (dx / dist) * speed;
          mob.z += (dz / dist) * speed;
        } else if (dist < 6) {
          const speed = 1.5 * delta;
          mob.x -= (dx / dist) * speed;
          mob.z -= (dz / dist) * speed;
        }

        // Aim bow arm towards player
        if (mesh.userData.armR) {
          const pitch = Math.atan2(playerPos.y - (mob.y + 1.2), dist);
          mesh.userData.armR.rotation.x = Math.PI / 2.5 - pitch;
        }

        if (dist <= 18 && mob.shootCooldown <= 0) {
          mob.shootCooldown = 2.0 + Math.random() * 0.6;
          const arrowOrigin = new THREE.Vector3(mob.x, mob.y + 1.2, mob.z);
          const aimTarget = new THREE.Vector3(playerPos.x, playerPos.y + 0.8, playerPos.z);
          this.shootArrow(arrowOrigin, aimTarget);
        }
      }

      // 3. ENDERMAN
      else if (mob.type === 'enderman') {
        mob.teleportCooldown = (mob.teleportCooldown || 2.0) - delta;
        mob.rotation = Math.atan2(dx, dz);

        // Purple ender sparkles
        if (Math.random() < 0.28) {
          const sparkGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
          const sparkMat = new THREE.MeshBasicMaterial({ color: 0xd946ef });
          const spark = new THREE.Mesh(sparkGeo, sparkMat);
          spark.position.set(
            mob.x + (Math.random() - 0.5) * 0.6,
            mob.y + Math.random() * 2.8,
            mob.z + (Math.random() - 0.5) * 0.6
          );
          this.particleGroup.add(spark);
          this.particles.push({
            mesh: spark,
            velocity: new THREE.Vector3(0, Math.random() * 1.5 + 0.5, 0),
            life: 0,
            maxLife: 0.5,
          });
        }

        if (dist > 1.3 && dist < 24) {
          const speed = 2.6 * delta;
          mob.x += (dx / dist) * speed;
          mob.z += (dz / dist) * speed;
        } else if (dist <= 1.3) {
          endermanAttacked = true;
        }

        // Teleportation evasion
        if (dist < 20 && dist > 4 && mob.teleportCooldown <= 0 && Math.random() < 0.04) {
          mob.teleportCooldown = 4.0;
          soundManager.playTeleport();
          const tAngle = Math.random() * Math.PI * 2;
          const tDist = 2.5 + Math.random() * 2.0;
          mob.x = playerPos.x + Math.cos(tAngle) * tDist;
          mob.z = playerPos.z + Math.sin(tAngle) * tDist;
          mob.y = playerPos.y;
        }
      }

      // 4. PASSIVE MOBS (Pig, Cow, Sheep, Villager)
      else if (mob.type === 'pig' || mob.type === 'cow' || mob.type === 'sheep' || mob.type === 'villager') {
        mob.idleTimer = (mob.idleTimer || 3) - delta;

        if (mob.state === 'flee') {
          // Panicked sprint away from player!
          const fleeSpeed = 2.4 * delta;
          mob.rotation = Math.atan2(-dx, -dz);
          mob.x += Math.sin(mob.rotation) * fleeSpeed;
          mob.z += Math.cos(mob.rotation) * fleeSpeed;

          if (mob.idleTimer <= 0) {
            mob.state = 'idle';
            mob.idleTimer = 3 + Math.random() * 4;
          }
        } else {
          // Peaceful wander
          if (mob.idleTimer <= 0) {
            mob.idleTimer = 2.5 + Math.random() * 4.0;
            mob.wanderAngle = Math.random() * Math.PI * 2;
          }
          if (mob.wanderAngle !== undefined && Math.random() < 0.6) {
            mob.rotation = THREE.MathUtils.lerp(mob.rotation, mob.wanderAngle, delta * 3);
            const walkSpeed = 0.7 * delta;
            mob.x += Math.sin(mob.rotation) * walkSpeed;
            mob.z += Math.cos(mob.rotation) * walkSpeed;
          }
        }
      }

      // 5. ZOMBIE
      else {
        if (dist < 20 && dist > 1.1) {
          const speed = 1.85 * delta;
          mob.x += (dx / dist) * speed;
          mob.z += (dz / dist) * speed;
          mob.rotation = Math.atan2(dx, dz);
        } else if (dist <= 1.1) {
          zombieAttacked = true;
        }
      }

      // F. REALISTIC INDEPENDENT HEAD TRACKING TOWARDS PLAYER
      if (mesh.userData.head && dist < 16) {
        const headPivot = mesh.userData.head as THREE.Group;
        const targetHeadAngle = Math.atan2(dx, dz) - mob.rotation;
        const normalizedAngle = Math.atan2(Math.sin(targetHeadAngle), Math.cos(targetHeadAngle));
        const headYaw = THREE.MathUtils.clamp(normalizedAngle, -Math.PI / 3, Math.PI / 3);

        const eyeHeight = mob.type === 'enderman' ? 2.5 : mob.type === 'pig' || mob.type === 'cow' || mob.type === 'sheep' ? 0.7 : 1.5;
        const targetHeadPitch = Math.atan2((playerPos.y + 0.8) - (mob.y + eyeHeight), dist);
        const headPitch = THREE.MathUtils.clamp(-targetHeadPitch, -Math.PI / 4, Math.PI / 4);

        headPivot.rotation.y = THREE.MathUtils.lerp(headPivot.rotation.y, headYaw, delta * 8);
        headPivot.rotation.x = THREE.MathUtils.lerp(headPivot.rotation.x, headPitch, delta * 8);
      }

      // G. SMOOTH KINEMATIC LIMB SWING ANIMATIONS
      const isMoving = dist > 1.2 && dist < 22;
      const walkTime = Date.now() * 0.007;
      const swing = isMoving ? Math.sin(walkTime) * 0.55 : 0;

      if (mesh.userData.legL) mesh.userData.legL.rotation.x = swing;
      if (mesh.userData.legR) mesh.userData.legR.rotation.x = -swing;
      if (mesh.userData.legFL) mesh.userData.legFL.rotation.x = swing;
      if (mesh.userData.legFR) mesh.userData.legFR.rotation.x = -swing;
      if (mesh.userData.legBL) mesh.userData.legBL.rotation.x = -swing;
      if (mesh.userData.legBR) mesh.userData.legBR.rotation.x = swing;

      if (mob.type === 'zombie') {
        if (mesh.userData.armL) mesh.userData.armL.rotation.x = Math.PI / 2 + Math.sin(walkTime * 0.5) * 0.08;
        if (mesh.userData.armR) mesh.userData.armR.rotation.x = Math.PI / 2 - Math.sin(walkTime * 0.5) * 0.08;
      } else if (mob.type === 'enderman') {
        if (mesh.userData.armL) mesh.userData.armL.rotation.x = Math.PI / 4 + Math.sin(walkTime) * 0.1;
        if (mesh.userData.armR) mesh.userData.armR.rotation.x = Math.PI / 4 - Math.sin(walkTime) * 0.1;
      }

      // H. HURT VISUAL FLASH & RECOIL
      if (mob.hurtTimer && mob.hurtTimer > 0) {
        mob.hurtTimer -= delta;
        mesh.rotation.x = -0.25; // Pain tilt backward
        mesh.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mat = (child as THREE.Mesh).material as THREE.MeshLambertMaterial;
            if (mat && mat.emissive) mat.emissive.setHex(0xdd2222);
          }
        });
      } else {
        mesh.rotation.x = 0;
        if (!mob.isFusing) {
          mesh.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mat = (child as THREE.Mesh).material as THREE.MeshLambertMaterial;
              if (mat && mat.emissive) mat.emissive.setHex(0x000000);
            }
          });
        }
      }

      // I. UPDATE FLOATING HEALTH BAR
      if (mesh.userData.healthBar) {
        const hBar = mesh.userData.healthBar;
        const pct = Math.max(0, Math.min(1, mob.health / mob.maxHealth));
        if (hBar.userData.fill) {
          hBar.userData.fill.scale.x = pct;
          hBar.userData.fill.position.x = (pct - 1) * 0.265;
        }
        // Billboarding: face health bar to player camera
        hBar.rotation.y = -mob.rotation + Math.atan2(dx, dz);
        hBar.visible = pct < 1.0; // Only visible when damaged
      }

      mesh.position.set(mob.x, mob.y, mob.z);
      mesh.rotation.y = mob.rotation;
    }

    return {
      zombieAttacked,
      creeperExploded,
      explosionDamage,
      explosionKnockback,
      arrowHitPlayer,
      arrowDamage,
      endermanAttacked,
      collectedDrops,
    };
  }
}
