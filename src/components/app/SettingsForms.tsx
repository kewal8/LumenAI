"use client";

import { CheckCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, FieldLabel, FormError, send } from "@/components/auth/fields";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/rules";
import {
  PASTE_FONTS,
  PASTE_HEADING_STYLES,
  PASTE_LIST_STYLES,
  PASTE_SIZES,
  buildReportHtml,
  type PasteProfile,
} from "@/lib/reportFormat";
import { Select, buttonClass } from "./ui";

function useSave() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(method: "POST" | "PATCH", path: string, body: unknown) {
    setBusy(true);
    setError("");
    setSaved(false);
    const result = await send(method, path, body);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return false;
    }
    setSaved(true);
    router.refresh();
    return true;
  }

  return { busy, error, saved, save, touch: () => (setSaved(false), setError("")) };
}

function SaveRow({ busy, saved, disabled }: { busy: boolean; saved: boolean; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <button type="submit" disabled={busy || disabled} className={buttonClass.primary}>
        {busy ? "Saving" : "Save"}
      </button>
      {saved && (
        <span role="status" className="flex items-center gap-1.5 text-[0.92rem] text-teal-deep">
          <CheckCircle weight="fill" className="h-4 w-4" />
          Saved
        </span>
      )}
    </div>
  );
}

export function ProfileForm({ name: initial, email }: { name: string; email: string }) {
  const [name, setName] = useState(initial);
  const { busy, error, saved, save, touch } = useSave();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save("PATCH", "/api/account", { name });
      }}
      className="flex max-w-2xl flex-col gap-4"
      noValidate
    >
      <Field
        dense
        id="name"
        label="Name"
        value={name}
        onChange={(value) => (setName(value), touch())}
        autoComplete="name"
        hint="As it should appear on your reports."
      />
      <Field dense id="email" label="Email" type="email" value={email} onChange={() => {}} autoComplete="email" readOnly />
      <FormError message={error} />
      <SaveRow busy={busy} saved={saved} disabled={!name.trim() || name === initial} />
    </form>
  );
}

export function OrganisationForm({ name: initial }: { name: string }) {
  const [name, setName] = useState(initial);
  const { busy, error, saved, save, touch } = useSave();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save("PATCH", "/api/account", { organisationName: name });
      }}
      className="flex max-w-2xl flex-col gap-4"
      noValidate
    >
      <Field
        dense
        id="organisation"
        label="Organisation name"
        value={name}
        onChange={(value) => (setName(value), touch())}
        autoComplete="organization"
      />
      <FormError message={error} />
      <SaveRow busy={busy} saved={saved} disabled={!name.trim() || name === initial} />
    </form>
  );
}

export function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const { busy, error, saved, save, touch } = useSave();

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (await save("POST", "/api/account/password", { current, next })) {
          setCurrent("");
          setNext("");
        }
      }}
      className="flex max-w-2xl flex-col gap-4"
      noValidate
    >
      <Field
        dense
        id="current-password"
        label="Current password"
        type="password"
        value={current}
        onChange={(value) => (setCurrent(value), touch())}
        autoComplete="current-password"
      />
      <Field
        dense
        id="new-password"
        label="New password"
        type="password"
        value={next}
        onChange={(value) => (setNext(value), touch())}
        autoComplete="new-password"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters. Other devices will be signed out.`}
      />
      <FormError message={error} />
      <SaveRow busy={busy} saved={saved} disabled={!current || !next} />
    </form>
  );
}

// Made-up sample, no patient data.
const SAMPLE = {
  title: "CT BRAIN (PLAIN)",
  sections: [
    {
      heading: "FINDINGS",
      lines: [
        "Undisplaced fracture of the squamous part of the right temporal bone.",
        "No intracranial haemorrhage. No midline shift.",
      ],
    },
    { heading: "IMPRESSION", lines: ["Undisplaced right temporal bone fracture."] },
  ],
};

export function PasteFormatForm({ profile: initial }: { profile: PasteProfile }) {
  const [profile, setProfile] = useState(initial);
  const { busy, error, saved, save, touch } = useSave();

  function set<Key extends keyof PasteProfile>(key: Key, value: PasteProfile[Key]) {
    setProfile((previous) => ({ ...previous, [key]: value }));
    touch();
  }

  const controls: {
    key: keyof PasteProfile;
    label: string;
    options: readonly (string | number)[];
  }[] = [
    { key: "font", label: "Font", options: PASTE_FONTS },
    { key: "size", label: "Size (pt)", options: PASTE_SIZES },
    { key: "headingStyle", label: "Headings", options: PASTE_HEADING_STYLES },
    { key: "listStyle", label: "Lines", options: PASTE_LIST_STYLES },
  ];

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save("PATCH", "/api/account", { pasteProfile: profile });
      }}
      className="flex flex-col gap-5"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {controls.map(({ key, label, options }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <FieldLabel id={`paste-${key}`} label={label} />
            <Select
              id={`paste-${key}`}
              value={profile[key]}
              onChange={(event) =>
                set(key, (key === "size" ? Number(event.target.value) : event.target.value) as never)
              }
            >
              {options.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </Select>
          </div>
        ))}
      </div>

      {/* White in both themes: this previews what lands in the PACS editor. */}
      <div
        aria-label="Preview of a pasted report"
        className="rounded-2xl border border-ink/20 bg-[#fff] p-6"
        dangerouslySetInnerHTML={{ __html: buildReportHtml(SAMPLE, profile) }}
      />

      <FormError message={error} />
      <SaveRow
        busy={busy}
        saved={saved}
        disabled={JSON.stringify(profile) === JSON.stringify(initial)}
      />
    </form>
  );
}
