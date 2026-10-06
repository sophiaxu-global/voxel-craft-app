import * as THREE from 'three';
import { soundManager } from '../utils/audio';
import { VoxelWorld } from './VoxelWorld';

export type CoasterSectionType =
  | 'station'
  | 'lift'
  | 'crest'
  | 'giga_drop'
  | 'vertical_loop'
  | 'banked_helix'
  | 'airtime_hill'
  | 'water_splash'
  | 'glowing_tunnel'
  | 'corkscrew'
  | 'boost_track'
  | 'brakes';

export interface CoasterTrackNode {
  pos: THREE.Vector3;
  roll: number; // Banking angle in radians
  type: CoasterSectionType;
  targetSpeed?: number; // m/s for powered sections
  label: string;
}

export class RollercoasterTrack {
  public scene: THREE.Scene;
  public world: VoxelWorld;

  // Track Spline & Interpolator
  public curve!: THREE.CatmullRomCurve3;
  public totalLength: number = 0;
  public trackNodes: CoasterTrackNode[] = [];
  public samplePoints: {
    distance: number;
    pos: THREE.Vector3;
    tangent: THREE.Vector3;
    normal: THREE.Vector3;
    binormal: THREE.Vector3;
    roll: number;
    type: CoasterSectionType;
    label: string;
  }[] = [];

  // Track 3D Meshes
  public trackGroup = new THREE.Group();
  public supportGroup = new THREE.Group();
  public sleeperGroup = new THREE.Group();

  // Minecart 3D Model
  public cartGroup = new THREE.Group();
  public cartBodyMesh!: THREE.Mesh;
  public cartWheels: THREE.Mesh[] = [];
  public cartLight!: THREE.SpotLight;
  public cartLightTarget = new THREE.Object3D();

  // Ride State
  public isRiding: boolean = false;
  public trackDistance: number = 0;
  public currentSpeed: number = 0; // m/s
  public currentGForce: number = 1.0;
  public currentSection: string = 'Station Platform';
  public currentSectionType: CoasterSectionType = 'station';
  public perspective: 'first' | 'third' | 'cinematic' = 'first';

  // Audio / FX Timers
  private chainClickTimer: number = 0;
  private screechTimer: number = 0;
  private whooshTimer: number = 0;
  private sparkTimer: number = 0;

  // Particle System for Sparks & Wind
  public sparkParticles: {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    life: number;
  }[] = [];
  public sparkGroup = new THREE.Group();

  constructor(scene: THREE.Scene, world: VoxelWorld) {
    this.scene = scene;
    this.world = world;

    this.scene.add(this.trackGroup);
    this.scene.add(this.supportGroup);
    this.scene.add(this.sleeperGroup);
    this.scene.add(this.cartGroup);
    this.scene.add(this.sparkGroup);
    this.scene.add(this.cartLightTarget);

    this.buildMegaCoasterTrackNodes();
    this.bakeTrackSpline();
    this.buildTrackGeometry();
    this.buildMinecartModel();
  }

