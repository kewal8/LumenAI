"use client";

import { Spinner } from "@/components/Spinner";
import { CaretRight, Eye, EyeSlash, WarningCircle } from "@phosphor-icons/react";
import { useState } from "react";

type FieldProps = {
  id: string;
  label: string;
  type?: "text" | "email" | "tel" | "password";
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  autoFocus?: boolean;
  hint?: string;
  readOnly?: boolean;
  optional?: boolean;
  /** Shorter control for forms that have to fit on one screen. */
  dense?: boolean;
};

export function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  autoFocus,
  hint,
  readOnly,
  optional,
  dense,
}: FieldProps) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const isPassword = type === "password";

  return (
    <div className={`focus-field flex flex-col ${dense ? "gap-1.5" : "gap-2"}`}>
      <FieldLabel id={id} label={label} optional={optional} />
      <div className="relative">
        <input
          id={id}
          name={id}
          type={isPassword && visible ? "text" : type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyUp={(event) => isPassword && setCapsLock(event.getModifierState("CapsLock"))}
          onBlur={() => setCapsLock(false)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          readOnly={readOnly}
          aria-describedby={hint || capsLock ? `${id}-hint` : undefined}
          className={`${dense ? "h-11" : "h-13"} w-full rounded-full border border-ink/35 bg-surface pl-5 text-base text-ink outline-none transition-colors hover:border-ink/60 focus:border-teal read-only:bg-transparent read-only:text-ink-soft ${
            isPassword ? "pr-13" : "pr-5"
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((shown) => !shown)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-ink-soft transition-colors hover:bg-teal-tint hover:text-teal-deep"
          >
            {visible ? <EyeSlash className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </div>
      {(capsLock || hint) && (
        <p id={`${id}-hint`} className="text-[0.9rem] text-ink-soft">
          {capsLock ? "Caps Lock is on." : hint}
        </p>
      )}
    </div>
  );
}

export function FieldLabel({
  id,
  label,
  optional,
}: {
  id: string;
  label: string;
  optional?: boolean;
}) {
  return (
    <label htmlFor={id} className="text-[0.95rem] font-semibold">
      {label}
      {optional && <span className="ml-1.5 font-medium text-ink-quiet">optional</span>}
    </label>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 text-[0.92rem] text-flag">
      <WarningCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </p>
  );
}

export function SubmitButton({
  children,
  busy,
  busyLabel = "One moment",
  disabled,
  dense,
}: {
  children: React.ReactNode;
  busy: boolean;
  /** What is happening while it works, such as "Signing in". */
  busyLabel?: string;
  disabled?: boolean;
  dense?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className={`group flex ${dense ? "h-12" : "h-13"} items-center justify-between rounded-full bg-btn pl-6 pr-1.5 text-base font-bold text-btn-text transition-[background-color,transform,opacity] duration-200 hover:bg-teal-deep active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-btn`}
    >
      {busy ? busyLabel : children}
      <span
        className={`grid ${dense ? "h-9 w-9" : "h-10 w-10"} place-items-center rounded-full bg-teal text-btn-text`}
      >
        {busy ? (
          <Spinner />
        ) : (
          <CaretRight
            weight="bold"
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-disabled:translate-x-0"
          />
        )}
      </span>
    </button>
  );
}

/** Posts JSON to an auth route and returns the error message, or "" on success. */
export async function postAuth(path: string, body: Record<string, string>) {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) return "";
    return (await response.json()).error ?? "Something went wrong. Try again.";
  } catch {
    return "Could not reach the server. Check your connection and try again.";
  }
}

/** Sends JSON to an API route. `error` is "" on success. */
export async function send<Data = unknown>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<{ error: string; data?: Data }> {
  try {
    const response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) return { error: "", data };
    return { error: data.error ?? "Something went wrong. Try again." };
  } catch {
    return { error: "Could not reach the server. Check your connection and try again." };
  }
}
