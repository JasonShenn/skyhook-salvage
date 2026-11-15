// All sound is synthesized with the Web Audio API: short oscillator and
// filtered-noise blips, no audio files, so the game stays fully offline and
// the gate's "no network" check has nothing to trip over. Sound only starts
// after the player's first interaction (browser autoplay policy), and M mutes.
export function createAudio() {
  let context = null;
  let muted = false;
  let noiseBuffer = null;

  // Lazily built on first use, inside a user gesture.
  function ensure() {
    if (context === null) {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
      const length = Math.floor(context.sampleRate * 0.5);
      noiseBuffer = context.createBuffer(1, length, context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  }

  function tone(freqStart, freqEnd, duration, type, volume, when = 0) {
    const ctx = ensure();
    if (ctx === null || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + duration);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  function noise(duration, filterFreq, volume, when = 0) {
    const ctx = ensure();
    if (ctx === null || muted) return;
    const t0 = ctx.currentTime + when;
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(t0);
    source.stop(t0 + duration + 0.02);
  }

  return {
    // Call from the first key/click so the context is allowed to start.
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    // The hook lets go and drops.
    drop() {
      tone(520, 180, 0.22, 'sine', 0.12);
    },
    // The hook breaks the surface.
    splash() {
      noise(0.28, 900, 0.22);
    },
    // Something is caught: a bright two-note catch.
    catch() {
      tone(660, 660, 0.09, 'triangle', 0.16);
      tone(990, 990, 0.14, 'triangle', 0.16, 0.08);
    },
    // Coins in: a little arpeggio, higher when the combo is hot.
    coins(combo) {
      const base = 740 + Math.min(combo, 8) * 40;
      tone(base, base, 0.08, 'square', 0.07);
      tone(base * 1.25, base * 1.25, 0.08, 'square', 0.07, 0.07);
      tone(base * 1.5, base * 1.5, 0.16, 'square', 0.07, 0.14);
    },
    // A mine goes off: low thump plus noise.
    explosion() {
      tone(160, 40, 0.5, 'sawtooth', 0.25);
      noise(0.45, 500, 0.3);
    },
    // The day's quota is met: a rising jingle.
    dayClear() {
      [523, 659, 784, 1047].forEach((freq, i) => tone(freq, freq, 0.22, 'triangle', 0.14, i * 0.11));
    },
    // Game over: three descending notes.
    gameOver() {
      [392, 330, 262].forEach((freq, i) => tone(freq, freq * 0.94, 0.3, 'triangle', 0.14, i * 0.16));
    },
    // The last ten seconds tick.
    tick() {
      tone(1200, 1200, 0.05, 'square', 0.05);
    },
  };
}
