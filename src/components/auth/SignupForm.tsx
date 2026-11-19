"use client";

import { EnvelopeSimpleOpen } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/rules";
import { authLinkClass } from "./AuthShell";
import { Field, FormError, SubmitButton, send } from "./fields";

const CODE_LENGTH = 6;
/** Seconds before another code can be asked for. */
const RESEND_AFTER = 60;

type Details = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  referralCode: string;
};

/**
 * Sign-up in two steps on one screen: the doctor's details, then the six-digit
 * code emailed to them. The account exists only once the code is right.
 */
export function SignupForm({ referralCode = "" }: { referralCode?: string }) {
  const router = useRouter();
  const [details, setDetails] = useState<Details>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    // Filled in when the doctor arrived from someone's referral link.
    referralCode,
  });
  const [signupId, setSignupId] = useState<string | null>(null);
  const [devCode, setDevCode] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  // Counts down the seconds until a new code may be sent.
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  function update(key: keyof Details) {
    return (value: string) => {
      setDetails((current) => ({ ...current, [key]: value }));
      setError("");
    };
  }

  async function sendCode(event?: React.FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setError("");
    const result = await send<{ id: string; devCode?: string }>("POST", "/api/auth/signup", details);
    setBusy(false);
    if (result.error || !result.data) {
      setError(result.error);
      return;
    }
    setSignupId(result.data.id);
    setDevCode(result.data.devCode ?? "");
    setCode("");
    setWait(RESEND_AFTER);
  }

  async function verify(value = code) {
    if (!signupId || value.length !== CODE_LENGTH) return;
    setBusy(true);
    setError("");
    const result = await send<{ home: string }>("POST", "/api/auth/signup/verify", { id: signupId, code: value });
    if (result.error) {
      setBusy(false);
      setError(result.error);
      return;
    }
    router.replace(result.data?.home ?? "/welcome");
  }

  if (signupId) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          verify();
        }}
        className="flex flex-col gap-6"
        noValidate
      >
        <div className="flex items-start gap-4 rounded-3xl bg-teal-tint p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal text-white">
            <EnvelopeSimpleOpen weight="fill" className="h-6 w-6" />
          </span>
          <p className="leading-relaxed text-ink">
            We sent a 6-digit code to <strong className="break-all">{details.email}</strong>. Enter it
            below to confirm your email. It works for 10 minutes.
          </p>
        </div>

        <CodeInput
          value={code}
          onChange={(value) => {
            setCode(value);
            setError("");
            // A full code is checked straight away; no extra click needed.
            if (value.length === CODE_LENGTH) verify(value);
          }}
          disabled={busy}
        />

        {devCode && (
          <p className="rounded-2xl border border-dashed border-ink/35 px-4 py-3 text-[0.9rem] text-ink-soft">
            Email is not set up on this computer. Your code is{" "}
            <strong className="font-bold tracking-[0.15em] text-ink">{devCode}</strong>
          </p>
        )}

        <FormError message={error} />
        <SubmitButton busy={busy} busyLabel="Checking" disabled={code.length !== CODE_LENGTH}>
          Confirm email
        </SubmitButton>

        <div className="flex flex-wrap items-center justify-between gap-3 text-[0.95rem]">
          <button
            type="button"
            onClick={() => {
              setSignupId(null);
              setError("");
            }}
            className={authLinkClass}
          >
            Change details
          </button>
          {wait > 0 ? (
            <span className="text-ink-soft tabular-nums">Send a new code in {wait}s</span>
          ) : (
            <button type="button" onClick={() => sendCode()} disabled={busy} className={authLinkClass}>
              Send a new code
            </button>
          )}
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="first-name"
          label="First name"
          value={details.firstName}
          onChange={update("firstName")}
          autoComplete="given-name"
          autoFocus
        />
        <Field
          id="last-name"
          label="Last name"
          value={details.lastName}
          onChange={update("lastName")}
          autoComplete="family-name"
        />
      </div>
      <Field
        id="email"
        label="Email"
        type="email"
        value={details.email}
        onChange={update("email")}
        autoComplete="email"
        hint="We send a code here to confirm it is yours."
      />
      <Field
        id="new-password"
        label="Password"
        type="password"
        value={details.password}
        onChange={update("password")}
        autoComplete="new-password"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
      />
      <Field
        id="phone"
        label="Mobile number"
        type="tel"
        value={details.phone}
        onChange={update("phone")}
        autoComplete="tel-national"
        hint="10 digits, for example 98765 43210."
      />
      <Field
        id="referral-code"
        label="Referral code"
        value={details.referralCode}
        onChange={(value) => update("referralCode")(value.toUpperCase())}
        autoComplete="off"
        optional
        hint="If a colleague gave you their code. You can also add it later on the Plans page."
      />
      <FormError message={error} />
      <SubmitButton
        busy={busy}
        busyLabel="Sending your code"
        disabled={!details.firstName.trim() || !details.lastName.trim() || !details.email || !details.password || !details.phone}
      >
        Create account
      </SubmitButton>
    </form>
  );
}

/** Six boxes for the emailed code. Typing moves along; pasting the whole code fills every box. */
function CodeInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    boxes.current[0]?.focus();
  }, []);

  function fill(from: number, typed: string) {
    const digits = typed.replace(/\D/g, "");
    if (!digits) return;
    const next = (value.slice(0, from) + digits).slice(0, CODE_LENGTH);
    onChange(next);
    boxes.current[Math.min(next.length, CODE_LENGTH - 1)]?.focus();
  }

  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-2.5 text-[0.95rem] font-semibold">Code from the email</legend>
      <div className="grid grid-cols-6 gap-2 sm:gap-3">
        {Array.from({ length: CODE_LENGTH }, (_, index) => (
          <input
            key={index}
            ref={(element) => {
              boxes.current[index] = element;
            }}
            value={value[index] ?? ""}
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
            disabled={disabled}
            maxLength={CODE_LENGTH}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => fill(Math.min(index, value.length), event.target.value)}
            onPaste={(event) => {
              event.preventDefault();
              fill(0, event.clipboardData.getData("text"));
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !value[index] && index > 0) {
                event.preventDefault();
                onChange(value.slice(0, index - 1));
                boxes.current[index - 1]?.focus();
              } else if (event.key === "Backspace" && value[index]) {
                event.preventDefault();
                onChange(value.slice(0, index));
              } else if (event.key === "ArrowLeft" && index > 0) {
                boxes.current[index - 1]?.focus();
              } else if (event.key === "ArrowRight" && index < value.length) {
                boxes.current[index + 1]?.focus();
              }
            }}
            className={`h-14 w-full rounded-2xl border bg-surface text-center text-[1.6rem] font-bold tabular-nums text-ink outline-none transition-colors hover:border-ink/60 focus:border-teal focus:ring-4 focus:ring-teal/15 disabled:opacity-60 sm:h-16 ${
              value[index] ? "border-ink/60" : "border-ink/35"
            }`}
          />
        ))}
      </div>
    </fieldset>
  );
}
