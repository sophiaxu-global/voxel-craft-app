import * as THREE from 'three';
import { BlockType, MinecartEntity } from '../types';
import { soundManager } from '../utils/audio';
import { VoxelWorld } from './VoxelWorld';

interface RailNeighbor {
  x: number;
  y: number;
  z: number;
  dx: number;
  dz: number;
  slope: number; // 1 = slope up, 0 = flat, -1 = slope down
}

export class MinecraftRailSystem {
  public scene: THREE.Scene;
  public world: VoxelWorld;
  public minecarts: MinecartEntity[] = [];
  public ridingCartId: string | null = null;
  public isAutoCruise: boolean = false;

  private rollSoundTimer: number = 0;
  private boostSoundTimer: number = 0;

  constructor(scene: THREE.Scene, world: VoxelWorld) {
    this.scene = scene;
    this.world = world;
  }

  // Create an authentic 3D Shinkansen High-Speed Bullet Train Consist (Lead Engine + Trailing Coach)
  public createMinecartMesh(): THREE.Group {
    const group = new THREE.Group();

    // High-fidelity Aerodynamic Shinkansen Materials
    const bodyMat = new THREE.MeshLambertMaterial({
      color: 0xf8fafc, // Shinkansen Pearlescent Aerodynamic White
    });
    const stripeBlueMat = new THREE.MeshLambertMaterial({
      color: 0x0284c7, // Signature Shinkansen Electric Blue Racing Stripe
    });
    const stripeCyanMat = new THREE.MeshLambertMaterial({
      color: 0x38bdf8, // High-speed Cyan accent pinstripe
    });
    const cockpitGlassMat = new THREE.MeshLambertMaterial({
      color: 0x0f172a, // Dark aerodynamic tinted cockpit canopy glass
    });
    const headlightMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe, // High-intensity Xenon/LED Headlight glow
    });
    const taillightMat = new THREE.MeshBasicMaterial({
      color: 0xef4444, // Red LED tail markers
    });
    const interiorMat = new THREE.MeshLambertMaterial({
      color: 0x1e293b, // Dark cockpit interior
    });
    const seatMat = new THREE.MeshLambertMaterial({
      color: 0x334155, // Ergonomic high-speed pilot seat
    });
    const windowMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a, // Illuminated warm cabin passenger windows
    });
    const bogieMat = new THREE.MeshLambertMaterial({
      color: 0x334155, // Undercarriage bogie steel
    });
    const wheelMat = new THREE.MeshLambertMaterial({
      color: 0x1e293b, // High-speed steel rail wheels
    });
    const gangwayMat = new THREE.MeshLambertMaterial({
      color: 0x18181b, // Flexible rubber accordion vestibule coupler
    });

    // =========================================================================
    // CAR 1: LEAD BULLET LOCOMOTIVE (Front Lead Car, Z = -0.7 to +1.2)
    // =========================================================================

    // 1. Bottom floor plate & aerodynamic underbody
    const floorGeo = new THREE.BoxGeometry(0.82, 0.08, 1.4);
    const floorMesh = new THREE.Mesh(floorGeo, interiorMat);
    floorMesh.position.set(0, 0.12, 0);
    floorMesh.castShadow = true;
    group.add(floorMesh);

    // 2. Main Aerodynamic Cabin Walls (Flanks)
    const sideWallGeo = new THREE.BoxGeometry(0.06, 0.46, 1.35);
    const leftWall = new THREE.Mesh(sideWallGeo, bodyMat);
    leftWall.position.set(0.39, 0.32, 0);
    leftWall.castShadow = true;
    group.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeo, bodyMat);
    rightWall.position.set(-0.39, 0.32, 0);
    rightWall.castShadow = true;
    group.add(rightWall);

    // Electric Blue & Cyan Speed Stripes on both sides
    const stripeBlueGeo = new THREE.BoxGeometry(0.065, 0.07, 1.36);
    const leftStripeBlue = new THREE.Mesh(stripeBlueGeo, stripeBlueMat);
    leftStripeBlue.position.set(0.392, 0.26, 0);
    group.add(leftStripeBlue);

    const rightStripeBlue = new THREE.Mesh(stripeBlueGeo, stripeBlueMat);
    rightStripeBlue.position.set(-0.392, 0.26, 0);
    group.add(rightStripeBlue);

    const stripeCyanGeo = new THREE.BoxGeometry(0.065, 0.03, 1.36);
    const leftStripeCyan = new THREE.Mesh(stripeCyanGeo, stripeCyanMat);
    leftStripeCyan.position.set(0.392, 0.21, 0);
    group.add(leftStripeCyan);

    const rightStripeCyan = new THREE.Mesh(stripeCyanGeo, stripeCyanMat);
    rightStripeCyan.position.set(-0.392, 0.21, 0);
    group.add(rightStripeCyan);

    // Illuminated Passenger Windows along sides
    for (const wz of [-0.35, -0.1, 0.15]) {
      const winGeo = new THREE.BoxGeometry(0.07, 0.1, 0.16);
      const lWin = new THREE.Mesh(winGeo, windowMat);
      lWin.position.set(0.392, 0.38, wz);
      group.add(lWin);

      const rWin = new THREE.Mesh(winGeo, windowMat);
      rWin.position.set(-0.392, 0.38, wz);
      group.add(rWin);
    }

    // 3. FRONT: Signature Aerodynamic Bullet / Duckbill Nose (+Z forward)
    const noseBaseGeo = new THREE.BoxGeometry(0.8, 0.36, 0.48);
    const noseBase = new THREE.Mesh(noseBaseGeo, bodyMat);
    noseBase.position.set(0, 0.28, 0.82);
    noseBase.rotation.x = -0.24; // Aerodynamic downward slope
    noseBase.castShadow = true;
    group.add(noseBase);

    // Extreme Needle Wedge Nose Tip
    const tipGeo = new THREE.BoxGeometry(0.72, 0.18, 0.3);
    const tipMesh = new THREE.Mesh(tipGeo, bodyMat);
    tipMesh.position.set(0, 0.16, 1.12);
    tipMesh.rotation.x = -0.16;
    group.add(tipMesh);

    // Front Slanted Cockpit Windshield
    const windshieldGeo = new THREE.BoxGeometry(0.74, 0.2, 0.32);
    const windshield = new THREE.Mesh(windshieldGeo, cockpitGlassMat);
    windshield.position.set(0, 0.44, 0.65);
    windshield.rotation.x = -0.48;
    group.add(windshield);

    // Dual High-Intensity LED Headlights at Nose Tip
    const headlightGeo = new THREE.BoxGeometry(0.12, 0.06, 0.05);
    const leftHeadlight = new THREE.Mesh(headlightGeo, headlightMat);
    leftHeadlight.position.set(0.24, 0.18, 1.25);
    group.add(leftHeadlight);

    const rightHeadlight = new THREE.Mesh(headlightGeo, headlightMat);
    rightHeadlight.position.set(-0.24, 0.18, 1.25);
    group.add(rightHeadlight);

    // High-Intensity Forward Headlight Beam illuminating track ahead
    const headBeam = new THREE.PointLight(0xe0f2fe, 1.6, 26);
    headBeam.position.set(0, 0.35, 1.3);
    group.add(headBeam);

    // 4. ROOF & Aerodynamic Fin / High-Speed Pantograph
    const roofGeo = new THREE.BoxGeometry(0.78, 0.06, 1.15);
    const roofMesh = new THREE.Mesh(roofGeo, bodyMat);
    roofMesh.position.set(0, 0.55, -0.05);
    group.add(roofMesh);

    // High-Voltage Shinkansen Pantograph / Speed Stabilizer Fin
    const finGeo = new THREE.BoxGeometry(0.04, 0.14, 0.28);
    const finMesh = new THREE.Mesh(finGeo, stripeBlueMat);
    finMesh.position.set(0, 0.64, -0.35);
    group.add(finMesh);

    const armGeo = new THREE.BoxGeometry(0.26, 0.03, 0.04);
    const armMesh = new THREE.Mesh(armGeo, stripeCyanMat);
    armMesh.position.set(0, 0.7, -0.35);
    group.add(armMesh);

    // 5. Cockpit Pilot Seat (Center) & Instrument Console
    const seatGeo = new THREE.BoxGeometry(0.44, 0.28, 0.38);
    const seatMesh = new THREE.Mesh(seatGeo, seatMat);
    seatMesh.position.set(0, 0.26, -0.05);
    group.add(seatMesh);

    const headrestGeo = new THREE.BoxGeometry(0.36, 0.22, 0.1);
    const headrestMesh = new THREE.Mesh(headrestGeo, stripeBlueMat);
    headrestMesh.position.set(0, 0.44, -0.2);
    group.add(headrestMesh);

    // Instrument Console
    const dashGeo = new THREE.BoxGeometry(0.5, 0.16, 0.18);
    const dashMesh = new THREE.Mesh(dashGeo, interiorMat);
    dashMesh.position.set(0, 0.3, 0.35);
    group.add(dashMesh);

    // 6. Undercarriage Skirts & High-Speed Bogies with Steel Wheels
    const skirtGeo = new THREE.BoxGeometry(0.86, 0.07, 1.3);
    const skirtMesh = new THREE.Mesh(skirtGeo, bogieMat);
    skirtMesh.position.set(0, 0.07, 0);
    group.add(skirtMesh);

    const wheelGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.05, 12);
    wheelGeo.rotateZ(Math.PI / 2);

    const wheelOffsets = [
      { x: 0.36, z: 0.48 },
      { x: -0.36, z: 0.48 },
      { x: 0.36, z: 0.26 },
      { x: -0.36, z: 0.26 },
      { x: 0.36, z: -0.26 },
      { x: -0.36, z: -0.26 },
      { x: 0.36, z: -0.48 },
      { x: -0.36, z: -0.48 },
    ];

    for (const off of wheelOffsets) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(off.x, 0.06, off.z);
      group.add(wheel);
    }

    // =========================================================================
    // VESTIBULE GANGWAY COUPLER (Connecting Car 1 to Car 2 at Z = -0.75 to -0.95)
    // =========================================================================
    const gangwayGeo = new THREE.BoxGeometry(0.68, 0.46, 0.24);
    const gangway = new THREE.Mesh(gangwayGeo, gangwayMat);
    gangway.position.set(0, 0.32, -0.82);
    group.add(gangway);

    // =========================================================================
    // CAR 2: COUPLED PASSENGER COACH (Trailing Car, Z = -0.95 to -2.35)
    // =========================================================================
    const coachLength = 1.35;
    const coachCenterZ = -1.6;

    // Coach floor & body
    const coachFloorGeo = new THREE.BoxGeometry(0.82, 0.08, coachLength);
    const coachFloor = new THREE.Mesh(coachFloorGeo, interiorMat);
    coachFloor.position.set(0, 0.12, coachCenterZ);
    group.add(coachFloor);

    // Coach sides
    const coachWallGeo = new THREE.BoxGeometry(0.06, 0.46, coachLength);
    const coachLeftWall = new THREE.Mesh(coachWallGeo, bodyMat);
    coachLeftWall.position.set(0.39, 0.32, coachCenterZ);
    group.add(coachLeftWall);

    const coachRightWall = new THREE.Mesh(coachWallGeo, bodyMat);
    coachRightWall.position.set(-0.39, 0.32, coachCenterZ);
    group.add(coachRightWall);

    // Coach speed stripes
    const coachStripeBlueGeo = new THREE.BoxGeometry(0.065, 0.07, coachLength);
    const cLeftStripeBlue = new THREE.Mesh(coachStripeBlueGeo, stripeBlueMat);
    cLeftStripeBlue.position.set(0.392, 0.26, coachCenterZ);
    group.add(cLeftStripeBlue);

    const cRightStripeBlue = new THREE.Mesh(coachStripeBlueGeo, stripeBlueMat);
    cRightStripeBlue.position.set(-0.392, 0.26, coachCenterZ);
    group.add(cRightStripeBlue);

    const coachStripeCyanGeo = new THREE.BoxGeometry(0.065, 0.03, coachLength);
    const cLeftStripeCyan = new THREE.Mesh(coachStripeCyanGeo, stripeCyanMat);
    cLeftStripeCyan.position.set(0.392, 0.21, coachCenterZ);
    group.add(cLeftStripeCyan);

    const cRightStripeCyan = new THREE.Mesh(coachStripeCyanGeo, stripeCyanMat);
    cRightStripeCyan.position.set(-0.392, 0.21, coachCenterZ);
    group.add(cRightStripeCyan);

    // Coach Roof
    const coachRoofGeo = new THREE.BoxGeometry(0.78, 0.06, coachLength);
    const coachRoof = new THREE.Mesh(coachRoofGeo, bodyMat);
    coachRoof.position.set(0, 0.55, coachCenterZ);
    group.add(coachRoof);

    // Coach Passenger Windows (4 pairs)
    for (const cz of [-1.15, -1.45, -1.75, -2.05]) {
      const winGeo = new THREE.BoxGeometry(0.07, 0.1, 0.16);
      const lWin = new THREE.Mesh(winGeo, windowMat);
      lWin.position.set(0.392, 0.38, cz);
      group.add(lWin);

      const rWin = new THREE.Mesh(winGeo, windowMat);
      rWin.position.set(-0.392, 0.38, cz);
      group.add(rWin);
    }

    // Coach Rear Tail with Aerodynamic Taper (-Z tail)
    const coachTailGeo = new THREE.BoxGeometry(0.8, 0.42, 0.25);
    const coachTail = new THREE.Mesh(coachTailGeo, bodyMat);
    coachTail.position.set(0, 0.31, coachCenterZ - coachLength / 2 - 0.1);
    coachTail.rotation.x = 0.16;
    group.add(coachTail);

    // Dual Glowing Red LED Tail Lamps on Coach Rear
    const tailGeo = new THREE.BoxGeometry(0.12, 0.05, 0.04);
    const leftTail = new THREE.Mesh(tailGeo, taillightMat);
    leftTail.position.set(0.25, 0.26, coachCenterZ - coachLength / 2 - 0.22);
    group.add(leftTail);

    const rightTail = new THREE.Mesh(tailGeo, taillightMat);
    rightTail.position.set(-0.25, 0.26, coachCenterZ - coachLength / 2 - 0.22);
    group.add(rightTail);

    // Coach Skirts & Wheels
    const coachSkirtGeo = new THREE.BoxGeometry(0.86, 0.07, coachLength);
    const coachSkirt = new THREE.Mesh(coachSkirtGeo, bogieMat);
    coachSkirt.position.set(0, 0.07, coachCenterZ);
    group.add(coachSkirt);

    const coachWheelOffsets = [
      { x: 0.36, z: coachCenterZ + 0.4 },
      { x: -0.36, z: coachCenterZ + 0.4 },
      { x: 0.36, z: coachCenterZ + 0.18 },
      { x: -0.36, z: coachCenterZ + 0.18 },
      { x: 0.36, z: coachCenterZ - 0.18 },
      { x: -0.36, z: coachCenterZ - 0.18 },
      { x: 0.36, z: coachCenterZ - 0.4 },
      { x: -0.36, z: coachCenterZ - 0.4 },
    ];

    for (const off of coachWheelOffsets) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(off.x, 0.06, off.z);
      group.add(wheel);
    }

    return group;
  }

  // Find nearest rail block in the world within maxDist
  public findNearestRail(pos: THREE.Vector3, maxDist: number = 6): { x: number; y: number; z: number; type: BlockType } | null {
    const px = Math.floor(pos.x);
    const py = Math.floor(pos.y);
    const pz = Math.floor(pos.z);
    const distInt = Math.ceil(maxDist);

    let nearest: { x: number; y: number; z: number; type: BlockType } | null = null;
    let minD2 = maxDist * maxDist;

    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -distInt; dx <= distInt; dx++) {
        for (let dz = -distInt; dz <= distInt; dz++) {
          const x = px + dx;
          const y = py + dy;
          const z = pz + dz;
          const v = this.world.getVoxel(x, y, z);
          if (v && v.includes('rail')) {
            const d2 = (x + 0.5 - pos.x) ** 2 + (y - pos.y) ** 2 + (z + 0.5 - pos.z) ** 2;
            if (d2 < minD2) {
              minD2 = d2;
              nearest = { x, y, z, type: v };
            }
          }
        }
      }
    }

    return nearest;
  }

  // Spawn a new Minecart on a rail block or coordinate
  public spawnMinecart(x: number, y: number, z: number, autoMount: boolean = false): MinecartEntity {
    // Check if there is a rail at (x,y,z) or within 1.5 blocks
    let snapX = Math.floor(x) + 0.5;
    let snapZ = Math.floor(z) + 0.5;
    let snapY = Math.floor(y);

    const railHere = this.findRailAtOrBelow(Math.floor(x), snapY, Math.floor(z));
    if (railHere) {
      snapX = railHere.x + 0.5;
      snapY = railHere.y;
      snapZ = railHere.z + 0.5;
    } else {
      // Check if there is a nearby rail within 3 blocks
      const nearbyRail = this.findNearestRail(new THREE.Vector3(x, y, z), 3.0);
      if (nearbyRail) {
        snapX = nearbyRail.x + 0.5;
        snapY = nearbyRail.y;
        snapZ = nearbyRail.z + 0.5;
      } else {
        // Ground height
        const groundY = this.world.getHighestSolidVoxel(Math.floor(x), Math.floor(z));
        snapY = groundY + 1;
      }
    }

    const mesh = this.createMinecartMesh();
    mesh.position.set(snapX, snapY + 0.03, snapZ);
    this.scene.add(mesh);

    const cart: MinecartEntity = {
      id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      x: snapX,
      y: snapY + 0.03,
      z: snapZ,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: 0,
      pitch: 0,
      isRidden: false,
      speed: 0,
      mesh: mesh,
    };

    this.minecarts.push(cart);
    soundManager.playMinecartPlace();

    if (autoMount) {
      this.mountPlayer(cart.id);
    }

    return cart;
  }

  // Find minecart nearest to a coordinate
  public findNearestCart(pos: THREE.Vector3, maxDist: number = 3.5): MinecartEntity | null {
    let nearest: MinecartEntity | null = null;
    let nearestDist = maxDist;

    for (const cart of this.minecarts) {
      const dist = pos.distanceTo(new THREE.Vector3(cart.x, cart.y, cart.z));
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = cart;
      }
    }

    return nearest;
  }

  // Mount player in minecart
  public mountPlayer(cartId: string): boolean {
    const cart = this.minecarts.find((c) => c.id === cartId);
    if (!cart) return false;

    // Dismount any existing
    if (this.ridingCartId) {
      this.dismountPlayer();
    }

    this.ridingCartId = cart.id;
    cart.isRidden = true;
    soundManager.playPowerUp();
    return true;
  }

  // Dismount player safely onto adjacent block
  public dismountPlayer(): void {
    if (!this.ridingCartId) return;

    const cart = this.minecarts.find((c) => c.id === this.ridingCartId);
    if (cart) {
      cart.isRidden = false;
    }
    this.ridingCartId = null;
    this.isAutoCruise = false;
    soundManager.playStep();
  }

  public isPlayerRiding(): boolean {
    return this.ridingCartId !== null;
  }

  public getRidingCart(): MinecartEntity | null {
    if (!this.ridingCartId) return null;
    return this.minecarts.find((c) => c.id === this.ridingCartId) || null;
  }

  // Remove a specific minecart
  public removeCart(cartId: string): void {
    const index = this.minecarts.findIndex((c) => c.id === cartId);
    if (index === -1) return;

    const cart = this.minecarts[index];
    if (cart.mesh) {
      this.scene.remove(cart.mesh);
    }

    if (this.ridingCartId === cart.id) {
      this.dismountPlayer();
    }

    this.minecarts.splice(index, 1);
    soundManager.playBreak();
  }

  // Clear all minecarts
  public clearMinecarts(): void {
    for (const cart of this.minecarts) {
      if (cart.mesh) {
        this.scene.remove(cart.mesh);
      }
    }
    this.minecarts = [];
    this.ridingCartId = null;
    this.isAutoCruise = false;
  }

  // Helper to check if a block is a rail
  public isRail(x: number, y: number, z: number): boolean {
    const v = this.world.getVoxel(x, y, z);
    return v.includes('rail');
  }

  public getRailType(x: number, y: number, z: number): BlockType | null {
    const v = this.world.getVoxel(x, y, z);
    return v.includes('rail') ? v : null;
  }

  // Find rail block directly under or at the coordinate
  private findRailAtOrBelow(bx: number, by: number, bz: number): { x: number; y: number; z: number; type: BlockType } | null {
    const checkY = [by, by - 1, by + 1, by - 2];
    for (const cy of checkY) {
      const type = this.getRailType(bx, cy, bz);
      if (type) {
        return { x: bx, y: cy, z: bz, type };
      }
    }
    return null;
  }

  // Find connected rail neighbors in cardinal directions
  private getConnectedNeighbors(bx: number, by: number, bz: number): RailNeighbor[] {
    const neighbors: RailNeighbor[] = [];
    const cardinal = [
      { dx: 0, dz: -1 }, // North
      { dx: 0, dz: 1 },  // South
      { dx: 1, dz: 0 },  // East
      { dx: -1, dz: 0 }, // West
    ];

    for (const { dx, dz } of cardinal) {
      const nx = bx + dx;
      const nz = bz + dz;

      // 1. Same level
      if (this.isRail(nx, by, nz)) {
        neighbors.push({ x: nx, y: by, z: nz, dx, dz, slope: 0 });
      }
      // 2. Slope up
      else if (this.isRail(nx, by + 1, nz)) {
        neighbors.push({ x: nx, y: by + 1, z: nz, dx, dz, slope: 1 });
      }
      // 3. Slope down
      else if (this.isRail(nx, by - 1, nz)) {
        neighbors.push({ x: nx, y: by - 1, z: nz, dx, dz, slope: -1 });
      }
    }

    return neighbors;
  }

  // Driving Action Handlers
  public accelerateRidingCart(force: number = 24.0): void {
    const cart = this.getRidingCart();
    if (!cart) return;

    if (cart.speed < 1.0) {
      // Kickstart along current yaw
      const fx = -Math.sin(cart.yaw);
      const fz = -Math.cos(cart.yaw);
      cart.vx = fx * force;
      cart.vz = fz * force;
    } else {
      const normX = cart.vx / (cart.speed || 1);
      const normZ = cart.vz / (cart.speed || 1);
      cart.vx += normX * force;
      cart.vz += normZ * force;
    }
    soundManager.playStep();
  }

  public brakeRidingCart(): void {
    const cart = this.getRidingCart();
    if (!cart) return;
    cart.vx *= 0.15;
    cart.vz *= 0.15;
    this.isAutoCruise = false;
    soundManager.playStep();
  }

  public reverseRidingCart(force: number = 16.0): void {
    const cart = this.getRidingCart();
    if (!cart) return;
    if (cart.speed > 0.5) {
      cart.vx = -cart.vx * 0.8;
      cart.vz = -cart.vz * 0.8;
    } else {
      const fx = Math.sin(cart.yaw);
      const fz = Math.cos(cart.yaw);
      cart.vx = fx * force;
      cart.vz = fz * force;
    }
  }

  public turboBoostRidingCart(): void {
    const cart = this.getRidingCart();
    if (!cart) return;
    const currentSpeed = Math.hypot(cart.vx, cart.vz);
    const boostSpeed = 125.0; // 450 km/h Maglev Bullet Train Hyper Speed!
    if (currentSpeed > 0.2) {
      const normX = cart.vx / currentSpeed;
      const normZ = cart.vz / currentSpeed;
      cart.vx = normX * boostSpeed;
      cart.vz = normZ * boostSpeed;
    } else {
      const fx = -Math.sin(cart.yaw);
      const fz = -Math.cos(cart.yaw);
      cart.vx = fx * boostSpeed;
      cart.vz = fz * boostSpeed;
    }
    soundManager.playMinecartBoost();
    soundManager.playBulletTrainHorn();
    soundManager.playBulletTrainWhoosh();
  }

  public playHorn(): void {
    soundManager.playBulletTrainHorn();
  }

  public toggleCruise(): boolean {
    this.isAutoCruise = !this.isAutoCruise;
    if (this.isAutoCruise) {
      soundManager.playPowerUp();
    }
    return this.isAutoCruise;
  }

  // Main physics and rail navigation loop
  public update(
    delta: number,
    input: { fwd: boolean; back: boolean; left: boolean; right: boolean; jump: boolean },
    playerPos: THREE.Vector3,
    playerYaw: number
  ): { isRiding: boolean; currentSpeed: number; trackType?: string } {
    this.rollSoundTimer -= delta;
    this.boostSoundTimer -= delta;

    let ridingSpeed = 0;
    let ridingTrackType = 'Standard Rail';

    for (let i = this.minecarts.length - 1; i >= 0; i--) {
      const cart = this.minecarts[i];
      const isRidden = cart.id === this.ridingCartId;

      // 1. Dismount Check
      if (isRidden && input.jump) {
        this.dismountPlayer();
        playerPos.y += 0.8;
        continue;
      }

      const blockX = Math.floor(cart.x);
      const blockY = Math.floor(cart.y);
      const blockZ = Math.floor(cart.z);

      // Check current rail block under cart
      const currentRail = this.findRailAtOrBelow(blockX, blockY, blockZ);
      const onTrack = currentRail !== null;

      if (onTrack && currentRail) {
        const railX = currentRail.x;
        const railY = currentRail.y;
        const railZ = currentRail.z;
        const railType = currentRail.type;

        if (isRidden) {
          ridingTrackType =
            railType === 'powered_rail'
              ? '🚅 Shinkansen 320km/h Booster'
              : railType === 'detector_rail'
              ? '🔴 Detector Signal Rail'
              : railType === 'activator_rail'
              ? '✨ Sonic Activator Rail'
              : '🚄 Shinkansen High-Speed Rail';
        }

        // Get connected track neighbors
        const neighbors = this.getConnectedNeighbors(railX, railY, railZ);
        const hasNorth = neighbors.some((n) => n.dz === -1);
        const hasSouth = neighbors.some((n) => n.dz === 1);
        const hasEast = neighbors.some((n) => n.dx === 1);
        const hasWest = neighbors.some((n) => n.dx === -1);

        const isStraightX = (hasEast || hasWest) && !hasNorth && !hasSouth;
        const isStraightZ = (hasNorth || hasSouth) && !hasEast && !hasWest;

        // Player Forward look vector
        const lookX = -Math.sin(playerYaw);
        const lookZ = -Math.cos(playerYaw);

        // 2. Accelerate with W or Auto-Cruise
        const wantsForward = (isRidden && (input.fwd || this.isAutoCruise));
        const wantsBack = isRidden && input.back;

        // High-Speed Acceleration rate (Bullet Train Electric Motors)
        const accelRate = 32.0;

        if (wantsForward) {
          const currentSpeed = Math.hypot(cart.vx, cart.vz);

          if (currentSpeed < 0.2) {
            // Cart is at rest: choose launch direction along available tracks
            let bestDirX = 0;
            let bestDirZ = 0;
            let bestDot = -999;

            if (neighbors.length > 0) {
              for (const n of neighbors) {
                const dot = lookX * n.dx + lookZ * n.dz;
                if (dot > bestDot) {
                  bestDot = dot;
                  bestDirX = n.dx;
                  bestDirZ = n.dz;
                }
              }
            } else {
              // Isolated rail: launch in look direction along primary axis
              if (Math.abs(lookX) >= Math.abs(lookZ)) {
                bestDirX = lookX >= 0 ? 1 : -1;
              } else {
                bestDirZ = lookZ >= 0 ? 1 : -1;
              }
            }

            // High-speed launch kick
            const kickSpeed = Math.max(16.0, accelRate * delta * 5);
            cart.vx = bestDirX * kickSpeed;
            cart.vz = bestDirZ * kickSpeed;
          } else {
            // If in auto-cruise mode, accelerate toward 72 m/s (~260 km/h)
            const cruiseTarget = this.isAutoCruise ? 72.0 : 100.0;
            if (currentSpeed < cruiseTarget) {
              const normX = cart.vx / currentSpeed;
              const normZ = cart.vz / currentSpeed;
              cart.vx += normX * accelRate * delta;
              cart.vz += normZ * accelRate * delta;
            }
          }
        } else if (wantsBack) {
          // Braking / Reversing
          const currentSpeed = Math.hypot(cart.vx, cart.vz);
          if (currentSpeed > 1.2) {
            // Apply strong brakes
            cart.vx *= Math.pow(0.04, delta);
            cart.vz *= Math.pow(0.04, delta);
          } else {
            // Reverse direction along track
            let revDirX = 0;
            let revDirZ = 0;
            if (neighbors.length > 0) {
              let bestDot = -999;
              for (const n of neighbors) {
                // Point away from look
                const dot = -lookX * n.dx - lookZ * n.dz;
                if (dot > bestDot) {
                  bestDot = dot;
                  revDirX = n.dx;
                  revDirZ = n.dz;
                }
              }
            } else {
              revDirZ = lookZ >= 0 ? -1 : 1;
            }
            cart.vx = revDirX * 18.0;
            cart.vz = revDirZ * 18.0;
          }
        }

        // 3. Powered Rail Physics (Shinkansen 360km/h Booster!)
        const isPowered = railType === 'powered_rail';
        if (isPowered) {
          const currentSpeed = Math.hypot(cart.vx, cart.vz);
          const maxPoweredSpeed = 100.0; // 360 km/h Shinkansen Speed!

          if (currentSpeed > 0.2) {
            // Rapid acceleration towards top bullet speed
            const boostSpeed = Math.min(maxPoweredSpeed, currentSpeed + 55.0 * delta);
            const normX = cart.vx / currentSpeed;
            const normZ = cart.vz / currentSpeed;
            cart.vx = normX * boostSpeed;
            cart.vz = normZ * boostSpeed;
          } else {
            // Kickstart in open track direction
            let kickX = 0;
            let kickZ = 0;
            if (neighbors.length > 0) {
              let bestDot = -999;
              for (const n of neighbors) {
                const dot = isRidden ? lookX * n.dx + lookZ * n.dz : 1;
                if (dot > bestDot) {
                  bestDot = dot;
                  kickX = n.dx;
                  kickZ = n.dz;
                }
              }
            } else {
              kickZ = 1;
            }
            cart.vx = kickX * 32.0;
            cart.vz = kickZ * 32.0;
          }

          if (isRidden && this.boostSoundTimer <= 0) {
            soundManager.playMinecartBoost();
            soundManager.playBulletTrainMotor(Math.min(1.0, currentSpeed / 100.0));
            this.boostSoundTimer = 0.35;
          }
        } else {
          // Standard rail friction (low friction so bullet train glides effortlessly)
          const friction = isRidden ? 0.998 : 0.975;
          cart.vx *= Math.pow(friction, delta * 60);
          cart.vz *= Math.pow(friction, delta * 60);
        }

        // 4. Clamping Speed (Up to 450 km/h Hyper Maglev)
        const maxSpeed = isPowered || cart.speed > 105.0 ? 125.0 : 68.0;
        const curSpd = Math.hypot(cart.vx, cart.vz);
        if (curSpd > maxSpeed) {
          cart.vx = (cart.vx / curSpd) * maxSpeed;
          cart.vz = (cart.vz / curSpd) * maxSpeed;
        }

        // 5. Track Constraining, Curves & Navigation
        if (isStraightX) {
          // Confined to East-West line
          cart.z = THREE.MathUtils.lerp(cart.z, railZ + 0.5, 0.45);
          cart.vz = 0;
          cart.yaw = cart.vx >= 0 ? Math.PI / 2 : -Math.PI / 2;
        } else if (isStraightZ) {
          // Confined to North-South line
          cart.x = THREE.MathUtils.lerp(cart.x, railX + 0.5, 0.45);
          cart.vx = 0;
          cart.yaw = cart.vz >= 0 ? 0 : Math.PI;
        } else if (neighbors.length >= 2) {
          // Curved Track or Junction
          // Check if cart is moving towards an invalid non-connected edge
          const headingX = Math.sign(cart.vx);
          const headingZ = Math.sign(cart.vz);

          const hasHeadingX = neighbors.some((n) => n.dx === headingX);
          const hasHeadingZ = neighbors.some((n) => n.dz === headingZ);

          // If current heading is turning into a curve:
          if (Math.abs(cart.vx) > Math.abs(cart.vz) && !hasHeadingX) {
            // X heading has no outlet, transfer velocity to Z outlet!
            const outletZ = neighbors.find((n) => n.dz !== 0);
            if (outletZ) {
              const spd = Math.abs(cart.vx);
              cart.vz = outletZ.dz * spd;
              cart.vx = 0;
              cart.x = railX + 0.5;
            }
          } else if (Math.abs(cart.vz) > Math.abs(cart.vx) && !hasHeadingZ) {
            // Z heading has no outlet, transfer velocity to X outlet!
            const outletX = neighbors.find((n) => n.dx !== 0);
            if (outletX) {
              const spd = Math.abs(cart.vz);
              cart.vx = outletX.dx * spd;
              cart.vz = 0;
              cart.z = railZ + 0.5;
            }
          }

          if (Math.abs(cart.vx) > 0.05 || Math.abs(cart.vz) > 0.05) {
            cart.yaw = Math.atan2(cart.vx, cart.vz);
          }
        }

        // 6. Slope Height & Pitch Handling
        let targetY = railY + 0.03;

        // Check slope in current movement direction
        const movingNeighbor = neighbors.find(
          (n) => (n.dx !== 0 && Math.sign(cart.vx) === n.dx) || (n.dz !== 0 && Math.sign(cart.vz) === n.dz)
        );

        if (movingNeighbor && movingNeighbor.slope !== 0) {
          let frac = 0;
          if (movingNeighbor.dx !== 0) {
            frac = movingNeighbor.dx > 0 ? cart.x - railX : 1.0 - (cart.x - railX);
          } else {
            frac = movingNeighbor.dz > 0 ? cart.z - railZ : 1.0 - (cart.z - railZ);
          }
          frac = Math.max(0, Math.min(1, frac));

          if (movingNeighbor.slope === 1) {
            targetY = railY + 0.03 + frac * 1.0;
            cart.pitch = 0.55;
          } else if (movingNeighbor.slope === -1) {
            targetY = railY + 0.03 - frac * 1.0;
            cart.pitch = -0.55;
          }
        } else {
          cart.pitch = THREE.MathUtils.lerp(cart.pitch, 0, 0.25);
        }

        cart.y = THREE.MathUtils.lerp(cart.y, targetY, 0.5);

        // 7. Apply Delta Movement
        cart.x += cart.vx * delta;
        cart.z += cart.vz * delta;

        // 8. Track Buffer / Dead-End Protection
        // Prevent cart from getting stuck outside the track bounds!
        if (neighbors.length <= 1) {
          const allowed = neighbors[0];
          // If no neighbors or moving away from single neighbor, clamp inside block
          if (!allowed || (allowed.dx !== 0 && Math.sign(cart.vx) !== allowed.dx)) {
            if (cart.x < railX + 0.2 || cart.x > railX + 0.8) {
              cart.x = Math.max(railX + 0.2, Math.min(railX + 0.8, cart.x));
              cart.vx = -cart.vx * 0.3;
            }
          }
          if (!allowed || (allowed.dz !== 0 && Math.sign(cart.vz) !== allowed.dz)) {
            if (cart.z < railZ + 0.2 || cart.z > railZ + 0.8) {
              cart.z = Math.max(railZ + 0.2, Math.min(railZ + 0.8, cart.z));
              cart.vz = -cart.vz * 0.3;
            }
          }
        } else {
          // Multi-neighbor block: verify destination block has a rail
          const nextBx = Math.floor(cart.x);
          const nextBz = Math.floor(cart.z);
          if (nextBx !== railX || nextBz !== railZ) {
            const nextRail = this.findRailAtOrBelow(nextBx, railY, nextBz);
            if (!nextRail) {
              // Bounced against dead-end
              cart.x = Math.max(railX + 0.15, Math.min(railX + 0.85, cart.x));
              cart.z = Math.max(railZ + 0.15, Math.min(railZ + 0.85, cart.z));
              cart.vx = -cart.vx * 0.3;
              cart.vz = -cart.vz * 0.3;
            }
          }
        }

        cart.speed = Math.hypot(cart.vx, cart.vz);

        // High-Speed Visual Particles for Bullet Train:
        // 1. Electric Cyan/Blue Rail Wheel Sparks
        if (cart.speed > 16.0 && Math.random() < 0.35) {
          const side = Math.random() > 0.5 ? 0.36 : -0.36;
          const sparkPos = new THREE.Vector3(cart.x + side, cart.y + 0.08, cart.z);
          const sparkVel = new THREE.Vector3(
            (Math.random() - 0.5) * 3,
            Math.random() * 2.5 + 0.5,
            (Math.random() - 0.5) * 3
          );
          this.world.spawnCustomParticle(sparkPos, sparkVel, 0x38bdf8, 0.07, 0.3);
        }

        // 2. Supersonic Aerodynamic White Vapor Trail behind roof pantograph
        if (cart.speed > 30.0 && Math.random() < 0.4) {
          const trailPos = new THREE.Vector3(
            cart.x + (Math.random() - 0.5) * 0.2,
            cart.y + 0.68,
            cart.z + (Math.random() - 0.5) * 0.2
          );
          const trailVel = new THREE.Vector3(0, Math.random() * 0.8 + 0.2, 0);
          this.world.spawnCustomParticle(trailPos, trailVel, 0xffffff, 0.12, 0.35);
        }

        // Play rolling audio & high-speed supersonic whoosh
        if (isRidden && cart.speed > 0.4 && this.rollSoundTimer <= 0) {
          soundManager.playMinecartRoll(cart.speed);
          if (cart.speed > 45.0) {
            soundManager.playBulletTrainWhoosh();
          }
          this.rollSoundTimer = Math.max(0.12, 0.32 - (cart.speed / 20.0) * 0.2);
        }
      } else {
        // OFF-TRACK ALL-TERRAIN DRIVING:
        // Even when placed on ground, minecarts can be driven smoothly!
        if (isRidden) {
          ridingTrackType = '🚜 All-Terrain Bullet Train';
          const turnRate = 2.4;
          if (input.left) {
            cart.yaw += turnRate * delta;
          }
          if (input.right) {
            cart.yaw -= turnRate * delta;
          }

          const offRoadMaxSpeed = 12.0;
          if (input.fwd || this.isAutoCruise) {
            const fx = -Math.sin(cart.yaw);
            const fz = -Math.cos(cart.yaw);
            cart.vx = THREE.MathUtils.lerp(cart.vx, fx * offRoadMaxSpeed, 0.16);
            cart.vz = THREE.MathUtils.lerp(cart.vz, fz * offRoadMaxSpeed, 0.16);
          } else if (input.back) {
            const fx = Math.sin(cart.yaw);
            const fz = Math.cos(cart.yaw);
            cart.vx = THREE.MathUtils.lerp(cart.vx, fx * 6.0, 0.12);
            cart.vz = THREE.MathUtils.lerp(cart.vz, fz * 6.0, 0.12);
          } else {
            cart.vx *= Math.pow(0.85, delta * 60);
            cart.vz *= Math.pow(0.85, delta * 60);
          }
        } else {
          cart.vx *= Math.pow(0.8, delta * 60);
          cart.vz *= Math.pow(0.8, delta * 60);
        }

        cart.x += cart.vx * delta;
        cart.z += cart.vz * delta;

        // Ground clamping
        const groundY = this.world.getHighestSolidVoxel(Math.floor(cart.x), Math.floor(cart.z));
        cart.y = groundY + 1.02;
        cart.pitch = 0;
        cart.speed = Math.hypot(cart.vx, cart.vz);

        if (isRidden && cart.speed > 0.4 && this.rollSoundTimer <= 0) {
          soundManager.playStep();
          this.rollSoundTimer = 0.3;
        }
      }

      // Update 3D Mesh
      if (cart.mesh) {
        cart.mesh.position.set(cart.x, cart.y, cart.z);
        cart.mesh.rotation.set(cart.pitch, cart.yaw, 0, 'YXZ');
      }

      // Attach player position smoothly to train cockpit
      if (isRidden) {
        ridingSpeed = cart.speed;
        playerPos.set(cart.x, cart.y + 0.38, cart.z);
      }
    }

    return {
      isRiding: this.ridingCartId !== null,
      currentSpeed: ridingSpeed,
      trackType: ridingTrackType,
    };
  }

  // Quick Builder: Lay Straight Rails (16m) and spawn mounted Bullet Train
  public layStraightRails(playerPos: THREE.Vector3, playerYaw: number, length: number = 16, type: BlockType = 'rail'): { count: number; cartId: string } {
    const fx = -Math.sin(playerYaw);
    const fz = -Math.cos(playerYaw);

    let dx = 0;
    let dz = 0;
    if (Math.abs(fx) > Math.abs(fz)) {
      dx = fx >= 0 ? 1 : -1;
    } else {
      dz = fz >= 0 ? 1 : -1;
    }

    const startX = Math.floor(playerPos.x) + dx;
    const startY = Math.floor(playerPos.y);
    const startZ = Math.floor(playerPos.z) + dz;

    let placed = 0;
    for (let step = 0; step < length; step++) {
      const x = startX + dx * step;
      const z = startZ + dz * step;
      const y = startY;

      // Solid support underneath
      const below = this.world.getVoxel(x, y - 1, z);
      if (below === 'air' || below === 'water') {
        this.world.setVoxel(x, y - 1, z, 'stone', false);
      }

      // Clear headspace
      this.world.setVoxel(x, y + 1, z, 'air', false);
      this.world.setVoxel(x, y + 2, z, 'air', false);

      // Place rail
      this.world.setVoxel(x, y, z, type, false);
      placed++;
    }

    this.world.rebuildMeshes();
    soundManager.playPowerUp();

    // Spawn Bullet Train right at the start and launch forward down the track!
    const cart = this.spawnMinecart(startX, startY, startZ, true);
    cart.vx = dx * 26.0;
    cart.vz = dz * 26.0;
    cart.speed = 26.0;
    cart.yaw = Math.atan2(dx, dz);

    return { count: placed, cartId: cart.id };
  }

  // Quick Builder: Super High-Speed Powered Rollerway (32m) with alternating booster tracks
  public layPoweredRollerway(playerPos: THREE.Vector3, playerYaw: number, length: number = 32): { count: number; cartId: string } {
    const fx = -Math.sin(playerYaw);
    const fz = -Math.cos(playerYaw);

    let dx = 0;
    let dz = 0;
    if (Math.abs(fx) > Math.abs(fz)) {
      dx = fx >= 0 ? 1 : -1;
    } else {
      dz = fz >= 0 ? 1 : -1;
    }

    const startX = Math.floor(playerPos.x) + dx;
    const startY = Math.floor(playerPos.y);
    const startZ = Math.floor(playerPos.z) + dz;

    // Perpendicular vector for redstone torches
    const px = -dz;
    const pz = dx;

    let placed = 0;
    for (let step = 0; step < length; step++) {
      const x = startX + dx * step;
      const z = startZ + dz * step;
      const y = startY;

      // Ballast base underneath
      const below = this.world.getVoxel(x, y - 1, z);
      if (below === 'air' || below === 'water') {
        this.world.setVoxel(x, y - 1, z, 'cobblestone', false);
      }

      // Clear overhead clearance
      this.world.setVoxel(x, y + 1, z, 'air', false);
      this.world.setVoxel(x, y + 2, z, 'air', false);

      // Alternating powered booster rails
      const isPowered = step % 3 === 0 || step === 0 || step === 1;
      const railType: BlockType = isPowered ? 'powered_rail' : 'rail';
      this.world.setVoxel(x, y, z, railType, false);

      // Place redstone torches along the track to power the rails
      if (isPowered) {
        this.world.setVoxel(x + px, y - 1, z + pz, 'stone', false);
        this.world.setVoxel(x + px, y, z + pz, 'torch', false);
      }

      placed++;
    }

    this.world.rebuildMeshes();
    soundManager.playPowerUp();

    // Spawn Bullet Train right at the start and launch at 250+ km/h down the powered track!
    const cart = this.spawnMinecart(startX, startY, startZ, true);
    cart.vx = dx * 70.0;
    cart.vz = dz * 70.0;
    cart.speed = 70.0;
    cart.yaw = Math.atan2(dx, dz);

    return { count: placed, cartId: cart.id };
  }
}
