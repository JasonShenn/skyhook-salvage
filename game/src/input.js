// Keyboard, mouse and touch input, all funnelled into one action per frame:
// confirm (start / drop the hook / restart), pause, mute. Space, Enter and a
// click/tap all mean "do the thing in front of you", so the game plays the
// same on desktop and on a touch screen held sideways.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';

export function createInput(canvas) {
  const queue = [];
  let down = false;

  function push(action) {
    queue.push(action);
  }

  function onKey(event) {
    if (event.repeat) return;
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      push(ACTION_CONFIRM);
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      push(ACTION_PAUSE);
    } else if (event.code === 'KeyM') {
      push(ACTION_MUTE);
    } else if (event.code === 'KeyR') {
      push(ACTION_CONFIRM);
    }
  }

  function onPointerDown(event) {
    event.preventDefault();
    down = true;
    push(ACTION_CONFIRM);
  }

  function onPointerUp() {
    down = false;
  }

  window.addEventListener('keydown', onKey);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);

  return {
    // Every action pressed since the last frame, in order; drains the queue.
    readActions() {
      return queue.splice(0, queue.length);
    },
    isPointerDown() {
      return down;
    },
  };
}
