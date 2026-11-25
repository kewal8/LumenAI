"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  ArrowCounterClockwise,
  ArrowLeft,
  Buildings,
  CaretDown,
  FilePdf,
  LinkSimple,
  LockSimple,
  Trash,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Spinner } from "@/components/Spinner";
import { toast } from "@/components/Toast";
import { FormError, send } from "@/components/auth/fields";
import {
  ReportEditor,
  type ReportEditorHandle,
} from "@/components/report/editor/ReportEditor";
import { Tip } from "@/components/Tip";
import type { DocNode } from "@/lib/reportDoc";
import { docToHtml } from "@/lib/reportDoc";
import { DEFAULT_PROFILE, buildPrintHtml } from "@/lib/reportFormat";
import { MODALITIES } from "@/lib/templateDoc";
import { BACKDROP, ConfirmAction, POPUP } from "./TeamClient";
import { buttonClass } from "./ui";

const EMPTY: DocNode = { type: "doc", content: [{ type: "paragraph" }] };

// Round outlined icon tools; the report header keeps its plain icons.
const TOOL =
  "grid h-11 w-11 place-items-center rounded-full border border-ink/40 text-ink transition-colors hover:bg-ink/[0.06]";
const FIELD_LABEL = "text-[0.85rem] font-semibold text-ink-soft";
const FIELD =
  "flex h-[4.25rem] flex-col justify-center gap-0.5 rounded-[1.6rem] border border-ink/30 bg-surface px-5 transition-colors focus-within:border-teal hover:border-ink/50";

/**
 * Writing a template: a name, its study type, and an open page to type or
 * paste the template into. Headings end in a colon (FINDINGS:); the lines under
 * IMPRESSION: are the impression used when everything is normal.
 */
