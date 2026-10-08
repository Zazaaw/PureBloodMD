"use client";

/**
 * Tiny Web Audio cues, carried over from the prototype. They only play after a
 * user gesture (browsers block autoplay) and never under reduced motion.
 */
let ctx: AudioContext | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = "sine", peak = 0.12) {
  const c = audio();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  gain.gain.setValueAtTime(0.0001, c.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(peak, c.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + duration + 0.05);
}

export const sounds = {
  beep: (freq = 600) => tone(freq, 0, 0.12),
  /** S1 "lub" + S2 "dub", twice. */
  heartbeat: () => {
    [0, 0.85].forEach((t) => {
      tone(55, t, 0.16, "sine", 0.5);
      tone(70, t + 0.22, 0.12, "sine", 0.35);
    });
  },
  defib: () => {
    tone(180, 0, 0.35, "sawtooth", 0.08);
    tone(90, 0.05, 0.3, "square", 0.05);
  },
  fanfare: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.18, "triangle", 0.1)),
  message: () => tone(880, 0, 0.12, "triangle", 0.08),
};
