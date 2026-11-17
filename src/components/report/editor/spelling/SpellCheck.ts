import { Extension } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { isCheckable, wordsIn } from "@/lib/spelling/words";
import { isMisspelt, onSpellingChange } from "./spelling";

/** A word in the report, where it sits in the document. */
export type SpellTarget = { word: string; from: number; to: number; x: number; y: number };

type State = { decorations: DecorationSet; typingAt: number | null };

const key = new PluginKey<State>("spellCheck");
const REDRAW = "spellRedraw";

/** Each word of each paragraph with its place in the document. */
function eachWord(doc: PMNode, visit: (word: string, from: number, to: number) => void) {
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    // Line breaks count as one character, so offsets match document positions.
    const text = node.textBetween(0, node.content.size, undefined, "\n");
    for (const { word, start, end } of wordsIn(text)) visit(word, pos + 1 + start, pos + 1 + end);
    return false;
  });
}

function underline(state: EditorState, typingAt: number | null) {
  const { selection } = state;
  const found: Decoration[] = [];
  eachWord(state.doc, (word, from, to) => {
    if (!isCheckable(word)) return;
    // The word being typed is left alone until the cursor moves on.
    if (typingAt !== null && selection.empty && typingAt >= from && typingAt <= to) {
      if (selection.head >= from && selection.head <= to) return;
    }
    if (isMisspelt(word)) found.push(Decoration.inline(from, to, { class: "spell-miss" }));
  });
  return DecorationSet.create(state.doc, found);
}

/** The word at a place in the document, if there is one. */
function wordAt(doc: PMNode, pos: number) {
  const $pos = doc.resolve(pos);
  const block = $pos.parent;
  if (!block.isTextblock) return null;
  const start = $pos.start();
  const text = block.textBetween(0, block.content.size, undefined, "\n");
  const offset = pos - start;
  const hit = wordsIn(text).find((word) => offset >= word.start && offset <= word.end);
  return hit ? { word: hit.word, from: start + hit.start, to: start + hit.end } : null;
}

function targetFromEvent(view: EditorView, event: MouseEvent): SpellTarget | null {
  // From the keyboard (menu key, Shift+F10) there is no pointer: use the cursor.
  const fromPointer = event.clientX !== 0 || event.clientY !== 0;
  const pos = fromPointer
    ? view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
    : view.state.selection.head;
  if (pos === undefined) return null;
  const hit = wordAt(view.state.doc, pos);
  if (!hit || !isCheckable(hit.word) || !isMisspelt(hit.word)) return null;
  const box = view.coordsAtPos(hit.from);
  return { ...hit, x: fromPointer ? event.clientX : box.left, y: fromPointer ? event.clientY : box.bottom };
}

/**
 * Underlines words that are not in British English, the radiology word list
 * or the account's dictionary, and opens `onMenu` when one is right-clicked.
 * Anywhere else the browser's own right-click menu stays.
 */
export const SpellCheck = Extension.create<{ onMenu: (target: SpellTarget) => void }>({
  name: "spellCheck",

  addOptions() {
    return { onMenu: () => {} };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin<State>({
        key,
        state: {
          init: (_, state) => ({ decorations: underline(state, null), typingAt: null }),
          apply: (tr, old, _, state) => {
            if (!tr.docChanged && !tr.selectionSet && !tr.getMeta(REDRAW)) return old;
            const typingAt = tr.docChanged ? tr.selection.head : old.typingAt;
            return { decorations: underline(state, typingAt), typingAt };
          },
        },
        props: {
          decorations: (state) => key.getState(state)?.decorations,
          handleDOMEvents: {
            contextmenu: (view, event) => {
              const target = targetFromEvent(view, event);
              if (!target) return false;
              event.preventDefault();
              options.onMenu(target);
              return true;
            },
          },
        },
        view: (view) => {
          // Answers come back from the checker a moment later: redraw then.
          const stop = onSpellingChange(() => {
            if (!view.isDestroyed) view.dispatch(view.state.tr.setMeta(REDRAW, true).setMeta("addToHistory", false));
          });
          return { destroy: stop };
        },
      }),
    ];
  },
});
