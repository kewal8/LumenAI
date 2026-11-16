"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  ArrowDown,
  Lightning,
  Microphone,
  PencilSimple,
  Plus,
  Trash,
  X,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { toast } from "@/components/Toast";
import { FormError, send } from "@/components/auth/fields";
import { Tip } from "@/components/Tip";
import { KeyCombo } from "@/components/KeyCombo";
import {
  HeadTick,
  ListMenu,
  RowTick,
  Selectable,
  SelectionBar,
} from "./Selection";
import { SearchField } from "./Search";
import { ConfirmAction } from "./TeamClient";
import { MACRO_BODY_LIMIT, SHORT_FORM_LIMIT, type Macro } from "@/lib/macros";
import { BACKDROP } from "./TeamClient";
import { IconTile, buttonClass } from "./ui";

const byShortForm = (a: Macro, b: Macro) =>
  a.shortForm.localeCompare(b.shortForm, undefined, { sensitivity: "base" });

/**
 * Every macro in one place, with room to read and change the full text. The
 * panel on the report screen is for using them mid-report; this is for keeping them.
 */
export function MacrosManager({ macros: initial }: { macros: Macro[] }) {
  const [macros, setMacros] = useState(initial);
  const [query, setQuery] = useState("");
  // "new" while adding, a macro's id while changing it, null otherwise.
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");

  const words = query.trim().toLowerCase();
  const shown = words
    ? macros.filter((macro) =>
        `${macro.shortForm} ${macro.body}`.toLowerCase().includes(words),
      )
    : macros;

  function saved(macro: Macro) {
    setMacros((current) =>
      [...current.filter((item) => item.id !== macro.id), macro].sort(
        byShortForm,
      ),
    );
    setEditing(null);
  }

  return (
    <Selectable>
      <div className="flex flex-col gap-6">
        {/* How macros are used, in one line each, since most doctors meet them here first. */}
        <ul className="grid gap-3 sm:grid-cols-2">
          <li className="flex items-start gap-3 rounded-2xl bg-ink/[0.04] px-4 py-3.5">
            <Microphone
              weight="fill"
              className="mt-0.5 h-5 w-5 shrink-0 text-teal"
            />
            <span className="leading-relaxed text-ink">
              Say or type the <strong>short form</strong> while dictating. The
              full text goes into the report.
            </span>
          </li>
          <li className="flex items-start gap-3 rounded-2xl bg-ink/[0.04] px-4 py-3.5">
            <Lightning
              weight="fill"
              className="mt-0.5 h-5 w-5 shrink-0 text-teal"
            />
            <span className="leading-relaxed text-ink">
              Added one by mistake? Say <strong>“delete last macro”</strong> and
              it is taken out.
            </span>
          </li>
        </ul>

        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            value={query}
            onChange={setQuery}
            label="Search macros"
            placeholder="Search by short form or text"
            className="min-w-0 flex-1 basis-64"
          />
          <button
            type="button"
            onClick={() => (setEditing("new"), setError(""))}
            className={buttonClass.primary}
          >
            <Plus weight="bold" className="h-4.5 w-4.5" />
            New macro
          </button>
          {macros.length > 0 && <ListMenu />}
        </div>

        <SelectionBar
          noun="macros"
          deleteBase="/api/macros/"
          warning="Saying or typing their short forms will no longer add their text."
          onDeleted={(ids) =>
            setMacros((current) =>
              current.filter((macro) => !ids.includes(macro.id)),
            )
          }
        />

        <MacroDialog
          open={editing !== null}
          macro={macros.find((macro) => macro.id === editing) ?? null}
          macros={macros}
          startWith={
            shown.length === 0 && query.trim().length <= SHORT_FORM_LIMIT
              ? query.trim()
              : ""
          }
          onClose={() => setEditing(null)}
          onSaved={saved}
        />

        <FormError message={error} />

        {macros.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-ink/25 px-6 py-10 text-center">
            <p className="text-[1.1rem] font-bold">No macros yet</p>
            <p className="mx-auto mt-1.5 max-w-[46ch] text-ink-soft">
              Save sentences you use often under a short form, such as “CSV” for
              chronic small vessel changes.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-ink/20">
            <div className="t-label hidden grid-cols-[9rem_minmax(0,1fr)_8rem] gap-6 border-b border-line bg-ink/[0.04] px-5 py-3 md:grid">
              <span className="flex items-center gap-3">
                <HeadTick ids={shown.map((macro) => macro.id)} />
                Short form
              </span>
              <span>Full text</span>
              <span className="text-right">
                {macros.length} {macros.length === 1 ? "macro" : "macros"}
              </span>
            </div>
            {shown.length === 0 ? (
              <p className="px-5 py-6 text-center text-ink-soft">
                No macro matches “{query.trim()}”.
              </p>
            ) : (
              <ul>
                {shown.map((macro) => (
                  <li
                    key={macro.id}
                    className="grid gap-x-6 gap-y-2 border-t border-line px-5 py-4 first:border-t-0 has-[:checked]:bg-teal/[0.06] md:grid-cols-[9rem_minmax(0,1fr)_8rem] md:items-start"
                  >
                    <span className="flex items-center gap-3 self-start">
                      <RowTick id={macro.id} label={macro.shortForm} />
                      <span className="rounded-lg bg-teal/[0.12] px-2 py-1 text-[0.9rem] font-bold uppercase tracking-wide text-teal-deep">
                        {macro.shortForm}
                      </span>
                    </span>
                    <p className="whitespace-pre-line leading-relaxed text-ink">
                      {macro.body}
                    </p>
                    <span className="flex items-center gap-1 md:justify-end">
                      <Tip label="Change">
                        <button
                          type="button"
                          onClick={() => (setEditing(macro.id), setError(""))}
                          aria-label={`Change macro ${macro.shortForm}`}
                          className="grid h-9 w-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-ink/[0.08] hover:text-ink"
                        >
                          <PencilSimple weight="bold" className="h-4.5 w-4.5" />
                        </button>
                      </Tip>
                      <ConfirmAction
                        label={`Delete macro ${macro.shortForm}`}
                        icon={<Trash weight="bold" className="h-4.5 w-4.5" />}
                        triggerClassName="grid h-9 w-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-flag/10 hover:text-flag"
                        title={`Delete the macro ${macro.shortForm}?`}
                        body={`Saying or typing ${macro.shortForm} will no longer add its text.`}
                        confirmLabel="Delete macro"
                        doneMessage={`Macro ${macro.shortForm} deleted`}
                        path={`/api/macros/${macro.id}`}
                        onDone={() =>
                          setMacros((current) =>
                            current.filter((item) => item.id !== macro.id),
                          )
                        }
                      />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Selectable>
  );
}

/**
 * Adding a macro, or changing one when `macro` is given. A dialog, so the list
 * stays where it was, with a preview of what saying the short form will write.
 */
function MacroDialog({
  open,
  macro,
  macros,
  startWith,
  onClose,
  onSaved,
}: {
  open: boolean;
  macro: Macro | null;
  /** All macros, to warn about a short form already in use before saving. */
  macros: Macro[];
  /** A short form to start a new macro with, such as what was searched for. */
  startWith: string;
  onClose: () => void;
  onSaved: (macro: Macro) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className={BACKDROP} />
        <Dialog.Popup className="app-layer sheet fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-ink/20 bg-surface shadow-[0_24px_70px_-20px_rgb(15_38_36/0.5)] outline-none">
          {/* Remounted for each macro, so the fields always start from it. */}
          {open && (
            <MacroForm
              key={macro?.id ?? "new"}
              macro={macro}
              macros={macros}
              startWith={startWith}
              onSaved={onSaved}
            />
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function MacroForm({
  macro,
  macros,
  startWith,
  onSaved,
}: {
  macro: Macro | null;
  macros: Macro[];
  startWith: string;
  onSaved: (macro: Macro) => void;
}) {
  const [shortForm, setShortForm] = useState(macro?.shortForm ?? startWith);
  const [body, setBody] = useState(macro?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const trimmed = shortForm.trim();
  const taken = macros.find(
    (other) =>
      other.id !== macro?.id &&
      other.shortForm.toLowerCase() === trimmed.toLowerCase(),
  );
  const ready =
    trimmed.length >= 2 && body.trim().length > 0 && !taken && !busy;

  async function save(event?: React.FormEvent) {
    event?.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError("");
    const result = macro
      ? await send<{ macro: Macro }>("PATCH", `/api/macros/${macro.id}`, {
          shortForm,
          body,
        })
      : await send<{ macro: Macro }>("POST", "/api/macros", {
          shortForm,
          body,
        });
    setBusy(false);
    if (result.error || !result.data) {
      setError(result.error);
      toast.error(result.error || "The macro could not be saved.");
      return;
    }
    toast.success(
      macro
        ? `Macro ${shortForm.trim()} updated`
        : `Macro ${shortForm.trim()} created`,
    );
    onSaved(result.data.macro);
  }

  return (
    <form
      onSubmit={save}
      onKeyDown={(event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          save();
        }
      }}
      className="flex min-h-0 flex-col"
      noValidate
    >
      <header className="flex items-start gap-4 border-b border-line px-6 py-5 sm:px-7">
        <IconTile tone="teal">
          <Lightning weight="fill" className="h-5 w-5" />
        </IconTile>
        <div className="min-w-0 flex-1">
          <Dialog.Title className="text-[1.3rem] font-semibold leading-tight tracking-[-0.02em]">
            {macro ? `Edit ${macro.shortForm}` : "New macro"}
          </Dialog.Title>
          <Dialog.Description className="t-meta mt-1">
            A short form you say or type, and the full sentence it writes into
            the report.
          </Dialog.Description>
        </div>
        <Dialog.Close
          aria-label="Close"
          className="-mr-2 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-ink/[0.08] hover:text-ink"
        >
          <X weight="bold" className="h-5 w-5" />
        </Dialog.Close>
      </header>

      <div className="flex min-h-0 flex-col gap-6 overflow-y-auto px-6 py-6 sm:px-7">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="macro-short-form"
            className="text-[0.98rem] font-semibold"
          >
            Short form
          </label>
          <input
            id="macro-short-form"
            value={shortForm}
            onChange={(event) => (
              setShortForm(event.target.value),
              setError("")
            )}
            maxLength={SHORT_FORM_LIMIT}
            placeholder="CSV"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(taken)}
            aria-describedby="macro-short-form-hint"
            className={`h-14 w-full max-w-[18rem] rounded-2xl border-2 bg-surface px-4 text-[1.45rem] font-bold uppercase tracking-[0.06em] text-ink outline-none transition-colors placeholder:font-semibold placeholder:text-ink-quiet/60 ${
              taken
                ? "border-flag"
                : "border-ink/35 hover:border-ink/60 focus:border-teal"
            }`}
          />
          <p
            id="macro-short-form-hint"
            className={`text-[0.9rem] ${taken ? "font-semibold text-flag" : "text-ink-soft"}`}
          >
            {taken
              ? `You already have a macro called “${taken.shortForm}”. Choose another short form.`
              : "Letters or numbers you can say clearly, such as CSV or NCB."}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <label
              htmlFor="macro-body"
              className="text-[0.98rem] font-semibold"
            >
              Full text
            </label>
            <span
              className={`t-meta tabular-nums ${body.length > MACRO_BODY_LIMIT * 0.9 ? "!text-amber-deep" : ""}`}
            >
              {body.length.toLocaleString("en-IN")} /{" "}
              {MACRO_BODY_LIMIT.toLocaleString("en-IN")}
            </span>
          </div>
          <textarea
            id="macro-body"
            value={body}
            onChange={(event) => (setBody(event.target.value), setError(""))}
            maxLength={MACRO_BODY_LIMIT}
            placeholder="Chronic small vessel ischaemic changes are seen in bilateral fronto-parietal white matter."
            className="min-h-32 w-full resize-none rounded-2xl border-2 border-ink/35 bg-surface px-4 py-3.5 text-[1.02rem] leading-relaxed text-ink outline-none transition-colors [field-sizing:content] placeholder:text-ink-quiet/70 hover:border-ink/60 focus:border-teal"
          />
        </div>

        {/* What saying it does, in the same words the report will have. */}
        <section aria-label="Preview" className="rounded-2xl bg-ink/[0.04] p-4">
          <p className="t-label">When you dictate</p>
          <div className="mt-3 flex flex-col gap-2.5">
            <p className="t-speech self-start">
              “Left frontal infarct.{" "}
              <strong className="uppercase">{trimmed || "CSV"}</strong>.”
            </p>
            <ArrowDown
              weight="bold"
              aria-hidden="true"
              className="ml-4 h-4 w-4 text-ink-quiet"
            />
            <p className="rounded-xl border border-ink/15 bg-surface px-4 py-3 leading-relaxed text-ink">
              Left frontal infarct.{" "}
              <mark
                className={`rounded-md px-1 py-0.5 ${body.trim() ? "bg-teal/[0.14] text-ink" : "bg-transparent text-ink-quiet"}`}
              >
                {body.trim() || "Your full text appears here."}
              </mark>
            </p>
          </div>
        </section>
      </div>

      <footer className="flex flex-wrap items-center gap-3 border-t border-line px-6 py-4 sm:px-7">
        <span className="min-w-0 flex-1">
          {error ? (
            <FormError message={error} />
          ) : (
            <span className="t-meta hidden sm:inline">
              <KeyCombo combo="Ctrl+Enter" join=" + " /> to save
            </span>
          )}
        </span>
        <Dialog.Close className={buttonClass.secondary}>Cancel</Dialog.Close>
        <button type="submit" disabled={!ready} className={buttonClass.primary}>
          {busy && <Spinner />}
          {macro
            ? busy
              ? "Updating"
              : "Update macro"
            : busy
              ? "Creating"
              : "Create macro"}
        </button>
      </footer>
    </form>
  );
}
