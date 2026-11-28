"use client";

import { Spinner } from "@/components/Spinner";
import { toast } from "@/components/Toast";
import { Dialog } from "@base-ui/react/dialog";
import { Check, Copy, Plus } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, FieldLabel, FormError, send } from "@/components/auth/fields";
import { Tip } from "@/components/Tip";
import type { Role } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/team";
import { BACKDROP, POPUP, Select, buttonClass } from "./ui";

// Kept in ./ui so screens that only need these styles do not load this file.
export { BACKDROP, POPUP };

export function InviteButton({
  roles,
  triggerClassName = buttonClass.primary,
}: {
  roles: Role[];
  /** The button's look; the teal Team panel gives it the glowing style. */
  triggerClassName?: string;
}) {
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
      toast.error(result.error);
      return;
    }
    toast.success("Invitation created. Copy the link and send it.");
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
      <Dialog.Trigger className={triggerClassName}>
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
                className="h-11 w-full rounded-full border border-ink/35 bg-canvas px-4 text-[0.9rem] text-ink outline-none transition-colors focus:border-teal"
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
                <FieldLabel id="invite-role" label="Role" required />
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
                  {busy && <Spinner />}
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

export function RoleSelect({
  memberId,
  memberName,
  role,
  roles,
}: {
  memberId: string;
  memberName: string;
  role: Role;
  roles: Role[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(role);
  // The role picked but not yet confirmed.
  const [pending, setPending] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function change(next: Role) {
    setBusy(true);
    setError("");
    const result = await send("PATCH", `/api/team/members/${memberId}`, { role: next });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success(`${memberName} is now ${ROLE_LABELS[next].toLowerCase()}`);
    setValue(next);
    setPending(null);
    router.refresh();
  }

  return (
    <>
      <Select
        aria-label="Role"
        value={value}
        disabled={busy}
        onChange={(event) => setPending(event.target.value as Role)}
      >
        {roles.map((option) => (
          <option key={option} value={option}>
            {ROLE_LABELS[option]}
          </option>
        ))}
      </Select>
      <Dialog.Root open={pending !== null} onOpenChange={(open) => !open && !busy && (setPending(null), setError(""))}>
        <Dialog.Portal>
          <Dialog.Backdrop className={BACKDROP} />
          <Dialog.Popup className={POPUP}>
            <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">
              Make {memberName} {pending ? ROLE_LABELS[pending].toLowerCase() : ""}?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-ink-soft">
              {pending === "radiologist"
                ? "They will no longer be able to invite people or change the team."
                : "They will be able to invite people and change the team."}
            </Dialog.Description>
            <div className="mt-4">
              <FormError message={error} />
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => pending && change(pending)}
                disabled={busy}
                className={buttonClass.primary}
              >
                {busy && <Spinner />}
                {busy ? "Changing" : "Change role"}
              </button>
              <Dialog.Close className={buttonClass.secondary}>Cancel</Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
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
  method = "DELETE",
  payload,
  tone = "danger",
  icon,
  triggerClassName = buttonClass.quiet,
  onDone,
  doneMessage,
  doneTone = "success",
}: {
  label: string;
  /** Shown instead of the label on the button; the label is then its name for screen readers. */
  icon?: React.ReactNode;
  triggerClassName?: string;
  /** Called after it succeeds, for screens that keep their own copy of the data. */
  onDone?: () => void;
  /** The toast shown when it worked, such as "Template deleted". */
  doneMessage?: string;
  /** Green for a plain success; orange when the result needs attention, such as turning an account off. */
  doneTone?: "success" | "warning";
  title: string;
  body: string;
  confirmLabel: string;
  path: string;
  /** Where to go afterwards, when the current screen no longer exists. */
  redirectTo?: string;
  method?: "DELETE" | "PATCH";
  payload?: unknown;
  tone?: "danger" | "primary";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    const result = await send(method, path, payload);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    setOpen(false);
    toast[doneTone](doneMessage ?? "Done");
    onDone?.();
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (setOpen(next), setError(""))}>
      {icon ? (
        <Tip label={label}>
          <Dialog.Trigger type="button" className={triggerClassName} aria-label={label}>
            {icon}
          </Dialog.Trigger>
        </Tip>
      ) : (
        <Dialog.Trigger type="button" className={triggerClassName}>
          {label}
        </Dialog.Trigger>
      )}
      <Dialog.Portal>
        <Dialog.Backdrop className={BACKDROP} />
        <Dialog.Popup className={POPUP}>
          <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-ink-soft">{body}</Dialog.Description>
          <div className="mt-4">
            <FormError message={error} />
          </div>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={confirm} disabled={busy} className={buttonClass[tone]}>
              {busy && <Spinner />}
              {busy ? "Working" : confirmLabel}
            </button>
            <Dialog.Close className={buttonClass.secondary}>Cancel</Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
