"use client";
// Interface sounds, synthesised with the Web Audio API (no files): a soft tick on press, a
// rising pair for confirmations, a low pulse for the SOS countdown. Off unless the visitor
// turns them on; the context is created on that first, user-initiated toggle.
let ctx: AudioContext | null = null;

export function enableSound() {
  const AC =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!ctx && AC) ctx = new AC();
  void ctx?.resume();
}

function tone(
  freq: number,
  at: number,
  length: number,
  gain: number,
  type: OscillatorType = "sine",
) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + length + 0.02);
}

export type Cue = "press" | "confirm" | "alert" | "send";

export function play(cue: Cue, on: boolean) {
  if (!on || !ctx) return;
  if (cue === "press") tone(1800, 0, 0.035, 0.05, "triangle");
  if (cue === "confirm") {
    tone(660, 0, 0.12, 0.06);
    tone(990, 0.07, 0.16, 0.05);
  }
  if (cue === "send") {
    tone(520, 0, 0.1, 0.05);
    tone(780, 0.06, 0.1, 0.05);
    tone(1170, 0.12, 0.14, 0.04);
  }
  if (cue === "alert") tone(220, 0, 0.3, 0.12, "square");
}
