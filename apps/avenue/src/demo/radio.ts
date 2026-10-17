"use client";
// AVENUE Radio: two stations, EDM and lo-fi, generated live with the Web Audio API. No audio
// files and no licensed music: every kick, chord and crackle is synthesised here, and a track
// is a seed (key, progression, pattern). One stream at a time, for the seat the visitor is in,
// as a multi-zone car would route each seat's audio to its own speakers or headphones.
import type { Station } from "./system";

type Engine = {
  ctx: AudioContext;
  out: GainNode;
  bus: GainNode;
  analyser: AnalyserNode;
  delay: DelayNode;
  noise: AudioBuffer;
};

let engine: Engine | null = null;
let current: { station: Station; seed: number } | null = null;
let volume = 0.6;

function ctxClass() {
  return (
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  );
}

/** The shared audio context; created on a user gesture (the sound gate or a sound toggle). */
export function audioContext(): AudioContext | null {
  if (engine) return engine.ctx;
  const AC = ctxClass();
  if (!AC) return null;
  const ctx = new AC();
  const out = ctx.createGain();
  out.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 3;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0.78;
  const bus = ctx.createGain();
  const delay = ctx.createDelay(1);
  const fb = ctx.createGain();
  fb.gain.value = 0.32;
  const wet = ctx.createGain();
  wet.gain.value = 0.22;
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 3200;
  delay.connect(fb).connect(tone).connect(delay);
  delay.connect(wet).connect(bus);
  bus.connect(comp).connect(out).connect(analyser).connect(ctx.destination);
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  engine = { ctx, out, bus, analyser, delay, noise };
  return ctx;
}

export function analyser(): AnalyserNode | null {
  return engine?.analyser ?? null;
}

export function nowStreaming() {
  return current;
}

export function setVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  if (engine && current) engine.out.gain.setTargetAtTime(volume * 0.8, engine.ctx.currentTime, 0.1);
}

// ---------------------------------------------------------------- music theory, small

const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);

function rng(seed: number) {
  let t = seed * 2654435761;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

type Song = {
  bpm: number;
  swing: number;
  /** Chords as MIDI notes, one per bar. */
  chords: number[][];
  bass: number[];
  rand: () => number;
};

function compose(station: Station, seed: number): Song {
  const rand = rng(seed);
  if (station === "edm") {
    const root = [45, 46, 48, 50][seed % 4] ?? 45; // A, A#, C, D (minor)
    // i  VI  III  VII
    const prog = [
      [0, 3, 7],
      [-4, 0, 3],
      [3, 7, 10],
      [-2, 2, 5],
    ];
    const order = seed % 2 ? [0, 1, 2, 3] : [0, 3, 1, 2];
    const chords = order.map((i) => (prog[i] ?? [0, 3, 7]).map((n) => root + 24 + n));
    const bass = order.map((i) => root + (prog[i]?.[0] ?? 0));
    return { bpm: 124 + (seed % 3) * 2, swing: 0, chords, bass, rand };
  }
  const root = [50, 48, 53, 51][seed % 4] ?? 50; // D, C, F, D# (major key, jazzy)
  // ii9  V13  Imaj9  vi9
  const prog = [
    [2, 5, 9, 12, 16],
    [7, 11, 14, 16, 21],
    [0, 4, 7, 11, 14],
    [9, 12, 16, 19, 23],
  ];
  const chords = prog.map((c) => c.map((n) => root + 12 + n));
  const bass = prog.map((c) => root - 12 + (c[0] ?? 0));
  return { bpm: 74 + (seed % 3) * 3, swing: 0.58, chords, bass, rand };
}

// ---------------------------------------------------------------- voices

function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function kick(e: Engine, t: number, soft: boolean) {
  const o = e.ctx.createOscillator();
  const g = e.ctx.createGain();
  o.frequency.setValueAtTime(soft ? 110 : 150, t);
  o.frequency.exponentialRampToValueAtTime(soft ? 48 : 42, t + (soft ? 0.18 : 0.12));
  env(g, t, soft ? 0.55 : 0.95, 0.002, soft ? 0.3 : 0.38);
  o.connect(g).connect(e.bus);
  o.start(t);
  o.stop(t + 0.5);
}

function noiseHit(
  e: Engine,
  t: number,
  type: BiquadFilterType,
  freq: number,
  peak: number,
  decay: number,
  q = 0.8,
) {
  const src = e.ctx.createBufferSource();
  src.buffer = e.noise;
  const f = e.ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = e.ctx.createGain();
  env(g, t, peak, 0.001, decay);
  src.connect(f).connect(g).connect(e.bus);
  src.start(t, Math.random() * 1.5);
  src.stop(t + decay + 0.05);
}

function synth(
  e: Engine,
  t: number,
  freq: number,
  length: number,
  opts: {
    type: OscillatorType;
    peak: number;
    attack: number;
    cutoff: number;
    detune?: number;
    to?: AudioNode;
    send?: number;
  },
) {
  const f = e.ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = opts.cutoff;
  const g = e.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.peak, t + opts.attack);
  g.gain.setValueAtTime(opts.peak, t + Math.max(opts.attack, length - 0.08));
  g.gain.exponentialRampToValueAtTime(0.0001, t + length + 0.25);
  for (const cents of opts.detune ? [-opts.detune, opts.detune] : [0]) {
    const o = e.ctx.createOscillator();
    o.type = opts.type;
    o.frequency.value = freq;
    o.detune.value = cents;
    o.connect(f);
    o.start(t);
    o.stop(t + length + 0.3);
  }
  f.connect(g).connect(opts.to ?? e.bus);
  if (opts.send) {
    const s = e.ctx.createGain();
    s.gain.value = opts.send;
    g.connect(s).connect(e.delay);
  }
}

