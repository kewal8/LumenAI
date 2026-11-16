"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ArrowsClockwise, FileDoc, FilePdf, UploadSimple, WarningCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Spinner } from "@/components/Spinner";
import { toast } from "@/components/Toast";
import { send } from "@/components/auth/fields";
import { MODALITIES } from "@/lib/templateDoc";
import type { UploadedTemplate } from "@/lib/templateUpload";
import { BACKDROP, POPUP } from "./TeamClient";
import { Select, buttonClass } from "./ui";

type Existing = { id: string; canEdit: boolean; shared: boolean };
type Row = UploadedTemplate & {
  modality: string;
  saveError: string;
  /** A template the person already has by this name. */
  existing: Existing | null;
  /** Chosen to overwrite that template with this upload. */
  replace: boolean;
  /** The name `existing` was looked up for. */
  checked: string;
};

/** The template already called this, if any. */
async function existingNamed(name: string): Promise<Existing | null> {
  if (!name.trim()) return null;
  const result = await send<{ existing: Existing | null }>(
    "GET",
    `/api/templates/name-taken?${new URLSearchParams({ name: name.trim(), which: "1" })}`,
  );
  return result.data?.existing ?? null;
}

const SMALL_BUTTON =
  "inline-flex h-8 items-center rounded-full border border-ink/40 px-3 text-[0.85rem] font-semibold text-ink transition-colors hover:bg-ink/[0.06] disabled:opacity-50";
const FIELD =
  "h-11 w-full rounded-full border border-ink/35 bg-surface px-4 text-[0.95rem] font-semibold text-ink outline-none transition-colors hover:border-ink/55 focus:border-teal";

/**
 * Many templates at once from Word files (.docx) or a ZIP of them. Each
 * document becomes a template named after its file; the name and modality are
 * checked here before the templates are created.
 */
