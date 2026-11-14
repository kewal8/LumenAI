"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Check, Copy, Plus } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, FieldLabel, FormError, send } from "@/components/auth/fields";
import type { Role } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/team";
import { Select, buttonClass } from "./ui";

const POPUP =
  "app-layer fixed left-1/2 top-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-ink/20 bg-surface p-6 shadow-[0_24px_70px_-20px_rgb(15_38_36/0.5)] outline-none sm:p-8";
const BACKDROP = "app-backdrop fixed inset-0 z-50 bg-[#0f2624]/40";

export function InviteButton({ roles }: { roles: Role[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(roles[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  function reset(next: boolean) {
    setOpen(next);
    if (!next) {
      setEmail("");
      setError("");
      setLink("");
      setCopied(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await send<{ link: string }>("POST", "/api/team/invites", { email, role });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setLink(result.data?.link ?? "");
    router.refresh();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("Could not copy. Select the link and copy it by hand.");
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={reset}>
      <Dialog.Trigger className={buttonClass.primary}>
        <Plus weight="bold" className="h-4 w-4" />
        Invite
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className={BACKDROP} />
        <Dialog.Popup className={POPUP}>
          <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">
            {link ? "Invitation ready" : "Invite to your team"}
          </Dialog.Title>

          {link ? (
            <div className="mt-2 flex flex-col gap-4">
              <Dialog.Description className="text-ink-soft">
                Send this link to {email}. It works once and expires in 7 days. It is shown only
                now.
              </Dialog.Description>
              <input
                readOnly
                value={link}
                aria-label="Invitation link"
                onFocus={(event) => event.target.select()}
                className="h-11 w-full rounded-full border border-ink/35 bg-canvas px-4 text-[0.9rem] text-ink outline-none"
              />
              <FormError message={error} />
              <div className="flex gap-2">
                <button type="button" onClick={copy} className={buttonClass.primary}>
                  {copied ? <Check weight="bold" className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy link"}
                </button>
                <Dialog.Close className={buttonClass.secondary}>Done</Dialog.Close>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-2 flex flex-col gap-4" noValidate>
              <Dialog.Description className="text-ink-soft">
                They set their own name and password from the link you send them.
              </Dialog.Description>
              <Field
                dense
                id="invite-email"
                label="Email"
                type="email"
                value={email}
                onChange={(value) => (setEmail(value), setError(""))}
                autoComplete="off"
                autoFocus
              />
              <div className="flex flex-col gap-1.5">
                <FieldLabel id="invite-role" label="Role" />
                <Select
                  id="invite-role"
                  value={role}
                  onChange={(event) => setRole(event.target.value as Role)}
                >
                  {roles.map((option) => (
                    <option key={option} value={option}>
                      {ROLE_LABELS[option]}
                    </option>
                  ))}
                </Select>
              </div>
              <FormError message={error} />
              <div className="flex gap-2">
                <button type="submit" disabled={busy || !email} className={buttonClass.primary}>
                  {busy ? "Creating" : "Create invitation"}
                </button>
                <Dialog.Close className={buttonClass.secondary}>Cancel</Dialog.Close>
              </div>
            </form>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function RoleSelect({ memberId, role, roles }: { memberId: string; role: Role; roles: Role[] }) {
  const router = useRouter();
  const [value, setValue] = useState(role);
  const [busy, setBusy] = useState(false);

  async function change(next: Role) {
    setBusy(true);
    const result = await send("PATCH", `/api/team/members/${memberId}`, { role: next });
    setBusy(false);
    if (!result.error) setValue(next);
    router.refresh();
  }

  return (
    <Select
      aria-label="Role"
      value={value}
      disabled={busy}
      onChange={(event) => change(event.target.value as Role)}
    >
      {roles.map((option) => (
        <option key={option} value={option}>
          {ROLE_LABELS[option]}
        </option>
      ))}
    </Select>
  );
}

/** A destructive action that asks first. */
export function ConfirmAction({
  label,
  title,
  body,
  confirmLabel,
  path,
  redirectTo,
}: {
  label: string;
  title: string;
  body: string;
  confirmLabel: string;
  path: string;
  /** Where to go afterwards, when the current screen no longer exists. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    const result = await send("DELETE", path);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (setOpen(next), setError(""))}>
      <Dialog.Trigger type="button" className={buttonClass.quiet}>{label}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className={BACKDROP} />
        <Dialog.Popup className={POPUP}>
          <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-ink-soft">{body}</Dialog.Description>
          <div className="mt-4">
            <FormError message={error} />
          </div>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={confirm} disabled={busy} className={buttonClass.danger}>
              {busy ? "Working" : confirmLabel}
            </button>
            <Dialog.Close className={buttonClass.secondary}>Cancel</Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
