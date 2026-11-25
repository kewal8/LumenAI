"use client";

import { useRef, useState } from "react";

/** How far the row slides to show its actions. */
const OPEN = -148;

/**
 * A list row as on a phone: swipe it left to show its actions (such as PDF and
 * Delete), swipe back or tap it to close. On a wider screen, or with a mouse,
 * it is an ordinary row and the actions stay hidden.
 */
export function SwipeRow({
  className,
  actions,
  children,
}: {
  /** The row's own layout, such as its grid of columns. */
  className: string;
  /** Shown behind the row once it is swiped; phone only. */
  actions: React.ReactNode;
  children: React.ReactNode;
}) {
  const [shift, setShift] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; from: number } | null>(null);
  // A swipe that moved the row is not also a tap on the link inside it.
  const moved = useRef(false);

  function onPointerDown(event: React.PointerEvent) {
    if (event.pointerType === "mouse" || window.matchMedia("(min-width: 768px)").matches) return;
    start.current = { x: event.clientX, y: event.clientY, from: shift };
    moved.current = false;
  }

  function onPointerMove(event: React.PointerEvent) {
    const from = start.current;
    if (!from) return;
    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;
    // Scrolling the list up or down wins over a sideways swipe.
    if (!moved.current && Math.abs(dy) > Math.abs(dx)) {
      start.current = null;
      return;
    }
    if (Math.abs(dx) > 6) {
      moved.current = true;
      setDragging(true);
    }
    if (moved.current) setShift(Math.min(0, Math.max(OPEN - 24, from.from + dx)));
  }

  function onPointerUp() {
    if (!start.current) return;
    start.current = null;
    setDragging(false);
    if (moved.current) setShift((now) => (now < OPEN / 2 ? OPEN : 0));
  }

  return (
    <li className="relative overflow-hidden border-t border-line first:border-t-0">
      <div
        inert={shift === 0}
        className={`absolute inset-y-0 right-0 flex md:hidden ${shift === 0 && !dragging ? "invisible" : ""}`}
        style={{ width: -OPEN }}
        onClick={() => setShift(0)}
      >
        {actions}
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(event) => {
          // A tap on a row that is open closes it, rather than opening the report.
          if (moved.current || shift !== 0) {
            event.preventDefault();
            event.stopPropagation();
            moved.current = false;
            setShift(0);
          }
        }}
        className={`relative bg-surface [touch-action:pan-y] ${dragging ? "" : "transition-transform duration-200"} ${className}`}
        style={{ transform: shift ? `translateX(${shift}px)` : undefined }}
      >
        {children}
      </div>
    </li>
  );
}

/** One action behind a swiped row: a tall, labelled square. */
export const SWIPE_ACTION =
  "flex h-full flex-1 flex-col items-center justify-center gap-1 text-[0.8rem] font-semibold text-white disabled:opacity-60";
