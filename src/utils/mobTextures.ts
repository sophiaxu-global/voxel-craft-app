import * as THREE from 'three';

// Cache generated mob materials & textures for high rendering performance
const mobTextureCache = new Map<string, THREE.CanvasTexture>();

function create16x16Canvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  return [canvas, ctx];
}

function fillPixel(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function pseudoNoise(x: number, y: number, seed = 42): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function getTexture(key: string, drawFn: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  if (mobTextureCache.has(key)) {
    return mobTextureCache.get(key)!;
  }
  const [canvas, ctx] = create16x16Canvas();
  drawFn(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  mobTextureCache.set(key, texture);
  return texture;
}

// 1. ZOMBIE TEXTURES
export function getZombieFaceTexture(): THREE.CanvasTexture {
  return getTexture('zombie_face', (ctx) => {
    // Base green rotting skin
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = pseudoNoise(x, y, 11);
        const g = Math.floor(100 + n * 35);
        const r = Math.floor(55 + n * 20);
        const b = Math.floor(45 + n * 18);
        fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
      }
    }
    // Dark hair / scalp fringe on top
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 4; y++) {
        const n = pseudoNoise(x, y, 99);
        const col = Math.floor(30 + n * 20);
        fillPixel(ctx, x, y, `rgb(${col},${Math.floor(col * 1.2)},${col})`);
      }
    }
    // Deep sunken eyes (x=2..5, y=7..9) and (x=10..13, y=7..9)
    for (let x = 2; x <= 5; x++) {
      for (let y = 7; y <= 9; y++) {
        fillPixel(ctx, x, y, '#182414');
      }
    }
    for (let x = 10; x <= 13; x++) {
      for (let y = 7; y <= 9; y++) {
        fillPixel(ctx, x, y, '#182414');
      }
    }
    // Pupil glint
    fillPixel(ctx, 4, 8, '#324a2c');
    fillPixel(ctx, 11, 8, '#324a2c');

    // Nose
    fillPixel(ctx, 7, 10, '#37572d');
    fillPixel(ctx, 8, 10, '#37572d');
    fillPixel(ctx, 7, 11, '#2c4724');
    fillPixel(ctx, 8, 11, '#2c4724');

    // Snarl mouth
    for (let x = 5; x <= 10; x++) {
      fillPixel(ctx, x, 13, '#1a2b16');
    }
    fillPixel(ctx, 5, 14, '#1a2b16');
    fillPixel(ctx, 10, 14, '#1a2b16');
  });
}

export function getZombieBodyTexture(): THREE.CanvasTexture {
  return getTexture('zombie_body', (ctx) => {
    // Teal cyan shirt with dirt / tatter
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = pseudoNoise(x, y, 22);
        const r = Math.floor(35 + n * 18);
        const g = Math.floor(125 + n * 35);
        const b = Math.floor(125 + n * 35);
        fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
      }
    }
    // Neck collar & exposed rotting skin
    for (let x = 6; x <= 9; x++) {
      for (let y = 0; y <= 3; y++) {
        fillPixel(ctx, x, y, '#4b7a42');
      }
    }
    // Shirt bottom hem
    for (let x = 0; x < 16; x++) {
      fillPixel(ctx, x, 15, '#1e6865');
    }
  });
}

export function getZombieLegTexture(): THREE.CanvasTexture {
  return getTexture('zombie_leg', (ctx) => {
    // Navy blue pants with dark shoes
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = pseudoNoise(x, y, 33);
        if (y > 12) {
          // Grey shoes
          const val = Math.floor(40 + n * 20);
          fillPixel(ctx, x, y, `rgb(${val},${val},${val + 5})`);
        } else {
          // Indigo jeans
          const r = Math.floor(40 + n * 15);
          const g = Math.floor(38 + n * 15);
          const b = Math.floor(95 + n * 30);
          fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
        }
      }
    }
  });
}

