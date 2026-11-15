// The screenshot scenes behind ?shot=start|play|combo|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot (drop the hook when it points at the nearest valuable
// salvage, and never when a mine sits on the same line), so the frame is what
// a short real game looks like and the same seed always gives the same frame.
import { CRANE, FIELD, SEA, STEP } from './config.js';
import { KIND_MINE, KIND_RELIC } from './items.js';
import { angleTo, hookTip } from './hook.js';
import { EVENT_DAY_CLEAR, EVENT_OVER, resetRun, stepWorld } from './world.js';
import { SCREEN_DAY_CLEAR, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { floatText, splashRing } from './particles.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 8;
const COMBO_SECONDS = 16;
const END_LIMIT_SECONDS = 600;
const SAMPLE = STEP;

/** The valuable things the hook points at, nearest by angle first. */
function pickTargets(state, hook) {
  const targets = [];
  for (const item of state.items) {
    if (!item.active || item.caught || item.kind === KIND_MINE) continue;
    if (item.y < SEA.surface) continue;
    targets.push({ item, diff: Math.abs(angleTo(item.x, item.y) - hook.angle) });
  }
  targets.sort((a, b) => a.diff - b.diff);
  return targets;
}

/** True when a mine lies on the same aim line, closer than the target. */
function mineInTheWay(state, target) {
  const targetAngle = angleTo(target.x, target.y);
  const targetDist = Math.hypot(target.x - CRANE.x, target.y - CRANE.y);
  for (const item of state.items) {
    if (!item.active || item.caught || item.kind !== KIND_MINE) continue;
    const diff = Math.abs(angleTo(item.x, item.y) - targetAngle);
    const dist = Math.hypot(item.x - CRANE.x, item.y - CRANE.y);
    if (diff < 0.04 && dist < targetDist) return true;
  }
  return false;
}

/** Drop when the hook points at good salvage and no mine is in the way. */
function autopilot(world) {
  const { state, hook } = world;
  if (hook.state !== 'swing') return false;
  for (const target of pickTargets(state, hook)) {
    if (target.diff > 0.06) return false;
    if (!mineInTheWay(state, target.item)) return true;
  }
  return false;
}

function simulate(world, seconds) {
  let events = 0;
  for (let t = 0; t < seconds; t += SAMPLE) {
    events |= stepWorld(world, autopilot(world), SAMPLE);
    if (events & (EVENT_DAY_CLEAR | EVENT_OVER)) break;
  }
  return events;
}

// After the play simulation, freeze the hook mid-drop toward the nearest
// salvage so the frame shows the game in motion, not idling.
function stageMidDrop(world) {
  const { state, hook } = world;
  if (hook.caught) {
    hook.caught.caught = false;
    hook.caught = null;
  }
  const targets = pickTargets(state, hook);
  if (targets.length === 0) return;
  hook.state = 'drop';
  hook.angle = angleTo(targets[0].item.x, targets[0].item.y);
  hook.length = 330;
  hook.splashed = true;
  const tip = hookTip(hook);
  splashRing(world.particles, tip.x, SEA.surface);
}

// After the combo simulation, stage the money shot: a golden relic riding
// the hook up with a hot combo on the HUD. The simulation's own floating
// texts are cleared first so the staged ones read cleanly; the relic at a
// 5-catch streak pays $150 x 2.0 = $300.
function stageRelicHaul(world) {
  const { state, hook } = world;
  state.combo = 5;
  state.bestCombo = Math.max(state.bestCombo, 5);
  world.particles.texts = [];
  let relic = state.items.find((item) => item.active && !item.caught && item.kind === KIND_RELIC);
  if (!relic) {
    relic = {
      kind: KIND_RELIC, value: 150, radius: 22, weight: 1, colour: '#ffd94a',
      x: 780, y: 520, bob: 0, bobSpeed: 1, drift: 0.5, caught: false, active: true,
    };
    state.items.push(relic);
  }
  relic.caught = true;
  hook.state = 'retract';
  hook.caught = relic;
  hook.angle = angleTo(relic.x, relic.y);
  hook.length = 380;
  const tip = hookTip(hook);
  relic.x = tip.x;
  relic.y = tip.y + relic.radius * 0.4;
  floatText(world.particles, 640, 340, '+$300', '#ffd94a');
  floatText(world.particles, 640, 378, 'COMBO x5', '#7fe0ff');
}

/**
 * Set `world` to the named scene (start, play, combo or end; any other name
 * is start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  // Fresh day one, every time: the scene starts from the same place.
  resetRun(world);
  if (name === 'play') {
    simulate(world, PLAY_SECONDS);
    stageMidDrop(world);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'combo') {
    simulate(world, COMBO_SECONDS);
    stageRelicHaul(world);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'end') {
    const events = simulate(world, END_LIMIT_SECONDS);
    if (events & EVENT_DAY_CLEAR) return { screen: SCREEN_DAY_CLEAR, best: world.state.score };
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  // Title: the bay drifts and the hook swings, but nothing is caught yet.
  for (let t = 0; t < START_SECONDS; t += SAMPLE) stepWorld(world, false, SAMPLE);
  return { screen: SCREEN_TITLE, best: 0 };
}
