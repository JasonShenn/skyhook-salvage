// Juice: particles, splash rings, floating score text and screen shake.
// Nothing here affects the rules; it all exists so every catch, miss and
// explosion feels like something happened.
export function createParticles() {
  return { list: [], texts: [], shake: 0 };
}

export function burst(particles, x, y, colour, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = speed * (0.3 + Math.random() * 0.7);
    particles.list.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity - speed * 0.25,
      life: 0.5 + Math.random() * 0.4,
      age: 0,
      size: 2 + Math.random() * 4,
      colour,
      gravity: 260,
    });
  }
}

export function splashRing(particles, x, y) {
  particles.list.push({
    x, y, vx: 0, vy: 0, life: 0.45, age: 0, size: 6, colour: '#bfe8ef', gravity: 0, ring: true,
  });
  burst(particles, x, y, '#bfe8ef', 10, 130);
}

export function explosion(particles, x, y) {
  burst(particles, x, y, '#ff9a3c', 26, 320);
  burst(particles, x, y, '#3a3f4a', 16, 200);
  burst(particles, x, y, '#ffd94a', 12, 260);
  particles.shake = 14;
}

export function floatText(particles, x, y, text, colour) {
  particles.texts.push({ x, y, text, colour, life: 1.1, age: 0 });
}

export function stepParticles(particles, dt) {
  for (const p of particles.list) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.gravity * dt;
    if (p.ring) p.size += 260 * dt;
  }
  particles.list = particles.list.filter((p) => p.age < p.life);
  for (const t of particles.texts) {
    t.age += dt;
    t.y -= 42 * dt;
  }
  particles.texts = particles.texts.filter((t) => t.age < t.life);
  if (particles.shake > 0) particles.shake = Math.max(0, particles.shake - 40 * dt);
}
