"use client";

import { Switch } from "@base-ui/react/switch";
import { ArrowCounterClockwise, ArrowLeft, CaretDown, CheckCircle, FilePdf } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Spinner } from "@/components/Spinner";
import { FormError, send } from "@/components/auth/fields";
import { ReportEditor, type ReportEditorHandle } from "@/components/report/editor/ReportEditor";
import type { DocNode } from "@/lib/reportDoc";
import { docToHtml } from "@/lib/reportDoc";
import { DEFAULT_PROFILE, buildPrintHtml } from "@/lib/reportFormat";
import { MODALITIES } from "@/lib/templateDoc";
import { ConfirmAction } from "./TeamClient";
import { buttonClass } from "./ui";

const EMPTY: DocNode = { type: "doc", content: [{ type: "paragraph" }] };

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
}: {
  template?: { id: string; name: string; modality: string | null; shared: boolean; doc: DocNode };
  canShare: boolean;
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
  const [saved, setSaved] = useState(false);

  function touched() {
    setError("");
    setSaved(false);
  }

  async function save() {
    const doc = editor.current?.getDoc();
    if (!name.trim()) return setError("Give the template a name.");
    if (!doc) return;
    setBusy(true);
    setError("");
    const body = { name, modality: modality || null, shared, doc };
    const result = template
      ? await send<{ id: string }>("PATCH", `/api/templates/${template.id}`, body)
      : await send<{ id: string }>("POST", "/api/templates", body);
    setBusy(false);
    if (result.error || !result.data) {
      setError(result.error);
      return;
    }
    setSaved(true);
    if (!template) router.replace(`/templates/${result.data.id}`);
    router.refresh();
  }

  // Shows the template as it will print, in a hidden frame.
  function pdf() {
    const doc = editor.current?.getDoc();
    if (!doc) return;
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
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

  function reset() {
    setName(template?.name ?? "");
    setModality(template?.modality ?? "");
    setShared(template?.shared ?? false);
    setEmpty(!template);
    setSeed((value) => value + 1);
    touched();
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="flex flex-col gap-5"
      noValidate
    >
      <header className="flex flex-wrap items-center gap-3">
        <Link href="/templates" className={buttonClass.secondary}>
          <ArrowLeft weight="bold" className="h-4 w-4" />
          Back
        </Link>
        <h1 className="sr-only">{template ? "Edit template" : "New template"}</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {saved && (
            <span role="status" className="mr-1 flex items-center gap-1.5 text-[0.92rem] font-semibold text-teal-deep">
              <CheckCircle weight="fill" className="h-4 w-4" />
              Saved
            </span>
          )}
          {template && (
            <ConfirmAction
              label="Delete"
              title={`Delete ${template.name}?`}
              body="The template is removed for everyone who can use it. Reports already written are not affected."
              confirmLabel="Delete template"
              path={`/api/templates/${template.id}`}
              redirectTo="/templates"
            />
          )}
          <button type="button" onClick={reset} className={buttonClass.secondary}>
            <ArrowCounterClockwise weight="bold" className="h-4 w-4" />
            Reset
          </button>
          <button
            type="button"
            onClick={pdf}
            aria-label="See as PDF"
            title="See as PDF"
            className="grid h-11 w-11 place-items-center rounded-full border border-ink/40 text-flag transition-colors hover:bg-ink/[0.06]"
          >
            <FilePdf weight="fill" className="h-5 w-5" />
          </button>
          <button type="submit" disabled={busy} className={buttonClass.primary}>
            {busy && <Spinner />}
            {busy ? "Saving" : "Save changes"}
          </button>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <label className={FIELD}>
          <span className={FIELD_LABEL}>Template name</span>
          <input
            value={name}
            onChange={(event) => (setName(event.target.value), touched())}
            maxLength={120}
            placeholder="CT Brain (Plain)"
            autoFocus={!template}
            style={{ outline: "none" }}
            className="bg-transparent text-[1.02rem] font-semibold text-ink placeholder:font-medium placeholder:text-ink-quiet"
          />
        </label>
        <div className={`${FIELD} relative`}>
          <label htmlFor="template-modality" className={`${FIELD_LABEL} pointer-events-none`}>
            Modality
          </label>
          <span
            aria-hidden="true"
            className={`pointer-events-none text-[1.02rem] font-semibold ${modality ? "text-ink" : "text-ink-quiet"}`}
          >
            {modality || "Select a modality"}
          </span>
          <CaretDown weight="bold" aria-hidden="true" className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2" />
          {/* The browser's own list, laid invisibly over the whole field so any click opens it. */}
          <select
            id="template-modality"
            value={modality}
            onChange={(event) => (setModality(event.target.value), touched())}
            className="absolute inset-0 cursor-pointer rounded-[1.6rem] opacity-0"
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

      {canShare && (
        <label className="flex items-center gap-3 self-start text-[0.95rem] font-semibold">
          <Switch.Root
            checked={shared}
            onCheckedChange={(next) => (setShared(next), touched())}
            className="flex h-6 w-11 shrink-0 items-center rounded-full bg-ink/30 p-0.5 transition-colors data-[checked]:bg-teal"
          >
            <Switch.Thumb className="h-5 w-5 rounded-full bg-[#fff] shadow transition-transform data-[checked]:translate-x-5" />
          </Switch.Root>
          Share with everyone in the organisation
        </label>
      )}

      <FormError message={error} />

      {/* The open page. The hint shows only while it is empty. */}
      <div
        className="template-canvas"
        data-empty={empty || undefined}
        style={
          {
            "--placeholder":
              '"Write the template here, or paste it from Word. Headings end with a colon, such as FINDINGS:. Under IMPRESSION:, write the impression for a normal study."',
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
    </form>
  );
}
