import * as THREE from 'three';
import { BlockType } from '../types';

// Cache generated textures
const textureCache = new Map<string, THREE.CanvasTexture>();

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

// Pseudo-random noise helper for repeatable crisp pixel patterns
function pseudoNoise(x: number, y: number, seed = 42): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

export function generateTextureCanvas(type: BlockType, face: 'top' | 'bottom' | 'side' | 'front' = 'side'): HTMLCanvasElement {
  const [canvas, ctx] = create16x16Canvas();

  switch (type) {
    case 'grass': {
      if (face === 'top') {
        for (let x = 0; x < 16; x++) {
          for (let y = 0; y < 16; y++) {
            const n = pseudoNoise(x, y, 1);
            const g = Math.floor(130 + n * 45);
            const r = Math.floor(65 + n * 25);
            const b = Math.floor(25 + n * 15);
            fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
          }
        }
      } else if (face === 'bottom') {
        // Dirt bottom
        return generateTextureCanvas('dirt', 'side');
      } else {
        // Side: Dirt with grass top fringe
        for (let x = 0; x < 16; x++) {
          for (let y = 0; y < 16; y++) {
            const fringeDepth = Math.floor(2 + pseudoNoise(x, 0, 99) * 3);
            if (y < fringeDepth) {
              const n = pseudoNoise(x, y, 1);
              const g = Math.floor(130 + n * 45);
              const r = Math.floor(65 + n * 25);
              const b = Math.floor(25 + n * 15);
              fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
            } else {
              const n = pseudoNoise(x, y, 2);
              const r = Math.floor(115 + n * 25);
              const g = Math.floor(75 + n * 20);
              const b = Math.floor(45 + n * 15);
              fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
            }
          }
        }
      }
      break;
    }

    case 'dirt': {
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const n = pseudoNoise(x, y, 2);
          const r = Math.floor(115 + n * 25);
          const g = Math.floor(75 + n * 20);
          const b = Math.floor(45 + n * 15);
          fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
        }
      }
      break;
    }

    case 'stone': {
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const n = pseudoNoise(x, y, 3);
          const val = Math.floor(110 + n * 35);
          fillPixel(ctx, x, y, `rgb(${val},${val},${val})`);
        }
      }
      break;
    }

    case 'cobblestone': {
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const isBorder = (x % 4 === 0 && y % 4 === 0) || (x === 0 || y === 0 || x === 15 || y === 15);
          const n = pseudoNoise(x, y, 4);
          let val = Math.floor(100 + n * 50);
          if (isBorder && n > 0.4) val = Math.max(30, val - 45);
          fillPixel(ctx, x, y, `rgb(${val},${val},${val})`);
        }
      }
      break;
    }

    case 'wood': {
      if (face === 'top' || face === 'bottom') {
        // Tree Rings
        for (let x = 0; x < 16; x++) {
          for (let y = 0; y < 16; y++) {
            const dist = Math.hypot(x - 7.5, y - 7.5);
            if (dist > 6.5) {
              // Bark rim
              fillPixel(ctx, x, y, '#5a3d28');
            } else {
              const ring = Math.floor(dist) % 2 === 0;
              const col = ring ? '#b88958' : '#a17242';
              fillPixel(ctx, x, y, col);
            }
          }
        }
      } else {
        // Bark
        for (let x = 0; x < 16; x++) {
          for (let y = 0; y < 16; y++) {
            const stripe = (x % 3 === 0) ? 0.7 : 1.0;
            const n = pseudoNoise(x, y, 5);
            const r = Math.floor((90 + n * 30) * stripe);
            const g = Math.floor((60 + n * 20) * stripe);
            const b = Math.floor((40 + n * 15) * stripe);
            fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
          }
        }
      }
      break;
    }

    case 'planks': {
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const row = Math.floor(y / 4);
          const isRowSeam = y % 4 === 0;
          const isColSeam = (row % 2 === 0 && x === 8) || (row % 2 === 1 && (x === 0 || x === 15));
          if (isRowSeam || isColSeam) {
            fillPixel(ctx, x, y, '#926c44');
          } else {
            const n = pseudoNoise(x, y, 6);
            const r = Math.floor(180 + n * 25);
            const g = Math.floor(138 + n * 20);
            const b = Math.floor(88 + n * 15);
            fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
          }
        }
      }
      break;
    }

    case 'leaves': {
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const n = pseudoNoise(x, y, 7);
          if (n > 0.85) {
            // Cutout transparent or very dark
            fillPixel(ctx, x, y, 'rgba(20, 60, 20, 0.95)');
          } else {
            const g = Math.floor(110 + n * 60);
            const r = Math.floor(35 + n * 25);
            const b = Math.floor(25 + n * 20);
            fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
          }
        }
      }
      break;
    }

    case 'glass': {
      ctx.fillStyle = 'rgba(220, 240, 255, 0.25)';
      ctx.fillRect(0, 0, 16, 16);
      // Glass border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, 15, 15);
      // Highlights
      fillPixel(ctx, 3, 3, 'rgba(255, 255, 255, 0.9)');
      fillPixel(ctx, 4, 4, 'rgba(255, 255, 255, 0.9)');
      fillPixel(ctx, 11, 10, 'rgba(255, 255, 255, 0.8)');
      fillPixel(ctx, 12, 11, 'rgba(255, 255, 255, 0.8)');
      break;
    }

    case 'sand': {
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const n = pseudoNoise(x, y, 8);
          const r = Math.floor(215 + n * 25);
          const g = Math.floor(200 + n * 25);
          const b = Math.floor(140 + n * 20);
          fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
        }
      }
      break;
    }

    case 'coal_ore':
    case 'iron_ore':
    case 'gold_ore':
    case 'diamond_ore': {
      // Base stone
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const n = pseudoNoise(x, y, 3);
          const val = Math.floor(110 + n * 35);
          fillPixel(ctx, x, y, `rgb(${val},${val},${val})`);
        }
      }
      // Ore flecks
      const flecks = [
        [3, 3], [4, 3], [3, 4],
        [10, 4], [11, 4], [11, 5],
        [6, 9], [7, 9], [7, 10], [6, 10],
        [12, 11], [13, 11], [12, 12],
        [2, 12], [3, 13]
      ];
      let oreColor = '#222222';
      let oreHighlight = '#444444';
      if (type === 'iron_ore') {
        oreColor = '#d8af93';
        oreHighlight = '#f4d2bb';
      } else if (type === 'gold_ore') {
        oreColor = '#fcee4b';
        oreHighlight = '#fff486';
      } else if (type === 'diamond_ore') {
        oreColor = '#4dedf4';
        oreHighlight = '#b3f7fa';
      }
      flecks.forEach(([fx, fy], idx) => {
        fillPixel(ctx, fx, fy, idx % 2 === 0 ? oreHighlight : oreColor);
      });
      break;
    }

    case 'obsidian': {
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const n = pseudoNoise(x, y, 9);
          const r = Math.floor(20 + n * 20);
          const g = Math.floor(15 + n * 15);
          const b = Math.floor(35 + n * 30);
          fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
        }
      }
      break;
    }

    case 'bricks': {
      ctx.fillStyle = '#bfa59a'; // Mortar
      ctx.fillRect(0, 0, 16, 16);
      const brickColors = ['#a04332', '#913b2c', '#b04b39'];
      for (let row = 0; row < 4; row++) {
        const yStart = row * 4 + 1;
        const offset = (row % 2 === 0) ? 0 : 4;
        for (let col = -1; col < 4; col++) {
          const xStart = col * 8 + offset + 1;
          const colIdx = Math.floor(pseudoNoise(row, col, 10) * 3);
          ctx.fillStyle = brickColors[colIdx];
          ctx.fillRect(Math.max(0, xStart), yStart, Math.min(16 - xStart, 7), 3);
        }
      }
      break;
    }

    case 'bookshelf': {
      if (face === 'top' || face === 'bottom') {
        return generateTextureCanvas('planks', 'side');
      }
      // Wood frame + colorful books
      ctx.fillStyle = '#a17242';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#22150c';
      ctx.fillRect(1, 2, 14, 5);
      ctx.fillRect(1, 9, 14, 5);
      const bookColors = ['#8e2828', '#255883', '#397839', '#966a2b', '#6d3879'];
      for (let b = 0; b < 5; b++) {
        const bx = 2 + b * 2.6;
        ctx.fillStyle = bookColors[b % bookColors.length];
        ctx.fillRect(bx, 2, 2, 5);
        ctx.fillStyle = bookColors[(b + 2) % bookColors.length];
        ctx.fillRect(bx, 9, 2, 5);
      }
      break;
    }

    case 'crafting_table': {
      if (face === 'top') {
        // 3x3 Grid pattern with crafting tools
        ctx.fillStyle = '#bc8c56';
        ctx.fillRect(0, 0, 16, 16);
        ctx.strokeStyle = '#624223';
        ctx.lineWidth = 1;
        ctx.strokeRect(1.5, 1.5, 13, 13);
        ctx.beginPath();
        ctx.moveTo(6, 2); ctx.lineTo(6, 14);
        ctx.moveTo(10, 2); ctx.lineTo(10, 14);
        ctx.moveTo(2, 6); ctx.lineTo(14, 6);
        ctx.moveTo(2, 10); ctx.lineTo(14, 10);
        ctx.stroke();
      } else {
        // Wood sides with saw & hammer
        ctx.fillStyle = '#a17242';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#624223';
        ctx.strokeRect(0.5, 0.5, 15, 15);
        ctx.fillStyle = '#333333';
        ctx.fillRect(4, 5, 2, 6);
        ctx.fillRect(3, 4, 4, 2);
        ctx.fillRect(10, 5, 2, 6);
      }
      break;
    }

    case 'furnace': {
      if (face === 'top' || face === 'bottom') {
        return generateTextureCanvas('stone', 'side');
      } else if (face === 'front') {
        // Stone face with mouth
        for (let x = 0; x < 16; x++) {
          for (let y = 0; y < 16; y++) {
            const n = pseudoNoise(x, y, 11);
            const val = Math.floor(100 + n * 30);
            fillPixel(ctx, x, y, `rgb(${val},${val},${val})`);
          }
        }
        // Mouth
        ctx.fillStyle = '#1c1c1c';
        ctx.fillRect(3, 8, 10, 6);
        ctx.fillStyle = '#e86a17';
        ctx.fillRect(5, 10, 6, 3);
        ctx.fillStyle = '#ffcf33';
        fillPixel(ctx, 7, 11, '#ffcf33');
        fillPixel(ctx, 8, 12, '#ffcf33');
      } else {
        return generateTextureCanvas('cobblestone', 'side');
      }
      break;
    }

    case 'torch': {
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fillRect(0, 0, 16, 16);
      // Stick
      ctx.fillStyle = '#6e492c';
      ctx.fillRect(7, 6, 2, 10);
      // Flame
      ctx.fillStyle = '#ff9900';
      ctx.fillRect(6, 2, 4, 4);
      ctx.fillStyle = '#ffee44';
      ctx.fillRect(7, 3, 2, 2);
      break;
    }

    case 'glowstone': {
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const n = pseudoNoise(x, y, 12);
          const r = Math.floor(220 + n * 35);
          const g = Math.floor(190 + n * 45);
          const b = Math.floor(100 + n * 40);
          fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
        }
      }
      break;
    }

    case 'tnt': {
      if (face === 'top' || face === 'bottom') {
        ctx.fillStyle = '#9e2b20';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#444444';
        fillPixel(ctx, 7, 7, '#222222');
        fillPixel(ctx, 8, 8, '#222222');
      } else {
        // Red with white TNT stripe
        ctx.fillStyle = '#bd2e22';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 5, 16, 6);
        ctx.fillStyle = '#111111';
        ctx.font = 'bold 5px sans-serif';
        ctx.fillText('TNT', 2, 10);
      }
      break;
    }

    case 'water': {
      ctx.fillStyle = 'rgba(32, 110, 220, 0.7)';
      ctx.fillRect(0, 0, 16, 16);
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          if ((x + y) % 4 === 0) {
            fillPixel(ctx, x, y, 'rgba(80, 160, 255, 0.85)');
          }
        }
      }
      break;
    }

    case 'red_wool':
    case 'blue_wool':
    case 'yellow_wool': {
      const baseColors = {
        red_wool: [180, 40, 40],
        blue_wool: [40, 80, 190],
        yellow_wool: [210, 190, 40],
      }[type];
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const n = pseudoNoise(x, y, 13);
          const r = Math.floor(baseColors[0] + n * 25);
          const g = Math.floor(baseColors[1] + n * 25);
          const b = Math.floor(baseColors[2] + n * 25);
          fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
        }
      }
      break;
    }

    case 'bedrock': {
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const n = pseudoNoise(x, y, 55);
          const val = Math.floor(15 + n * 50);
          fillPixel(ctx, x, y, `rgb(${val},${val},${val})`);
        }
      }
      break;
    }

    case 'mossy_cobblestone': {
      // Base cobblestone
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const isBorder = (x % 4 === 0 && y % 4 === 0) || (x === 0 || y === 0 || x === 15 || y === 15);
          const n = pseudoNoise(x, y, 4);
          let val = Math.floor(100 + n * 50);
          if (isBorder && n > 0.4) val = Math.max(30, val - 45);

          // Green moss overlay
          const mossNoise = pseudoNoise(x, y, 99);
          if (mossNoise > 0.45) {
            const mg = Math.floor(120 + mossNoise * 50);
            const mr = Math.floor(45 + mossNoise * 30);
            const mb = Math.floor(30 + mossNoise * 20);
            fillPixel(ctx, x, y, `rgb(${mr},${mg},${mb})`);
          } else {
            fillPixel(ctx, x, y, `rgb(${val},${val},${val})`);
          }
        }
      }
      break;
    }

    case 'sandstone': {
      if (face === 'top') {
        for (let x = 0; x < 16; x++) {
          for (let y = 0; y < 16; y++) {
            const n = pseudoNoise(x, y, 22);
            const r = Math.floor(215 + n * 20);
            const g = Math.floor(198 + n * 20);
            const b = Math.floor(145 + n * 20);
            fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
          }
        }
      } else if (face === 'bottom') {
        ctx.fillStyle = '#c7b37e';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#a6905d';
        ctx.strokeRect(1, 1, 14, 14);
      } else {
        // Stratified desert sandstone sides
        for (let y = 0; y < 16; y++) {
          const stripe = (y % 4 === 0) ? -20 : 0;
          for (let x = 0; x < 16; x++) {
            const n = pseudoNoise(x, y, 23);
            const r = Math.max(0, Math.floor(210 + stripe + n * 25));
            const g = Math.max(0, Math.floor(192 + stripe + n * 25));
            const b = Math.max(0, Math.floor(140 + stripe + n * 20));
            fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
          }
        }
      }
      break;
    }

    case 'gravel': {
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const n = pseudoNoise(x, y, 31);
          const r = Math.floor(130 + n * 45);
          const g = Math.floor(125 + n * 40);
          const b = Math.floor(120 + n * 40);
          fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
        }
      }
      break;
    }

    case 'spruce_wood': {
      if (face === 'top' || face === 'bottom') {
        for (let x = 0; x < 16; x++) {
          for (let y = 0; y < 16; y++) {
            const dist = Math.hypot(x - 7.5, y - 7.5);
            fillPixel(ctx, x, y, dist > 6 ? '#342214' : '#6f4f34');
          }
        }
      } else {
        // Dark pine bark
        for (let x = 0; x < 16; x++) {
          for (let y = 0; y < 16; y++) {
            const stripe = (x % 4 === 0) ? 0.7 : 1.0;
            const n = pseudoNoise(x, y, 35);
            const r = Math.floor((65 + n * 25) * stripe);
            const g = Math.floor((45 + n * 20) * stripe);
            const b = Math.floor((28 + n * 15) * stripe);
            fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
          }
        }
      }
      break;
    }

    case 'birch_wood': {
      if (face === 'top' || face === 'bottom') {
        for (let x = 0; x < 16; x++) {
          for (let y = 0; y < 16; y++) {
            const dist = Math.hypot(x - 7.5, y - 7.5);
            fillPixel(ctx, x, y, dist > 6 ? '#cfcfce' : '#e6d8b8');
          }
        }
      } else {
        // White birch bark with black horizontal knots
        for (let x = 0; x < 16; x++) {
          for (let y = 0; y < 16; y++) {
            const isKnot = (y % 5 === 0 && x >= 4 && x <= 9) || (y % 7 === 2 && x >= 11 && x <= 14);
            if (isKnot) {
              fillPixel(ctx, x, y, '#222222');
            } else {
              const n = pseudoNoise(x, y, 37);
              const val = Math.floor(215 + n * 35);
              fillPixel(ctx, x, y, `rgb(${val},${val},${Math.floor(val * 0.95)})`);
            }
          }
        }
      }
      break;
    }

    case 'spruce_leaves': {
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const n = pseudoNoise(x, y, 39);
          const g = Math.floor(80 + n * 45);
          const r = Math.floor(25 + n * 20);
          const b = Math.floor(30 + n * 25);
          fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
        }
      }
      break;
    }

    case 'cactus': {
      if (face === 'top' || face === 'bottom') {
        for (let x = 0; x < 16; x++) {
          for (let y = 0; y < 16; y++) {
            const n = pseudoNoise(x, y, 42);
            fillPixel(ctx, x, y, `rgb(${Math.floor(25 + n * 15)},${Math.floor(130 + n * 35)},${Math.floor(30 + n * 15)})`);
          }
        }
      } else {
        // Green cactus with vertical ridges and spines
        for (let x = 0; x < 16; x++) {
          const isGroove = x % 4 === 0;
          for (let y = 0; y < 16; y++) {
            const isSpine = (y % 4 === 2 && (x % 4 === 2));
            if (isSpine) {
              fillPixel(ctx, x, y, '#e0f2b3');
            } else {
              const n = pseudoNoise(x, y, 43);
              const g = Math.floor((isGroove ? 100 : 145) + n * 25);
              const r = Math.floor((isGroove ? 20 : 35) + n * 15);
              const b = Math.floor(20 + n * 15);
              fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
            }
          }
        }
      }
      break;
    }

    case 'snow': {
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const n = pseudoNoise(x, y, 48);
          const val = Math.floor(240 + n * 15);
          fillPixel(ctx, x, y, `rgb(${val},${val},${Math.min(255, val + 5)})`);
        }
      }
      break;
    }

    case 'ice': {
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const n = pseudoNoise(x, y, 51);
          const isCrack = (x === y || x === 15 - y) && n > 0.3;
          if (isCrack) {
            fillPixel(ctx, x, y, 'rgba(255, 255, 255, 0.9)');
          } else {
            const r = Math.floor(170 + n * 30);
            const g = Math.floor(215 + n * 30);
            const b = Math.floor(255);
            fillPixel(ctx, x, y, `rgba(${r},${g},${b},0.85)`);
          }
        }
      }
      break;
    }

    case 'chest': {
      // Oak wood chest with dark metal band and silver front lock latch
      ctx.fillStyle = '#8f683b';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#2f2115';
      ctx.strokeRect(1, 1, 14, 14);

      if (face === 'side' || face === 'front') {
        // Horizontal band
        ctx.fillStyle = '#2f2115';
        ctx.fillRect(0, 7, 16, 2);

        if (face === 'front') {
          // Iron Lock Clasp
          ctx.fillStyle = '#dddddd';
          ctx.fillRect(7, 6, 2, 4);
          ctx.fillStyle = '#444444';
          fillPixel(ctx, 7, 7, '#222222');
        }
      }
      break;
    }

    case 'farmland': {
      if (face === 'top') {
        // Moist dark soil
        for (let x = 0; x < 16; x++) {
          for (let y = 0; y < 16; y++) {
            const n = pseudoNoise(x, y, 61);
            const r = Math.floor(65 + n * 20);
            const g = Math.floor(40 + n * 15);
            const b = Math.floor(25 + n * 10);
            fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
          }
        }
      } else {
        return generateTextureCanvas('dirt', 'side');
      }
      break;
    }

    case 'dragon_egg': {
      // Obsidian-black egg shell with glowing purple ender flakes
      ctx.fillStyle = '#0c0714';
      ctx.fillRect(0, 0, 16, 16);
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const n = pseudoNoise(x, y, 77);
          if (n > 0.65) {
            fillPixel(ctx, x, y, '#9333ea'); // Glowing violet specks
          } else if (n > 0.5) {
            fillPixel(ctx, x, y, '#2e1065');
          } else {
            const v = Math.floor(10 + n * 18);
            fillPixel(ctx, x, y, `rgb(${v},${Math.floor(v*0.6)},${Math.floor(v*1.2)})`);
          }
        }
      }
      break;
    }

    case 'iron_block':
    case 'gold_block':
    case 'diamond_block': {
      const baseColors = {
        iron_block: [225, 225, 225],
        gold_block: [250, 225, 60],
        diamond_block: [90, 240, 240],
      }[type];

      ctx.fillStyle = `rgb(${baseColors[0]},${baseColors[1]},${baseColors[2]})`;
      ctx.fillRect(0, 0, 16, 16);

      // Bevel edge
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.strokeRect(0.5, 0.5, 15, 15);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.strokeRect(1.5, 1.5, 13, 13);
      break;
    }

    case 'rail': {
      if (face === 'top') {
        ctx.clearRect(0, 0, 16, 16);
        // 4 Wooden sleepers
        const tieYs = [1, 5, 9, 13];
        for (const ty of tieYs) {
          for (let x = 1; x < 15; x++) {
            for (let dy = 0; dy < 2; dy++) {
              const y = ty + dy;
              const n = pseudoNoise(x, y, 71);
              const r = Math.floor(120 + n * 20);
              const g = Math.floor(82 + n * 15);
              const b = Math.floor(48 + n * 10);
              fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
            }
          }
        }
        // Two iron rails
        for (let y = 0; y < 16; y++) {
          fillPixel(ctx, 2, y, '#f1f5f9');
          fillPixel(ctx, 3, y, '#64748b');
          fillPixel(ctx, 12, y, '#f1f5f9');
          fillPixel(ctx, 13, y, '#64748b');
          if (tieYs.some((ty) => y === ty || y === ty + 1)) {
            fillPixel(ctx, 1, y, '#334155');
            fillPixel(ctx, 4, y, '#334155');
            fillPixel(ctx, 11, y, '#334155');
            fillPixel(ctx, 14, y, '#334155');
          }
        }
      } else {
        ctx.clearRect(0, 0, 16, 16);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(0, 14, 16, 2);
      }
      break;
    }

    case 'powered_rail': {
      if (face === 'top') {
        ctx.clearRect(0, 0, 16, 16);
        const tieYs = [1, 5, 9, 13];
        for (const ty of tieYs) {
          for (let x = 1; x < 15; x++) {
            for (let dy = 0; dy < 2; dy++) {
              const y = ty + dy;
              const n = pseudoNoise(x, y, 72);
              const r = Math.floor(105 + n * 20);
              const g = Math.floor(70 + n * 15);
              const b = Math.floor(42 + n * 10);
              fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
            }
          }
        }
        // Gold rails
        for (let y = 0; y < 16; y++) {
          fillPixel(ctx, 2, y, '#fef08a');
          fillPixel(ctx, 3, y, '#ca8a04');
          fillPixel(ctx, 12, y, '#fef08a');
          fillPixel(ctx, 13, y, '#ca8a04');
        }
        // Glowing Redstone center core
        for (let y = 0; y < 16; y++) {
          fillPixel(ctx, 7, y, '#ef4444');
          fillPixel(ctx, 8, y, '#f87171');
          if (y % 4 === 2) {
            fillPixel(ctx, 6, y, '#dc2626');
            fillPixel(ctx, 9, y, '#dc2626');
          }
        }
      } else {
        ctx.clearRect(0, 0, 16, 16);
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(0, 14, 16, 2);
      }
      break;
    }

    case 'detector_rail': {
      if (face === 'top') {
        ctx.clearRect(0, 0, 16, 16);
        const tieYs = [1, 5, 9, 13];
        for (const ty of tieYs) {
          for (let x = 1; x < 15; x++) {
            for (let dy = 0; dy < 2; dy++) {
              const y = ty + dy;
              const n = pseudoNoise(x, y, 73);
              const r = Math.floor(115 + n * 20);
              const g = Math.floor(80 + n * 15);
              const b = Math.floor(46 + n * 10);
              fillPixel(ctx, x, y, `rgb(${r},${g},${b})`);
            }
          }
        }
        for (let y = 0; y < 16; y++) {
          fillPixel(ctx, 2, y, '#f1f5f9');
          fillPixel(ctx, 3, y, '#64748b');
          fillPixel(ctx, 12, y, '#f1f5f9');
          fillPixel(ctx, 13, y, '#64748b');
        }
        // Pressure plate
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(6, 4, 4, 8);
        ctx.strokeStyle = '#475569';
        ctx.strokeRect(5.5, 3.5, 5, 9);
        fillPixel(ctx, 6, 4, '#ef4444');
        fillPixel(ctx, 9, 4, '#ef4444');
        fillPixel(ctx, 6, 11, '#ef4444');
        fillPixel(ctx, 9, 11, '#ef4444');
      } else {
        ctx.clearRect(0, 0, 16, 16);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(0, 14, 16, 2);
      }
      break;
    }

    case 'activator_rail': {
      if (face === 'top') {
        ctx.clearRect(0, 0, 16, 16);
        const tieYs = [1, 5, 9, 13];
        for (const ty of tieYs) {
          for (let x = 1; x < 15; x++) {
            for (let dy = 0; dy < 2; dy++) {
              fillPixel(ctx, x, ty + dy, '#78350f');
            }
          }
        }
        for (let y = 0; y < 16; y++) {
          fillPixel(ctx, 2, y, '#f1f5f9');
          fillPixel(ctx, 3, y, '#64748b');
          fillPixel(ctx, 12, y, '#f1f5f9');
          fillPixel(ctx, 13, y, '#64748b');
        }
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(7, 6, 2, 4);
        fillPixel(ctx, 7, 5, '#fef08a');
        fillPixel(ctx, 8, 5, '#fef08a');
      } else {
        ctx.clearRect(0, 0, 16, 16);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(0, 14, 16, 2);
      }
      break;
    }

    default: {
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(0, 0, 16, 16);
      break;
    }
  }

  return canvas;
}

