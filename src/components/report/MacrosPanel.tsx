"use client";

import { CaretDown, MagnifyingGlass, Plus, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { FormError, send } from "@/components/auth/fields";
import { buttonClass } from "@/components/app/ui";
import { MACRO_BODY_LIMIT, SHORT_FORM_LIMIT, type Macro } from "@/lib/macros";

/**
 * The doctor's short forms, beside the dictation box. Saying or typing a short
 * form puts its full text in the report; clicking one here adds its text to
 * the box straight away. Closed by default to keep the panel quiet.
 */
export function MacrosPanel({
  macros,
  onMacrosChange,
  onInsert,
}: {
  macros: Macro[];
  onMacrosChange: (macros: Macro[]) => void;
  onInsert: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [shortForm, setShortForm] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // The macro waiting for a second click to confirm deleting it.
  const [deleting, setDeleting] = useState<string | null>(null);

  const words = query.trim().toLowerCase();
  const shown = words
    ? macros.filter((macro) => `${macro.shortForm} ${macro.body}`.toLowerCase().includes(words))
    : macros;

  function startAdding() {
    // What was searched for is usually the short form they wanted.
    setShortForm(query.trim().length <= SHORT_FORM_LIMIT ? query.trim() : "");
    setBody("");
    setError("");
    setAdding(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await send<{ macro: Macro }>("POST", "/api/macros", { shortForm, body });
    setBusy(false);
    if (result.error || !result.data) {
      setError(result.error);
      return;
    }
    const added = result.data.macro;
    onMacrosChange(
      [...macros, added].sort((a, b) => a.shortForm.localeCompare(b.shortForm, undefined, { sensitivity: "base" })),
    );
    setAdding(false);
    setQuery("");
  }

  async function remove(id: string) {
    const result = await send("DELETE", `/api/macros/${id}`);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDeleting(null);
    onMacrosChange(macros.filter((macro) => macro.id !== id));
  }

  return (
    <section aria-label="Macros" className="shrink-0 border-t border-line">
      <button
        type="button"
        onClick={() => setOpen((shownNow) => !shownNow)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-ink/[0.04]"
      >
        <span className="flex items-center gap-2.5 text-[1rem] font-semibold">
          Macros
          {macros.length > 0 && (
            <span className="rounded-full bg-ink/[0.08] px-2 py-0.5 text-[0.8rem] font-bold tabular-nums">
              {macros.length}
            </span>
          )}
        </span>
        <CaretDown weight="bold" className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="flex flex-col gap-2 px-5 pb-3">
          {adding ? (
            <form onSubmit={save} className="flex flex-col gap-2.5 rounded-2xl border border-ink/25 p-3" noValidate>
              <label className="flex flex-col gap-1">
                <span className="text-[0.88rem] font-semibold">Short form</span>
                <input
                  value={shortForm}
                  onChange={(event) => (setShortForm(event.target.value), setError(""))}
                  maxLength={SHORT_FORM_LIMIT}
                  placeholder="CSV"
                  autoFocus
                  className="h-10 rounded-full border border-ink/35 bg-surface px-4 text-[0.95rem] font-semibold outline-none focus:border-teal"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[0.88rem] font-semibold">Full text</span>
                <textarea
                  value={body}
                  onChange={(event) => (setBody(event.target.value), setError(""))}
                  maxLength={MACRO_BODY_LIMIT}
                  rows={3}
                  placeholder="Chronic small vessel ischemic changes are seen in bilateral fronto-parietal white matter."
                  className="resize-none rounded-2xl border border-ink/35 bg-surface px-4 py-2.5 text-[0.95rem] leading-snug outline-none placeholder:text-ink-quiet focus:border-teal"
                />
              </label>
              <FormError message={error} />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy || !shortForm.trim() || !body.trim()}
                  className={`${buttonClass.primary} h-10`}
                >
                  {busy && <Spinner />}
                  {busy ? "Saving" : "Save macro"}
                </button>
                <button type="button" onClick={() => setAdding(false)} className={`${buttonClass.secondary} h-10`}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <label className="relative block min-w-0 flex-1">
                  <MagnifyingGlass
                    weight="bold"
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink"
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && shown.length === 0 && query.trim()) {
                        event.preventDefault();
                        startAdding();
                      }
                    }}
                    aria-label="Search macros"
                    placeholder="Search macros"
                    className="h-10 w-full rounded-full border border-ink/35 bg-surface pl-10 pr-3 text-[0.95rem] font-semibold outline-none placeholder:font-medium placeholder:text-ink-quiet focus:border-teal"
                  />
                </label>
                <button
                  type="button"
                  onClick={startAdding}
                  aria-label="Add a macro"
                  title="Add a macro"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-btn text-btn-text transition-colors hover:bg-teal-deep"
                >
                  <Plus weight="bold" className="h-4 w-4" />
                </button>
              </div>

              {shown.length === 0 ? (
                <p className="py-2 text-center text-[0.92rem] text-ink-soft">
                  {macros.length === 0
                    ? "No macros yet. Add one, then say or type its short form."
                    : `No macro called “${query.trim()}”. Press Enter to add it.`}
                </p>
              ) : (
                <ul className="flex max-h-44 flex-col overflow-y-auto overscroll-contain">
                  {shown.map((macro) => (
                    <li key={macro.id} className="group flex items-start gap-1 border-t border-line first:border-t-0">
                      <button
                        type="button"
                        onClick={() => onInsert(macro.body)}
                        title="Add this text to the dictation box"
                        className="flex min-w-0 flex-1 items-start gap-3 rounded-xl px-1.5 py-2 text-left transition-colors hover:bg-ink/[0.05]"
                      >
                        <span className="shrink-0 rounded-md bg-teal/[0.12] px-1.5 py-0.5 text-[0.82rem] font-bold uppercase tracking-wide text-teal-deep">
                          {macro.shortForm}
                        </span>
                        <span className="line-clamp-2 text-[0.9rem] leading-snug text-ink">{macro.body}</span>
                      </button>
                      {deleting === macro.id ? (
                        <button
                          type="button"
                          onClick={() => remove(macro.id)}
                          onBlur={() => setDeleting(null)}
                          autoFocus
                          className="mt-1 h-8 shrink-0 rounded-full bg-flag px-3 text-[0.82rem] font-bold text-white"
                        >
                          Delete
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleting(macro.id)}
                          aria-label={`Delete macro ${macro.shortForm}`}
                          title="Delete"
                          className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-flag/10 hover:text-flag"
                        >
                          <Trash weight="bold" className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <FormError message={error} />
            </>
          )}
        </div>
      )}
    </section>
  );
}
