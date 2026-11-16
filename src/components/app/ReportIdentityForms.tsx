"use client";

import { toast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";
import { Switch } from "@base-ui/react/switch";
import { CheckCircle, Trash, UploadSimple } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FieldLabel, FormError, send } from "@/components/auth/fields";
import {
  LETTERHEAD_IMAGE_LIMIT,
  SIGNATURE_IMAGE_LIMIT,
  SIGNATURE_TEXT_LIMIT,
  type ReportIdentity,
} from "@/lib/reportIdentity";
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_ACTIONS,
  comboFromEvent,
  type ShortcutAction,
  type Shortcuts,
} from "@/lib/shortcuts";
import { buttonClass } from "./ui";
import { keyCaps, keyText, modifierNames, useIsMac } from "@/lib/keys";

function useSave() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(body: unknown) {
    setBusy(true);
    setError("");
    setSaved(false);
    const result = await send("PATCH", "/api/account", body);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    setSaved(true);
    toast.success("Saved");
    router.refresh();
  }

  return { busy, error, saved, save, setError, touch: () => (setSaved(false), setError("")) };
}

function SaveRow({
  busy,
  saved,
  disabled,
  children,
}: {
  busy: boolean;
  saved: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={busy || disabled} className={buttonClass.primary}>
        {busy && <Spinner />}
        {busy ? "Saving" : "Save"}
      </button>
      {children}
      {saved && (
        <span role="status" className="flex items-center gap-1.5 text-[0.92rem] text-teal-deep">
          <CheckCircle weight="fill" className="h-4 w-4" />
          Saved
        </span>
      )}
    </div>
  );
}

/**
 * Shrinks a chosen picture in the browser so it is small enough to store and
 * to travel inside a copied report. PNG keeps a transparent background.
 */
async function shrinkImage(file: File, maxWidth: number, maxHeight: number, limit: number) {
  if (!/^image\/(png|jpeg)$/.test(file.type)) throw new Error("Use a PNG or JPG image.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("This image could not be opened."));
      image.src = url;
    });
    const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d")!;
    if (file.type === "image/png") {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const png = canvas.toDataURL("image/png");
      if (png.length <= limit) return png;
    }
    // JPEG has no transparency, so it goes on white paper.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.75, 0.6]) {
      const jpeg = canvas.toDataURL("image/jpeg", quality);
      if (jpeg.length <= limit) return jpeg;
    }
    throw new Error("That image is too large. Try a smaller one.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Picks one image: an upload area while empty, then the picture with Replace and Remove. */
function ImagePicker({
  id,
  label,
  hint,
  value,
  onChange,
  onError,
  maxWidth,
  maxHeight,
  limit,
  previewClass,
}: {
  id: string;
  label: string;
  hint: string;
  value: string | null;
  onChange: (value: string | null) => void;
  onError: (message: string) => void;
  maxWidth: number;
  maxHeight: number;
  limit: number;
  /** Size of the picture once chosen. */
  previewClass: string;
}) {
  const input = useRef<HTMLInputElement>(null);

  async function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      onChange(await shrinkImage(file, maxWidth, maxHeight, limit));
    } catch (problem) {
      onError(problem instanceof Error ? problem.message : "This image could not be used.");
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel id={id} label={label} optional />
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/png,image/jpeg"
        onChange={choose}
        className="sr-only"
        tabIndex={-1}
      />
      {value ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink/25 p-3">
          {/* White in both themes: this is how it sits on paper. */}
          <span className="flex min-w-0 flex-1 basis-48 items-center justify-center rounded-xl border border-line bg-[#fff] p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL */}
            <img src={value} alt={label} className={previewClass} />
          </span>
          <span className="flex gap-2">
            <button type="button" onClick={() => input.current?.click()} className={buttonClass.secondary}>
              <UploadSimple weight="bold" className="h-4 w-4" />
              Replace
            </button>
            <button type="button" onClick={() => onChange(null)} className={buttonClass.danger}>
              <Trash weight="bold" className="h-4 w-4" />
              Remove
            </button>
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex items-center gap-4 rounded-2xl border border-dashed border-ink/40 px-5 py-4 text-left transition-colors hover:border-ink/70 hover:bg-ink/[0.04]"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal/[0.12] text-teal-deep">
            <UploadSimple weight="bold" className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-semibold">Choose an image</span>
            <span className="block text-[0.9rem] text-ink-soft">{hint}</span>
          </span>
        </button>
      )}
    </div>
  );
}

