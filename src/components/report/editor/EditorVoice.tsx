"use client";

import { closeHistory } from "@tiptap/pm/history";
import type { Node as PMNode } from "@tiptap/pm/model";
import { useEditorState, type Editor } from "@tiptap/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { expandMacros, type Macro } from "@/lib/macros";
import { useDictation, type Word } from "@/lib/useDictation";
import { COMMAND_LABELS, spokenStream, type SpokenPiece } from "@/lib/voiceCommands";
import { SpeakPill, shapeWords } from "../LineVoice";

const BUTTON_HEIGHT = 32;
// Wide enough for the listening state, so the button never runs off the report.
const BUTTON_WIDTH = 132;

/** Where `needle` appears in the document, ignoring letter case, as document positions. */
function findText(doc: PMNode, needle: string) {
  const found: { from: number; to: number }[] = [];
  const wanted = needle.toLowerCase();
  if (!wanted) return found;
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    // One character per inline leaf, so offsets in the text are offsets in the document.
    const text = node.textBetween(0, node.content.size, undefined, "￼").toLowerCase();
    for (let at = text.indexOf(wanted); at >= 0; at = text.indexOf(wanted, at + 1)) {
      found.push({ from: pos + 1 + at, to: pos + 1 + at + wanted.length });
    }
    return false;
  });
  return found;
}

/** Text of the current paragraph before and after the selection. */
function around(editor: Editor) {
  const { $from, $to } = editor.state.selection;
  return {
    before: $from.parent.textBetween(0, $from.parentOffset, undefined, "￼"),
    after: $to.parent.textBetween($to.parentOffset, $to.parent.content.size, undefined, "￼"),
  };
}

/**
 * Speaking straight into the rich report editor at the cursor: words go in
 * as said (short forms expanded, no AI rewrite), and spoken commands such as
 * "next line", "delete last macro" and "undo that" are carried out.
 * The same behaviour as the Speak button in the classic report screen.
 */
export function useEditorVoice({ macros }: { macros: Macro[] }) {
  const editorRef = useRef<Editor | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const [note, setNote] = useState("");
  const noteTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const macrosRef = useRef(macros);
  useEffect(() => {
    macrosRef.current = macros;
  }, [macros]);

  const listener = useRef(spokenStream());
  const queue = useRef(Promise.resolve());
  // Changes made by speaking this time, each its own undo step, for "undo that".
  const steps = useRef(0);
  // Full texts of macros spoken this time, newest last, for "delete last macro".
  const spokenMacros = useRef<string[]>([]);

  function tell(message: string) {
    clearTimeout(noteTimer.current);
    setNote(message);
    noteTimer.current = setTimeout(() => setNote(""), 2500);
  }

  /** Runs a change as its own undo step, so "undo that" takes back exactly it. */
  function step(editor: Editor, change: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) {
    const done = change(
      editor.chain().command(({ tr }) => {
        closeHistory(tr);
        return true;
      }),
    ).run();
    if (done) steps.current += 1;
    return done;
  }

  function write(editor: Editor, spoken: string) {
    const text = expandMacros(spoken, macrosRef.current);
    for (const macro of macrosRef.current) {
      if (!spoken.toLowerCase().includes(macro.body.toLowerCase()) && text.includes(macro.body)) {
        spokenMacros.current.push(macro.body);
      }
    }
    const { before, after } = around(editor);
    const shaped = shapeWords(before, after, text);
    if (!shaped) return;
    const { from, to } = editor.state.selection;
    step(editor, (chain) =>
      chain
        .insertContentAt({ from, to }, { type: "text", text: shaped.lead + shaped.words + shaped.trail })
        .setTextSelection(from + shaped.lead.length + shaped.words.length),
    );
  }

  function deleteMacro(editor: Editor) {
    const cursor = editor.state.selection.from;
    // The macro spoken last this time; otherwise the last of any macro before the cursor.
    const candidates = spokenMacros.current.length
      ? [spokenMacros.current[spokenMacros.current.length - 1]]
      : macrosRef.current.map((macro) => macro.body);
    const found = candidates.flatMap((body) => findText(editor.state.doc, body).map((range) => ({ ...range, body })));
    // The one ending nearest before the cursor; if none is before it, the last in the report.
    const before = found.filter((range) => range.to <= cursor);
    const best = (before.length ? before : found).reduce<(typeof found)[number] | null>(
      (last, range) => (!last || range.to > last.to ? range : last),
      null,
    );
    if (!best) {
      tell("No macro to remove");
      return;
    }
    // The space that joined it to the words before goes with it.
    const from = editor.state.doc.textBetween(best.from - 1, best.from) === " " ? best.from - 1 : best.from;
    step(editor, (chain) => chain.deleteRange({ from, to: best.to }));
    const index = spokenMacros.current.lastIndexOf(best.body);
    if (index >= 0) spokenMacros.current.splice(index, 1);
    const macro = macrosRef.current.find((item) => item.body === best.body);
    tell(macro ? `Removed “${macro.shortForm}”` : "Removed the last macro");
  }

  function apply(pieces: SpokenPiece[]) {
    const editor = editorRef.current;
    if (!editor || editor.isDestroyed) return;
    for (const piece of pieces) {
      if (piece.kind === "text") {
        write(editor, piece.text);
      } else if (piece.command === "newLine" || piece.command === "newParagraph") {
        // A report line holds one statement: the next one starts a line of its own.
        step(editor, (chain) => chain.splitBlock());
        tell(COMMAND_LABELS[piece.command]);
      } else if (piece.command === "deleteMacro") {
        deleteMacro(editor);
      } else if (steps.current > 0) {
        editor.commands.undo();
        steps.current -= 1;
        tell("Undone");
      } else {
        tell("Nothing to undo");
      }
    }
  }

  const dictation = useDictation({
    model: "nova-3-medical",
    language: "en-IN",
    keyterms: macros.map((macro) => macro.shortForm).slice(0, 50),
    onWords: (words: Word[]) => {
      const pieces = listener.current.push(words.map((word) => word.text).join(" "));
      queue.current = queue.current.then(() => apply(pieces));
    },
  });
  // Listening can end without Stop (the microphone was refused or the
  // connection dropped), so this counts as speaking only while it is live.
  const live = speaking && (dictation.recording || dictation.starting);

  function start() {
    if (!editorRef.current) return;
    listener.current = spokenStream();
    steps.current = 0;
    spokenMacros.current = [];
    setQuiet(false);
    setSpeaking(true);
    dictation.start();
  }

  async function stop() {
    await dictation.stop();
    // Words held back in case a phrase carried on are written now.
    const pieces = listener.current.flush();
    await (queue.current = queue.current.then(() => apply(pieces)));
    setSpeaking(false);
  }

  return {
    live,
    stop,
    /** The Speak button at the editor's cursor. Render it with the editor once it exists. */
    render: (editor: Editor, disabled: boolean) => (
      <SpeakAtCursor
        editor={editor}
        onEditor={(current) => {
          editorRef.current = current;
        }}
        speaking={live}
        starting={dictation.starting}
        quiet={quiet}
        onQuiet={setQuiet}
        readLevel={dictation.readLevel}
        onPress={() => (live ? stop() : start())}
        disabled={disabled}
        message={live ? note || dictation.interim : ""}
        error={!live ? dictation.error : ""}
      />
    ),
  };
}

