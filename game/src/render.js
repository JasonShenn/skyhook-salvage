// The renderer: everything the eye sees, drawn on one canvas. The scene is
// a salvage airship over a drowned city bay at sunset: gradient sky, low sun,
// drifting clouds, broken towers rising out of the sea, the brass airship
// with its swinging crane hook, and the salvage drifting below. The HUD, the
// title screen and the end screens are drawn here too, so a screenshot shows
// the whole game exactly as the player sees it.
import { CRANE, FIELD, PALETTE, SEA } from './config.js';
import { KIND_ANCHOR, KIND_BARREL, KIND_BUOY, KIND_CHEST, KIND_CRATE, KIND_MINE, KIND_PEARL, KIND_RELIC } from './items.js';
import { hookTip } from './hook.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_DAY_CLEAR = 'dayclear';
export const SCREEN_OVER = 'over';

const FONT = '"Arial", "Helvetica", sans-serif';

// The drowned city's towers: fixed silhouettes so the skyline never changes.
const TOWERS = [
  { x: 40, w: 70, h: 150, tilt: -0.03 }, { x: 140, w: 46, h: 105, tilt: 0.02 },
  { x: 215, w: 80, h: 190, tilt: -0.01 }, { x: 330, w: 54, h: 120, tilt: 0.04 },
  { x: 420, w: 90, h: 210, tilt: -0.02 }, { x: 545, w: 48, h: 95, tilt: 0 },
  { x: 900, w: 64, h: 165, tilt: 0.03 }, { x: 990, w: 88, h: 205, tilt: -0.04 },
  { x: 1105, w: 50, h: 120, tilt: 0.02 }, { x: 1180, w: 76, h: 175, tilt: -0.02 },
];