export function SignatureForm({ text: initialText, image: initialImage }: { text: string; image: string | null }) {
  const [text, setText] = useState(initialText);
  const [image, setImage] = useState(initialImage);
  const { busy, error, saved, save, setError, touch } = useSave();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save({ signature: { text, image } });
      }}
      className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]"
      noValidate
    >
      <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <FieldLabel id="signature-text" label="Sign-off text" optional />
        <textarea
          id="signature-text"
          value={text}
          onChange={(event) => (setText(event.target.value), touch())}
          rows={4}
          maxLength={SIGNATURE_TEXT_LIMIT}
          placeholder={"Dr. Your Name\nMD Radiodiagnosis\nConsultant Radiologist\nReg. No. 00000"}
          aria-describedby="signature-text-hint"
          className="w-full rounded-2xl border border-ink/35 bg-surface px-5 py-3 text-base text-ink outline-none transition-colors placeholder:text-ink-quiet hover:border-ink/60 focus:border-teal"
        />
        <p id="signature-text-hint" className="text-[0.9rem] text-ink-soft">
          One detail per line. The first line is set in bold.
        </p>
      </div>
      <ImagePicker
        id="signature-image"
        label="Signature image"
        hint="PNG or JPG. A signature on a white or clear background works best."
        value={image}
        onChange={(value) => (setImage(value), touch())}
        onError={setError}
        maxWidth={600}
        maxHeight={240}
        limit={SIGNATURE_IMAGE_LIMIT}
        previewClass="h-16 w-auto max-w-full"
      />
      <FormError message={error} />
      <SaveRow busy={busy} saved={saved} disabled={text === initialText && image === initialImage} />
      </div>

      {/* The end of a report as it will be pasted. White in both themes, like paper. */}
      <figure className="flex flex-col gap-2">
        <figcaption className="text-[0.95rem] font-semibold">How it ends your report</figcaption>
        <div className="rounded-2xl border border-ink/25 bg-[#fff] p-6 font-[Arial,Helvetica,sans-serif] text-[0.85rem] leading-[1.5] tracking-normal text-[#000]">
          <p className="font-bold">IMPRESSION:</p>
          <p>No significant abnormality detected.</p>
          {image || text.trim() ? (
            <div className="mt-5">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL */}
              {image && <img src={image} alt="" className="h-12 w-auto max-w-full" />}
              {text
                .split("\n")
                .filter((line) => line.trim())
                .map((line, index) => (
                  <p key={index} className={index === 0 ? "font-bold" : ""}>
                    {line}
                  </p>
                ))}
            </div>
          ) : (
            <p className="mt-5 text-[#5b6664]">Your signature and sign-off text will appear here.</p>
          )}
        </div>
      </figure>
    </form>
  );
}

