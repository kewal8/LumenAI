"use client";

import Link from "next/link";
import { useState } from "react";
import { copyReport } from "@/lib/clipboard";
import {
  DEFAULT_PROFILE,
  buildReportHtml,
  buildReportText,
  type FormattedReport,
  type PasteProfile,
} from "@/lib/reportFormat";

// Made-up sample, no patient data.
const SAMPLE: FormattedReport = {
  title: "CT BRAIN (PLAIN)",
  sections: [
    {
      heading: "TECHNIQUE",
      lines: ["Axial sections of the brain were obtained without contrast."],
    },
    {
      heading: "FINDINGS",
      lines: [
        "Undisplaced fracture of the squamous part of the right temporal bone extending to the external auditory canal.",
        "Soft tissue swelling in the right maxillary and premandibular regions.",
        "No intracranial haemorrhage. No midline shift. Ventricles are normal in size.",
      ],
    },
    {
      heading: "IMPRESSION",
      lines: [
        "Undisplaced right temporal bone fracture.",
        "Right facial soft tissue swelling.",
      ],
    },
  ],
};

const FONTS = ["Calibri", "Arial", "Times New Roman", "Verdana"];
const SIZES = [10, 11, 12, 14];
const HEADING_STYLES: Options["headingStyle"][] = ["bold", "bold + underline"];
const LIST_STYLES: Options["listStyle"][] = ["paragraphs", "bullets"];

type Options = PasteProfile;

export default function PasteTestPage() {
  const [options, setOptions] = useState<Options>(DEFAULT_PROFILE);
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  const html = buildReportHtml(SAMPLE, options);

  function update<K extends keyof Options>(key: K, value: Options[K]) {
    setOptions((previous) => ({ ...previous, [key]: value }));
    setStatus("idle");
  }

  async function copy() {
    try {
      await copyReport(html, buildReportText(SAMPLE, options));
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  const selectClass =
    "rounded border border-zinc-300 bg-transparent px-2 py-1.5 dark:border-zinc-700";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">PACS paste test</h1>
        <Link href="/tools" className="text-sm text-zinc-500 hover:underline">
          Tools
        </Link>
      </header>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Copy this sample report, press Ctrl+V in the PACS report editor, and
        note which settings keep the font, headings and spacing intact.
      </p>

      <section className="grid gap-4 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          Font
          <select
            value={options.font}
            onChange={(event) => update("font", event.target.value)}
            className={selectClass}
          >
            {FONTS.map((font) => (
              <option key={font}>{font}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Size (pt)
          <select
            value={options.size}
            onChange={(event) => update("size", Number(event.target.value))}
            className={selectClass}
          >
            {SIZES.map((size) => (
              <option key={size}>{size}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Headings
          <select
            value={options.headingStyle}
            onChange={(event) =>
              update("headingStyle", event.target.value as Options["headingStyle"])
            }
            className={selectClass}
          >
            {HEADING_STYLES.map((style) => (
              <option key={style}>{style}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Lines
          <select
            value={options.listStyle}
            onChange={(event) =>
              update("listStyle", event.target.value as Options["listStyle"])
            }
            className={selectClass}
          >
            {LIST_STYLES.map((style) => (
              <option key={style}>{style}</option>
            ))}
          </select>
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={copy}
          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Copy for PACS
        </button>
        {status === "copied" && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
            Copied. Press Ctrl+V in PACS.
          </span>
        )}
        {status === "failed" && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            Not copied. Click the page and try again.
          </span>
        )}
      </div>

      {/* White sheet in both themes: this previews what lands in the PACS editor. */}
      <section
        className="rounded border border-zinc-300 bg-white p-8 dark:border-zinc-700"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  );
}
