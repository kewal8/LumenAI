"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type Word = { text: string; confidence: number };

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
  const [recording, setRecording] = useState(false);
  const [words, setWords] = useState<Word[]>([]);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");

  const socketRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function cleanup() {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
    streamRef.current = null;
    socketRef.current = null;
    setRecording(false);
    setInterim("");
  }

  async function start() {
    setError("");
    try {
      const tokenRes = await fetch("/api/stt-token", { method: "POST" });
      const tokenBody = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokenBody.error);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const params = new URLSearchParams({
        model,
        language,
        interim_results: "true",
        smart_format: "true",
      });
      keyterms
        .split(/[\n,]/)
        .map((term) => term.trim())
        .filter(Boolean)
        .forEach((term) => params.append("keyterm", term));

      const socket = new WebSocket(
        `wss://api.deepgram.com/v1/listen?${params}`,
        ["bearer", tokenBody.token],
      );
      socketRef.current = socket;

      socket.onopen = () => {
        const recorder = new MediaRecorder(stream);
        recorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        };
        recorder.start(250);
        setRecording(true);
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type !== "Results") return;
        const alternative = message.channel?.alternatives?.[0];
        if (!alternative) return;

        if (message.is_final) {
          const finalWords: Word[] = (alternative.words ?? []).map(
            (word: { word: string; punctuated_word?: string; confidence: number }) => ({
              text: word.punctuated_word ?? word.word,
              confidence: word.confidence,
            }),
          );
          setWords((previous) => [...previous, ...finalWords]);
          setInterim("");
        } else {
          setInterim(alternative.transcript);
        }
      };

      socket.onerror = () => {
        setError("Speech connection failed. Check the model, language and API key.");
      };
      socket.onclose = cleanup;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start dictation.");
      cleanup();
    }
  }

  function stop() {
    const socket = socketRef.current;
    recorderRef.current?.stop();
    recorderRef.current = null;
    if (socket?.readyState === WebSocket.OPEN) {
      // Ask Deepgram to flush the last words, then it closes the socket.
      socket.send(JSON.stringify({ type: "CloseStream" }));
    } else {
      cleanup();
    }
  }

  const transcript = words.map((word) => word.text).join(" ");
  const lowConfidenceCount = words.filter(
    (word) => word.confidence < LOW_CONFIDENCE,
  ).length;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Dictation test</h1>
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          Home
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
          className={`rounded-full px-5 py-2 text-sm font-medium text-white ${
            recording ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {recording ? "Stop" : "Start dictation"}
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
