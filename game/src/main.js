// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens: title,
// play, paused, day clear and game over.
//
// ?seed=N fixes the salvage pattern. ?shot=start|play|combo|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CATCH, EVENT_DAY_CLEAR, EVENT_MINE, EVENT_OVER, EVENT_SCORED, EVENT_SPLASH, EVENT_TICK, nextDay, resetRun, stepWorld } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_DAY_CLEAR, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, draw } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas, seed);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    draw(renderer, world, scene.screen, scene.best, world.time, false);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function setStatus(text) {
    status.textContent = text;
  }

  function playEvents(events) {
    if (events & EVENT_SPLASH) audio.splash();
    if (events & EVENT_CATCH) audio.catch();
    if (events & EVENT_SCORED) audio.coins(world.state.combo);
    if (events & EVENT_MINE) audio.explosion();
    if (events & EVENT_TICK) audio.tick();
    if (events & EVENT_DAY_CLEAR) {
      audio.dayClear();
      screen = SCREEN_DAY_CLEAR;
      setStatus(`Day ${world.state.day} clear! Score $${world.state.score}. Press Space for day ${world.state.day + 1}.`);
    }
    if (events & EVENT_OVER) {
      audio.gameOver();
      screen = SCREEN_OVER;
      if (world.state.score > best) {
        best = world.state.score;
        saveBest(best);
      }
      setStatus(`Game over. Final score $${world.state.score}. Press R to salvage again.`);
    }
  }

  function onConfirm() {
    audio.unlock();
    if (screen === SCREEN_TITLE) {
      resetRun(world);
      screen = SCREEN_PLAY;
      setStatus('Salvaging! Space or click drops the hook.');
    } else if (screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
    } else if (screen === SCREEN_DAY_CLEAR) {
      nextDay(world);
      screen = SCREEN_PLAY;
      setStatus(`Day ${world.state.day}. Fill the quota before sunset.`);
    } else if (screen === SCREEN_OVER) {
      resetRun(world);
      screen = SCREEN_PLAY;
      setStatus('Salvaging! Space or click drops the hook.');
    }
  }

  function frame(now) {
    const elapsed = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // A confirm pressed while playing drops the hook on the very next step.
    let dropQueued = false;
    for (const action of input.readActions()) {
      if (action === ACTION_MUTE) {
        audio.unlock();
        const muted = audio.toggleMute();
        setStatus(muted ? 'Sound off.' : 'Sound on.');
      } else if (action === ACTION_PAUSE) {
        if (screen === SCREEN_PLAY) {
          screen = SCREEN_PAUSED;
          setStatus('Paused. Press P to keep salvaging.');
        } else if (screen === SCREEN_PAUSED) {
          screen = SCREEN_PLAY;
        }
      } else if (action === ACTION_CONFIRM) {
        if (screen === SCREEN_PLAY && world.hook.state === 'swing') {
          dropQueued = true;
          audio.drop();
        }
        onConfirm();
      }
    }

    if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        const events = stepWorld(world, dropQueued, STEP);
        dropQueued = false;
        playEvents(events);
        accumulator -= STEP;
      }
    }
    draw(renderer, world, screen, best, world.time, audio.isMuted());
    requestAnimationFrame(frame);
  }

  setStatus('Skyhook Salvage. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