export function createRenderer(canvas, seed) {
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  const ctx = canvas.getContext('2d');
  const random = createRandom(seed ^ 0x9e3779b9);
  const clouds = [];
  for (let i = 0; i < 7; i += 1) {
    clouds.push({
      x: random.range(0, FIELD.width),
      y: random.range(50, 260),
      w: random.range(120, 260),
      speed: random.range(4, 12),
    });
  }
  return { canvas, ctx, clouds };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawSky(ctx, renderer, time) {
  const grad = ctx.createLinearGradient(0, 0, 0, SEA.surface);
  grad.addColorStop(0, PALETTE.skyTop);
  grad.addColorStop(0.55, PALETTE.skyMid);
  grad.addColorStop(1, PALETTE.skyLow);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FIELD.width, SEA.surface + 2);

  // Low sun with a warm glow, sinking toward the horizon.
  const sunX = 1030;
  const sunY = 392;
  const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 180);
  glow.addColorStop(0, 'rgba(255, 217, 138, 0.85)');
  glow.addColorStop(1, 'rgba(255, 217, 138, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 180, sunY - 180, 360, 360);
  ctx.fillStyle = PALETTE.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 44, 0, Math.PI * 2);
  ctx.fill();

  // Slow clouds, wrapping around the screen.
  ctx.fillStyle = 'rgba(255, 214, 180, 0.20)';
  for (const cloud of renderer.clouds) {
    const x = ((cloud.x + time * cloud.speed) % (FIELD.width + 320)) - 160;
    ctx.beginPath();
    ctx.ellipse(x, cloud.y, cloud.w / 2, cloud.w / 7, 0, 0, Math.PI * 2);
    ctx.ellipse(x + cloud.w / 4, cloud.y + 8, cloud.w / 3, cloud.w / 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // The drowned city: broken towers with a few lit windows, rising from the sea.
  for (const tower of TOWERS) {
    ctx.save();
    ctx.translate(tower.x + tower.w / 2, SEA.surface + 6);
    ctx.rotate(tower.tilt);
    ctx.fillStyle = '#241f3d';
    ctx.fillRect(-tower.w / 2, -tower.h, tower.w, tower.h + 10);
    // A broken top edge.
    ctx.beginPath();
    ctx.moveTo(-tower.w / 2, -tower.h);
    ctx.lineTo(-tower.w / 6, -tower.h - 14);
    ctx.lineTo(tower.w / 4, -tower.h + 4);
    ctx.lineTo(tower.w / 2, -tower.h - 8);
    ctx.lineTo(tower.w / 2, -tower.h);
    ctx.closePath();
    ctx.fill();
    // Lit windows.
    ctx.fillStyle = 'rgba(255, 205, 110, 0.85)';
    for (let row = 0; row < Math.floor(tower.h / 34); row += 1) {
      for (let col = 0; col < Math.floor(tower.w / 22); col += 1) {
        if ((row * 3 + col * 7 + tower.x) % 5 === 0) {
          ctx.fillRect(-tower.w / 2 + 8 + col * 22, -tower.h + 16 + row * 34, 7, 10);
        }
      }
    }
    ctx.restore();
  }
}

function drawSea(ctx, time) {
  const grad = ctx.createLinearGradient(0, SEA.surface, 0, FIELD.height);
  grad.addColorStop(0, PALETTE.seaTop);
  grad.addColorStop(1, PALETTE.seaDeep);
  ctx.fillStyle = grad;
  ctx.fillRect(0, SEA.surface, FIELD.width, FIELD.height - SEA.surface);

  // Rolling wave lines.
  ctx.strokeStyle = 'rgba(190, 232, 239, 0.35)';
  ctx.lineWidth = 2;
  for (let row = 0; row < 4; row += 1) {
    const y = SEA.surface + 22 + row * 52;
    ctx.beginPath();
    for (let x = 0; x <= FIELD.width; x += 16) {
      const wave = Math.sin(x * 0.018 + time * (1.1 + row * 0.25) + row * 1.7) * 6;
      if (x === 0) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
  // Sun glitter on the water.
  ctx.fillStyle = 'rgba(255, 217, 138, 0.28)';
  for (let i = 0; i < 14; i += 1) {
    const x = 980 + Math.sin(time * 0.8 + i * 2.3) * 60 + (i % 4) * 22 - 40;
    const y = SEA.surface + 14 + i * 15;
    ctx.fillRect(x, y, 26 - (i % 3) * 6, 3);
  }
}

function drawShip(ctx, time) {
  const bob = Math.sin(time * 0.9) * 4;
  const cx = 640;
  const cy = 146 + bob;

  // Balloon envelope: cream with brass stripes and a tail fin.
  ctx.fillStyle = '#f2e3c2';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 240, 62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.shipHull;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 240, 62, 0, -0.5, 0.5);
  ctx.fill();
  ctx.fillStyle = '#c98f4a';
  ctx.fillRect(cx - 240, cy - 8, 480, 16);
  ctx.fillStyle = PALETTE.shipTrim;
  ctx.beginPath();
  ctx.moveTo(cx + 225, cy - 10);
  ctx.lineTo(cx + 285, cy - 34);
  ctx.lineTo(cx + 285, cy + 18);
  ctx.lineTo(cx + 225, cy + 10);
  ctx.closePath();
  ctx.fill();
  // Name on the envelope.
  ctx.fillStyle = '#6b4a1f';
  ctx.font = `700 22px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('KESTREL', cx, cy - 26);

  // Rigging lines down to the gondola.
  ctx.strokeStyle = '#8a7a5a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 150, cy + 48);
  ctx.lineTo(cx - 90, cy + 108);
  ctx.moveTo(cx + 150, cy + 48);
  ctx.lineTo(cx + 90, cy + 108);
  ctx.moveTo(cx - 40, cy + 58);
  ctx.lineTo(cx - 20, cy + 108);
  ctx.moveTo(cx + 40, cy + 58);
  ctx.lineTo(cx + 20, cy + 108);
  ctx.stroke();

  // Gondola with lit windows and the crane housing.
  ctx.fillStyle = '#7a4a26';
  roundRect(ctx, cx - 100, cy + 104, 200, 34, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 205, 110, 0.9)';
  for (let i = 0; i < 5; i += 1) ctx.fillRect(cx - 84 + i * 36, cy + 114, 20, 14);
  ctx.fillStyle = '#5d3a1e';
  ctx.fillRect(cx - 26, cy + 138, 52, 16);
}

// The crane cable and hook, swinging under the ship.
function drawHook(ctx, hook) {
  const tip = hookTip(hook);
  ctx.strokeStyle = PALETTE.cable;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CRANE.x, CRANE.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  // The hook: a claw that reads at a glance.
  ctx.save();
  ctx.translate(tip.x, tip.y);
  ctx.rotate(hook.angle * 0.35);
  ctx.strokeStyle = PALETTE.hookSteel;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 6, 14, Math.PI * 0.15, Math.PI * 1.15);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(0, 6);
  ctx.stroke();
  ctx.fillStyle = PALETTE.hookSteel;
  ctx.beginPath();
  ctx.arc(-12, -2, 4, 0, Math.PI * 2);
  ctx.arc(12, 16, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawItem(ctx, item, time) {
  const x = item.x;
  const y = item.y + Math.sin(item.bob) * 4;
  const r = item.radius;
  ctx.save();
  ctx.translate(x, y);

  if (item.kind === KIND_CRATE) {
    ctx.fillStyle = item.colour;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.strokeStyle = '#7a5230';
    ctx.lineWidth = 4;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.beginPath();
    ctx.moveTo(-r, -r);
    ctx.lineTo(r, r);
    ctx.moveTo(r, -r);
    ctx.lineTo(-r, r);
    ctx.stroke();
  } else if (item.kind === KIND_BARREL) {
    ctx.fillStyle = item.colour;
    roundRect(ctx, -r, -r * 0.9, r * 2, r * 1.8, 8);
    ctx.fill();
    ctx.strokeStyle = '#4a6b3f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-r, -r * 0.35);
    ctx.lineTo(r, -r * 0.35);
    ctx.moveTo(-r, r * 0.35);
    ctx.lineTo(r, r * 0.35);
    ctx.stroke();
  } else if (item.kind === KIND_CHEST) {
    ctx.fillStyle = '#6b4a1f';
    roundRect(ctx, -r, -r * 0.6, r * 2, r * 1.2, 5);
    ctx.fill();
    ctx.fillStyle = item.colour;
    ctx.beginPath();
    ctx.arc(0, -r * 0.6, r, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(-4, -r, 8, r * 1.6);
    ctx.fillRect(-r, -2, r * 2, 5);
  } else if (item.kind === KIND_ANCHOR) {
    ctx.strokeStyle = item.colour;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r * 0.8);
    ctx.moveTo(-r * 0.8, -r * 0.5);
    ctx.lineTo(r * 0.8, -r * 0.5);
    ctx.moveTo(-r * 0.9, r * 0.1);
    ctx.quadraticCurveTo(-r * 0.7, r, 0, r * 0.85);
    ctx.quadraticCurveTo(r * 0.7, r, r * 0.9, r * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -r, 6, 0, Math.PI * 2);
    ctx.stroke();
  } else if (item.kind === KIND_PEARL) {
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 2.2);
    glow.addColorStop(0, 'rgba(242, 230, 255, 0.9)');
    glow.addColorStop(1, 'rgba(242, 230, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-r * 2.2, -r * 2.2, r * 4.4, r * 4.4);
    ctx.fillStyle = item.colour;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.3, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.kind === KIND_RELIC) {
    const pulse = 1 + Math.sin(time * 5) * 0.12;
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 2.6);
    glow.addColorStop(0, 'rgba(255, 217, 74, 0.9)');
    glow.addColorStop(1, 'rgba(255, 217, 74, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-r * 2.6, -r * 2.6, r * 5.2, r * 5.2);
    ctx.save();
    ctx.scale(pulse, pulse);
    ctx.fillStyle = item.colour;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.1);
    ctx.lineTo(r * 0.8, 0);
    ctx.lineTo(0, r * 1.1);
    ctx.lineTo(-r * 0.8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (item.kind === KIND_MINE) {
    ctx.fillStyle = item.colour;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#20242e';
    ctx.lineWidth = 5;
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7);
      ctx.lineTo(Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15);
      ctx.stroke();
    }
    const blink = Math.sin(time * 6) > 0;
    ctx.fillStyle = blink ? '#ff3b30' : '#7a1f1a';
    ctx.beginPath();
    ctx.arc(0, -r * 0.2, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.kind === KIND_BUOY) {
    ctx.fillStyle = item.colour;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.8, r * 0.7);
    ctx.lineTo(-r * 0.8, r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2ede0';
    ctx.fillRect(-r * 0.55, -r * 0.1, r * 1.1, r * 0.35);
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath();
    ctx.arc(0, -r - 4, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // A caught item rides the hook: draw a little chain link to the cable.
  if (item.caught) {
    ctx.strokeStyle = PALETTE.cable;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(0, -r - 16);
    ctx.stroke();
  }
  ctx.restore();
}

function drawParticles(ctx, particles) {
  for (const p of particles.list) {
    const alpha = 1 - p.age / p.life;
    if (p.ring) {
      ctx.strokeStyle = p.colour;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.colour;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of particles.texts) {
    const alpha = 1 - t.age / t.life;
    ctx.globalAlpha = alpha;
    ctx.font = `700 30px ${FONT}`;
    ctx.fillStyle = t.colour;
    ctx.fillText(t.text, t.x, t.y);
    ctx.globalAlpha = 1;
  }
}

function drawHeart(ctx, x, y, size, filled) {
  ctx.fillStyle = filled ? '#ff5a6e' : 'rgba(255, 255, 255, 0.25)';
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.35);
  ctx.bezierCurveTo(x - size, y - size * 0.35, x - size * 0.4, y - size, x, y - size * 0.3);
  ctx.bezierCurveTo(x + size * 0.4, y - size, x + size, y - size * 0.35, x, y + size * 0.35);
  ctx.fill();
}

function drawHud(ctx, state) {
  ctx.textBaseline = 'middle';
  // Day and score, top left.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(10, 16, 32, 0.45)';
  roundRect(ctx, 16, 14, 250, 64, 10);
  ctx.fill();
  ctx.fillStyle = '#ffd98a';
  ctx.font = `700 20px ${FONT}`;
  ctx.fillText(`DAY ${state.day}`, 30, 32);
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText(`$${state.score}`, 30, 60);

  // Quota bar, top centre.
  const barW = 380;
  const barX = (FIELD.width - barW) / 2;
  ctx.fillStyle = 'rgba(10, 16, 32, 0.45)';
  roundRect(ctx, barX - 12, 14, barW + 24, 64, 10);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 16px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`QUOTA  $${Math.min(state.quotaProgress, state.quota)} / $${state.quota}`, FIELD.width / 2, 30);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  roundRect(ctx, barX, 44, barW, 18, 9);
  ctx.fill();
  ctx.fillStyle = '#7fe0a8';
  const fillW = Math.min(1, state.quotaProgress / state.quota) * barW;
  if (fillW > 0) {
    roundRect(ctx, barX, 44, fillW, 18, 9);
    ctx.fill();
  }

  // Timer and hull, top right.
  ctx.fillStyle = 'rgba(10, 16, 32, 0.45)';
  roundRect(ctx, FIELD.width - 266, 14, 250, 64, 10);
  ctx.fill();
  const seconds = Math.max(0, Math.ceil(state.timeLeft));
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, '0');
  ctx.fillStyle = seconds <= 10 ? '#ff8a7a' : '#ffffff';
  ctx.font = `700 28px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(`☀ ${mm}:${ss}`, FIELD.width - 30, 40);
  for (let i = 0; i < 3; i += 1) {
    drawHeart(ctx, FIELD.width - 150 + i * 34, 62, 11, i < state.hull);
  }

  // Combo badge, bottom centre: clear of the airship and the action.
  if (state.combo >= 2) {
    ctx.fillStyle = 'rgba(10, 16, 32, 0.55)';
    const label = `COMBO x${state.combo}`;
    ctx.font = `700 20px ${FONT}`;
    const w = ctx.measureText(label).width + 28;
    roundRect(ctx, FIELD.width / 2 - w / 2, FIELD.height - 52, w, 34, 17);
    ctx.fill();
    ctx.fillStyle = '#7fe0ff';
    ctx.textAlign = 'center';
    ctx.fillText(label, FIELD.width / 2, FIELD.height - 34);
  }

  // Controls hint, bottom left.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = `400 15px ${FONT}`;
  ctx.fillText('SPACE / CLICK — drop the hook      P — pause      M — sound', 18, FIELD.height - 16);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(12, 18, 38, 0.94)';
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 217, 138, 0.5)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 18);
  ctx.stroke();
}

