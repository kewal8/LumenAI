"use client";

import { Tooltip } from "@base-ui/react/tooltip";

/** How long the pointer rests on an icon before its name shows. */
const OPEN_DELAY = 300;

/** Lets neighbouring tips open at once while moving along a row of icons. */
export function TipProvider({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip.Provider delay={OPEN_DELAY} closeDelay={0}>
      {children}
    </Tooltip.Provider>
  );
}

/**
 * The one tooltip used across the app for icon-only buttons: the button's name,
 * and its keyboard shortcut when it has one, in a small dark label. It shows on
 * pointing and on keyboard focus, and replaces the browser's own slow `title`.
 *
 * `children` is the button itself; it is rendered as the tooltip's trigger, so
 * a menu or dialog trigger can be passed straight in.
 */
export function Tip({
  label,
  shortcut,
  side = "bottom",
  children,
}: {
  label: string;
  /** Shown beside the name, such as "Ctrl + S". */
  shortcut?: string;
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactElement;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} delay={OPEN_DELAY} />
      <Tooltip.Portal>
        <Tooltip.Positioner side={side} sideOffset={8} className="z-[80]">
          <Tooltip.Popup className="app-layer flex items-center gap-2 rounded-lg bg-ink px-2.5 py-1.5 text-[0.82rem] font-semibold whitespace-nowrap text-surface shadow-[0_8px_24px_-10px_rgb(6_17_15/0.5)]">
            {/* The popup layer sets its own text colour, so the label states it here. */}
            <span className="text-surface">{label}</span>
            {shortcut && <span className="font-medium text-surface/65">{shortcut}</span>}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
