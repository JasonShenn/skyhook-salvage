// Skyhook Salvage: every tuning number lives here, so the feel of the game
// (swing speed, drop speed, item values, day quotas) can be tuned in one place.
export const STEP = 1 / 60;
export const BEST_KEY = 'skyhook-salvage-best';

// Logical playfield: the canvas is scaled to fit the window, so screenshots
// and play always share these exact proportions (16:9).
export const FIELD = { width: 1280, height: 720 };

// The sea surface and the sea floor the hook can reach.
export const SEA = { surface: 470, floor: 668 };

// The crane pivot hangs under the airship, dead centre.
export const CRANE = { x: 640, y: 218 };

// Pendulum swing: how far the hook swings each way (radians) and how fast.
// Days get quicker, so the swing speeds up a little every day.
export const HOOK = {
  maxAngle: 1.0,
  baseSpeed: 1.05,
  speedPerDay: 0.09,
  dropSpeed: 520,
  retractSpeed: 340,
  heavyRetractSpeed: 210,
  grabRadius: 34,
  maxLength: 560,
};

export const PLAYER = { hull: 3 };

// A day: how much salvage value must be hauled up before the sun sets, and
// how long the day lasts. Later days ask for more in less time.
export function dayPlan(day) {
  const quota = 350 + (day - 1) * 100;
  const seconds = Math.max(50, 75 - (day - 1) * 5);
  return { quota, seconds };
}

// Combo: each catch in a row without a miss adds 20% to the next catch,
// capped at double value.
export const COMBO = { step: 0.2, cap: 2 };

// The current pushes drifting salvage sideways; it grows with the day.
export function currentSpeed(day) {
  return 14 + day * 5;
}

// How many things float in the water at once, and how fast new ones arrive.
export const SPAWN = { target: 11, interval: 1.1 };

// Colours for the sunset palette, shared by the renderer.
export const PALETTE = {
  skyTop: '#1b2a52',
  skyMid: '#7a4a7d',
  skyLow: '#e8804a',
  sun: '#ffd98a',
  seaDeep: '#0d2f3f',
  seaTop: '#1d6a72',
  shipHull: '#e8b64c',
  shipTrim: '#8a5a2b',
  cable: '#d8d3c3',
  hookSteel: '#c9ced6',
};