  // Define the Thunderbird Mega-Coaster circuit nodes
  private buildMegaCoasterTrackNodes() {
    this.trackNodes = [
      // 1. Station Platform & Dispatch
      { pos: new THREE.Vector3(0, 7, -10), roll: 0, type: 'station', targetSpeed: 4.0, label: 'Station Platform' },
      { pos: new THREE.Vector3(0, 7, -2), roll: 0, type: 'station', targetSpeed: 5.0, label: 'Station Launch' },

      // 2. Turn to Lift Hill
      { pos: new THREE.Vector3(3, 7.2, 5), roll: 0.15, type: 'boost_track', targetSpeed: 6.0, label: 'Turn to Lift' },
      { pos: new THREE.Vector3(8, 7.5, 9), roll: 0.2, type: 'lift', targetSpeed: 5.5, label: 'Lift Hill Approach' },
      { pos: new THREE.Vector3(14, 8.5, 9), roll: 0, type: 'lift', targetSpeed: 5.5, label: 'Chain Lift Hill' },

      // 3. Motorized Chain Lift (40 blocks soaring into sky!)
      { pos: new THREE.Vector3(20, 15, 9), roll: 0, type: 'lift', targetSpeed: 5.5, label: 'Ascending 40m Summit' },
      { pos: new THREE.Vector3(26, 23, 9), roll: 0, type: 'lift', targetSpeed: 5.5, label: 'Ascending 40m Summit' },
      { pos: new THREE.Vector3(32, 31, 9), roll: 0, type: 'lift', targetSpeed: 5.5, label: 'Ascending 40m Summit' },
      { pos: new THREE.Vector3(38, 39, 9), roll: 0, type: 'lift', targetSpeed: 5.5, label: 'Ascending 40m Summit' },

      // 4. Crest & Summit Panorama
      { pos: new THREE.Vector3(43, 42, 9), roll: 0, type: 'crest', targetSpeed: 6.5, label: 'Summit Crest' },
      { pos: new THREE.Vector3(46, 41.5, 7), roll: 0.15, type: 'crest', targetSpeed: 8.0, label: 'Pre-Drop Dive Dip' },
      { pos: new THREE.Vector3(47, 40, 2), roll: 0.35, type: 'crest', targetSpeed: 10.0, label: 'Giga Drop Crest' },

      // 5. 85-Degree Giga-Drop into Ravine (Plummeting 40m down!)
      { pos: new THREE.Vector3(46, 32, -6), roll: 0.2, type: 'giga_drop', label: '85° Vertical Giga-Drop' },
      { pos: new THREE.Vector3(43, 20, -14), roll: 0.1, type: 'giga_drop', label: '85° Vertical Giga-Drop' },
      { pos: new THREE.Vector3(39, 8, -20), roll: 0.05, type: 'giga_drop', label: 'Canyon Bottom Pullout' },
      { pos: new THREE.Vector3(33, 3.5, -23), roll: 0, type: 'giga_drop', label: 'Max Speed Valley Dive' },

      // 6. 360-Degree Inverted Vertical Loop
      { pos: new THREE.Vector3(26, 4.5, -23), roll: 0, type: 'vertical_loop', label: 'Vertical Loop Entry' },
      { pos: new THREE.Vector3(20, 12, -23), roll: Math.PI * 0.45, type: 'vertical_loop', label: 'Loop Inversion Climb' },
      { pos: new THREE.Vector3(15, 20, -23), roll: Math.PI, type: 'vertical_loop', label: '360° Loop Inverted Apex' },
      { pos: new THREE.Vector3(10, 12, -23), roll: Math.PI * 1.55, type: 'vertical_loop', label: 'Loop Exit Dive' },
      { pos: new THREE.Vector3(5, 4.5, -23), roll: Math.PI * 2, type: 'vertical_loop', label: 'Loop Valley Exit' },

      // 7. High-G Banked Helix & Canyon Overbank Turn
      { pos: new THREE.Vector3(-3, 6, -21), roll: -0.65, type: 'banked_helix', label: 'Banked Overbank Turn' },
      { pos: new THREE.Vector3(-12, 10, -16), roll: -0.85, type: 'banked_helix', label: 'High-G Banked Helix' },
      { pos: new THREE.Vector3(-18, 14, -8), roll: -0.75, type: 'banked_helix', label: 'High-G Banked Helix' },
      { pos: new THREE.Vector3(-20, 12, 1), roll: -0.5, type: 'banked_helix', label: 'Helix Exit' },

      // 8. Camelback Airtime Hill #1
      { pos: new THREE.Vector3(-19, 16, 9), roll: 0, type: 'airtime_hill', label: 'Camelback Airtime Hill' },
      { pos: new THREE.Vector3(-16, 20, 16), roll: 0, type: 'airtime_hill', label: '0.2G Floating Airtime' },
      { pos: new THREE.Vector3(-12, 14, 21), roll: 0.15, type: 'airtime_hill', label: 'Hill Dive' },

      // 9. Water Splashdown Trench
      { pos: new THREE.Vector3(-6, 4.2, 23), roll: 0, type: 'water_splash', label: 'Lake Splashdown Trench' },
      { pos: new THREE.Vector3(2, 3.8, 23), roll: 0, type: 'water_splash', label: 'Water Spray Wave' },
      { pos: new THREE.Vector3(10, 4.2, 21), roll: -0.2, type: 'water_splash', label: 'Splashdown Exit' },

      // 10. Underground Glowing Cavern Tunnel
      { pos: new THREE.Vector3(16, 3.5, 17), roll: -0.3, type: 'glowing_tunnel', label: 'Cavern Tunnel Dive' },
      { pos: new THREE.Vector3(18, 2.5, 10), roll: -0.4, type: 'glowing_tunnel', label: 'Neon Tunnel Rings' },
      { pos: new THREE.Vector3(18, 2.8, 1), roll: -0.2, type: 'glowing_tunnel', label: 'Underground Tunnel' },
      { pos: new THREE.Vector3(16, 3.8, -7), roll: 0, type: 'glowing_tunnel', label: 'Tunnel Daylight Eruption' },

      // 11. High-Speed Banked Corkscrew
      { pos: new THREE.Vector3(12, 8, -14), roll: Math.PI * 0.7, type: 'corkscrew', label: 'Zero-G Corkscrew' },
      { pos: new THREE.Vector3(7, 11, -18), roll: Math.PI * 1.3, type: 'corkscrew', label: 'Corkscrew Apex Roll' },
      { pos: new THREE.Vector3(0, 8, -20), roll: Math.PI * 2, type: 'corkscrew', label: 'Corkscrew Recovery' },

      // 12. Camelback Airtime Hill #2 & Powered Boost
      { pos: new THREE.Vector3(-7, 10, -18), roll: -0.2, type: 'boost_track', targetSpeed: 20.0, label: 'Magnetic Booster' },
      { pos: new THREE.Vector3(-14, 12, -14), roll: -0.35, type: 'airtime_hill', label: 'Bunny Hop Airtime' },
      { pos: new THREE.Vector3(-16, 9, -8), roll: -0.2, type: 'airtime_hill', label: 'Final Turn Approach' },

      // 13. Station Return Turn & Magnetic Brakes
      { pos: new THREE.Vector3(-14, 7.5, -2), roll: -0.1, type: 'brakes', targetSpeed: 6.0, label: 'Magnetic Brake Zone' },
      { pos: new THREE.Vector3(-8, 7.2, -6), roll: 0, type: 'brakes', targetSpeed: 4.5, label: 'Smooth Deceleration' },
      { pos: new THREE.Vector3(-4, 7.0, -9), roll: 0, type: 'station', targetSpeed: 4.0, label: 'Approaching Station' },
    ];
  }