export function getBlockTexture(type: BlockType, face: 'top' | 'bottom' | 'side' | 'front' = 'side'): THREE.CanvasTexture {
  const key = `${type}_${face}`;
  if (textureCache.has(key)) {
    return textureCache.get(key)!;
  }

  const canvas = generateTextureCanvas(type, face);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(key, texture);
  return texture;
}

// Breaking crack textures (stages 0 to 4)
export function getBreakCrackTexture(stage: number): THREE.CanvasTexture {
  const key = `crack_${stage}`;
  if (textureCache.has(key)) {
    return textureCache.get(key)!;
  }

  const [canvas, ctx] = create16x16Canvas();
  ctx.clearRect(0, 0, 16, 16);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.lineWidth = 1;

  ctx.beginPath();
  if (stage >= 0) {
    ctx.moveTo(8, 8); ctx.lineTo(12, 12);
    ctx.moveTo(8, 8); ctx.lineTo(4, 5);
  }
  if (stage >= 1) {
    ctx.moveTo(12, 12); ctx.lineTo(15, 10);
    ctx.moveTo(4, 5); ctx.lineTo(2, 2);
    ctx.moveTo(8, 8); ctx.lineTo(10, 3);
  }
  if (stage >= 2) {
    ctx.moveTo(10, 3); ctx.lineTo(14, 2);
    ctx.moveTo(8, 8); ctx.lineTo(5, 13);
    ctx.moveTo(5, 13); ctx.lineTo(2, 14);
  }
  if (stage >= 3) {
    ctx.moveTo(8, 8); ctx.lineTo(14, 8);
    ctx.moveTo(8, 8); ctx.lineTo(1, 8);
    ctx.moveTo(8, 1); ctx.lineTo(8, 15);
  }
  if (stage >= 4) {
    // Dense shatter
    for (let i = 0; i < 8; i++) {
      ctx.moveTo(pseudoNoise(i, 1) * 16, pseudoNoise(i, 2) * 16);
      ctx.lineTo(pseudoNoise(i, 3) * 16, pseudoNoise(i, 4) * 16);
    }
  }
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  textureCache.set(key, texture);
  return texture;
}