// 2. SKELETON TEXTURES
export function getSkeletonFaceTexture(): THREE.CanvasTexture {
  return getTexture('skeleton_face', (ctx) => {
    // Weathered bone skull
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = pseudoNoise(x, y, 44);
        const val = Math.floor(205 + n * 35);
        fillPixel(ctx, x, y, `rgb(${val},${Math.floor(val * 0.98)},${Math.floor(val * 0.92)})`);
      }
    }
    // Eye sockets (deep hollow dark grey/black)
    for (let x = 2; x <= 5; x++) {
      for (let y = 6; y <= 9; y++) {
        fillPixel(ctx, x, y, '#1e1c1a');
      }
    }
    for (let x = 10; x <= 13; x++) {
      for (let y = 6; y <= 9; y++) {
        fillPixel(ctx, x, y, '#1e1c1a');
      }
    }
    // Nasal cavity
    fillPixel(ctx, 7, 10, '#2b2825');
    fillPixel(ctx, 8, 10, '#2b2825');
    fillPixel(ctx, 7, 11, '#1e1c1a');
    fillPixel(ctx, 8, 11, '#1e1c1a');

    // Toothy skeletal smile
    for (let x = 4; x <= 11; x++) {
      fillPixel(ctx, x, 13, '#1e1c1a');
    }
    for (let x = 4; x <= 11; x += 2) {
      fillPixel(ctx, x, 14, '#dfded8');
      fillPixel(ctx, x, 12, '#dfded8');
    }
  });
}

export function getSkeletonBodyTexture(): THREE.CanvasTexture {
  return getTexture('skeleton_body', (ctx) => {
    // Dark hollow interior with visible bone ribcage & spine
    ctx.fillStyle = '#1e1c1a';
    ctx.fillRect(0, 0, 16, 16);

    // Spine
    for (let y = 0; y < 16; y++) {
      fillPixel(ctx, 7, y, '#dedbd2');
      fillPixel(ctx, 8, y, '#ece9e0');
    }

    // Ribs (3 horizontal bars)
    [3, 7, 11].forEach((ry) => {
      for (let x = 2; x <= 13; x++) {
        const n = pseudoNoise(x, ry, 55);
        const col = Math.floor(215 + n * 25);
        fillPixel(ctx, x, ry, `rgb(${col},${col},${col - 5})`);
        fillPixel(ctx, x, ry + 1, `rgb(${col - 25},${col - 25},${col - 30})`);
      }
    });

    // Pelvis bone
    for (let x = 3; x <= 12; x++) {
      fillPixel(ctx, x, 14, '#dedbd2');
      fillPixel(ctx, x, 15, '#c7c3b8');
    }
  });
}

// 3. CREEPER TEXTURES
export function getCreeperFaceTexture(): THREE.CanvasTexture {
  return getTexture('creeper_face', (ctx) => {
    // Multi-shade camo moss noise base
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = pseudoNoise(x, y, 66);
        const g = Math.floor(130 + n * 80);
        const r = Math.floor(50 + n * 50);
        const b = Math.floor(40 + n * 35);
        fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
      }
    }

    // Iconic Creeper Face Pixels
    // Eyes: (3,3)-(6,6) and (9,3)-(12,6)
    for (let x = 3; x <= 6; x++) {
      for (let y = 3; y <= 6; y++) {
        fillPixel(ctx, x, y, '#0a1007');
      }
    }
    for (let x = 9; x <= 12; x++) {
      for (let y = 3; y <= 6; y++) {
        fillPixel(ctx, x, y, '#0a1007');
      }
    }

    // Nose connector: (6,7)-(9,9)
    for (let x = 6; x <= 9; x++) {
      for (let y = 7; y <= 9; y++) {
        fillPixel(ctx, x, y, '#0a1007');
      }
    }

    // Mouth droop: (4,9)-(6,13) and (9,9)-(11,13)
    for (let x = 4; x <= 6; x++) {
      for (let y = 9; y <= 13; y++) {
        fillPixel(ctx, x, y, '#0a1007');
      }
    }
    for (let x = 9; x <= 11; x++) {
      for (let y = 9; y <= 13; y++) {
        fillPixel(ctx, x, y, '#0a1007');
      }
    }
  });
}

