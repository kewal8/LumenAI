"use client";

import { ArrowUp, CircleNotch, Microphone, Stop } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { setFloatingWindow } from "@/lib/clipboard";

type PictureInPicture = {
  requestWindow(options: { width: number; height: number }): Promise<Window>;
};

function api(): PictureInPicture | undefined {
  return (globalThis as { documentPictureInPicture?: PictureInPicture }).documentPictureInPicture;
}

const nothing = () => () => {};

/**
 * A small window that stays on top of every other window, PACS included, so
 * findings can be dictated without coming back to this tab. The browser
 * provides it (Chrome and Edge on a computer); it shares this page's styles
 * and state, and closes with the page.
 */
export function useFloatingWindow(
  whenAway = false,
  /** Whether leaving the browser now should bring the window up, such as when the dictation box has focus. */
  onLeave: () => boolean = () => false,
  enabled = true,
) {
  const [win, setWin] = useState<Window | null>(null);
  // Set when the browser refuses to open the window.
  const [refused, setRefused] = useState(false);
  // Known only in the browser, so the first paint matches the server's.
  const supported = useSyncExternalStore(nothing, () => api() !== undefined, () => false);

  const open = useCallback(async (quiet = false) => {
    setRefused(false);
    const pip = await api()
      ?.requestWindow({ width: 440, height: 300 })
      .catch(() => null);
    if (!pip) {
      if (!quiet) setRefused(true);
      return;
    }

    // Same fonts, colours and theme as the page it came from.
    for (const node of document.querySelectorAll('link[rel="stylesheet"], style')) {
      pip.document.head.append(node.cloneNode(true));
    }
    for (const { name, value } of document.documentElement.attributes) {
      pip.document.documentElement.setAttribute(name, value);
    }
    pip.document.body.className = document.body.className;
    pip.document.title = "LumenAI dictation";

    pip.addEventListener("pagehide", () => {
      setFloatingWindow(null);
      setWin(null);
    });
    setFloatingWindow(pip);
    setWin(pip);
  }, []);

  const close = useCallback(() => win?.close(), [win]);

  // A browser opens a window only from a click, with one exception: Chrome
  // and Edge ask the page for one when the person switches away from a tab
  // that is using the microphone. That is the moment it is wanted.
  useEffect(() => {
    const session = navigator.mediaSession as MediaSession | undefined;
    if (!whenAway || !supported || !session) return;
    const action = "enterpictureinpicture" as MediaSessionAction;
    try {
      session.setActionHandler(action, () => void open());
    } catch {
      return; // This browser cannot open it by itself.
    }
    return () => {
      try {
        session.setActionHandler(action, null);
      } catch {}
    };
  }, [whenAway, supported, open]);

  // Switching to another app, such as PACS, gives no such request. But for a
  // few seconds after a click the browser still lets the page open a window,
  // so leaving right after clicking into the dictation box brings it up.
  const leaveCheck = useRef(onLeave);
  useEffect(() => {
    leaveCheck.current = onLeave;
  });
  useEffect(() => {
    if (!enabled || !supported || win) return;
    const left = () => {
      const activation = (navigator as { userActivation?: { isActive: boolean } }).userActivation;
      if (activation && !activation.isActive) return;
      if (leaveCheck.current()) void open(true);
    };
    window.addEventListener("blur", left);
    return () => window.removeEventListener("blur", left);
  }, [enabled, supported, win, open]);
  // Back in the browser window, the report is in view again.
  useEffect(() => {
    if (!win) return;
    const back = () => win.close();
    window.addEventListener("focus", back);
    return () => window.removeEventListener("focus", back);
  }, [win]);

  // Back on the tab, the report itself is in view, so the window is not needed.
  useEffect(() => {
    if (!win) return;
    const back = () => document.visibilityState === "visible" && win.close();
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, [win]);
  // Never leave the little window behind when the report screen goes away.
  useEffect(() => () => win?.close(), [win]);

  return { win, supported, refused, open, close };
}

export type FloatingStatus = "ready" | "starting" | "listening" | "writing";

const STATUS_TEXT: Record<FloatingStatus, string> = {
  ready: "Ready. Press the microphone and speak.",
  starting: "Turning on the microphone.",
  listening: "Listening. Press stop when you finish.",
  writing: "Writing your report.",
};

/** What is drawn inside the floating window. */
export function FloatingBox({
  win,
  status,
  words,
  note,
  problem,
  onType,
  onMic,
  onSend,
}: {
  win: Window;
  status: FloatingStatus;
  /** Typed and spoken words so far. */
  words: string;
  /** Good news to show in place of the status, such as "copied". */
  note: string;
  /** Something that went wrong, shown in place of the status. */
  problem: string;
  onType: (text: string) => void;
  onMic: () => void;
  onSend: () => void;
}) {
  const idle = status === "ready";
  const canSend = idle && words.trim() !== "";

  return createPortal(
    <div className="app flex h-[100dvh] flex-col gap-2.5 p-3">
      <textarea
        value={words}
        onChange={(event) => onType(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (canSend) onSend();
          }
        }}
        readOnly={status === "listening" || status === "writing"}
        aria-label="What you said"
        placeholder="Type or speak your findings"
        autoFocus
        className="min-h-0 flex-1 resize-none rounded-2xl border border-ink/40 bg-surface px-4 py-3 text-[1rem] leading-snug text-ink outline-none placeholder:text-ink-quiet focus:border-teal"
      />
      <div className="flex items-center gap-2.5">
        <p
          role="status"
          className={`min-w-0 flex-1 text-[0.9rem] font-semibold leading-snug ${
            problem ? "text-flag" : status === "listening" ? "text-flag" : "text-ink-soft"
          }`}
        >
          {problem || (idle && note) || STATUS_TEXT[status]}
        </p>
        <button
          type="button"
          onClick={onMic}
          disabled={status === "starting" || status === "writing"}
          aria-label={status === "listening" ? "Stop and write report" : "Start speaking"}
          title={status === "listening" ? "Stop and write report" : "Start speaking"}
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-white transition-colors disabled:cursor-progress ${
            status === "listening" ? "bg-flag hover:bg-flag/90" : idle ? "bg-teal hover:brightness-110" : "bg-[#8a5a0c]"
          }`}
        >
          {status === "listening" ? (
            <Stop weight="fill" className="h-5 w-5" />
          ) : idle ? (
            <Microphone weight="fill" className="h-5 w-5" />
          ) : (
            <CircleNotch weight="bold" className="h-5 w-5 animate-spin" />
          )}
        </button>
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          aria-label="Update report from typed text"
          title="Update report from typed text"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-btn text-btn-text transition-colors hover:bg-teal-deep disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowUp weight="bold" className="h-5 w-5" />
        </button>
      </div>
    </div>,
    win.document.body,
  );
}