function drawTitle(ctx, best) {
  ctx.fillStyle = 'rgba(10, 14, 30, 0.45)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd98a';
  ctx.font = `700 84px ${FONT}`;
  ctx.fillText('SKYHOOK SALVAGE', FIELD.width / 2, 218);
  ctx.fillStyle = '#ffffff';
  ctx.font = `400 26px ${FONT}`;
  ctx.fillText('Fish the drowned city from the airship Kestrel — before the sun sets.', FIELD.width / 2, 272);

  panel(ctx, FIELD.width / 2 - 330, 312, 660, 168);
  ctx.fillStyle = '#ffffff';
  ctx.font = `400 21px ${FONT}`;
  ctx.fillText('🪝  The hook swings on its own — drop it when it points at salvage.', FIELD.width / 2, 348);
  ctx.fillText('💰  Fill the day’s quota before sunset to sail on to the next day.', FIELD.width / 2, 388);
  ctx.fillText('💣  Mines cost a hull. Three hits and the Kestrel goes down.', FIELD.width / 2, 428);
  ctx.fillText('✨  Catches in a row build a combo — up to double value.', FIELD.width / 2, 458);

  ctx.fillStyle = '#ffd98a';
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText('PRESS SPACE OR CLICK TO START', FIELD.width / 2, 540);
  if (best > 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = `400 20px ${FONT}`;
    ctx.fillText(`Best score: $${best}`, FIELD.width / 2, 582);
  }
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(10, 14, 30, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 56px ${FONT}`;
  ctx.fillText('PAUSED', FIELD.width / 2, 330);
  ctx.font = `400 22px ${FONT}`;
  ctx.fillText('Press P or click to keep salvaging.', FIELD.width / 2, 384);
}

function drawDayClear(ctx, state) {
  ctx.fillStyle = 'rgba(10, 14, 30, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(ctx, FIELD.width / 2 - 300, 210, 600, 280);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7fe0a8';
  ctx.font = `700 52px ${FONT}`;
  ctx.fillText(`DAY ${state.day} CLEAR!`, FIELD.width / 2, 272);
  ctx.fillStyle = '#ffffff';
  ctx.font = `400 24px ${FONT}`;
  ctx.fillText(`Quota filled — time and hull bonus: +$${state.lastGain}`, FIELD.width / 2, 330);
  ctx.fillText(`Score so far: $${state.score}      Best combo: x${state.bestCombo}`, FIELD.width / 2, 372);
  ctx.fillStyle = '#ffd98a';
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText(`PRESS SPACE FOR DAY ${state.day + 1}`, FIELD.width / 2, 440);
}

function drawGameOver(ctx, state, best) {
  ctx.fillStyle = 'rgba(10, 14, 30, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(ctx, FIELD.width / 2 - 320, 180, 640, 340);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff8a7a';
  ctx.font = `700 52px ${FONT}`;
  ctx.fillText(state.hull <= 0 ? 'HULL BREACHED!' : 'THE SUN HAS SET', FIELD.width / 2, 244);
  ctx.fillStyle = '#ffffff';
  ctx.font = `400 23px ${FONT}`;
  ctx.fillText(
    state.hull <= 0
      ? 'The Kestrel took one mine too many.'
      : `Day ${state.day} ended $${Math.max(0, state.quota - state.quotaProgress)} short of quota.`,
    FIELD.width / 2, 300,
  );
  ctx.font = `700 34px ${FONT}`;
  ctx.fillStyle = '#ffd98a';
  ctx.fillText(`FINAL SCORE  $${state.score}`, FIELD.width / 2, 356);
  ctx.fillStyle = '#ffffff';
  ctx.font = `400 22px ${FONT}`;
  ctx.fillText(`Best: $${Math.max(best, state.score)}      Days: ${state.day}      Catches: ${state.catches}      Best combo: x${state.bestCombo}`, FIELD.width / 2, 404);
  ctx.fillStyle = '#ffd98a';
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText('PRESS R OR CLICK TO SALVAGE AGAIN', FIELD.width / 2, 468);
}

export function draw(renderer, world, screen, best, time, muted) {
  const { ctx } = renderer;
  const state = world.state;
  ctx.save();
  if (world.particles.shake > 0) {
    ctx.translate((Math.random() - 0.5) * world.particles.shake, (Math.random() - 0.5) * world.particles.shake);
  }
  drawSky(ctx, renderer, time);
  drawSea(ctx, time);
  for (const item of state.items) {
    if (item.active && !item.caught) drawItem(ctx, item, time);
  }
  drawShip(ctx, time);
  drawHook(ctx, world.hook);
  // A caught item rides just under the hook tip.
  if (world.hook.caught) drawItem(ctx, world.hook.caught, time);
  drawParticles(ctx, world.particles);
  ctx.restore();

  if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(ctx, state);
  if (screen === SCREEN_TITLE) drawTitle(ctx, best);
  if (screen === SCREEN_PAUSED) drawPaused(ctx);
  if (screen === SCREEN_DAY_CLEAR) drawDayClear(ctx, state);
  if (screen === SCREEN_OVER) drawGameOver(ctx, state, best);
  if (muted) {
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = `400 15px ${FONT}`;
    ctx.fillText('MUTED (M)', FIELD.width - 16, FIELD.height - 16);
  }
}