export function getCreeperCamoTexture(): THREE.CanvasTexture {
  return getTexture('creeper_camo', (ctx) => {
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = pseudoNoise(x, y, 77);
        const g = Math.floor(115 + n * 95);
        const r = Math.floor(45 + n * 55);
        const b = Math.floor(35 + n * 40);
        fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
      }
    }
  });
}

// 4. ENDERMAN TEXTURES
export function getEndermanFaceTexture(): THREE.CanvasTexture {
  return getTexture('enderman_face', (ctx) => {
    // Charcoal obsidian dark body
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = pseudoNoise(x, y, 88);
        const val = Math.floor(15 + n * 18);
        fillPixel(ctx, x, y, `rgb(${val},${val},${val + 4})`);
      }
    }

    // Glowing Purple Eye Slits
    for (let x = 2; x <= 6; x++) {
      fillPixel(ctx, x, 7, '#d946ef');
      fillPixel(ctx, x, 8, '#f0abfc');
    }
    for (let x = 9; x <= 13; x++) {
      fillPixel(ctx, x, 7, '#d946ef');
      fillPixel(ctx, x, 8, '#f0abfc');
    }
    // Eye white/light centers
    fillPixel(ctx, 4, 7, '#ffffff');
    fillPixel(ctx, 11, 7, '#ffffff');
  });
}

export function getEndermanDarkTexture(): THREE.CanvasTexture {
  return getTexture('enderman_dark', (ctx) => {
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = pseudoNoise(x, y, 99);
        const val = Math.floor(14 + n * 15);
        fillPixel(ctx, x, y, `rgb(${val},${val},${val + 3})`);
      }
    }
  });
}

// 5. PIG TEXTURES
export function getPigFaceTexture(): THREE.CanvasTexture {
  return getTexture('pig_face', (ctx) => {
    // Pink base skin
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = pseudoNoise(x, y, 101);
        const r = Math.floor(235 + n * 18);
        const g = Math.floor(150 + n * 20);
        const b = Math.floor(165 + n * 20);
        fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
      }
    }

    // Eyes on sides of head (2x2 white with 1x1 black pupil)
    fillPixel(ctx, 1, 6, '#ffffff');
    fillPixel(ctx, 2, 6, '#ffffff');
    fillPixel(ctx, 1, 7, '#241a1c');
    fillPixel(ctx, 2, 7, '#ffffff');

    fillPixel(ctx, 13, 6, '#ffffff');
    fillPixel(ctx, 14, 6, '#ffffff');
    fillPixel(ctx, 14, 7, '#241a1c');
    fillPixel(ctx, 13, 7, '#ffffff');

    // 3D Snout face area (darker pink with nostrils)
    for (let x = 5; x <= 10; x++) {
      for (let y = 9; y <= 13; y++) {
        fillPixel(ctx, x, y, '#e88998');
      }
    }
    fillPixel(ctx, 6, 11, '#6b2b36');
    fillPixel(ctx, 9, 11, '#6b2b36');
  });
}

export function getPigSkinTexture(): THREE.CanvasTexture {
  return getTexture('pig_skin', (ctx) => {
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = pseudoNoise(x, y, 102);
        const r = Math.floor(240 + n * 14);
        const g = Math.floor(155 + n * 18);
        const b = Math.floor(168 + n * 18);
        fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
      }
    }
  });
}

// 6. COW TEXTURES
export function getCowFaceTexture(): THREE.CanvasTexture {
  return getTexture('cow_face', (ctx) => {
    // Brown & white spotted cowhide face
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = pseudoNoise(x, y, 103);
        const isWhitePatch = (x > 3 && x < 12 && y < 7) || n > 0.65;
        if (isWhitePatch) {
          const w = Math.floor(220 + n * 30);
          fillPixel(ctx, x, y, `rgb(${w},${w},${w})`);
        } else {
          const r = Math.floor(100 + n * 30);
          const g = Math.floor(65 + n * 20);
          const b = Math.floor(45 + n * 15);
          fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
        }
      }
    }

    // Eyes
    fillPixel(ctx, 2, 7, '#ffffff');
    fillPixel(ctx, 3, 7, '#1f1610');
    fillPixel(ctx, 12, 7, '#1f1610');
    fillPixel(ctx, 13, 7, '#ffffff');

    // Muzzle (pinkish-grey)
    for (let x = 4; x <= 11; x++) {
      for (let y = 10; y <= 14; y++) {
        fillPixel(ctx, x, y, '#cca0a6');
      }
    }
    fillPixel(ctx, 6, 12, '#4a2f34');
    fillPixel(ctx, 9, 12, '#4a2f34');
  });
}