// Materials Cache for standard voxel cube (materials for 6 sides)
const materialsCache = new Map<BlockType, THREE.Material[]>();

export function getBlockMaterials(type: BlockType): THREE.Material[] {
  if (materialsCache.has(type)) {
    return materialsCache.get(type)!;
  }

  const isTransparent = type === 'glass' || type === 'leaves' || type === 'water' || type.includes('rail');
  const opacity = type === 'water' ? 0.7 : type === 'glass' ? 0.4 : 1.0;

  const createMat = (face: 'top' | 'bottom' | 'side' | 'front') => {
    return new THREE.MeshLambertMaterial({
      map: getBlockTexture(type, face),
      transparent: isTransparent,
      opacity: opacity,
      alphaTest: (type === 'leaves' || type.includes('rail')) ? 0.1 : 0.0,
      side: type === 'water' || type.includes('rail') ? THREE.DoubleSide : THREE.FrontSide,
    });
  };

  let materials: THREE.Material[];

  if (type === 'grass' || type.includes('rail')) {
    // Order in Three.js BoxGeometry: +X, -X, +Y (top), -Y (bottom), +Z, -Z
    materials = [
      createMat('side'),
      createMat('side'),
      createMat('top'),
      createMat('bottom'),
      createMat('side'),
      createMat('side'),
    ];
  } else if (type === 'wood' || type === 'spruce_wood' || type === 'birch_wood' || type === 'cactus') {
    materials = [
      createMat('side'),
      createMat('side'),
      createMat('top'),
      createMat('bottom'),
      createMat('side'),
      createMat('side'),
    ];
  } else if (type === 'sandstone' || type === 'farmland') {
    materials = [
      createMat('side'),
      createMat('side'),
      createMat('top'),
      createMat('bottom'),
      createMat('side'),
      createMat('side'),
    ];
  } else if (type === 'chest') {
    materials = [
      createMat('side'),
      createMat('side'),
      createMat('top'),
      createMat('bottom'),
      createMat('front'),
      createMat('side'),
    ];
  } else if (type === 'crafting_table') {
    materials = [
      createMat('side'),
      createMat('side'),
      createMat('top'),
      createMat('bottom'),
      createMat('side'),
      createMat('side'),
    ];
  } else if (type === 'furnace') {
    materials = [
      createMat('side'),
      createMat('side'),
      createMat('top'),
      createMat('bottom'),
      createMat('front'),
      createMat('side'),
    ];
  } else if (type === 'tnt') {
    materials = [
      createMat('side'),
      createMat('side'),
      createMat('top'),
      createMat('bottom'),
      createMat('side'),
      createMat('side'),
    ];
  } else {
    const mat = createMat('side');
    materials = [mat, mat, mat, mat, mat, mat];
  }

  materialsCache.set(type, materials);
  return materials;
}
