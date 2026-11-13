"use client";

import Link from "next/link";
import { useState } from "react";
import { copyReport } from "@/lib/clipboard";

type Section = { heading: string; body: string[] };

// Made-up sample, no patient data.
const SAMPLE: { title: string; sections: Section[] } = {
  title: "CT BRAIN (PLAIN)",
  sections: [
    {
      heading: "TECHNIQUE",
      body: ["Axial sections of the brain were obtained without contrast."],
    },
    {
      heading: "FINDINGS",
      body: [
        "Undisplaced fracture of the squamous part of the right temporal bone extending to the external auditory canal.",
        "Soft tissue swelling in the right maxillary and premandibular regions.",
        "No intracranial haemorrhage. No midline shift. Ventricles are normal in size.",
      ],
    },
    {
      heading: "IMPRESSION",
      body: [
        "Undisplaced right temporal bone fracture.",
        "Right facial soft tissue swelling.",
      ],
    },
  ],
};

const FONTS = ["Calibri", "Arial", "Times New Roman", "Verdana"];
const SIZES = [10, 11, 12, 14];
const HEADING_STYLES = ["bold", "bold + underline"] as const;
const LIST_STYLES = ["paragraphs", "bullets"] as const;

type Options = {
  font: string;
  size: number;
  headingStyle: (typeof HEADING_STYLES)[number];
  listStyle: (typeof LIST_STYLES)[number];
};

function buildHtml({ font, size, headingStyle, listStyle }: Options) {
  // Inline styles only: PACS editors drop <style> blocks and class names on paste.
  const base = `font-family:'${font}',sans-serif;font-size:${size}pt;color:#000;`;
  const heading =
    base +
    "font-weight:bold;" +
    (headingStyle === "bold + underline" ? "text-decoration:underline;" : "");

  const sections = SAMPLE.sections
    .map(({ heading: label, body }) => {
      const lines =
        listStyle === "bullets"
          ? `<ul style="margin:0 0 8pt 0;">${body
              .map((line) => `<li style="${base}">${line}</li>`)
              .join("")}</ul>`
          : body
              .map((line) => `<p style="${base}margin:0 0 4pt 0;">${line}</p>`)
              .join("");
      return `<p style="${heading}margin:8pt 0 2pt 0;">${label}:</p>${lines}`;
    })
    .join("");

  return `<p style="${heading}text-align:center;margin:0 0 8pt 0;">${SAMPLE.title}</p>${sections}`;
}

function buildText({ listStyle }: Options) {
  const sections = SAMPLE.sections.map(({ heading, body }) => {
    const lines = body.map((line) => (listStyle === "bullets" ? `- ${line}` : line));
    return `${heading}:\n${lines.join("\n")}`;
  });
  return [SAMPLE.title, ...sections].join("\n\n");
}

export default function PasteTestPage() {
  const [options, setOptions] = useState<Options>({
    font: FONTS[0],
    size: 11,
    headingStyle: HEADING_STYLES[0],
    listStyle: LIST_STYLES[0],
  });
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  const html = buildHtml(options);

  function update<K extends keyof Options>(key: K, value: Options[K]) {
    setOptions((previous) => ({ ...previous, [key]: value }));
    setStatus("idle");
  }

  async function copy() {
    try {
      await copyReport(html, buildText(options));
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
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          Home
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
