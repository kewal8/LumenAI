"use client";

import { CircleNotch, Microphone, Stop } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";

export type VoiceStatus = "ready" | "starting" | "listening" | "writing";

/** Below this the microphone is picking up room noise, not a voice. */
const SPEECH_LEVEL = 0.06;
/** Silence this long while listening is reported through onQuiet; the microphone stays on. */
const QUIET_AFTER_MS = 5000;

const WAVES = [
  { height: 1, cycles: 1.6, direction: 1, alpha: 0.55, line: 2 },
  { height: 0.7, cycles: 2.4, direction: -1.3, alpha: 0.35, line: 1.5 },
  { height: 0.45, cycles: 3.3, direction: 1.7, alpha: 0.25, line: 1.5 },
];

/**
 * Voice waves inside the button: three soft lines that roll along like a
 * sound wave, taller and faster the louder the voice, nearly flat and still in
 * silence. Drawn on a canvas each frame, so speaking never re-renders the screen.
 */
function InnerWave({
  readLevel,
  onQuiet,
}: {
  readLevel: () => number;
  onQuiet?: (quiet: boolean) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const board = canvas.current;
    const context = board?.getContext("2d");
    if (!board || !context) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    const fit = () => {
      const ratio = window.devicePixelRatio || 1;
      ({ width, height } = board.getBoundingClientRect());
      board.width = width * ratio;
      board.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    fit();
    const resize = new ResizeObserver(fit);
    resize.observe(board);

    let frame = 0;
    let smooth = 0;
    let phase = 0;
    let last = performance.now();
    let lastVoice = last;
    let quiet = false;

    const tick = (now: number) => {
      const step = Math.min(64, now - last) / 1000;
      last = now;
      const raw = readLevel();
      if (raw > SPEECH_LEVEL) lastVoice = now;
      const nowQuiet = now - lastVoice > QUIET_AFTER_MS;
      if (nowQuiet !== quiet) {
        quiet = nowQuiet;
        onQuiet?.(quiet);
      }
      const target = raw > SPEECH_LEVEL ? Math.min(1, raw * 3.2) : 0;
      // Rise quickly with the voice, settle gently when it stops.
      smooth += (target - smooth) * (target > smooth ? 0.35 : 0.08);
      if (!still) phase += step * (0.6 + smooth * 7);

      context.clearRect(0, 0, width, height);
      const middle = height / 2;
      for (const wave of WAVES) {
        context.beginPath();
        context.lineWidth = wave.line;
        context.strokeStyle = `rgb(255 255 255 / ${wave.alpha})`;
        for (let x = 0; x <= width; x += 2) {
          const along = x / width;
          // Fades to nothing at both ends, so the wave sits inside the pill.
          const taper = Math.sin(Math.PI * along);
          const y =
            middle +
            Math.sin(along * Math.PI * 2 * wave.cycles + phase * wave.direction) *
              (2 + smooth * (middle - 6)) *
              wave.height *
              taper;
          if (x === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.stroke();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
    };
  }, [readLevel, onQuiet]);

  return <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
}

/**
 * The wide speaking button under the message box. Start, then Please wait
 * while the microphone switches on, then Talk now with the voice rolling
 * through it, then Writing report while the AI updates the report.
 */
export function VoiceButton({
  status,
  readLevel,
  onQuiet,
  onClick,
  disabled,
  keyShortcut,
  className = "",
}: {
  status: VoiceStatus;
  /** Current loudness, 0 to 1. */
  readLevel: () => number;
  /** Told once when no voice has been heard for a few seconds, and again when it returns. */
  onQuiet?: (quiet: boolean) => void;
  onClick: () => void;
  disabled?: boolean;
  keyShortcut: string;
  className?: string;
}) {
  const shortcut = keyShortcut.replace(/\+/g, " + ");
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={status === "listening" ? `Stop and write report (${shortcut})` : `Start speaking (${shortcut})`}
      aria-keyshortcuts={keyShortcut}
      className={`group relative flex h-14 items-center justify-center gap-2.5 overflow-hidden rounded-full px-5 text-[1rem] font-bold transition-colors duration-200 active:scale-[0.99] disabled:cursor-progress ${
        status === "ready"
          ? "bg-btn text-btn-text hover:bg-teal-deep"
          : status === "listening"
            ? "bg-teal text-white"
            : "bg-ink/[0.07] text-ink-soft"
      } ${className}`}
    >
      {status === "listening" && <InnerWave readLevel={readLevel} onQuiet={onQuiet} />}
      {status === "ready" && (
        <>
          <Microphone weight="fill" className="h-5 w-5" />
          Start
        </>
      )}
      {(status === "starting" || status === "writing") && (
        <>
          <CircleNotch weight="bold" className="h-5 w-5 animate-spin" />
          {status === "starting" ? "Please wait" : "Writing report"}
        </>
      )}
      {status === "listening" && (
        <span className="relative flex items-center gap-2.5">
          <Microphone weight="fill" className="h-5 w-5 group-hover:hidden" />
          <Stop weight="fill" className="hidden h-5 w-5 group-hover:block" />
          Talk now
        </span>
      )}
    </button>
  );
}
