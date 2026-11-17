"use client";

import { Popover } from "@base-ui/react/popover";
import { ArrowsOutSimple, Lightning, PencilSimple, Trash } from "@phosphor-icons/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { findMacros, replaceSpan, type Macro, type MacroSpan } from "@/lib/macros";
import { MACRO_MARK } from "./macroMark";

/** The text box's own look, copied so the highlight lines up with its words exactly. */
type Frame = { style: React.CSSProperties; scrollTop: number };

const COPIED = [
  "boxSizing", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
  "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing", "lineHeight",
  "textTransform", "wordSpacing", "textIndent", "tabSize",
] as const;

/**
 * Marks every macro in the dictation box, over the box itself: the words stay
 * the box's own, and only the marks are drawn on top. Pointing at a mark shows
 * its macro: a short form can be turned into its full text with a click, and
 * any macro can be changed for this report or taken out.
 *
 * The box must sit in a `relative` wrapper, which this is drawn into.
 */
export function MacroHighlights({
  fieldRef,
  text,
  draft,
  macros,
  onChange,
  editRequest,
}: {
  fieldRef: React.RefObject<HTMLTextAreaElement | null>;
  /** Everything shown in the box, including words still being heard. */
  text: string;
  /** The settled words the marks may change. */
  draft: string;
  macros: Macro[];
  onChange: (draft: string) => void;
  /** Goes up by one when the doctor says "change this macro": the last macro opens to edit. */
  editRequest: number;
}) {
  const spans = useMemo(
    () => findMacros(text, macros).filter((span) => span.end <= draft.length),
    [text, draft.length, macros],
  );
  const [frame, setFrame] = useState<Frame | null>(null);
  // The mark whose card is open, by where it starts, and whether it is being edited.
  const [open, setOpen] = useState<{ start: number; editing: boolean } | null>(null);

  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const measure = () => {
      const style = getComputedStyle(field);
      const copied: Record<string, string> = {};
      for (const property of COPIED) copied[property] = style[property];
      setFrame({
        style: {
          ...copied,
          left: field.offsetLeft,
          top: field.offsetTop,
          width: field.offsetWidth,
          height: field.offsetHeight,
          borderStyle: "solid",
          borderColor: "transparent",
        },
        scrollTop: field.scrollTop,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(field);
    field.addEventListener("scroll", measure);
    return () => {
      observer.disconnect();
      field.removeEventListener("scroll", measure);
    };
  }, [fieldRef, text]);

  // "Change this macro": the last one in the box opens, ready to edit.
  const [handled, setHandled] = useState(editRequest);
  if (editRequest !== handled) {
    setHandled(editRequest);
    const last = spans[spans.length - 1];
    setOpen(last ? { start: last.start, editing: true } : null);
  }

  // A card for a mark that has since gone (edited away, removed) counts as closed.
  const shown = open && spans.some((span) => span.start === open.start) ? open : null;

  if (!frame || spans.length === 0) return null;

  const pieces: React.ReactNode[] = [];
  let at = 0;
  for (const span of spans) {
    if (span.start > at) pieces.push(text.slice(at, span.start));
    pieces.push(
      <MacroMark
        key={`${span.start}-${span.macro.id}`}
        span={span}
        label={text.slice(span.start, span.end)}
        open={shown?.start === span.start}
        editing={shown?.start === span.start && shown.editing}
        onOpenChange={(next) => setOpen(next ? { start: span.start, editing: false } : null)}
        onEdit={() => setOpen({ start: span.start, editing: true })}
        onReplace={(replacement) => {
          onChange(replaceSpan(draft, span, replacement));
          setOpen(null);
        }}
      />,
    );
    at = span.end;
  }
  if (at < text.length) pieces.push(text.slice(at));

  return (
    <div
      aria-hidden={shown ? undefined : true}
      className="pointer-events-none absolute overflow-hidden"
      style={frame.style}
    >
      {/* Same words as the box, invisible; only the marks show. */}
      <div
        className="whitespace-pre-wrap break-words text-transparent"
        style={{ transform: `translateY(${-frame.scrollTop}px)` }}
      >
        {pieces}
        {/* Keeps a final line break the same height as in the box. */}
        {"​"}
      </div>
    </div>
  );
}

function MacroMark({
  span,
  label,
  open,
  editing,
  onOpenChange,
  onEdit,
  onReplace,
}: {
  span: MacroSpan;
  label: string;
  open: boolean;
  editing: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onReplace: (text: string) => void;
}) {
  const { macro, kind } = span;
  return (
    <Popover.Root
      open={open}
      // Pointing opens the card; a click on the mark keeps it open rather than
      // closing it again, so the doctor can move to its buttons.
      onOpenChange={(next, details) => {
        if (!next && details.reason === "trigger-press") return;
        onOpenChange(next);
      }}
    >
      <Popover.Trigger
        openOnHover={!editing}
        delay={150}
        nativeButton={false}
        render={
          <span
            className={`pointer-events-auto cursor-pointer ${MACRO_MARK[kind]}`}
            aria-label={`Macro ${macro.shortForm}`}
          />
        }
      >
        {label}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" sideOffset={8} className="z-[70]">
          <Popover.Popup className="app-layer w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-ink/20 bg-surface p-3.5 shadow-[0_18px_48px_-18px_rgb(6_17_15/0.55)] outline-none">
            <p className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-teal/[0.14] text-teal-deep">
                <Lightning weight="fill" className="h-3.5 w-3.5" />
              </span>
              <span className="rounded-md bg-teal/[0.12] px-1.5 py-0.5 text-[0.82rem] font-bold uppercase tracking-wide text-teal-deep">
                {macro.shortForm}
              </span>
              <span className="t-meta">{kind === "short" ? "Short form" : "Full text written"}</span>
            </p>

            {editing ? (
              <EditMacro initial={kind === "short" ? macro.body : label} onSave={onReplace} />
            ) : (
              <>
                {kind === "short" ? (
                  // The card's main action: the full text itself, ready to use.
                  <button
                    type="button"
                    onClick={() => onReplace(macro.body)}
                    className="group mt-2.5 w-full rounded-xl border-2 border-teal/40 bg-teal/[0.05] px-3 py-2.5 text-left transition-colors hover:border-teal hover:bg-teal/[0.1]"
                  >
                    <span className="line-clamp-4 leading-snug text-ink">{macro.body}</span>
                    <span className="mt-1.5 flex items-center gap-1.5 text-[0.85rem] font-bold text-teal-deep">
                      <ArrowsOutSimple weight="bold" className="h-4 w-4" />
                      Use full text
                    </span>
                  </button>
                ) : (
                  <p className="mt-2 text-[0.92rem] leading-snug text-ink-soft">
                    Written from your macro. Change it for this report, or take it out.
                  </p>
                )}
                <div className="mt-2.5 flex gap-1.5">
                  <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink/30 px-3 text-[0.88rem] font-bold text-ink transition-colors hover:border-ink/60 hover:bg-ink/[0.05]"
                  >
                    <PencilSimple weight="bold" className="h-4 w-4" />
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => onReplace("")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-flag/40 px-3 text-[0.88rem] font-bold text-flag transition-colors hover:bg-flag/10"
                  >
                    <Trash weight="bold" className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Changes the macro's words for this report only; the saved macro stays as it is. */
function EditMacro({ initial, onSave }: { initial: string; onSave: (text: string) => void }) {
  const [value, setValue] = useState(initial);
  // Opens with the cursor after the words, ready to change or add to them.
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const box = field.current;
    if (!box) return;
    box.focus();
    box.setSelectionRange(box.value.length, box.value.length);
  }, []);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim()) onSave(value.trim());
      }}
      className="mt-2.5 flex flex-col gap-2"
    >
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (value.trim()) onSave(value.trim());
          }
        }}
        ref={field}
        aria-label="Macro text for this report"
        className="min-h-20 w-full resize-none rounded-xl border-2 border-ink/30 bg-surface px-3 py-2 text-[0.95rem] leading-snug text-ink outline-none [field-sizing:content] focus:border-teal"
      />
      <p className="t-meta">For this report only. Your saved macro stays the same.</p>
      <button
        type="submit"
        disabled={!value.trim()}
        className="inline-flex h-9 items-center justify-center rounded-full bg-btn px-4 text-[0.88rem] font-bold text-btn-text transition-colors hover:bg-teal-deep disabled:opacity-50"
      >
        Use this text
      </button>
    </form>
  );
}