export function TemplateCanvas({
  template,
  canShare,
  orgName,
}: {
  template?: {
    id: string;
    name: string;
    modality: string | null;
    shared: boolean;
    doc: DocNode;
  };
  canShare: boolean;
  /** The organisation a shared template is shared with. */
  orgName: string;
}) {
  const router = useRouter();
  const editor = useRef<ReportEditorHandle>(null);
  const [name, setName] = useState(template?.name ?? "");
  const [modality, setModality] = useState(template?.modality ?? "");
  const [shared, setShared] = useState(template?.shared ?? false);
  // Changed to start the page again from the last saved version.
  const [seed, setSeed] = useState(0);
  const [empty, setEmpty] = useState(!template);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Whether the name is already used by another template, asked of the server a
  // moment after typing stops, so no list of names is loaded.
  const [duplicate, setDuplicate] = useState(false);
  const nameTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function checkName(next: string) {
    clearTimeout(nameTimer.current);
    setDuplicate(false);
    if (!next.trim()) return;
    nameTimer.current = setTimeout(async () => {
      const query = new URLSearchParams({
        name: next,
        ...(template ? { except: template.id } : {}),
      });
      try {
        const response = await fetch(`/api/templates/name-taken?${query}`);
        if (response.ok) setDuplicate((await response.json()).taken === true);
      } catch {
        // Saving checks the name again, so a missed check here does no harm.
      }
    }, 350);
  }

  // The Share dialog, like sharing a document: who can use this template.
  const [sharing, setSharing] = useState(false);

  // True once something was changed and not yet saved.
  const [changed, setChanged] = useState(false);
  // Leaving or resetting with unsaved changes asks first.
  const [discard, setDiscard] = useState<"leave" | "reset" | null>(null);

  function touched() {
    setError("");
    setChanged(true);
  }

  function leave() {
    if (changed) setDiscard("leave");
    else router.push("/templates");
  }

  async function save() {
    const doc = editor.current?.getDoc();
    if (!name.trim()) {
      toast.error("Give the template a name.");
      return setError("Give the template a name.");
    }
    if (duplicate) {
      toast.error(`You already have a template called “${name.trim()}”.`);
      return setError(
        `You already have a template called “${name.trim()}”. Choose another name.`,
      );
    }
    if (!doc) return;
    setBusy(true);
    setError("");
    const body = { name, modality: modality || null, shared, doc };
    const result = template
      ? await send<{ id: string }>(
          "PATCH",
          `/api/templates/${template.id}`,
          body,
        )
      : await send<{ id: string }>("POST", "/api/templates", body);
    setBusy(false);
    if (result.error || !result.data) {
      setError(result.error);
      toast.error(result.error || "The template could not be saved.");
      return;
    }
    toast.success(template ? "Template updated" : `${name.trim()} created`);
    setChanged(false);
    if (!template) {
      // The app keeps visited screens alive; leave this one blank for the next template.
      setName("");
      setModality("");
      setShared(false);
      setEmpty(true);
      setSeed((value) => value + 1);
      router.replace(`/templates/${result.data.id}`);
    }
    router.refresh();
  }

  // Shows the template as it will print, in a hidden frame.
  function pdf() {
    const doc = editor.current?.getDoc();
    if (!doc) return;
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    frame.srcdoc = buildPrintHtml(
      { title: name || "Template", sections: [] },
      DEFAULT_PROFILE,
      undefined,
      null,
      docToHtml(doc, DEFAULT_PROFILE),
    );
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 60_000);
    };
    document.body.append(frame);
  }

  function askReset() {
    if (changed) setDiscard("reset");
    else reset();
  }

  function reset() {
    setChanged(false);
    setName(template?.name ?? "");
    setModality(template?.modality ?? "");
    setShared(template?.shared ?? false);
    setEmpty(!template);
    setSeed((value) => value + 1);
    setError("");
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      // On a phone the main button is docked at the bottom; room is left for it.
      className="flex flex-col gap-5 max-lg:pb-24"
      noValidate
      // The browser would otherwise refill a new template with the last one's name and modality.
      autoComplete="off"
    >
      <header className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={leave} aria-label="Back" className={`${buttonClass.secondary} max-sm:!w-11 max-sm:!px-0`}>
          <ArrowLeft weight="bold" className="h-4 w-4" />
          <span className="max-sm:hidden">Back</span>
        </button>
        {/* Named on a phone, where the screen has no other title. */}
        <h1 className="text-[1.15rem] font-semibold tracking-[-0.02em] sm:sr-only">
          {template ? "Edit template" : "New template"}
        </h1>
        {/* Right side: sharing, then each tool on its own with room around it,
            then the main action, divided into three groups. */}
        <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-3">
          {canShare && (
            <>
              <button
                type="button"
                onClick={() => setSharing(true)}
                aria-label="Share"
                className={`${buttonClass.secondary} max-sm:!w-11 max-sm:!px-0`}
              >
                {shared ? (
                  <Buildings weight="bold" className="h-4 w-4" />
                ) : (
                  <LockSimple weight="bold" className="h-4 w-4" />
                )}
                <span className="max-sm:hidden">Share</span>
              </button>
              <span aria-hidden="true" className="h-7 w-px bg-ink/20 max-sm:hidden" />
            </>
          )}
          <div className="flex items-center gap-1 sm:gap-2">
            <Tip label={template ? "Reset to the last saved version" : "Clear and start again"}>
              <button
                type="button"
                onClick={askReset}
                aria-label="Reset"
                className={TOOL}
              >
                <ArrowCounterClockwise weight="bold" className="h-5 w-5" />
              </button>
            </Tip>
            <Tip label="See as PDF">
              <button
                type="button"
                onClick={pdf}
                aria-label="See as PDF"
                className={`${TOOL} text-flag`}
              >
                <FilePdf weight="fill" className="h-5 w-5" />
              </button>
            </Tip>
            {template && (
              <ConfirmAction
                label="Delete template"
                icon={<Trash weight="bold" className="h-5 w-5" />}
                triggerClassName={`${TOOL} hover:!border-flag/50 hover:!bg-flag/10 hover:text-flag`}
                title={`Delete ${template.name}?`}
                body="The template is removed for everyone who can use it. Reports already written are not affected."
                confirmLabel="Delete template"
                doneMessage={`${template.name} deleted`}
                path={`/api/templates/${template.id}`}
                redirectTo="/templates"
              />
            )}
          </div>
          <span aria-hidden="true" className="h-7 w-px bg-ink/20 max-lg:hidden" />
          {/* On a phone or tablet: a full-width button docked at the bottom, above the keyboard when it is open. */}
          <div className="max-lg:fixed max-lg:inset-x-0 max-lg:bottom-[var(--kb,0px)] max-lg:z-30 max-lg:border-t max-lg:border-line max-lg:bg-surface/90 max-lg:px-4 max-lg:pt-3 max-lg:pb-[calc(0.75rem+env(safe-area-inset-bottom))] max-lg:backdrop-blur-xl">
          <button
            type="submit"
            disabled={busy || duplicate}
            className={`${buttonClass.primary} max-lg:h-12 max-lg:w-full`}
          >
            {busy && <Spinner />}
            {template
              ? busy
                ? "Updating"
                : "Update template"
              : busy
                ? "Creating"
                : "Create template"}
          </button>
          </div>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-[3fr_1fr]">
        <label className={FIELD}>
          <span className={FIELD_LABEL}>Template name</span>
          <input
            value={name}
            onChange={(event) => (
              setName(event.target.value),
              checkName(event.target.value),
              touched()
            )}
            maxLength={120}
            placeholder="Name this template, such as CT Brain (Plain)"
            autoComplete="off"
            name="lumenai-template-name"
            aria-invalid={duplicate || undefined}
            aria-describedby={duplicate ? "template-name-taken" : undefined}
            autoFocus={!template}
            className="bg-transparent text-[1.02rem] outline-none font-semibold text-ink placeholder:font-medium placeholder:text-ink-quiet"
          />
        </label>
        <div className={`${FIELD} relative`}>
          <label
            htmlFor="template-modality"
            className={`${FIELD_LABEL} pointer-events-none`}
          >
            Modality
          </label>
          <span
            aria-hidden="true"
            className={`pointer-events-none text-[1.02rem] font-semibold ${modality ? "text-ink" : "text-ink-quiet"}`}
          >
            {modality || "Select a modality"}
          </span>
          <CaretDown
            weight="bold"
            aria-hidden="true"
            className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2"
          />
          {/* The browser's own list, laid invisibly over the whole field so any click opens it. */}
          <select
            id="template-modality"
            autoComplete="off"
            value={modality}
            onChange={(event) => (setModality(event.target.value), touched())}
            className="absolute inset-0 cursor-pointer rounded-[1.6rem] opacity-0 outline-none"
          >
            <option value="">Select a modality</option>
            {MODALITIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {duplicate && (
        <p
          id="template-name-taken"
          role="alert"
          className="-mt-2 text-[0.92rem] font-semibold text-flag"
        >
          You already have a template called “{name.trim()}”. Choose another
          name.
        </p>
      )}
      <FormError message={error} />

      {/* The open page. The hint shows only while it is empty. */}
      <div
        className="template-canvas"
        data-empty={empty || undefined}
        style={
          {
            // Shown faintly until the first letter.
            "--placeholder": '"Type or paste your template here"',
          } as React.CSSProperties
        }
      >
        <ReportEditor
          key={seed}
          ref={editor}
          initialDoc={template?.doc ?? EMPTY}
          profile={DEFAULT_PROFILE}
          onChange={(doc) => {
            touched();
            setEmpty(!JSON.stringify(doc).includes('"text":'));
          }}
        />
      </div>

      <Dialog.Root
        open={discard !== null}
        onOpenChange={(open) => !open && setDiscard(null)}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className={BACKDROP} />
          <Dialog.Popup className={POPUP}>
            <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">
              {discard === "leave"
                ? "Leave without saving?"
                : "Undo your changes?"}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-ink-soft">
              {discard === "leave"
                ? "The changes you made to this template will be lost."
                : template
                  ? "The template goes back to how it was last saved."
                  : "The page is cleared."}
            </Dialog.Description>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const action = discard;
                  setDiscard(null);
                  if (action === "leave") router.push("/templates");
                  else reset();
                }}
                className={buttonClass.danger}
              >
                {discard === "leave" ? "Leave" : "Undo changes"}
              </button>
              <Dialog.Close className={buttonClass.secondary}>
                Keep editing
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <ShareDialog
        open={sharing}
        onClose={() => setSharing(false)}
        name={name.trim() || "this template"}
        orgName={orgName}
        templateId={template?.id ?? null}
        shared={shared}
        onShared={setShared}
      />
    </form>
  );
}

