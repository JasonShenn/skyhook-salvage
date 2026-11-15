// The salvage itself: what floats in the drowned bay, what each thing is
// worth, and how it drifts. Values are the heart of the risk/reward choice:
// the good stuff sits deep and drifts fast, and the mines drift with it.
import { CRANE, HOOK, SEA } from './config.js';

export const KIND_CRATE = 'crate';
export const KIND_BARREL = 'barrel';
export const KIND_CHEST = 'chest';
export const KIND_ANCHOR = 'anchor';
export const KIND_PEARL = 'pearl';
export const KIND_RELIC = 'relic';
export const KIND_MINE = 'mine';
export const KIND_BUOY = 'buoy';

// value: salvage dollars. radius: grab size. weight: 1 is normal, higher
// means the hook hauls it up slower. colour: the item's own paint.
export const ITEM_TYPES = {
  [KIND_CRATE]: { value: 10, radius: 26, weight: 1, colour: '#c98f4a' },
  [KIND_BARREL]: { value: 15, radius: 24, weight: 1, colour: '#7fae6e' },
  [KIND_CHEST]: { value: 30, radius: 26, weight: 1.4, colour: '#e8b64c' },
  [KIND_ANCHOR]: { value: 40, radius: 26, weight: 2.2, colour: '#8d97a5' },
  [KIND_PEARL]: { value: 60, radius: 15, weight: 0.8, colour: '#f2e6ff' },
  [KIND_RELIC]: { value: 150, radius: 22, weight: 1, colour: '#ffd94a' },
  [KIND_MINE]: { value: 0, radius: 26, weight: 1, colour: '#3a3f4a' },
  [KIND_BUOY]: { value: 5, radius: 22, weight: 1, colour: '#e86a5a' },
};

// Spawn weights by kind. Mines and relics appear more (and less) as the days
// go on, so the bay gets richer and meaner together.
export function pickKind(random, day) {
  const roll = random.next();
  const mineChance = Math.min(0.05 + day * 0.02, 0.17);
  const relicChance = 0.04;
  if (roll < mineChance) return KIND_MINE;
  if (roll < mineChance + relicChance) return KIND_RELIC;
  if (roll < mineChance + relicChance + 0.10) return KIND_PEARL;
  if (roll < mineChance + relicChance + 0.24) return KIND_ANCHOR;
  if (roll < mineChance + relicChance + 0.44) return KIND_CHEST;
  if (roll < mineChance + relicChance + 0.66) return KIND_BARREL;
  if (roll < mineChance + relicChance + 0.88) return KIND_CRATE;
  return KIND_BUOY;
}

// One floating thing. x/y drift with the current, bob is its own little
// up-and-down phase, caught means the hook has it.
//
// Spawn positions are sampled by angle and depth from the crane pivot, and
// only accepted when the hook can actually reach them: an item the hook can
// never touch is not a choice, it is a decoration. Deep items sit near the
// centre (the hook reaches deep only straight down); shallow ones spread
// wider, so the bay still fills the whole width.
export function spawnItem(random, day, width) {
  const kind = pickKind(random, day);
  const type = ITEM_TYPES[kind];
  const deep = kind === KIND_RELIC || kind === KIND_PEARL || kind === KIND_ANCHOR;
  let x = CRANE.x;
  let y = SEA.surface + 60;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const angle = random.range(-0.85, 0.85);
    const depth = deep
      ? random.range(SEA.surface + 90, SEA.floor - 30)
      : random.range(SEA.surface + 25, SEA.floor - 60);
    const distance = (depth - CRANE.y) / Math.cos(angle);
    if (distance > HOOK.maxLength - 40) continue;
    x = CRANE.x + Math.sin(angle) * distance;
    y = depth;
    break;
  }
  return {
    kind,
    value: type.value,
    radius: type.radius,
    weight: type.weight,
    colour: type.colour,
    x,
    y,
    bob: random.range(0, Math.PI * 2),
    bobSpeed: random.range(0.6, 1.6),
    drift: random.range(0.4, 1),
    caught: false,
    active: true,
  };
}
