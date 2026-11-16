"use client";

import { toast } from "@/components/Toast";
import { Dialog } from "@base-ui/react/dialog";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { BACKDROP, POPUP } from "@/components/app/TeamClient";
import { Badge, buttonClass, formatDate } from "@/components/app/ui";
import { FormError, send } from "@/components/auth/fields";
import { PLANS, monthlyPrice, rupees, yearlyPrice, type Cycle, type Plan } from "@/lib/plans";
import type { PlanStatus } from "@/lib/subscription";

/** One account's plan in the accounts list: where it stands, and a way to start or end it. */
export function PlanControl({ orgId, name, status }: { orgId: string; name: string; status: PlanStatus | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Starts on what the doctor asked for, so activating after payment is one click.
  const [plan, setPlan] = useState<Plan["id"]>(status?.requested?.id ?? status?.plan?.id ?? "pro");
  const [cycle, setCycle] = useState<Cycle>(status?.requestedCycle ?? status?.cycle ?? "monthly");
  const [busy, setBusy] = useState<"activate" | "end" | null>(null);
  const [error, setError] = useState("");
  // Ending a plan locks the account's report screen, so it is asked about once more.
  const [confirmEnd, setConfirmEnd] = useState(false);

  const state = status?.status ?? "pilot";
  const chosen = PLANS.find((item) => item.id === plan) ?? PLANS[0];

  async function submit(action: "activate" | "end") {
    setBusy(action);
    setError("");
    const result = await send<{ referralReward?: number }>("PATCH", `/api/admin/organizations/${orgId}/plan`, {
      action,
      plan,
      cycle,
    });
    setBusy(null);
    if (result.error) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    if (action === "end") toast.warning(`Plan ended for ${name}`);
    else {
      const reward = result.data?.referralReward ?? 0;
      toast.success(
        reward > 0
          ? `Plan active for ${name}. Their referrer got ${reward.toLocaleString("en-IN")} bonus AI updates`
          : `Plan active for ${name}`,
      );
    }
    setOpen(false);
    setConfirmEnd(false);
    router.refresh();
  }

  return (
    <span className="flex flex-col items-start gap-1.5">
      {state === "active" && status?.plan ? (
        <Badge tone="teal">
          {status.plan.name}
          {status.periodEnd ? `, to ${formatDate(status.periodEnd)}` : ""}
        </Badge>
      ) : state === "locked" ? (
        <Badge tone="amber">{status?.requested ? `Wants ${status.requested.name}` : "Not paid"}</Badge>
      ) : (
        <Badge>Pilot</Badge>
      )}

      <Dialog.Root open={open} onOpenChange={(next) => (setOpen(next), setError(""))}>
        <Dialog.Trigger type="button" className="text-[0.88rem] font-semibold text-ink underline decoration-ink/40 underline-offset-4 hover:decoration-ink">
          {state === "active" ? "Change plan" : "Activate plan"}
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className={BACKDROP} />
          <Dialog.Popup className={POPUP}>
            <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">Plan for {name}</Dialog.Title>
            <Dialog.Description className="mt-2 text-ink-soft">
              Activate once payment has been received. The editor opens straight away and the plan runs for one
              {cycle === "yearly" ? " year" : " month"} from today.
            </Dialog.Description>

            <fieldset className="mt-5">
              <legend className="t-label mb-2">Plan</legend>
              <div className="grid grid-cols-2 gap-2">
                {PLANS.map((item) => (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer flex-col rounded-2xl border-2 px-4 py-3 transition-colors ${
                      plan === item.id ? "border-teal bg-teal/[0.08]" : "border-ink/20 hover:border-ink/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={item.id}
                      checked={plan === item.id}
                      onChange={() => setPlan(item.id)}
                      className="sr-only"
                    />
                    <span className="font-bold">{item.name}</span>
                    <span className="t-meta">{item.creditsPerDay} credits a day</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-4">
              <legend className="t-label mb-2">Billing</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["monthly", "yearly"] as const).map((value) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer flex-col rounded-2xl border-2 px-4 py-3 transition-colors ${
                      cycle === value ? "border-teal bg-teal/[0.08]" : "border-ink/20 hover:border-ink/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="cycle"
                      value={value}
                      checked={cycle === value}
                      onChange={() => setCycle(value)}
                      className="sr-only"
                    />
                    <span className="font-bold">{value === "monthly" ? "Monthly" : "Yearly"}</span>
                    <span className="t-meta tabular-nums">
                      {value === "monthly"
                        ? `${rupees(monthlyPrice(chosen, "monthly"))} + GST`
                        : `${rupees(yearlyPrice(chosen))} + GST`}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-4">
              <FormError message={error} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => submit("activate")} disabled={busy !== null} className={buttonClass.primary}>
                {busy === "activate" && <Spinner />}
                {busy === "activate" ? "Activating" : "Payment received, activate"}
              </button>
              {state === "active" && (
                <button type="button" onClick={() => setConfirmEnd(true)} disabled={busy !== null} className={buttonClass.danger}>
                  End plan now
                </button>
              )}
              <Dialog.Close className={buttonClass.secondary}>Cancel</Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={confirmEnd} onOpenChange={(next) => busy === null && setConfirmEnd(next)}>
        <Dialog.Portal>
          <Dialog.Backdrop className={BACKDROP} />
          <Dialog.Popup className={POPUP}>
            <Dialog.Title className="text-[1.3rem] font-semibold tracking-[-0.02em]">End the plan for {name}?</Dialog.Title>
            <Dialog.Description className="mt-2 text-ink-soft">
              Their report screen closes at once and stays closed until a plan is activated again. Saved reports
              and templates are kept.
            </Dialog.Description>
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={() => submit("end")} disabled={busy !== null} className={buttonClass.danger}>
                {busy === "end" && <Spinner />}
                {busy === "end" ? "Ending" : "End plan"}
              </button>
              <Dialog.Close className={buttonClass.secondary}>Cancel</Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </span>
  );
}
