"use client";

import { useEffect, useRef } from "react";

const BARS = [0.55, 0.85, 1, 0.85, 0.55];
/** Below this the microphone is picking up room noise, not a voice. */
const SPEECH_LEVEL = 0.06;
const QUIET_AFTER_MS = 4000;

/**
 * Bars that rise and fall with the doctor's voice, so it is plain that the
 * microphone is hearing them. Heights are written straight to the elements on
 * each frame; nothing here re-renders the screen.
 */
export function VoiceMeter({
  readLevel,
  onQuiet,
  className = "",
}: {
  /** Current loudness, 0 to 1. */
  readLevel: () => number;
  /** Told once when no voice has been heard for a few seconds, and again when it returns. */
  onQuiet?: (quiet: boolean) => void;
  className?: string;
}) {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let smooth = 0;
    let lastVoice = performance.now();
    let quiet = false;

    const tick = (now: number) => {
      const level = readLevel();
      // Rise fast, fall slowly, so the bars follow speech without flickering.
      smooth = level > smooth ? level : smooth * 0.86 + level * 0.14;

      if (level > SPEECH_LEVEL) lastVoice = now;
      const nowQuiet = now - lastVoice > QUIET_AFTER_MS;
      if (nowQuiet !== quiet) {
        quiet = nowQuiet;
        onQuiet?.(quiet);
      }

      if (!still) {
        bars.current.forEach((bar, index) => {
          if (!bar) return;
          // A small ripple keeps the bars from moving as one block.
          const ripple = 0.85 + 0.15 * Math.sin(now / 140 + index * 1.3);
          const height = 0.22 + Math.min(1, smooth * 3.2) * BARS[index] * ripple * 0.78;
          bar.style.transform = `scaleY(${height.toFixed(3)})`;
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [readLevel, onQuiet]);

  return (
    <span aria-hidden="true" className={`inline-flex h-7 items-center gap-[3px] ${className}`}>
      {BARS.map((_, index) => (
        <span
          key={index}
          ref={(element) => {
            bars.current[index] = element;
          }}
          className="h-full w-[5px] origin-center rounded-full bg-current"
          style={{ transform: "scaleY(0.4)" }}
        />
      ))}
    </span>
  );
}