// ---------------------------------------------------------------- the two stations

type Player = { stop: () => void };

function play(e: Engine, station: Station, seed: number): Player {
  const song = compose(station, seed);
  const sixteenth = 60 / song.bpm / 4;
  e.delay.delayTime.value = sixteenth * 3;
  // Pads go through a sidechain gain that ducks on each kick (EDM) or a slow tremolo (lo-fi).
  const pad = e.ctx.createGain();
  pad.connect(e.bus);
  const stopNodes: AudioScheduledSourceNode[] = [];
  let crackle: GainNode | null = null;
  if (station === "lofi") {
    const src = e.ctx.createBufferSource();
    src.buffer = e.noise;
    src.loop = true;
    const f = e.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 2400;
    f.Q.value = 0.5;
    crackle = e.ctx.createGain();
    crackle.gain.value = 0.012;
    src.connect(f).connect(crackle).connect(e.bus);
    src.start();
    stopNodes.push(src);
    const lfo = e.ctx.createOscillator();
    const depth = e.ctx.createGain();
    lfo.frequency.value = 4.2;
    depth.gain.value = 0.12;
    pad.gain.value = 0.85;
    lfo.connect(depth).connect(pad.gain);
    lfo.start();
    stopNodes.push(lfo);
  }
  let step = 0;
  let next = e.ctx.currentTime + 0.08;
  const tick = () => {
    while (next < e.ctx.currentTime + 0.15) {
      const s16 = step % 16;
      const bar = Math.floor(step / 16);
      const chord = song.chords[bar % 4] ?? [];
      const bassNote = song.bass[bar % 4] ?? 45;
      const swing = s16 % 2 === 1 ? sixteenth * (song.swing ? (song.swing - 0.5) * 2 : 0) : 0;
      const t = next + swing;
      if (station === "edm") {
        const section = bar % 16;
        const breakdown = section >= 12;
        const intro = bar < 4;
        const open = Math.min(1, (bar % 16) / 8);
        if (!breakdown && s16 % 4 === 0) {
          kick(e, t, false);
          pad.gain.cancelScheduledValues(t);
          pad.gain.setValueAtTime(0.2, t);
          pad.gain.linearRampToValueAtTime(1, t + sixteenth * 3.2);
        }
        if (!intro && !breakdown && (s16 === 4 || s16 === 12))
          noiseHit(e, t, "bandpass", 1500, 0.32, 0.14, 0.9);
        if (s16 % 4 === 2) noiseHit(e, t, "highpass", 8000, intro ? 0.08 : 0.16, 0.05);
        if (!intro && s16 % 2 === 1) noiseHit(e, t, "highpass", 10000, 0.05, 0.02);
        if (!breakdown && s16 % 4 !== 0)
          synth(e, t, mtof(bassNote), sixteenth * 0.8, {
            type: "sawtooth",
            peak: 0.16,
            attack: 0.005,
            cutoff: 420 + open * 380,
          });
        if (s16 === 0)
          for (const n of chord)
            synth(e, t, mtof(n), sixteenth * 15, {
              type: "sawtooth",
              peak: breakdown ? 0.05 : 0.035,
              attack: breakdown ? 0.6 : 0.02,
              cutoff: breakdown ? 1400 : 1800 + open * 2200,
              detune: 9,
              to: pad,
            });
        if (!intro) {
          const arp = chord[(s16 * 2 + (s16 > 7 ? 1 : 0)) % chord.length] ?? 57;
          synth(e, t, mtof(arp + 12), sixteenth * 0.6, {
            type: "square",
            peak: 0.035,
            attack: 0.003,
            cutoff: 2600 + open * 1800,
            send: 0.45,
          });
        }
      } else {
        const fill = song.rand();
        if (s16 === 0 || (s16 === 10 && fill > 0.25) || (s16 === 7 && fill > 0.8)) kick(e, t, true);
        if (s16 === 4 || s16 === 12) {
          noiseHit(e, t, "bandpass", 1900, 0.2, 0.16, 0.7);
          noiseHit(e, t, "lowpass", 400, 0.06, 0.08);
        }
        if (s16 % 2 === 0) noiseHit(e, t, "highpass", 7000, 0.035 + song.rand() * 0.03, 0.04);
        if (s16 === 0 || (s16 === 11 && fill > 0.5))
          chord.forEach((n, i) => {
            const at = t + i * 0.018;
            synth(e, at, mtof(n), sixteenth * (s16 === 0 ? 10 : 4), {
              type: "sine",
              peak: 0.05,
              attack: 0.012,
              cutoff: 2200,
              to: pad,
            });
            synth(e, at, mtof(n + 12), sixteenth * 2, {
              type: "triangle",
              peak: 0.008,
              attack: 0.004,
              cutoff: 1800,
              to: pad,
            });
          });
        if (s16 === 0 || s16 === 8 || (s16 === 14 && fill > 0.6))
          synth(e, t, mtof(s16 === 14 ? bassNote + 7 : bassNote), sixteenth * 5, {
            type: "sine",
            peak: 0.22,
            attack: 0.01,
            cutoff: 600,
          });
        // A lazy melody, now and then, on the chord's upper notes.
        if (s16 % 4 === 2 && fill > 0.62) {
          const note = chord[2 + Math.floor(song.rand() * 3)] ?? 62;
          synth(e, t, mtof(note + 12), sixteenth * 2.5, {
            type: "triangle",
            peak: 0.03,
            attack: 0.01,
            cutoff: 1600,
            send: 0.5,
          });
        }
      }
      next += sixteenth;
      step++;
    }
  };
  tick();
  const id = window.setInterval(tick, 25);
  return {
    stop: () => {
      window.clearInterval(id);
      for (const n of stopNodes) n.stop(e.ctx.currentTime + 0.4);
      window.setTimeout(() => pad.disconnect(), 3000);
      crackle?.gain.setTargetAtTime(0, e.ctx.currentTime, 0.1);
    },
  };
}

let player: Player | null = null;

/** Start a track (a station and a seed), or keep it going if it is already the one playing. */
export function stream(station: Station, seed: number) {
  const ctx = audioContext();
  if (!ctx || !engine) return;
  void ctx.resume();
  if (current?.station === station && current.seed === seed && player) return;
  const e = engine;
  const t = ctx.currentTime;
  if (player) {
    const old = player;
    e.out.gain.setTargetAtTime(0, t, 0.08);
    window.setTimeout(() => old.stop(), 250);
  }
  current = { station, seed };
  window.setTimeout(
    () => {
      if (current?.station !== station || current.seed !== seed) return;
      player = play(e, station, seed);
      e.out.gain.setTargetAtTime(volume * 0.8, e.ctx.currentTime, 0.25);
    },
    player ? 280 : 0,
  );
}

export function silence() {
  if (!engine || !player) {
    current = null;
    return;
  }
  const p = player;
  player = null;
  current = null;
  engine.out.gain.setTargetAtTime(0, engine.ctx.currentTime, 0.12);
  window.setTimeout(() => p.stop(), 400);
}
