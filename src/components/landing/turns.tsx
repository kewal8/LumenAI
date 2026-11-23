"use client";

import { Pause, Play } from "@phosphor-icons/react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Things that take turns: one is shown for a few seconds, then the next.
 * The turn waits while it is off screen, while the pointer or keyboard is on
 * it, and for people who ask for less motion (they move it themselves).
 */
export function useTurns<T extends HTMLElement>(count: number, seconds = 5) {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [stopped, setStopped] = useState<boolean | null>(null);
  const isStopped = stopped ?? Boolean(reduce);
  const running = inView && !held && !isStopped;

  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => setIndex((now) => (now + 1) % count), seconds * 1000);
    return () => clearTimeout(timer);
  }, [running, index, count, seconds]);

  return {
    ref,
    hold: {
      onPointerEnter: () => setHeld(true),
      onPointerLeave: () => setHeld(false),
      onFocus: () => setHeld(true),
      onBlur: () => setHeld(false),
    },
    turns: {
      index,
      setIndex,
      running,
      seconds,
      isStopped,
      toggle: () => setStopped(!isStopped),
    },
  };
}

type Turns = ReturnType<typeof useTurns>["turns"];

/**
 * One of several things sharing the same spot. They all sit in one grid cell,
 * so the spot is as tall as the tallest and never jumps; only the one whose
 * turn it is can be seen. The parent must be a `grid`.
 */
export function Turn({
  active,
  before = false,
  slide = true,
  className = "",
  children,
}: {
  active: boolean;
  /** Its turn has passed, so it leaves to the left. */
  before?: boolean;
  slide?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      aria-hidden={!active}
      className={`[grid-area:1/1] ${className}`}
      initial={false}
      animate={{ opacity: active ? 1 : 0, x: active || !slide ? 0 : before ? -28 : 28 }}
      transition={{ duration: active ? 0.6 : 0.3, ease: EASE }}
      style={{ pointerEvents: active ? "auto" : "none" }}
    >
      {children}
    </motion.div>
  );
}

/** A bar for each turn, the current one filling as its time runs, and a pause button. */
export function TurnBars({
  turns,
  labels,
  className = "",
}: {
  turns: Turns;
  labels: string[];
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex flex-1 items-center gap-2">
        {labels.map((label, at) => {
          const active = at === turns.index;
          return (
            <button
              key={label}
              type="button"
              aria-label={label}
              aria-current={active ? "true" : undefined}
              onClick={() => turns.setIndex(at)}
              className="group flex h-6 cursor-pointer items-center transition-[flex-grow] duration-500"
              style={{ flexGrow: active ? 3 : 1, flexBasis: 0 }}
            >
              <span className="relative block h-1.5 w-full overflow-hidden rounded-full bg-teal/20 group-hover:bg-teal/35">
                {active && (
                  <motion.span
                    key={`${turns.index}-${turns.running}`}
                    className="absolute inset-0 rounded-full bg-teal"
                    style={{ originX: 0 }}
                    initial={{ scaleX: turns.running ? 0 : 1 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: turns.running ? turns.seconds : 0, ease: "linear" }}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={turns.toggle}
        aria-label={turns.isStopped ? "Play" : "Pause"}
        className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-teal/25 text-teal-deep hover:bg-surface/70"
      >
        {turns.isStopped ? (
          <Play weight="fill" className="h-3.5 w-3.5" />
        ) : (
          <Pause weight="fill" className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
