"use client";

import { CaretDown, CheckCircle } from "@phosphor-icons/react";
import { useState } from "react";
import { Field, FieldLabel, FormError, SubmitButton, postAuth } from "@/components/auth/fields";
import { ORGANISATION_TYPES } from "@/lib/demo";

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  designation: "",
  organisation: "",
  organisationType: "",
  location: "",
  message: "",
  website: "",
};

const controlClass =
  "w-full border border-ink/25 bg-surface px-5 text-base text-ink outline-none transition-colors hover:border-ink/45 focus:border-teal";

export function DemoRequestForm() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  function set(key: keyof typeof EMPTY) {
    return (value: string) => {
      setForm((previous) => ({ ...previous, [key]: value }));
      setError("");
    };
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const problem = await postAuth("/api/demo-requests", form);
    setBusy(false);
    if (problem) setError(problem);
    else setSent(true);
  }

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-start gap-4 py-6">
        <CheckCircle weight="fill" className="h-12 w-12 text-teal" />
        <h2 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em]">
          Thank you, {form.name.split(" ")[0]}.
        </h2>
        <p className="max-w-[40ch] leading-relaxed text-ink-soft">
          We have your request. We will contact you on {form.phone} or {form.email} to
          agree a time.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="focus-form flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field dense id="name" label="Full name" value={form.name} onChange={set("name")} autoComplete="name" />
        <Field
          dense
          id="designation"
          label="Designation"
          value={form.designation}
          onChange={set("designation")}
          autoComplete="organization-title"
          optional
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          dense
          id="email"
          label="Email"
          type="email"
          value={form.email}
          onChange={set("email")}
          autoComplete="email"
        />
        <Field
          dense
          id="phone"
          label="Phone or WhatsApp, with country code"
          type="tel"
          value={form.phone}
          onChange={set("phone")}
          autoComplete="tel"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          dense
          id="organisation"
          label="Organisation"
          value={form.organisation}
          onChange={set("organisation")}
          autoComplete="organization"
          optional
        />
        <div className="focus-field flex flex-col gap-1.5">
          <FieldLabel id="organisationType" label="Organisation type" optional />
          <div className="relative">
            <select
              id="organisationType"
              value={form.organisationType}
              onChange={(event) => set("organisationType")(event.target.value)}
              className={`${controlClass} h-11 appearance-none rounded-full pr-12 ${
                form.organisationType ? "" : "text-ink-quiet"
              }`}
            >
              <option value="">Choose one</option>
              {ORGANISATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <CaretDown
              weight="bold"
              className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
            />
          </div>
        </div>
      </div>

      <Field
          dense
        id="location"
        label="City"
        value={form.location}
        onChange={set("location")}
        autoComplete="address-level2"
        optional
      />

      <div className="focus-field flex flex-col gap-1.5">
        <FieldLabel id="message" label="What would you like to see?" optional />
        <textarea
          id="message"
          value={form.message}
          onChange={(event) => set("message")(event.target.value)}
          rows={2}
          maxLength={2000}
          className={`${controlClass} resize-none rounded-3xl py-2.5 leading-relaxed`}
        />
      </div>

      {/* Bots fill every field; people never see this one. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(event) => set("website")(event.target.value)}
          />
        </label>
      </div>

      <FormError message={error} />
      <SubmitButton busy={busy} busyLabel="Sending your request" dense disabled={!form.name.trim() || !form.email || !form.phone}>
        Request a demo
      </SubmitButton>
    </form>
  );
}
