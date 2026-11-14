"use client";

import { ArrowLeft, Plus, Rows, Sparkle, Trash } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, FieldLabel, FormError, send } from "@/components/auth/fields";
import { TEMPLATE_LIMITS, type TemplateDraft } from "@/lib/templateInput";
import { ConfirmAction } from "./TeamClient";
import { IconTile, PANEL, buttonClass } from "./ui";

const areaClass =
  "w-full resize-y rounded-2xl border border-ink/35 bg-surface px-4 py-3 text-[0.95rem] leading-relaxed text-ink outline-none transition-colors hover:border-ink/60 focus:border-teal";

const BLANK: TemplateDraft = {
  name: "",
  title: "",
  sections: [{ heading: "FINDINGS", lines: [] }],
  normalImpression: ["No significant abnormality detected."],
};

type Props = {
  /** Existing template to edit. Left out when creating one. */
  template?: TemplateDraft & { id: string; shared: boolean };
  canShare: boolean;
};

export function TemplateEditor({ template, canShare }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<TemplateDraft | null>(template ?? null);
  const [shared, setShared] = useState(template?.shared ?? false);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function convert() {
    setBusy(true);
    setError("");
    const result = await send<{ draft: TemplateDraft }>("POST", "/api/templates/parse", {
      text: pasted,
    });
    setBusy(false);
    if (result.error || !result.data) {
      setError(result.error);
      return;
    }
    setDraft(result.data.draft);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    setError("");
    const result = template
      ? await send("PATCH", `/api/templates/${template.id}`, { ...draft, shared })
      : await send("POST", "/api/templates", { ...draft, shared });
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push("/templates");
    router.refresh();
  }

  function update(patch: Partial<TemplateDraft>) {
    setDraft((previous) => (previous ? { ...previous, ...patch } : previous));
    setError("");
  }

  function updateSection(index: number, patch: Partial<TemplateDraft["sections"][number]>) {
    if (!draft) return;
    update({
      sections: draft.sections.map((section, position) =>
        position === index ? { ...section, ...patch } : section,
      ),
    });
  }

  const back = (
    <Link href="/templates" className={`${buttonClass.quiet} -ml-3 self-start`}>
      <ArrowLeft className="h-4 w-4" />
      Templates
    </Link>
  );

  // Step one for a new template: paste your own text, or start empty.
  if (!draft) {
    return (
      <>
        {back}
        <section className={`${PANEL} flex flex-col gap-5 p-6 sm:p-8`}>
          <div>
            <h1 className="text-[1.5rem] font-semibold tracking-[-0.03em]">New template</h1>
            <p className="mt-1.5 max-w-[60ch] text-ink-soft">
              Paste a template exactly as you type it today. LumenAI splits it into sections and
              lines, keeping your wording. You check it before it is saved.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel id="pasted" label="Your template text" />
            <textarea
              id="pasted"
              value={pasted}
              onChange={(event) => (setPasted(event.target.value), setError(""))}
              rows={12}
              maxLength={20000}
              className={areaClass}
            />
          </div>
          <FormError message={error} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={convert}
              disabled={busy || pasted.trim().length < 20}
              className={buttonClass.primary}
            >
              <Sparkle weight="fill" className="h-4 w-4" />
              {busy ? "Converting" : "Convert"}
            </button>
            <button type="button" onClick={() => setDraft(BLANK)} className={buttonClass.secondary}>
              Start blank
            </button>
          </div>
        </section>
      </>
    );
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-6" noValidate>
      {back}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em]">
          {template ? "Edit template" : "Check your template"}
        </h1>
        <div className="flex items-center gap-2">
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
          <button type="submit" disabled={busy} className={buttonClass.primary}>
            {busy ? "Saving" : "Save template"}
          </button>
        </div>
      </header>

      <FormError message={error} />

      <section className={`${PANEL} grid gap-4 p-6 sm:grid-cols-2 sm:p-8`}>
        <Field
          dense
          id="template-name"
          label="Template name"
          value={draft.name}
          onChange={(name) => update({ name })}
          autoComplete="off"
          hint="Shown in your template list, for example CT Brain (Plain)."
        />
        <Field
          dense
          id="template-title"
          label="Report title"
          value={draft.title}
          onChange={(title) => update({ title })}
          autoComplete="off"
          hint="Printed at the top of the report."
        />
        {canShare && (
          <label className="flex items-center gap-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={shared}
              onChange={(event) => setShared(event.target.checked)}
              className="h-4 w-4"
            />
            <span>Share with everyone in my organisation</span>
          </label>
        )}
      </section>

      {draft.sections.map((section, index) => (
        <section key={index} className={`${PANEL} flex flex-col gap-4 p-6 sm:p-8`}>
          <p className="flex items-center gap-3 text-[1.05rem] font-semibold">
            <IconTile tone="neutral">
              <Rows weight="fill" className="h-5 w-5" />
            </IconTile>
            Section {index + 1} of {draft.sections.length}
          </p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Field
                dense
                id={`section-${index}`}
                label="Section heading"
                value={section.heading}
                onChange={(heading) => updateSection(index, { heading })}
                autoComplete="off"
              />
            </div>
            {draft.sections.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  update({ sections: draft.sections.filter((_, position) => position !== index) })
                }
                aria-label={`Remove section ${section.heading || index + 1}`}
                className={`${buttonClass.quiet} mb-0.5`}
              >
                <Trash className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel id={`lines-${index}`} label="Normal lines" />
            <textarea
              id={`lines-${index}`}
              value={section.lines.join("\n")}
              onChange={(event) => updateSection(index, { lines: event.target.value.split("\n") })}
              rows={Math.max(3, section.lines.length + 1)}
              aria-describedby={`lines-${index}-hint`}
              className={areaClass}
            />
            <p id={`lines-${index}-hint`} className="text-[0.9rem] text-ink-soft">
              One structure per line. A dictated finding replaces the single line it belongs to.
            </p>
          </div>
        </section>
      ))}

      {draft.sections.length < TEMPLATE_LIMITS.sections && (
        <button
          type="button"
          onClick={() => update({ sections: [...draft.sections, { heading: "", lines: [] }] })}
          className={`${buttonClass.secondary} self-start`}
        >
          <Plus weight="bold" className="h-4 w-4" />
          Add section
        </button>
      )}

      <section className={`${PANEL} flex flex-col gap-1.5 p-6 sm:p-8`}>
        <FieldLabel id="impression" label="Impression when everything is normal" />
        <textarea
          id="impression"
          value={draft.normalImpression.join("\n")}
          onChange={(event) => update({ normalImpression: event.target.value.split("\n") })}
          rows={Math.max(2, draft.normalImpression.length + 1)}
          className={areaClass}
        />
      </section>
    </form>
  );
}