export function LetterheadForm({ identity }: { identity: ReportIdentity }) {
  const [header, setHeader] = useState(identity.headerImage);
  const [footer, setFooter] = useState(identity.footerImage);
  const [enabled, setEnabled] = useState(identity.letterheadEnabled);
  const { busy, error, saved, save, setError, touch } = useSave();
  const hasImage = Boolean(header || footer);
  const unchanged =
    header === identity.headerImage && footer === identity.footerImage && enabled === identity.letterheadEnabled;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save({ letterhead: { header, footer, enabled: enabled && hasImage } });
      }}
      className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]"
      noValidate
    >
      <div className="flex flex-col gap-5">
        <ImagePicker
          id="letterhead-header"
          label="Header image"
          hint="PNG or JPG, as wide as the page. Printed at the top of every sheet."
          value={header}
          onChange={(value) => (setHeader(value), touch())}
          onError={setError}
          maxWidth={1600}
          maxHeight={500}
          limit={LETTERHEAD_IMAGE_LIMIT}
          previewClass="max-h-20 w-auto max-w-full"
        />
        <ImagePicker
          id="letterhead-footer"
          label="Footer image"
          hint="PNG or JPG, as wide as the page. Printed at the bottom of every sheet."
          value={footer}
          onChange={(value) => (setFooter(value), touch())}
          onError={setError}
          maxWidth={1600}
          maxHeight={400}
          limit={LETTERHEAD_IMAGE_LIMIT}
          previewClass="max-h-20 w-auto max-w-full"
        />
        <label
          className={`flex items-center justify-between gap-4 rounded-2xl border border-ink/25 px-5 py-4 ${
            hasImage ? "" : "opacity-60"
          }`}
        >
          <span>
            <span className="block font-semibold">Use letterhead</span>
            <span className="block text-[0.9rem] text-ink-soft">
              {hasImage
                ? "Printed and PDF reports carry the header and footer."
                : "Add a header or footer image first."}
            </span>
          </span>
          <Switch.Root
            checked={enabled && hasImage}
            disabled={!hasImage}
            onCheckedChange={(next) => (setEnabled(next), touch())}
            className="flex h-7 w-12 shrink-0 items-center rounded-full bg-ink/30 p-0.5 transition-colors data-[checked]:bg-teal"
          >
            <Switch.Thumb className="h-6 w-6 rounded-full bg-[#fff] shadow transition-transform data-[checked]:translate-x-5" />
          </Switch.Root>
        </label>
        <FormError message={error} />
        <SaveRow busy={busy} saved={saved} disabled={unchanged} />
      </div>

      {/* A sheet of paper, white in both themes. */}
      <figure className="flex flex-col gap-2">
        <div
          aria-label="Preview of a printed page"
          className={`flex aspect-[210/297] w-full max-w-[22rem] flex-col overflow-hidden rounded-lg border border-ink/25 bg-[#fff] shadow-[0_8px_24px_-12px_rgb(15_38_36/0.35)] ${
            enabled && hasImage ? "" : "[&_img]:opacity-30"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL */}
          {header && <img src={header} alt="" className="w-full" />}
          <div className="flex flex-1 flex-col gap-1.5 px-[9%] py-[7%]">
            <span className="mx-auto mb-1.5 h-2 w-2/5 rounded-full bg-[#06110f]/25" />
            {["w-1/4", "w-full", "w-11/12", "w-4/5", "w-full", "w-2/3", "w-1/4", "w-3/5"].map((width, index) => (
              <span
                key={index}
                className={`h-1.5 rounded-full ${width} ${width === "w-1/4" ? "mt-1.5 bg-[#06110f]/30" : "bg-[#06110f]/12"}`}
              />
            ))}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL */}
          {footer && <img src={footer} alt="" className="w-full" />}
        </div>
        <figcaption className="text-[0.88rem] text-ink-soft">
          {enabled && hasImage ? "How a printed page is laid out." : "Letterhead is off."}
        </figcaption>
      </figure>
    </form>
  );
}

/** Turns the floating dictation window on or off. Saved as soon as it is changed. */
export function FloatingBoxSetting({ enabled: initial }: { enabled: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const { error, saved, save } = useSave();

  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <label className="flex items-center justify-between gap-6 rounded-2xl border border-ink/25 px-5 py-4">
        <span>
          <span className="block font-semibold">Floating box</span>
          <span className="block text-[0.92rem] text-ink-soft">
            While the microphone is on, switching to another tab opens a small dictation window
            that stays on top of PACS. It closes when you come back. Works in Chrome and Edge on a
            computer.
          </span>
        </span>
        <Switch.Root
          checked={enabled}
          onCheckedChange={(next) => (setEnabled(next), save({ floatingBox: next }))}
          className="flex h-7 w-12 shrink-0 items-center rounded-full bg-ink/30 p-0.5 transition-colors data-[checked]:bg-teal"
        >
          <Switch.Thumb className="h-6 w-6 rounded-full bg-[#fff] shadow transition-transform data-[checked]:translate-x-5" />
        </Switch.Root>
      </label>
      <FormError message={error} />
      {saved && (
        <p role="status" className="flex items-center gap-1.5 text-[0.92rem] text-teal-deep">
          <CheckCircle weight="fill" className="h-4 w-4" />
          Saved
        </p>
      )}
    </div>
  );
}

function Keys({ combo }: { combo: string }) {
  const mac = useIsMac();
  return (
    <span className="flex flex-wrap items-center gap-1">
      {keyCaps(combo, mac).map((key) => (
        <kbd
          key={key}
          className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-ink/35 bg-ink/[0.05] px-2 font-[inherit] text-[0.9rem] font-bold"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}

export function ShortcutsForm({ shortcuts: initial }: { shortcuts: Shortcuts }) {
  const [shortcuts, setShortcuts] = useState(initial);
  // The action whose next key press becomes its shortcut.
  const [recording, setRecording] = useState<ShortcutAction | null>(null);
  const mac = useIsMac();
  const { busy, error, saved, save, setError, touch } = useSave();
  const same = (a: Shortcuts, b: Shortcuts) => SHORTCUT_ACTIONS.every(({ id }) => a[id] === b[id]);

  function record(id: ShortcutAction, event: React.KeyboardEvent) {
    if (recording !== id) return;
    if (event.key === "Tab") return setRecording(null);
    event.preventDefault();
    if (event.key === "Escape") return setRecording(null);
    const combo = comboFromEvent(event.nativeEvent);
    if (!combo) {
      // Still holding only Ctrl, Alt or Shift.
      if (!["Control", "Alt", "Shift", "Meta"].includes(event.key)) {
        setError(`Hold ${modifierNames(mac)}, then press a letter, a number or a function key.`);
      }
      return;
    }
    const taken = SHORTCUT_ACTIONS.find((action) => action.id !== id && shortcuts[action.id] === combo);
    if (taken) {
      setError(`${keyText(combo, mac)} is already used for “${taken.label}”.`);
      return;
    }
    touch();
    setShortcuts((previous) => ({ ...previous, [id]: combo }));
    setRecording(null);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save({ shortcuts });
      }}
      className="flex flex-col gap-5"
      noValidate
    >
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {SHORTCUT_ACTIONS.map(({ id, label }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => (setRecording(recording === id ? null : id), setError(""))}
              onKeyDown={(event) => record(id, event)}
              onBlur={() => recording === id && setRecording(null)}
              aria-label={`${label}: ${keyText(shortcuts[id], mac, " ")}. Press to change.`}
              className={`flex w-full flex-col gap-2.5 rounded-2xl border px-5 py-4 text-left transition-colors ${
                recording === id ? "border-teal bg-teal/[0.08]" : "border-ink/25 hover:border-ink/60"
              }`}
            >
              <span className="text-[0.95rem] font-semibold text-ink-soft">{label}</span>
              {recording === id ? (
                <span className="flex h-8 items-center font-semibold text-teal-deep">Press the new keys</span>
              ) : (
                <Keys combo={shortcuts[id]} />
              )}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-[0.9rem] text-ink-soft">
        Press a box, then the keys you want. Each shortcut needs {modifierNames(mac)}. Escape cancels.
      </p>
      <FormError message={error} />
      <SaveRow busy={busy} saved={saved} disabled={same(shortcuts, initial)}>
        <button
          type="button"
          onClick={() => (setShortcuts(DEFAULT_SHORTCUTS), setRecording(null), touch())}
          disabled={same(shortcuts, DEFAULT_SHORTCUTS)}
          className={buttonClass.secondary}
        >
          Reset to default
        </button>
      </SaveRow>
    </form>
  );
}