/**
 * Who can use a template, chosen the way a document is shared: a small window
 * in the middle of the screen with general access and a link to copy. For a
 * saved template the choice takes effect at once; for a new one, on Create.
 */
function ShareDialog({
  open,
  onClose,
  name,
  orgName,
  templateId,
  shared,
  onShared,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  orgName: string;
  templateId: string | null;
  shared: boolean;
  onShared: (shared: boolean) => void;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState(shared);
  const [busy, setBusy] = useState(false);

  async function done() {
    if (!templateId || choice === shared) {
      onShared(choice);
      onClose();
      return;
    }
    setBusy(true);
    const result = await send("PATCH", `/api/templates/${templateId}`, {
      sharingOnly: true,
      shared: choice,
    });
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    onShared(choice);
    toast.success(
      choice ? `Shared with everyone at ${orgName}` : "Now only you can use it",
    );
    onClose();
    router.refresh();
  }

  async function copyLink() {
    if (!templateId) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/templates/${templateId}`,
      );
      toast.success("Link copied");
    } catch {
      toast.warning("The browser did not let the link copy.");
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (next) setChoice(shared);
        else if (!busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className={BACKDROP} />
        <Dialog.Popup className={`${POPUP} !w-[min(32rem,calc(100vw-2rem))]`}>
          <Dialog.Title className="truncate text-[1.35rem] font-semibold tracking-[-0.02em]">
            Share “{name}”
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-ink-soft">
            Choose who can use this template in their reports.
          </Dialog.Description>

          <p className="mt-6 text-[0.95rem] font-semibold">General access</p>
          <div className="mt-2 flex items-start gap-3.5 rounded-2xl px-1 py-1">
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
                choice
                  ? "bg-teal/[0.15] text-teal-deep"
                  : "bg-ink/[0.08] text-ink"
              }`}
            >
              {choice ? (
                <Buildings weight="fill" className="h-5 w-5" />
              ) : (
                <LockSimple weight="fill" className="h-5 w-5" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="relative inline-flex items-center">
                <select
                  aria-label="General access"
                  value={choice ? "org" : "me"}
                  onChange={(event) => setChoice(event.target.value === "org")}
                  className="cursor-pointer appearance-none rounded-lg bg-transparent py-1 pl-1 pr-7 text-[1rem] font-semibold outline-none hover:bg-ink/[0.06] focus-visible:bg-ink/[0.06] focus-visible:ring-2 focus-visible:ring-teal"
                >
                  <option value="me">Only you</option>
                  <option value="org">Everyone at {orgName}</option>
                </select>
                <CaretDown
                  weight="bold"
                  aria-hidden="true"
                  className="pointer-events-none absolute right-1.5 h-4 w-4"
                />
              </span>
              <span className="block pl-1 text-[0.9rem] text-ink-soft">
                {choice
                  ? "Everyone in your organisation can use it. Only you and admins can change it."
                  : "Only you can see and use this template."}
              </span>
            </span>
          </div>

          {!templateId && (
            <p className="mt-4 rounded-2xl bg-ink/[0.04] px-4 py-3 text-[0.9rem] text-ink-soft">
              This applies when you press Create template.
            </p>
          )}

          <div className="mt-7 flex items-center gap-2">
            {templateId && (
              <button
                type="button"
                onClick={copyLink}
                className={buttonClass.secondary}
              >
                <LinkSimple weight="bold" className="h-4 w-4" />
                Copy link
              </button>
            )}
            <button
              type="button"
              onClick={done}
              disabled={busy}
              className={`${buttonClass.primary} ml-auto`}
            >
              {busy && <Spinner />}
              {busy ? "Saving" : "Done"}
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
