// The world: everything the rules touch. A day is a quota of salvage value
// to haul up before the sun sets; meet it and the next day starts richer and
// meaner, miss it (or lose all three hull) and the run ends. The world steps
// in fixed 1/60 s ticks so a screenshot run replays exactly.
import { COMBO, CRANE, FIELD, HOOK, PLAYER, SEA, SPAWN, STEP, currentSpeed, dayPlan } from './config.js';
import { KIND_MINE, spawnItem } from './items.js';
import { HOOK_DROP, HOOK_RETRACT, HOOK_SWING, createHook, hookTip, startDrop, stepHook } from './hook.js';
import { burst, createParticles, explosion, floatText, splashRing, stepParticles } from './particles.js';

export const EVENT_CATCH = 1;
export const EVENT_MINE = 2;
export const EVENT_DAY_CLEAR = 4;
export const EVENT_OVER = 8;
export const EVENT_SPLASH = 16;
export const EVENT_TICK = 32;
export const EVENT_SCORED = 64;

export function createWorld(random) {
  const world = {
    random,
    state: null,
    hook: createHook(),
    particles: createParticles(),
    spawnTimer: 0,
    time: 0,
    lastTickSecond: -1,
  };
  resetDay(world, 1, 0, PLAYER.hull);
  return world;
}

function resetDay(world, day, score, hull) {
  const plan = dayPlan(day);
  world.state = {
    day,
    score,
    quota: plan.quota,
    quotaProgress: 0,
    timeLeft: plan.seconds,
    hull,
    combo: 0,
    bestCombo: 0,
    catches: 0,
    minesHit: 0,
    items: [],
    over: false,
    dayClear: false,
    lastGain: 0,
  };
  world.hook = createHook();
  world.particles = createParticles();
  world.spawnTimer = 0;
  world.time = 0;
  world.lastTickSecond = -1;
  for (let i = 0; i < SPAWN.target; i += 1) {
    world.state.items.push(spawnItem(world.random, day, FIELD.width));
  }
}

// Start over from day 1 (used by the title screen's fresh world and by R).
export function resetRun(world) {
  resetDay(world, 1, 0, PLAYER.hull);
}

// The value of a catch, with the combo multiplier applied.
export function catchValue(item, combo) {
  const multiplier = Math.min(1 + COMBO.step * combo, COMBO.cap);
  return Math.round(item.value * multiplier);
}

// One fixed step. `drop` is true when the player pressed confirm this tick.
// Returns a bitmask of events for the main loop to sound out.
export function stepWorld(world, drop, dt = STEP) {
  const state = world.state;
  let events = 0;
  if (state.over || state.dayClear) {
    stepParticles(world.particles, dt);
    return events;
  }

  world.time += dt;
  state.timeLeft -= dt;

  // Last-ten-seconds tick, once a second.
  const whole = Math.ceil(state.timeLeft);
  if (state.timeLeft <= 10.5 && whole !== world.lastTickSecond) {
    world.lastTickSecond = whole;
    events |= EVENT_TICK;
  }

  // The current pushes everything sideways; each item bobs on its own phase.
  const current = currentSpeed(state.day);
  for (const item of state.items) {
    if (!item.active || item.caught) continue;
    item.bob += item.bobSpeed * dt;
    item.x += current * item.drift * dt * Math.sin(world.time * 0.35 + item.bob * 0.5);
    item.y += Math.sin(item.bob) * 6 * dt;
    if (item.x < 30) item.x = 30;
    if (item.x > FIELD.width - 30) item.x = FIELD.width - 30;
  }
  state.items = state.items.filter((item) => item.active);

  // Keep the bay stocked.
  world.spawnTimer -= dt;
  if (state.items.length < SPAWN.target && world.spawnTimer <= 0) {
    state.items.push(spawnItem(world.random, state.day, FIELD.width));
    world.spawnTimer = SPAWN.interval;
  }

  if (drop && world.hook.state === HOOK_SWING) startDrop(world.hook);

  const swingSpeed = HOOK.baseSpeed + HOOK.speedPerDay * (state.day - 1);
  const hookEvent = stepHook(world.hook, state.items, dt, swingSpeed);
  const tip = hookTip(world.hook);

  if (hookEvent === 'splash') {
    splashRing(world.particles, tip.x, SEA.surface);
    events |= EVENT_SPLASH;
  } else if (hookEvent === 'grab') {
    burst(world.particles, tip.x, tip.y, '#ffd94a', 8, 120);
    events |= EVENT_CATCH;
  } else if (hookEvent === 'delivered') {
    // The catch is scored when it reaches the ship.
    const caught = state.items.find((item) => item.caught);
    if (caught) {
      caught.active = false;
      state.catches += 1;
      if (caught.kind === KIND_MINE) {
        state.hull -= 1;
        state.minesHit += 1;
        state.combo = 0;
        explosion(world.particles, CRANE.x, CRANE.y + 120);
        floatText(world.particles, CRANE.x, CRANE.y + 150, 'MINE! -1 HULL', '#ff5a4a');
        events |= EVENT_MINE;
      } else {
        const gain = catchValue(caught, state.combo);
        state.lastGain = gain;
        state.score += gain;
        state.quotaProgress += gain;
        state.combo += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        floatText(world.particles, CRANE.x, CRANE.y + 150, `+$${gain}`, '#ffd94a');
        if (state.combo >= 3) {
          floatText(world.particles, CRANE.x, CRANE.y + 185, `COMBO x${state.combo}`, '#7fe0ff');
        }
        events |= EVENT_SCORED;
      }
      state.items = state.items.filter((item) => item.active);
    }
  } else if (hookEvent === 'miss') {
    // An empty hook breaks the combo: the next catch starts over at x1.
    state.combo = 0;
  }

  stepParticles(world.particles, dt);

  if (state.quotaProgress >= state.quota) {
    state.dayClear = true;
    // Time bonus: two dollars a second left on the clock, plus hull bonus.
    const bonus = Math.round(state.timeLeft) * 2 + state.hull * 25;
    state.score += bonus;
    state.lastGain = bonus;
    events |= EVENT_DAY_CLEAR;
  } else if (state.hull <= 0 || state.timeLeft <= 0) {
    state.over = true;
    events |= EVENT_OVER;
  }
  return events;
}

// Move to the next day, keeping the score and the hull.
export function nextDay(world) {
  const state = world.state;
  resetDay(world, state.day + 1, state.score, state.hull);
}