  // Bake Catmull-Rom Spline and sample points
  private bakeTrackSpline() {
    const rawPoints = this.trackNodes.map((n) => n.pos);
    this.curve = new THREE.CatmullRomCurve3(rawPoints, true, 'catmullrom', 0.25);
    this.totalLength = this.curve.getLength();

    // Sample 300 points along track for ultra-precise physics and meshes
    const numSamples = 300;
    this.samplePoints = [];

    for (let i = 0; i <= numSamples; i++) {
      const u = i / numSamples;
      const distance = u * this.totalLength;
      const pos = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u).normalize();

      // Find closest node to interpolate roll and type
      let nearestNodeIdx = 0;
      let minDist = Infinity;
      this.trackNodes.forEach((node, nIdx) => {
        const d = node.pos.distanceTo(pos);
        if (d < minDist) {
          minDist = d;
          nearestNodeIdx = nIdx;
        }
      });

      const node = this.trackNodes[nearestNodeIdx];
      const roll = node.roll;

      // Compute track normal and binormal
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
      if (right.lengthSq() < 0.001) {
        right.set(1, 0, 0);
      }
      const normal = new THREE.Vector3().crossVectors(right, tangent).normalize();

      // Apply banking roll to right and normal
      const rotatedRight = right.clone().applyAxisAngle(tangent, roll);
      const rotatedNormal = normal.clone().applyAxisAngle(tangent, roll);

      this.samplePoints.push({
        distance,
        pos,
        tangent,
        normal: rotatedNormal,
        binormal: rotatedRight,
        roll,
        type: node.type,
        label: node.label,
      });
    }
  }

  // Construct 3D Visual Rails, Sleepers, Power Strips, and Support Pillars
  private buildTrackGeometry() {
    // 1. Dual Continuous Steel Tubular Rails
    const railRadius = 0.08;
    const railOffset = 0.42; // Distance from track center to left/right rail

    const leftRailPoints: THREE.Vector3[] = [];
    const rightRailPoints: THREE.Vector3[] = [];

    for (const sample of this.samplePoints) {
      const leftPos = sample.pos.clone().addScaledVector(sample.binormal, -railOffset);
      const rightPos = sample.pos.clone().addScaledVector(sample.binormal, railOffset);
      leftRailPoints.push(leftPos);
      rightRailPoints.push(rightPos);
    }

    const leftRailCurve = new THREE.CatmullRomCurve3(leftRailPoints, true);
    const rightRailCurve = new THREE.CatmullRomCurve3(rightRailPoints, true);

    const railGeoLeft = new THREE.TubeGeometry(leftRailCurve, 280, railRadius, 8, true);
    const railGeoRight = new THREE.TubeGeometry(rightRailCurve, 280, railRadius, 8, true);

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.85,
      roughness: 0.25,
    });

    const leftRailMesh = new THREE.Mesh(railGeoLeft, steelMat);
    const rightRailMesh = new THREE.Mesh(railGeoRight, steelMat);
    leftRailMesh.castShadow = true;
    rightRailMesh.castShadow = true;

    this.trackGroup.add(leftRailMesh);
    this.trackGroup.add(rightRailMesh);

    // 2. Track Sleepers / Cross-Ties along track (every 1.0 unit)
    const sleeperGeo = new THREE.BoxGeometry(1.05, 0.12, 0.22);
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x5a3d28,
      roughness: 0.8,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.8,
      roughness: 0.3,
      emissive: 0x78350f,
    });
    const brakeMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.5,
      roughness: 0.4,
      emissive: 0x450a0a,
    });

    for (let i = 0; i < this.samplePoints.length; i += 2) {
      const sample = this.samplePoints[i];
      let mat: THREE.MeshStandardMaterial = woodMat;
      if (sample.type === 'boost_track') mat = goldMat;
      if (sample.type === 'brakes' || sample.type === 'station') mat = brakeMat;

      const sleeperMesh = new THREE.Mesh(sleeperGeo, mat);
      sleeperMesh.position.copy(sample.pos);

      // Orient sleeper to track orientation
      const m = new THREE.Matrix4();
      m.makeBasis(sample.binormal, sample.normal, sample.tangent);
      sleeperMesh.rotation.setFromRotationMatrix(m);
      sleeperMesh.castShadow = true;

      this.sleeperGroup.add(sleeperMesh);

      // 3. Support Trestle Pillars to Ground (every 8 units, where height > 4)
      if (i % 6 === 0 && sample.pos.y > 4.5 && sample.type !== 'vertical_loop') {
        const groundY = Math.max(0, this.world.getHighestSolidVoxel(Math.round(sample.pos.x), Math.round(sample.pos.z)) + 1);
        const pillarHeight = sample.pos.y - groundY;

        if (pillarHeight > 1.0) {
          const pillarGeo = new THREE.CylinderGeometry(0.18, 0.22, pillarHeight, 8);
          const pillarMat = new THREE.MeshStandardMaterial({
            color: sample.pos.y > 25 ? 0xd97706 : 0x475569, // Yellow-gold top tower supports
            metalness: 0.6,
            roughness: 0.4,
          });
          const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
          pillarMesh.position.set(sample.pos.x, groundY + pillarHeight / 2, sample.pos.z);
          pillarMesh.castShadow = true;
          this.supportGroup.add(pillarMesh);
        }
      }
    }
  }

  // Detailed 3D Retro Voxel Minecart
  private buildMinecartModel() {
    this.cartGroup.name = 'MinecartVehicle';

    // 1. Chassis Base & Plating
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      metalness: 0.8,
      roughness: 0.3,
    });
    const seatMat = new THREE.MeshLambertMaterial({ color: 0x991b1b }); // Crimson leather seat

    // Outer cart box with hollow top
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.15, 1.2), bodyMat);
    baseMesh.position.y = 0.2;
    this.cartGroup.add(baseMesh);

    // Side Walls
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 1.2), bodyMat);
    wallL.position.set(-0.37, 0.45, 0);
    const wallR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 1.2), bodyMat);
    wallR.position.set(0.37, 0.45, 0);
    const wallF = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.45, 0.08), bodyMat);
    wallF.position.set(0, 0.45, 0.56);
    const wallB = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.45, 0.08), bodyMat);
    wallB.position.set(0, 0.45, -0.56);

    this.cartGroup.add(wallL, wallR, wallF, wallB);

    // Seat
    const seatMesh = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.25, 0.45), seatMat);
    seatMesh.position.set(0, 0.35, -0.2);
    this.cartGroup.add(seatMesh);

    // 2. 4 Flanged Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x71717a, metalness: 0.9, roughness: 0.2 });

    const wheelOffsets = [
      { x: -0.42, z: 0.35 },
      { x: 0.42, z: 0.35 },
      { x: -0.42, z: -0.35 },
      { x: 0.42, z: -0.35 },
    ];

    this.cartWheels = [];
    for (const offset of wheelOffsets) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(offset.x, 0.12, offset.z);
      this.cartGroup.add(wheel);
      this.cartWheels.push(wheel);
    }

    // 3. High-Intensity Front Beam Headlight
    const lightBulb = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.15, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    lightBulb.position.set(0, 0.5, 0.62);
    this.cartGroup.add(lightBulb);

    this.cartLight = new THREE.SpotLight(0xfffbeb, 2.5, 35, Math.PI / 4, 0.5, 1.2);
    this.cartLight.position.set(0, 0.5, 0.65);
    this.cartLight.target = this.cartLightTarget;
    this.cartGroup.add(this.cartLight);

    // Initial cart placement on station
    this.updateCartPlacement(0);
  }

  // Get track state at a specific continuous distance along circuit
  public getTrackStateAt(dist: number) {
    const wrappedDist = ((dist % this.totalLength) + this.totalLength) % this.totalLength;
    const u = wrappedDist / this.totalLength;

    const pos = this.curve.getPointAt(u);
    const tangent = this.curve.getTangentAt(u).normalize();

    // Approximate closest sample for normal, binormal, roll, and section metadata
    const sampleIdx = Math.floor(u * (this.samplePoints.length - 1));
    const sample = this.samplePoints[sampleIdx] || this.samplePoints[0];

    return {
      pos,
      tangent,
      normal: sample.normal,
      binormal: sample.binormal,
      roll: sample.roll,
      type: sample.type,
      label: sample.label,
    };
  }

  // Update Minecart 3D transform along track
  public updateCartPlacement(dist: number) {
    const state = this.getTrackStateAt(dist);
    this.cartGroup.position.copy(state.pos);

    // Compute rotation matrix from track frame
    const m = new THREE.Matrix4();
    m.makeBasis(state.binormal, state.normal, state.tangent);
    this.cartGroup.rotation.setFromRotationMatrix(m);

    // Target headlight forward along tangent
    this.cartLightTarget.position.copy(state.pos).addScaledVector(state.tangent, 15);

    // Spin wheels according to speed
    const wheelSpin = (this.currentSpeed * 0.1) % (Math.PI * 2);
    for (const wheel of this.cartWheels) {
      wheel.rotation.x = wheelSpin;
    }
  }

  // Board or Dismount Rollercoaster
  public boardCoaster() {
    this.isRiding = true;
    if (this.currentSpeed < 3.0) {
      this.currentSpeed = 5.0; // Initial gentle push from station
    }
    soundManager.playVictory();
  }

  public dismountCoaster() {
    this.isRiding = false;
    soundManager.playStep();
  }

  // Trigger Horn / Whistle
  public triggerHorn() {
    soundManager.playCoasterHorn();
  }

  // Emit High-Speed Sparks from Wheels
  public emitSparks(count: number = 3) {
    const state = this.getTrackStateAt(this.trackDistance);
    const sparkGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(sparkGeo, sparkMat);
      const offset = (Math.random() - 0.5) * 0.8;
      mesh.position.copy(state.pos).addScaledVector(state.binormal, offset);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4 - state.tangent.x * 3,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 4 - state.tangent.z * 3
      );

      this.sparkGroup.add(mesh);
      this.sparkParticles.push({
        mesh,
        velocity,
        life: 0.35 + Math.random() * 0.25,
      });
    }
  }

  // Main Simulation Step
  public update(
    delta: number,
    keys: Record<string, boolean>,
    camera: THREE.PerspectiveCamera
  ): {
    speedKmh: number;
    gForce: number;
    altitude: number;
    sectionName: string;
    isBoosting: boolean;
    isBraking: boolean;
  } {
    // 1. Query current track section
    const state = this.getTrackStateAt(this.trackDistance);
    this.currentSection = state.label;
    this.currentSectionType = state.type;

    // 2. Physics & Acceleration Calculations
    const gravity = 9.81;
    // Downward slope angle: negative tangent.y means diving down
    const slope = -state.tangent.y;

    // Check user inputs (Boost / Brake)
    const isBoosting =
      keys['KeyW'] ||
      keys['w'] ||
      keys['W'] ||
      keys['ArrowUp'] ||
      keys['ShiftLeft'] ||
      keys['ShiftRight'];
    const isBraking =
      keys['KeyS'] ||
      keys['s'] ||
      keys['S'] ||
      keys['ArrowDown'] ||
      keys['KeyC'] ||
      keys['c'];

    // Base acceleration from gravity slope
    let accel = gravity * slope * 2.6;

    // Friction & Air Drag
    const friction = 0.08 + 0.0008 * (this.currentSpeed * this.currentSpeed);
    accel -= friction;

    // Special Section Mechanics:
    if (state.type === 'lift') {
      // Motorized chain lift: locked steady climb
      const targetLiftSpeed = 4.8;
      this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, targetLiftSpeed, delta * 4);
      accel = 0;

      // Ratchet clicking sound
      this.chainClickTimer += delta;
      if (this.chainClickTimer >= 0.16) {
        this.chainClickTimer = 0;
        if (this.isRiding) {
          soundManager.playCoasterChainClick();
        }
      }
    } else if (state.type === 'boost_track') {
      // Magnetic booster rail: catapult acceleration!
      accel += 28.0;
      if (Math.random() < 0.2) {
        soundManager.playCoasterBoost();
        this.emitSparks(2);
      }
    } else if (state.type === 'brakes' || state.type === 'station') {
      // Station magnetic brakes
      const targetBrakeSpeed = 3.5;
      this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, targetBrakeSpeed, delta * 3.5);
      if (this.currentSpeed > 5.0 && Math.random() < 0.15) {
        soundManager.playCoasterBrake();
        this.emitSparks(3);
      }
    }

    // Player Boost / Brake controls
    if (isBoosting) {
      accel += 12.0;
      if (Math.random() < 0.15) this.emitSparks(1);
    }
    if (isBraking) {
      accel -= 22.0;
      this.emitSparks(2);
    }

    // Integrate speed
    this.currentSpeed += accel * delta;
    this.currentSpeed = Math.max(2.5, Math.min(32.0, this.currentSpeed)); // 9 km/h to 115 km/h

    // 3. Move along track
    this.trackDistance = (this.trackDistance + this.currentSpeed * delta) % this.totalLength;
    this.updateCartPlacement(this.trackDistance);

    // 4. Calculate G-Force for telemetry
    const speedKmh = Math.round(this.currentSpeed * 3.6);
    // Vertical G-force based on vertical curvature and gravity
    const verticalG = 1.0 + (slope < -0.3 ? -0.8 : slope > 0.4 ? 1.8 : 0.0) + (this.currentSpeed / 30.0) * (state.type === 'vertical_loop' ? 2.5 : 0.5);
    this.currentGForce = Math.round(Math.max(0.1, verticalG) * 10) / 10;

    // 5. Audio FX triggers during ride
    if (this.isRiding) {
      // Wind rush on steep drops
      if (speedKmh > 55) {
        this.whooshTimer += delta;
        if (this.whooshTimer >= 0.45) {
          this.whooshTimer = 0;
          soundManager.playCoasterWhoosh();
        }
      }

      // Rail screech on sharp banked curves / loops
      if (Math.abs(state.roll) > 0.5 && speedKmh > 40) {
        this.screechTimer += delta;
        if (this.screechTimer >= 0.35) {
          this.screechTimer = 0;
          soundManager.playCoasterRailScreech();
          this.emitSparks(2);
        }
      }
    }

    // 6. Update Sparks Particles
    for (let i = this.sparkParticles.length - 1; i >= 0; i--) {
      const p = this.sparkParticles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.sparkGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.sparkParticles.splice(i, 1);
      } else {
        p.mesh.position.addScaledVector(p.velocity, delta);
        p.velocity.y -= 12 * delta; // Gravity on sparks
      }
    }

    // 7. Update Camera for Rider
    if (this.isRiding) {
      const cartPos = state.pos;
      const fwd = state.tangent;
      const up = state.normal;
      const right = state.binormal;

      if (this.perspective === 'first') {
        // Cockpit view inside the front seat with authentic banking roll & pitch
        const headPos = cartPos.clone().addScaledVector(up, 0.75).addScaledVector(fwd, 0.15);
        camera.position.copy(headPos);

        const lookTarget = headPos.clone().addScaledVector(fwd, 10).addScaledVector(up, -0.2);
        camera.lookAt(lookTarget);
        camera.up.copy(up);

        // Dynamic FOV rush effect during steep drops
        const targetFov = 75 + (speedKmh > 50 ? (speedKmh - 50) * 0.35 : 0);
        camera.fov = THREE.MathUtils.lerp(camera.fov, Math.min(95, targetFov), delta * 5);
        camera.updateProjectionMatrix();
      } else if (this.perspective === 'third') {
        // Third-person chase cam directly behind and above the minecart
        const camPos = cartPos.clone().addScaledVector(fwd, -4.2).addScaledVector(up, 2.2);
        camera.position.copy(camPos);
        camera.lookAt(cartPos.clone().addScaledVector(fwd, 2.5));
        camera.up.copy(up);
      } else {
        // Cinematic spectator flyby
        const camPos = cartPos.clone().addScaledVector(right, 7.0).addScaledVector(up, 3.5);
        camera.position.copy(camPos);
        camera.lookAt(cartPos);
      }
    }

    return {
      speedKmh,
      gForce: this.currentGForce,
      altitude: Math.round(state.pos.y),
      sectionName: this.currentSection,
      isBoosting,
      isBraking,
    };
  }
}