function SpeakAtCursor({
  editor,
  onEditor,
  speaking,
  ...pill
}: {
  editor: Editor;
  onEditor: (editor: Editor) => void;
  speaking: boolean;
  starting: boolean;
  quiet: boolean;
  onQuiet: (quiet: boolean) => void;
  readLevel: () => number;
  onPress: () => void;
  disabled: boolean;
  message: string;
  error: string;
}) {
  useEffect(() => onEditor(editor), [editor, onEditor]);

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const { $to, to } = current.state.selection;
      return {
        focused: current.isFocused,
        to,
        atLineEnd: $to.parentOffset === $to.parent.content.size,
        size: current.state.doc.content.size,
      };
    },
  });

  const [spot, setSpot] = useState<{ left: number; top: number } | null>(null);
  // The doctor clicked away: the button goes, unless it is listening.
  const shown = Boolean(state?.focused) || speaking;

  useLayoutEffect(() => {
    if (!state || !shown) return;
    function place() {
      if (editor.isDestroyed) return;
      const caret = editor.view.coordsAtPos(Math.min(state!.to, editor.state.doc.content.size));
      const box = editor.view.dom.getBoundingClientRect();
      const height = caret.bottom - caret.top;
      // Beside the cursor at the end of a line, so no words are covered; otherwise just above it.
      setSpot(
        state!.atLineEnd && caret.left + 10 + BUTTON_WIDTH <= box.right
          ? { left: caret.left + 10, top: caret.top + height / 2 - BUTTON_HEIGHT / 2 }
          : {
              left: Math.min(Math.max(box.left, caret.left - BUTTON_WIDTH / 2), box.right - BUTTON_WIDTH),
              top: caret.top - BUTTON_HEIGHT - 6,
            },
      );
    }
    place();
    // The report scrolls inside its card, so the button follows on any scroll.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [editor, state, shown]);

  // Esc stops listening, from the report or anywhere else.
  useEffect(() => {
    if (!speaking) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") pill.onPress();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [speaking, pill]);

  if (!shown || !spot) return null;
  return createPortal(
    // Outside the app's own tree, so it carries the app's colours itself.
    <div className="app-layer fixed z-40" style={{ left: spot.left, top: spot.top }}>
      <SpeakPill speaking={speaking} {...pill} />
    </div>,
    document.body,
  );
}
