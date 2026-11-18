"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  Copy,
  FolderOpen,
  PencilSimpleLine,
  Printer,
  SealCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { buttonClass, formatDateTime } from "@/components/app/ui";

/**
 * Shown after a report is finalized: the report exactly as it will print,
 * on the doctor's letterhead and with their signature when they have set
 * them, otherwise the plain generated report.
 */
export function FinalizeDialog({
  open,
  onClose,
  printHtml,
  finalizedAt,
  hasLetterhead,
  hasSignature,
  flaggedLines,
  onPrint,
  onCopy,
}: {
  open: boolean;
  onClose: () => void;
  /** The full print page (letterhead, report, sign-off). */
  printHtml: string;
  finalizedAt: string | null;
  hasLetterhead: boolean;
  hasSignature: boolean;
  /** Lines still marked to check when it was finalized. */
  flaggedLines: number;
  onPrint: () => void;
  onCopy: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="app-backdrop fixed inset-0 z-50 bg-[#06110f]/55" />
        <Dialog.Popup className="app-layer fixed inset-3 z-50 mx-auto flex max-w-[64rem] flex-col overflow-hidden rounded-3xl border border-ink/20 bg-surface shadow-[0_24px_70px_-20px_rgb(6_17_15/0.6)] outline-none sm:inset-6">
          <header className="flex flex-wrap items-center gap-4 border-b border-line px-6 py-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal text-white">
              <SealCheck weight="fill" className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-[1.3rem] font-bold leading-tight tracking-[-0.02em]">
                Report finalized
              </Dialog.Title>
              <Dialog.Description className="t-meta mt-0.5">
                Saved in Reports{finalizedAt ? `, ${formatDateTime(finalizedAt)}` : ""}.{" "}
                {hasLetterhead && hasSignature
                  ? "Shown on your letterhead with your signature."
                  : hasLetterhead
                    ? "Shown on your letterhead."
                    : hasSignature
                      ? "Shown with your signature."
                      : "No letterhead or signature set. Add them in Settings."}
              </Dialog.Description>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={onPrint} className={buttonClass.secondary}>
                <Printer weight="bold" className="h-5 w-5" />
                Print or PDF
              </button>
              <button
                type="button"
                onClick={onCopy}
                className={buttonClass.primary}
              >
                <Copy weight="bold" className="h-5 w-5" />
                Copy report
              </button>
            </div>
          </header>

          {flaggedLines > 0 && (
            <p
              role="alert"
              className="flex items-center gap-2.5 border-b border-flag/40 bg-flag/10 px-6 py-3 font-semibold text-flag"
            >
              <WarningCircle weight="fill" className="h-5 w-5 shrink-0" />
              {flaggedLines} {flaggedLines === 1 ? "line was" : "lines were"} still marked to check when you
              finalized. Go back and look before you sign.
            </p>
          )}

          {/* The page as it prints: a white A4 sheet on a grey desk, in both themes. */}
          <div className="min-h-0 flex-1 overflow-y-auto bg-[#e7ebea] px-4 py-8">
            <iframe
              title="Finalized report preview"
              srcDoc={printHtml}
              className="mx-auto block h-[1123px] w-full max-w-[794px] rounded-sm bg-white shadow-[0_2px_10px_rgb(6_17_15/0.18)]"
            />
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-3">
            <Dialog.Close className={buttonClass.quiet}>
              <PencilSimpleLine weight="bold" className="h-5 w-5" />
              Back to the report
            </Dialog.Close>
            <Link href="/reports" className={buttonClass.secondary}>
              <FolderOpen weight="bold" className="h-5 w-5" />
              Go to Reports
            </Link>
          </footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
