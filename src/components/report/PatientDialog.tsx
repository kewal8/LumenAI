"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Info } from "@phosphor-icons/react";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { BACKDROP, POPUP, Select, buttonClass } from "@/components/app/ui";
import { FormError } from "@/components/auth/fields";
import { AGE_UNITS, SEXES, type AgeUnit, type Patient, type Sex } from "@/lib/patient";
import { MODALITIES } from "@/lib/templateDoc";

const LABEL = "text-[0.88rem] font-semibold text-ink-soft";
const FIELD =
  "h-11 w-full rounded-full border border-ink/35 bg-surface px-4 text-[0.98rem] font-semibold text-ink outline-none transition-colors placeholder:font-medium placeholder:text-ink-quiet hover:border-ink/55 focus:border-teal";

/**
 * Who and what the report is for. Asked for the first time a draft is saved,
 * and once more to confirm before it is finalized; opened any time from the
 * patient's name in the report's header.
 */
export function PatientDialog({
  open,
  initial,
  purpose,
  busy,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  initial: Patient;
  /** What happens after: saving the draft, finalizing, or only updating the details. */
  purpose: "save" | "finalize" | "edit";
  busy: boolean;
  onCancel: () => void;
  onSubmit: (patient: Patient) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && !busy && onCancel()}>
      <Dialog.Portal>
        <Dialog.Backdrop className={BACKDROP} />
        <Dialog.Popup className={`${POPUP} !w-[min(32rem,calc(100vw-2rem))]`}>
          {/* Remounted on each opening, so it starts from the latest details. */}
          {open && (
            <PatientForm initial={initial} purpose={purpose} busy={busy} onCancel={onCancel} onSubmit={onSubmit} />
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PatientForm({
  initial,
  purpose,
  busy,
  onCancel,
  onSubmit,
}: {
  initial: Patient;
  purpose: "save" | "finalize" | "edit";
  busy: boolean;
  onCancel: () => void;
  onSubmit: (patient: Patient) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [age, setAge] = useState(initial.age === null ? "" : String(initial.age));
  const [ageUnit, setAgeUnit] = useState<AgeUnit>(initial.ageUnit);
  const [sex, setSex] = useState<Sex | null>(initial.sex);
  const [study, setStudy] = useState(initial.study);
  const [modality, setModality] = useState(initial.modality ?? "");
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const years = age.trim() === "" ? null : Number(age);
    if (years !== null && (!Number.isInteger(years) || years < 0 || years > 150)) {
      setError("Enter the age as a whole number.");
      return;
    }
    onSubmit({ name: name.trim(), age: years, ageUnit, sex, study: study.trim(), modality: modality || null });
  }

  const action = purpose === "finalize" ? "Finalize report" : purpose === "save" ? "Save report" : "Update details";

  return (
    <form onSubmit={submit} noValidate>
      <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">
        {purpose === "finalize" ? "Check the patient details" : "Patient details"}
      </Dialog.Title>
      <Dialog.Description className="mt-1.5 text-ink-soft">
        {purpose === "finalize"
          ? "The final report is saved under these details. Check them before finalizing. Without a name, it is saved under today's date and the template."
          : "The report is saved under this patient in Reports. Without a name, it is saved under today's date and the template."}
      </Dialog.Description>

      <p className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-tint px-3.5 py-2.5 text-[0.88rem] font-semibold leading-snug text-amber-deep">
        <Info weight="fill" className="mt-0.5 h-4 w-4 shrink-0" />
        Pilot: use test details only, not real patients.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>
            Patient name <span className="font-medium text-ink-quiet">(optional)</span>
          </span>
          <input
            value={name}
            onChange={(event) => (setName(event.target.value), setError(""))}
            maxLength={120}
            autoFocus
            placeholder="Full name"
            className={FIELD}
          />
        </label>

        <div className="grid grid-cols-[4.75rem_7.5rem_minmax(0,1fr)] gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Age</span>
            <input
              value={age}
              onChange={(event) => (setAge(event.target.value.replace(/[^\d]/g, "")), setError(""))}
              inputMode="numeric"
              maxLength={3}
              placeholder="54"
              className={`${FIELD} tabular-nums`}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Unit</span>
            <Select value={ageUnit} onChange={(event) => setAgeUnit(event.target.value as AgeUnit)} className="!pl-4">
              {AGE_UNITS.map((unit) => (
                <option key={unit}>{unit}</option>
              ))}
            </Select>
          </label>
          <fieldset className="flex flex-col gap-1.5">
            <legend className={`${LABEL} mb-1.5`}>Sex</legend>
            <div className="flex h-11 items-center gap-1 rounded-full bg-ink/[0.05] p-1">
              {SEXES.map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => setSex(sex === option ? null : option)}
                  aria-pressed={sex === option}
                  className={`h-full flex-1 rounded-full text-[0.88rem] font-semibold transition-colors ${
                    sex === option ? "bg-surface text-ink shadow-[0_1px_3px_rgb(6_17_15/0.18)]" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="grid grid-cols-[3fr_1.4fr] gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Study</span>
            <input
              value={study}
              onChange={(event) => setStudy(event.target.value)}
              maxLength={160}
              placeholder="CT Brain (Plain)"
              className={FIELD}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Modality</span>
            <Select value={modality} onChange={(event) => setModality(event.target.value)} className="!pl-4">
              <option value="">Not set</option>
              {MODALITIES.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
          </label>
        </div>
      </div>

      <div className="mt-4">
        <FormError message={error} />
      </div>
      <div className="mt-5 flex gap-2">
        <button type="submit" disabled={busy} className={buttonClass.primary}>
          {busy && <Spinner />}
          {busy ? "Saving" : action}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={buttonClass.secondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}
