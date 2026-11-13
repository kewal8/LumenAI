"use client";

import Link from "next/link";
import { useState } from "react";
import { useDictation, type Word } from "@/lib/useDictation";

const MODELS = ["nova-3-medical", "nova-3"];
const LANGUAGES = ["en-IN", "en", "en-US", "en-GB"];
const LOW_CONFIDENCE = 0.7;
const DEFAULT_KEYTERMS = [
  "hypodense",
  "hyperdense",
  "effusion",
  "squamous temporal bone",
  "external auditory canal",
  "premandibular",
  "maxillary",
  "undisplaced fracture",
].join("\n");

export default function DictatePage() {
  const [model, setModel] = useState(MODELS[0]);
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [keyterms, setKeyterms] = useState(DEFAULT_KEYTERMS);
  const [words, setWords] = useState<Word[]>([]);

  const { recording, starting, interim, error, start, stop } = useDictation({
    model,
    language,
    keyterms: keyterms
      .split(/[\n,]/)
      .map((term) => term.trim())
      .filter(Boolean),
    onWords: (finalWords) => setWords((previous) => [...previous, ...finalWords]),
  });

  const transcript = words.map((word) => word.text).join(" ");
  const lowConfidenceCount = words.filter(
    (word) => word.confidence < LOW_CONFIDENCE,
  ).length;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Dictation test</h1>
        <Link href="/tools" className="text-sm text-zinc-500 hover:underline">
          Tools
        </Link>
      </header>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Dictate positive findings and check how well the speech service hears
        radiology terms. Words it is unsure about are marked in amber.
      </p>

      <section className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Model
          <select
            value={model}
            onChange={(event) => setModel(event.target.value)}
            disabled={recording}
            className="rounded border border-zinc-300 bg-transparent px-2 py-1.5 dark:border-zinc-700"
          >
            {MODELS.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Language
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            disabled={recording}
            className="rounded border border-zinc-300 bg-transparent px-2 py-1.5 dark:border-zinc-700"
          >
            {LANGUAGES.map((code) => (
              <option key={code}>{code}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          Key terms (one per line, boosts recognition)
          <textarea
            value={keyterms}
            onChange={(event) => setKeyterms(event.target.value)}
            disabled={recording}
            rows={4}
            className="rounded border border-zinc-300 bg-transparent px-2 py-1.5 font-mono text-xs dark:border-zinc-700"
          />
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={recording ? stop : start}
          disabled={starting}
          className={`rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-40 ${
            recording ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {recording ? "Stop" : starting ? "Starting…" : "Start dictation"}
        </button>
        <button
          onClick={() => setWords([])}
          disabled={recording || words.length === 0}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm disabled:opacity-40 dark:border-zinc-700"
        >
          Clear
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(transcript)}
          disabled={words.length === 0}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm disabled:opacity-40 dark:border-zinc-700"
        >
          Copy text
        </button>
        <span className="ml-auto text-xs text-zinc-500">
          {words.length} words, {lowConfidenceCount} unsure
        </span>
      </div>

      {error && (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      <section className="min-h-48 rounded border border-zinc-300 p-4 leading-7 dark:border-zinc-700">
        {words.length === 0 && !interim && (
          <span className="text-zinc-400">Transcript appears here.</span>
        )}
        {words.map((word, index) => (
          <span
            key={index}
            title={`confidence ${word.confidence.toFixed(2)}`}
            className={
              word.confidence < LOW_CONFIDENCE
                ? "rounded bg-amber-200 px-0.5 dark:bg-amber-800"
                : undefined
            }
          >
            {word.text}{" "}
          </span>
        ))}
        <span className="text-zinc-400">{interim}</span>
      </section>
    </main>
  );
}
