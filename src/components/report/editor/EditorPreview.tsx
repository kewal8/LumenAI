"use client";

import { ArrowsClockwise, Copy, Microphone, WarningCircle } from "@phosphor-icons/react";
import { useMemo, useRef, useState } from "react";
import { Badge, Page, PageHeader, PANEL, buttonClass } from "@/components/app/ui";
import { copyReport } from "@/lib/clipboard";
import { reportFromTemplate, type PatchOp } from "@/lib/report";
import { docToHtml, docToReport, docToText, reportToDoc, type DocNode } from "@/lib/reportDoc";
import { DEFAULT_PROFILE } from "@/lib/reportFormat";
import { CT_BRAIN_PLAIN } from "@/lib/templates";
import { ReportEditor, type ReportEditorHandle } from "./ReportEditor";

const op = (values: Partial<PatchOp> & Pick<PatchOp, "op">): PatchOp => ({
  sectionId: "findings",
  lineId: "",
  text: "",
  source: "",
  warnings: [],
  ...values,
});

// Made-up dictations, standing in for what the report service returns.
const SAMPLES: { label: string; ops: PatchOp[]; impression: string[] }[] = [
  {
    label: "Dictate two findings",
    ops: [
      op({
        op: "replace",
        lineId: "findings.bones",
        text: "Undisplaced fracture of the squamous part of the right temporal bone.",
        source: "undisplaced fracture of the squamer part of right temporal bone",
      }),
      op({
        op: "replace",
        lineId: "findings.soft-tissue",
        text: "Soft tissue swelling in the right maxillary region measuring 16 mm.",
        source: "soft tissue swelling in the right maxillary region measuring 16 mm",
      }),
    ],
    impression: [
      "Undisplaced fracture of the squamous part of the right temporal bone.",
      "Right maxillary soft tissue swelling.",
    ],
  },
  {
    label: "Add a new line",
    ops: [
      op({
        op: "add",
        text: "Small pneumocephalus adjacent to the fracture.",
        source: "small pneumocephalus adjacent to the fracture",
      }),
    ],
    impression: [
      "Undisplaced fracture of the squamous part of the right temporal bone with small pneumocephalus.",
      "Right maxillary soft tissue swelling.",
    ],
  },
  {
    label: "Line with a wrong side",
    ops: [
      op({
        op: "replace",
        lineId: "findings.haemorrhage",
        text: "Small extradural collection along the right temporal convexity.",
        source: "small extradural collection along the left temporal convexity",
        warnings: ["Side “right” is not in the dictated words."],
      }),
    ],
    impression: [
      "Undisplaced fracture of the squamous part of the right temporal bone with small pneumocephalus.",
      "Small temporal extradural collection. Side to be confirmed.",
      "Right maxillary soft tissue swelling.",
    ],
  },
  {
    label: "Remove the fracture",
    ops: [op({ op: "reset", lineId: "findings.bones" })],
    impression: ["Small temporal extradural collection.", "Right maxillary soft tissue swelling."],
  },
];

export function EditorPreview() {
  const profile = DEFAULT_PROFILE;
  const base = useMemo(() => reportFromTemplate(CT_BRAIN_PLAIN), []);
  const initialDoc = useMemo(() => reportToDoc(base, profile), [base, profile]);
  const editor = useRef<ReportEditorHandle>(null);
  const [doc, setDoc] = useState<DocNode>(initialDoc);
  const [copied, setCopied] = useState<"" | "yes" | "no">("");

  const report = docToReport(doc, base);
  const lines = report.sections.flatMap((section) => section.lines);
  const html = docToHtml(doc, profile);

  async function copy() {
    try {
      await copyReport(html, docToText(doc));
      setCopied("yes");
    } catch {
      setCopied("no");
    }
  }

  return (
    <Page>
      <PageHeader
        title="Editor preview"
        description="The new report editor, on its own page while it is being built. Made-up report, nothing is saved."
      />

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <ReportEditor ref={editor} initialDoc={initialDoc} profile={profile} onChange={setDoc} />

        <div className="flex flex-col gap-5">
          <section className={`${PANEL} flex flex-col gap-3 p-5`}>
            <h2 className="text-[1.1rem] font-semibold">Pretend to dictate</h2>
            {SAMPLES.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() =>
                  editor.current?.applyPatch({
                    template: CT_BRAIN_PLAIN,
                    ops: sample.ops,
                    impression: sample.impression,
                  })
                }
                className={buttonClass.secondary}
              >
                {sample.ops[0].op === "reset" ? (
                  <ArrowsClockwise weight="bold" className="h-5 w-5" />
                ) : (
                  <Microphone weight="bold" className="h-5 w-5" />
                )}
                {sample.label}
              </button>
            ))}
          </section>

          <section className={`${PANEL} flex flex-col gap-3 p-5`}>
            <h2 className="text-[1.1rem] font-semibold">Read back from the document</h2>
            <p className="flex flex-wrap gap-2">
              <Badge>{lines.length} lines</Badge>
              <Badge tone="teal">{lines.filter((line) => line.status === "spoken").length} dictated</Badge>
              <Badge tone="teal">{lines.filter((line) => line.status === "edited").length} edited by hand</Badge>
              <Badge tone="amber">{lines.filter((line) => line.warnings.length > 0).length} to check</Badge>
            </p>
            <ol data-testid="impression" className="list-decimal pl-5 text-[0.95rem]">
              {report.impression.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ol>
          </section>

          <section className={`${PANEL} flex flex-col gap-3 p-5`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[1.1rem] font-semibold">What gets pasted</h2>
              <button type="button" onClick={copy} className={buttonClass.primary}>
                <Copy weight="bold" className="h-5 w-5" />
                Copy
              </button>
            </div>
            {copied === "yes" && <p className="font-semibold text-teal-deep">Copied.</p>}
            {copied === "no" && (
              <p className="flex items-center gap-2 font-semibold text-flag">
                <WarningCircle weight="fill" className="h-5 w-5" />
                The browser did not allow copying here.
              </p>
            )}
            {/* White in both themes: this is the page a PACS editor shows. */}
            <div
              data-testid="pacs-output"
              className="max-h-[26rem] overflow-y-auto rounded-2xl border border-ink/25 bg-white p-4"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </section>
        </div>
      </div>
    </Page>
  );
}
