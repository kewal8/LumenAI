"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/rules";
import { authLinkClass } from "./AuthShell";
import { Field, FormError, SubmitButton, send } from "./fields";

function useSubmit(path: string, onDone: (home: string) => void) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent, body: Record<string, string>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await send<{ home?: string }>("POST", path, body);
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    onDone(result.data?.home ?? "/report");
  }

  return { error, busy, submit, clearError: () => setError("") };
}

export function LoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // The database sleeps when idle. Waking it now means it is ready by the
  // time the password is typed. Nothing depends on the answer.
  useEffect(() => {
    void fetch("/api/auth/warm", { method: "POST" }).catch(() => {});
  }, []);
  const { error, busy, submit, clearError } = useSubmit("/api/auth/login", (home) => {
    // One move, one load. The report screen is always fetched fresh for the
    // new session, so a refresh on top would only load it a second time.
    router.replace(next ?? home);
  });

  return (
    <form
      onSubmit={(event) => submit(event, { email, password })}
      className="flex flex-col gap-5"
      noValidate
    >
      <Field
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={(value) => {
          setEmail(value);
          clearError();
        }}
        autoComplete="username"
        autoFocus
      />
      <Field
        id="password"
        label="Password"
        type="password"
        value={password}
        onChange={(value) => {
          setPassword(value);
          clearError();
        }}
        autoComplete="current-password"
      />
      <FormError message={error} />
      <SubmitButton busy={busy} busyLabel="Signing in" disabled={!email || !password}>
        Sign in
      </SubmitButton>
      <Link href="/forgot-password" className={`${authLinkClass} self-start text-[0.95rem]`}>
        Forgot password?
      </Link>
    </form>
  );
}

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const { error, busy, submit, clearError } = useSubmit("/api/auth/accept-invite", (home) => {
    router.replace(home);
  });

  return (
    <form
      onSubmit={(event) => submit(event, { token, name, password })}
      className="flex flex-col gap-5"
      noValidate
    >
      <Field
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={() => {}}
        autoComplete="username"
        readOnly
      />
      <Field
        id="name"
        label="Your name"
        value={name}
        onChange={(value) => {
          setName(value);
          clearError();
        }}
        autoComplete="name"
        autoFocus
        hint="As it should appear on your reports, for example Dr. A. Sharma."
      />
      <Field
        id="new-password"
        label="Choose a password"
        type="password"
        value={password}
        onChange={(value) => {
          setPassword(value);
          clearError();
        }}
        autoComplete="new-password"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
      />
      <FormError message={error} />
      <SubmitButton busy={busy} busyLabel="Creating your account" disabled={!name.trim() || !password}>
        Create account
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const { error, busy, submit, clearError } = useSubmit("/api/auth/forgot-password", () =>
    setSent(true),
  );

  if (sent) {
    return (
      <p role="status" className="rounded-3xl bg-teal-tint p-6 leading-relaxed text-ink">
        If <strong>{email}</strong> has an account, a reset link is on its way. It works
        once and expires in one hour.
      </p>
    );
  }

  return (
    <form onSubmit={(event) => submit(event, { email })} className="flex flex-col gap-5" noValidate>
      <Field
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={(value) => {
          setEmail(value);
          clearError();
        }}
        autoComplete="username"
        autoFocus
      />
      <FormError message={error} />
      <SubmitButton busy={busy} busyLabel="Sending" disabled={!email}>
        Send reset link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const { error, busy, submit, clearError } = useSubmit("/api/auth/reset-password", (home) => {
    router.replace(home);
  });

  return (
    <form
      onSubmit={(event) => submit(event, { token, password })}
      className="flex flex-col gap-5"
      noValidate
    >
      <Field
        id="new-password"
        label="New password"
        type="password"
        value={password}
        onChange={(value) => {
          setPassword(value);
          clearError();
        }}
        autoComplete="new-password"
        autoFocus
        hint={`At least ${MIN_PASSWORD_LENGTH} characters. You will be signed out on other devices.`}
      />
      <FormError message={error} />
      <SubmitButton busy={busy} busyLabel="Saving" disabled={!password}>
        Save password
      </SubmitButton>
    </form>
  );
}
