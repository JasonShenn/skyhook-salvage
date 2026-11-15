// The crane hook: a pendulum that swings under the airship, drops straight
// down its aim line, grabs the first thing it touches, and hauls it back up.
// Three states only: swinging, dropping, retracting. The hook is the whole
// skill of the game: read the swing, drop at the right instant.
import { CRANE, HOOK, SEA } from './config.js';

export const HOOK_SWING = 'swing';
export const HOOK_DROP = 'drop';
export const HOOK_RETRACT = 'retract';

export function createHook() {
  return {
    angle: 0,
    // +1 swings right, -1 swings left.
    direction: 1,
    length: 90,
    state: HOOK_SWING,
    caught: null,
    splashed: false,
  };
}

// Where the hook's tip is right now, in playfield pixels.
export function hookTip(hook) {
  return {
    x: CRANE.x + Math.sin(hook.angle) * hook.length,
    y: CRANE.y + Math.cos(hook.angle) * hook.length,
  };
}

// The angle from the pivot to a point (for the screenshot autopilot).
export function angleTo(x, y) {
  return Math.atan2(x - CRANE.x, y - CRANE.y);
}

export function startDrop(hook) {
  if (hook.state !== HOOK_SWING) return false;
  hook.state = HOOK_DROP;
  hook.splashed = false;
  return true;
}

// Advance the hook one step. Returns 'grab' when it catches something,
// 'miss' when it comes back empty, 'floor' when it touches the sea floor,
// 'splash' the moment it breaks the surface, or null while it travels.
export function stepHook(hook, items, dt, swingSpeed) {
  if (hook.state === HOOK_SWING) {
    hook.angle += hook.direction * swingSpeed * dt;
    if (hook.angle > HOOK.maxAngle) {
      hook.angle = HOOK.maxAngle;
      hook.direction = -1;
    } else if (hook.angle < -HOOK.maxAngle) {
      hook.angle = -HOOK.maxAngle;
      hook.direction = 1;
    }
    hook.length = 90;
    return null;
  }

  if (hook.state === HOOK_DROP) {
    hook.length += HOOK.dropSpeed * dt;
    const tip = hookTip(hook);
    if (!hook.splashed && tip.y >= SEA.surface) {
      hook.splashed = true;
      return 'splash';
    }
    if (hook.length >= HOOK.maxLength || tip.y >= SEA.floor) {
      hook.state = HOOK_RETRACT;
      return 'floor';
    }
    for (const item of items) {
      if (!item.active || item.caught) continue;
      const dx = tip.x - item.x;
      const dy = tip.y - item.y;
      const reach = HOOK.grabRadius + item.radius * 0.6;
      if (dx * dx + dy * dy < reach * reach) {
        item.caught = true;
        hook.caught = item;
        hook.state = HOOK_RETRACT;
        return 'grab';
      }
    }
    return null;
  }

  // Retracting: the catch (if any) rides the tip back to the ship.
  const speed = hook.caught ? HOOK.retractSpeed / hook.caught.weight : HOOK.retractSpeed;
  hook.length -= speed * dt;
  if (hook.caught) {
    const tip = hookTip(hook);
    hook.caught.x = tip.x;
    hook.caught.y = tip.y + hook.caught.radius * 0.4;
  }
  if (hook.length <= 90) {
    hook.length = 90;
    const caught = hook.caught;
    hook.caught = null;
    hook.state = HOOK_SWING;
    return caught ? 'delivered' : 'miss';
  }
  return null;
}