export function getCowBodyTexture(): THREE.CanvasTexture {
  return getTexture('cow_body', (ctx) => {
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = pseudoNoise(x, y, 104);
        const isWhite = (x % 6 < 3 && y % 6 < 3) || n > 0.6;
        if (isWhite) {
          const w = Math.floor(225 + n * 25);
          fillPixel(ctx, x, y, `rgb(${w},${w},${w})`);
        } else {
          const r = Math.floor(95 + n * 25);
          const g = Math.floor(60 + n * 18);
          const b = Math.floor(40 + n * 15);
          fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
        }
      }
    }
  });
}

// 7. SHEEP TEXTURES
export function getSheepFaceTexture(): THREE.CanvasTexture {
  return getTexture('sheep_face', (ctx) => {
    // Soft beige fleece face
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = pseudoNoise(x, y, 105);
        const r = Math.floor(220 + n * 20);
        const g = Math.floor(195 + n * 20);
        const b = Math.floor(180 + n * 20);
        fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
      }
    }

    // Eyes
    fillPixel(ctx, 2, 7, '#ffffff');
    fillPixel(ctx, 3, 7, '#1f1610');
    fillPixel(ctx, 12, 7, '#1f1610');
    fillPixel(ctx, 13, 7, '#ffffff');

    // Cute pink nose
    fillPixel(ctx, 7, 11, '#e59fa8');
    fillPixel(ctx, 8, 11, '#e59fa8');
    fillPixel(ctx, 7, 12, '#cf7f8a');
    fillPixel(ctx, 8, 12, '#cf7f8a');
  });
}

export function getSheepWoolTexture(): THREE.CanvasTexture {
  return getTexture('sheep_wool', (ctx) => {
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = pseudoNoise(x, y, 106);
        const val = Math.floor(235 + n * 20);
        fillPixel(ctx, x, y, `rgb(${val},${val},${val - 4})`);
      }
    }
  });
}

// 8. VILLAGER TEXTURES
export function getVillagerFaceTexture(): THREE.CanvasTexture {
  return getTexture('villager_face', (ctx) => {
    // Tan flesh skin
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = pseudoNoise(x, y, 120);
        const r = Math.floor(195 + n * 20);
        const g = Math.floor(145 + n * 18);
        const b = Math.floor(115 + n * 15);
        fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
      }
    }

    // Unibrow
    for (let x = 3; x <= 12; x++) {
      fillPixel(ctx, x, 6, '#4a2f1b');
    }

    // Emerald Green Eyes
    fillPixel(ctx, 4, 8, '#ffffff');
    fillPixel(ctx, 5, 8, '#2ecc71');
    fillPixel(ctx, 10, 8, '#2ecc71');
    fillPixel(ctx, 11, 8, '#ffffff');

    // Nose
    for (let x = 7; x <= 8; x++) {
      for (let y = 9; y <= 13; y++) {
        fillPixel(ctx, x, y, '#b37d57');
      }
    }
  });
}

export function getVillagerRobeTexture(): THREE.CanvasTexture {
  return getTexture('villager_robe', (ctx) => {
    // Classic Brown/Tan Villager Robes with green sash collar
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const n = pseudoNoise(x, y, 122);
        const isCollar = y < 3 && x >= 5 && x <= 10;
        if (isCollar) {
          const g = Math.floor(130 + n * 25);
          fillPixel(ctx, x, y, `rgb(40,${g},55)`);
        } else {
          const r = Math.floor(115 + n * 20);
          const g = Math.floor(72 + n * 15);
          const b = Math.floor(48 + n * 12);
          fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
        }
      }
    }
  });
}
