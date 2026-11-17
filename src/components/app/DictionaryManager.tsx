"use client";

import { BookOpenText, Plus, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { toast } from "@/components/Toast";
import { FormError, send } from "@/components/auth/fields";
import { forgetWord, rememberWord } from "@/components/report/editor/spelling/spelling";
import { normaliseWord } from "@/lib/spelling/words";
import { SearchField } from "./Search";
import { ListMenu, RowTick, Selectable, SelectionBar } from "./Selection";
import { ConfirmAction } from "./TeamClient";
import { buttonClass } from "./ui";

const FIELD =
  "h-11 min-w-0 flex-1 basis-56 rounded-full border border-ink/40 bg-surface px-4 text-[0.98rem] font-semibold text-ink outline-none transition-colors placeholder:font-normal placeholder:text-ink-quiet hover:border-ink/60 focus:border-teal";

const byWord = (a: string, b: string) => a.localeCompare(b, "en", { sensitivity: "base" });

/** The account's spelling dictionary: words never underlined in reports. */
export function DictionaryManager({ initialWords }: { initialWords: string[] }) {
  const [words, setWords] = useState(initialWords);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const needle = query.trim().toLowerCase();
  const shown = needle ? words.filter((word) => word.toLowerCase().includes(needle)) : words;

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const word = normaliseWord(adding);
    if (!word) {
      setError("Add one word at a time, using letters and numbers only.");
      return;
    }
    if (words.includes(word)) {
      setError(`“${word}” is already in your dictionary.`);
      return;
    }
    setBusy(true);
    setError("");
    const result = await send<{ word: string }>("POST", "/api/dictionary", { word });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    setWords((current) => [...current, word].sort(byWord));
    rememberWord(word);
    setAdding("");
    toast.success(`“${word}” added to your dictionary.`);
  }

  function removed(gone: string[]) {
    setWords((current) => current.filter((word) => !gone.includes(word)));
    gone.forEach(forgetWord);
  }

  return (
    <Selectable>
      <div className="flex flex-col gap-6">
        <form onSubmit={add} className="flex flex-wrap items-center gap-3">
          <input
            value={adding}
            onChange={(event) => (setAdding(event.target.value), setError(""))}
            aria-label="Word to add"
            placeholder="Type a word to add, such as a colleague's name"
            maxLength={40}
            autoComplete="off"
            spellCheck={false}
            className={FIELD}
          />
          <button type="submit" disabled={busy} className={buttonClass.primary}>
            {busy ? <Spinner /> : <Plus weight="bold" className="h-4.5 w-4.5" />}
            Add word
          </button>
        </form>
        <FormError message={error} />

        {words.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <SearchField
              value={query}
              onChange={setQuery}
              label="Search your words"
              placeholder="Search your words"
              className="min-w-0 flex-1 basis-64"
            />
            <ListMenu />
          </div>
        )}

        <SelectionBar
          noun="words"
          deleteBase="/api/dictionary/"
          warning="They will be underlined again when they appear in a report."
          onDeleted={removed}
        />

        {words.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-ink/25 px-6 py-10 text-center">
            <BookOpenText weight="duotone" className="mx-auto h-8 w-8 text-ink-soft" />
            <p className="mt-2 text-[1.1rem] font-bold">No words of your own yet</p>
            <p className="mx-auto mt-1.5 max-w-[50ch] text-ink-soft">
              Right-click an underlined word in a report and choose Add to dictionary, or type one above. Everyone on
              your account shares these words.
            </p>
          </div>
        ) : shown.length === 0 ? (
          <p className="text-center text-ink-soft">No words match “{query.trim()}”.</p>
        ) : (
          <ul className="flex flex-wrap gap-2" aria-label="Your words">
            {shown.map((word) => (
              <li
                key={word}
                className="flex h-10 items-center gap-2 rounded-full border border-ink/25 bg-surface pl-4 pr-1 has-[:checked]:border-teal has-[:checked]:bg-teal/[0.08]"
              >
                <RowTick id={word} label={word} />
                <span className="font-semibold text-ink">{word}</span>
                <ConfirmAction
                  label={`Remove ${word}`}
                  icon={<X weight="bold" className="h-4 w-4" />}
                  triggerClassName="grid h-8 w-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-flag/10 hover:text-flag"
                  title={`Remove “${word}”?`}
                  body="It will be underlined again when it appears in a report."
                  confirmLabel="Remove word"
                  doneMessage={`“${word}” removed from your dictionary`}
                  path={`/api/dictionary/${encodeURIComponent(word)}`}
                  onDone={() => removed([word])}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Selectable>
  );
}
