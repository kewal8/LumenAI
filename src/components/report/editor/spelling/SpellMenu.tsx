"use client";

import { Menu } from "@base-ui/react/menu";
import { BookOpenText, EyeSlash } from "@phosphor-icons/react";
import type { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";
import { addToDictionary, ignoreWord, suggestFor } from "./spelling";
import type { SpellTarget } from "./SpellCheck";

const ITEM =
  "flex h-10 cursor-pointer select-none items-center gap-3 rounded-full px-3 text-[0.95rem] font-semibold text-ink outline-none data-[highlighted]:bg-ink/10";

/** Puts the chosen word in place of the wrong one, keeping its formatting. */
function replaceWord(editor: Editor, target: SpellTarget, word: string) {
  const { state, view } = editor;
  if (state.doc.textBetween(target.from, target.to) !== target.word) return;
  view.dispatch(state.tr.insertText(word, target.from, target.to));
}

/** The right-click menu for an underlined word: suggestions, ignore, add to dictionary. */
export function SpellMenu({
  editor,
  target,
  onClose,
}: {
  editor: Editor;
  target: SpellTarget | null;
  onClose: () => void;
}) {
  // Suggestions for the word they belong to; anything else counts as still loading.
  const [found, setFound] = useState<{ word: string; list: string[] } | null>(null);

  useEffect(() => {
    if (!target) return;
    let current = true;
    void suggestFor(target.word).then((list) => {
      if (current) setFound({ word: target.word, list });
    });
    return () => {
      current = false;
    };
  }, [target]);

  const list = target && found?.word === target.word ? found.list : null;
  const anchor = target
    ? { getBoundingClientRect: () => DOMRect.fromRect({ x: target.x, y: target.y, width: 0, height: 0 }) }
    : null;

  return (
    <Menu.Root open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <Menu.Portal>
        <Menu.Positioner anchor={anchor} side="bottom" align="start" sideOffset={4} className="z-50">
          <Menu.Popup
            // Back to the report where the cursor was, without scrolling the page.
            finalFocus={() => {
              editor.view.focus();
              return false;
            }}
            className="app-layer w-64 origin-[var(--transform-origin)] rounded-3xl border border-ink/20 bg-surface p-2 shadow-[0_18px_50px_-18px_rgb(15_38_36/0.45)] outline-none">
            {target && (
              <>
                <p className="truncate px-3 pt-1.5 pb-2 text-[0.85rem] font-semibold text-ink-soft">
                  Not in the dictionary: <span className="text-ink">{target.word}</span>
                </p>
                {list === null ? (
                  <p className="px-3 pb-2 text-[0.92rem] text-ink-soft">Finding suggestions…</p>
                ) : list.length === 0 ? (
                  <p className="px-3 pb-2 text-[0.92rem] text-ink-soft">No suggestions</p>
                ) : (
                  list.map((word) => (
                    <Menu.Item key={word} className={ITEM} onClick={() => replaceWord(editor, target, word)}>
                      {word}
                    </Menu.Item>
                  ))
                )}
                <div aria-hidden="true" className="mx-3 my-1.5 h-px bg-line" />
                <Menu.Item className={ITEM} onClick={() => ignoreWord(target.word)}>
                  <EyeSlash className="h-5 w-5 text-ink-soft" />
                  Ignore for now
                </Menu.Item>
                <Menu.Item className={ITEM} onClick={() => void addToDictionary(target.word)}>
                  <BookOpenText className="h-5 w-5 text-ink-soft" />
                  Add to dictionary
                </Menu.Item>
              </>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