export function TemplateUpload() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [discard, setDiscard] = useState(false);

  async function read(list: FileList | null) {
    const files = [...(list ?? [])];
    if (files.length === 0) return;
    setReading(true);
    // Loaded only when used: the Word and ZIP readers are large.
    const { readUploads } = await import("@/lib/templateUpload");
    const result = await readUploads(files);
    // Names already in use are found now, so the choice to replace is there before creating.
    const added = await Promise.all(
      result.templates.map(async (row) => ({
        ...row,
        modality: "",
        saveError: "",
        existing: row.doc && !row.error ? await existingNamed(row.name) : null,
        replace: false,
        checked: row.name,
      })),
    );
    setReading(false);
    setSkipped((count) => count + result.skipped);
    setRows((current) => [...current, ...added]);
    if (result.templates.length === 0) toast.warning("No Word documents (.docx) or PDFs were found in what you chose.");
  }

  function close() {
    setOpen(false);
    setRows([]);
    setSkipped(0);
    setDiscard(false);
  }

  function update(key: string, change: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...change } : row)));
  }

  function remove(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  // A changed name is checked again once the field is left.
  async function recheck(row: Row) {
    if (!row.doc || row.error || row.name === row.checked) return;
    update(row.key, { existing: await existingNamed(row.name), replace: false, checked: row.name });
  }

  // Names used by more than one upload: each must be unique.
  const names = rows.map((row) => row.name.trim().toLowerCase());
  const repeated = (row: Row) => names.filter((name) => name === row.name.trim().toLowerCase()).length > 1;
  const problem = (row: Row) =>
    row.error ||
    (!row.name.trim() ? "Give the template a name." : "") ||
    (repeated(row) ? "Another upload has this name. Change one of them." : "") ||
    (row.existing && !row.replace ? `You already have a template called “${row.name.trim()}”.` : "") ||
    row.saveError;
  const ready = rows.filter((row) => !problem(row));

  async function create() {
    setBusy(true);
    let created = 0;
    let replaced = 0;
    for (const row of ready) {
      const body = { name: row.name.trim(), modality: row.modality || null, doc: row.doc };
      const result =
        row.replace && row.existing
          ? // Keeps whether the old template was shared with the team.
            await send("PATCH", `/api/templates/${row.existing.id}`, { ...body, shared: row.existing.shared })
          : await send("POST", "/api/templates", body);
      if (result.error) {
        // Someone may have made a template by this name meanwhile: offer to replace it.
        const existing = row.replace ? row.existing : await existingNamed(row.name);
        update(row.key, existing && !row.replace ? { existing } : { saveError: result.error });
      } else {
        if (row.replace) replaced++;
        else created++;
        remove(row.key);
      }
    }
    setBusy(false);
    const done = created + replaced;
    if (done > 0) router.refresh();
    const summary = [
      created > 0 && `${created} template${created === 1 ? "" : "s"} created`,
      replaced > 0 && `${replaced} replaced`,
    ]
      .filter(Boolean)
      .join(", ");
    const left = rows.length - done;
    if (left === 0) {
      toast.success(summary);
      close();
    } else if (done > 0) {
      toast.warning(`${summary}. ${left} still need${left === 1 ? "s" : ""} attention.`);
    } else {
      toast.error("No templates were saved. Check the notes under each one.");
    }
  }

  const picker = (
    <input
      ref={input}
      type="file"
      multiple
      accept=".docx,.doc,.pdf,.zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,application/zip"
      className="sr-only"
      onChange={(event) => {
        read(event.target.files);
        event.target.value = "";
      }}
    />
  );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass.secondary}>
        <UploadSimple weight="bold" className="h-4 w-4" />
        Upload templates
      </button>

      <Dialog.Root
        open={open}
        onOpenChange={(next) => {
          if (next || busy) return;
          // Uploaded templates not yet created are lost on closing, so ask first.
          if (rows.length > 0) setDiscard(true);
          else close();
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className={BACKDROP} />
          <Dialog.Popup className={`${POPUP} !w-[min(48rem,calc(100vw-2rem))] flex max-h-[calc(100dvh-2rem)] flex-col`}>
            {picker}
            {discard ? (
              <div>
                <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">
                  Discard the uploaded templates?
                </Dialog.Title>
                <Dialog.Description className="mt-1.5 text-ink-soft">
                  {rows.length === 1 ? "1 template has" : `${rows.length} templates have`} not been created yet. You can
                  upload the files again later.
                </Dialog.Description>
                <div className="mt-6 flex gap-2">
                  <button type="button" onClick={close} className={buttonClass.danger}>
                    Discard
                  </button>
                  <button type="button" onClick={() => setDiscard(false)} className={buttonClass.secondary}>
                    Keep them
                  </button>
                </div>
              </div>
            ) : rows.length === 0 ? (
              <div>
                <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">Upload templates</Dialog.Title>
                <Dialog.Description className="mt-1.5 text-ink-soft">
                  Each Word document or PDF becomes one template, named after its file. You can check the names and pick a
                  modality next.
                </Dialog.Description>
                <button
                  type="button"
                  disabled={reading}
                  onClick={() => input.current?.click()}
                  onDragOver={(event) => (event.preventDefault(), setDragging(true))}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    read(event.dataTransfer.files);
                  }}
                  className={`mt-5 flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                    dragging ? "border-teal bg-teal-tint" : "border-ink/30 hover:border-ink/50 hover:bg-ink/[0.03]"
                  }`}
                >
                  {reading ? (
                    <>
                      <Spinner />
                      <span className="font-semibold">Reading your files</span>
                    </>
                  ) : (
                    <>
                      <UploadSimple weight="bold" className="h-7 w-7 text-teal" />
                      <span className="text-[1.05rem] font-semibold">Choose Word files, PDFs or a ZIP</span>
                      <span className="text-[0.9rem] text-ink-soft">or drop them here · .docx, .pdf or .zip, up to 100 at once</span>
                    </>
                  )}
                </button>
                <div className="mt-6 flex gap-2">
                  <button type="button" onClick={close} className={buttonClass.secondary}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="shrink-0">
                  <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">
                    Check your templates
                  </Dialog.Title>
                  <Dialog.Description className="mt-1.5 text-ink-soft">
                    The name comes from each file. Change it if you like, and pick a modality.
                    {skipped > 0 && ` ${skipped} file${skipped === 1 ? " was" : "s were"} not Word documents and left out.`}
                  </Dialog.Description>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2">
                      <span className="text-[0.88rem] font-semibold text-ink-soft">Modality for all</span>
                      <Select
                        value="choose"
                        disabled={busy}
                        onChange={(event) =>
                          setRows((current) => current.map((row) => ({ ...row, modality: event.target.value })))
                        }
                        className="!h-10 !w-40"
                      >
                        <option value="choose" disabled hidden>
                          Choose
                        </option>
                        <option value="">Not set</option>
                        {MODALITIES.map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </Select>
                    </label>
                    <button
                      type="button"
                      disabled={busy || reading}
                      onClick={() => input.current?.click()}
                      className={`${buttonClass.quiet} ml-auto`}
                    >
                      {reading && <Spinner />}
                      {reading ? "Reading" : "Add more files"}
                    </button>
                  </div>
                </div>

                <ul className="-mx-2 mt-4 min-h-0 flex-1 divide-y divide-line overflow-y-auto overscroll-contain px-2">
                  {rows.map((row) => {
                    const note = problem(row);
                    return (
                      <li key={row.key} className="py-3">
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
                          <input
                            value={row.name}
                            disabled={busy || !row.doc}
                            maxLength={120}
                            aria-label={`Template name for ${row.file}`}
                            onChange={(event) =>
                              update(row.key, { name: event.target.value, saveError: "", existing: null, replace: false })
                            }
                            onBlur={() => recheck(row)}
                            className={`${FIELD} ${note ? "!border-flag/60" : ""}`}
                          />
                          {row.doc && !row.error && (
                            <Select
                              value={row.modality}
                              disabled={busy}
                              aria-label={`Modality for ${row.name || row.file}`}
                              onChange={(event) => update(row.key, { modality: event.target.value })}
                              className="!w-full"
                            >
                              <option value="">Modality</option>
                              {MODALITIES.map((value) => (
                                <option key={value}>{value}</option>
                              ))}
                            </Select>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 pl-4 text-[0.85rem] text-ink-quiet">
                          {/\.pdf$/i.test(row.file) ? (
                            <FilePdf weight="fill" className="h-4 w-4 shrink-0" />
                          ) : (
                            <FileDoc weight="fill" className="h-4 w-4 shrink-0" />
                          )}
                          <span className="min-w-0 truncate">{row.file}</span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => remove(row.key)}
                            aria-label={`Remove ${row.file} from the upload`}
                            className="ml-auto shrink-0 rounded-full px-2.5 py-1 font-semibold text-ink-soft transition-colors hover:bg-ink/[0.07] hover:text-ink"
                          >
                            Remove
                          </button>
                        </div>
                        {row.noImpression && !note && (
                          <p className="mt-1 pl-4 text-[0.85rem] text-ink-soft">
                            No IMPRESSION section, so its reports will have no impression.
                          </p>
                        )}
                        {row.existing && row.replace ? (
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 pl-4 text-[0.88rem] font-semibold text-teal-deep">
                            <ArrowsClockwise weight="bold" className="h-4 w-4 shrink-0" />
                            Replaces your existing “{row.name.trim()}”.
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => update(row.key, { replace: false })}
                              className="text-ink underline decoration-ink/40 underline-offset-4 hover:decoration-ink"
                            >
                              Undo
                            </button>
                            {row.saveError && (
                              <span className="flex basis-full items-start gap-1.5 text-flag">
                                <WarningCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0" />
                                {row.saveError}
                              </span>
                            )}
                          </p>
                        ) : (
                          note && (
                            <div className="mt-1 pl-4">
                              <p className="flex items-start gap-1.5 text-[0.88rem] font-semibold text-flag">
                                <WarningCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0" />
                                {note}
                                {row.existing && !row.existing.canEdit && " It is shared with you, so rename this one."}
                              </p>
                              {row.existing?.canEdit && note.startsWith("You already have") && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => update(row.key, { replace: true, saveError: "" })}
                                    className={SMALL_BUTTON}
                                  >
                                    Replace the existing one
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => remove(row.key)}
                                    className={SMALL_BUTTON}
                                  >
                                    Remove this upload
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-5 flex shrink-0 flex-wrap items-center gap-2">
                  <button type="button" onClick={create} disabled={busy || ready.length === 0} className={buttonClass.primary}>
                    {busy && <Spinner />}
                    {busy
                      ? "Saving"
                      : `${ready.some((row) => row.replace) ? "Save" : "Create"} ${
                          ready.length === 0 ? "" : `${ready.length} `
                        }template${ready.length === 1 ? "" : "s"}`}
                  </button>
                  <button type="button" onClick={() => setDiscard(true)} disabled={busy} className={buttonClass.secondary}>
                    Cancel
                  </button>
                  {ready.length < rows.length && (
                    <span className="text-[0.88rem] text-ink-soft">
                      {rows.length - ready.length} need{rows.length - ready.length === 1 ? "s" : ""} a change first
                    </span>
                  )}
                </div>
              </>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
