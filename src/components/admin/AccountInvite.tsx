"use client";

import { toast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";
import { Dialog } from "@base-ui/react/dialog";
import { Check, Copy, Plus } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BACKDROP, POPUP } from "@/components/app/TeamClient";
import { Select, buttonClass } from "@/components/app/ui";
import { Field, FieldLabel, FormError, send } from "@/components/auth/fields";

type Kind = "personal" | "centre";

/** Opens a new account: one radiologist, or a centre whose owner invites the rest. */
export function AccountInviteButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState<Kind>("personal");
  const [organisation, setOrganisation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  function reset(next: boolean) {
    setOpen(next);
    if (!next) {
      setEmail("");
      setKind("personal");
      setOrganisation("");
      setError("");
      setLink("");
      setCopied(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await send<{ link: string }>("POST", "/api/admin/invites", { email, kind, organisation });
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
      <Dialog.Trigger className={buttonClass.primary}>
        <Plus weight="bold" className="h-4 w-4" />
        New account
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className={BACKDROP} />
        <Dialog.Popup className={POPUP}>
          <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">
            {link ? "Invitation ready" : "Open a new account"}
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
                The account starts when they open the link and set their name and password.
              </Dialog.Description>
              <Field
                dense
                id="account-email"
                label="Email of the account owner"
                type="email"
                value={email}
                onChange={(value) => (setEmail(value), setError(""))}
                autoComplete="off"
                autoFocus
              />
              <div className="flex flex-col gap-1.5">
                <FieldLabel id="account-kind" label="Account type" />
                <Select id="account-kind" value={kind} onChange={(event) => setKind(event.target.value as Kind)}>
                  <option value="personal">Personal: one radiologist</option>
                  <option value="centre">Centre: an owner who invites a team</option>
                </Select>
              </div>
              {kind === "centre" && (
                <Field
                  dense
                  id="account-organisation"
                  label="Name of the centre"
                  value={organisation}
                  onChange={(value) => (setOrganisation(value), setError(""))}
                  autoComplete="off"
                />
              )}
              <FormError message={error} />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy || !email || (kind === "centre" && !organisation.trim())}
                  className={buttonClass.primary}
                >
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
