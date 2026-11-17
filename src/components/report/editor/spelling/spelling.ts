"use client";

import { toast } from "@/components/Toast";
import type { SpellReply, SpellRequest } from "./spell.worker";

// One spelling checker for the whole page, shared by every editor on it: the
// background worker, what it has already said about each word, the account's
// own dictionary, and words ignored for this visit.

let worker: Worker | null = null;
let failed = false;
let nextId = 1;
const known = new Map<string, boolean>(); // word → spelt right
const waiting = new Set<string>();
const ignored = new Set<string>();
const personal = new Set<string>();
const suggestions = new Map<number, (words: string[]) => void>();
const listeners = new Set<() => void>();
let personalLoaded: Promise<void> | null = null;
let flushQueued = false;

function notify() {
  for (const listener of listeners) listener();
}

function post(message: SpellRequest) {
  start()?.postMessage(message);
}

function start() {
  if (worker || failed || typeof window === "undefined") return worker;
  try {
    worker = new Worker(new URL("./spell.worker.ts", import.meta.url), { type: "module" });
  } catch {
    failed = true;
    return null;
  }
  worker.onmessage = (event: MessageEvent<SpellReply>) => {
    const message = event.data;
    if (message.type === "failed") {
      // No dictionary: nothing is underlined rather than everything.
      failed = true;
      notify();
    } else if (message.type === "checked") {
      const wrong = new Set(message.wrong);
      for (const word of pendingChecks.get(message.id) ?? []) {
        known.set(word, !wrong.has(word));
        waiting.delete(word);
      }
      pendingChecks.delete(message.id);
      notify();
    } else if (message.type === "suggested") {
      suggestions.get(message.id)?.(message.suggestions);
      suggestions.delete(message.id);
    }
  };
  personalLoaded = loadPersonal();
  return worker;
}

const pendingChecks = new Map<number, string[]>();

async function loadPersonal() {
  try {
    const response = await fetch("/api/dictionary");
    if (!response.ok) return;
    const { words } = (await response.json()) as { words: string[] };
    for (const word of words) personal.add(word);
    if (words.length) post({ type: "add", words });
  } catch {
    // Signed out or offline: the shared dictionaries still apply.
  }
}

async function flush() {
  flushQueued = false;
  await personalLoaded;
  const words = [...waiting].filter((word) => !known.has(word));
  if (!words.length || failed) return;
  const id = nextId++;
  pendingChecks.set(id, words);
  post({ type: "check", id, words });
}

/** Called when the results for some words have come in, so underlines can be redrawn. */
export function onSpellingChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Whether this word is spelt wrong, as far as is known now. Unknown words are
 * sent to be checked and count as right until the answer comes back.
 */
export function isMisspelt(word: string) {
  if (ignored.has(word) || personal.has(word)) return false;
  const result = known.get(word);
  if (result !== undefined) return !result;
  if (!failed && start() && !waiting.has(word)) {
    waiting.add(word);
    if (!flushQueued) {
      flushQueued = true;
      queueMicrotask(() => void flush());
    }
  }
  return false;
}

/** Real words close to this one, best first. */
export function suggestFor(word: string) {
  return new Promise<string[]>((resolve) => {
    if (!start() || failed) return resolve([]);
    const id = nextId++;
    suggestions.set(id, resolve);
    post({ type: "suggest", id, word });
  });
}

/** Stops underlining this word until the page is closed. */
export function ignoreWord(word: string) {
  ignored.add(word);
  notify();
}

/** Saves the word to the account's dictionary, for everyone on it and on every device. */
export async function addToDictionary(word: string) {
  try {
    const response = await fetch("/api/dictionary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ word }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(body.error ?? "That word could not be added. Try again.");
      return;
    }
    rememberWord(body.word ?? word);
    toast.success(`“${body.word ?? word}” added to your dictionary.`);
  } catch {
    toast.error("That word could not be added. Check your connection and try again.");
  }
}

/** Counts a word as right on this page, after it was added to the dictionary elsewhere. */
export function rememberWord(word: string) {
  personal.add(word);
  post({ type: "add", words: [word] });
  notify();
}

/** Underlines a word again after it was taken out of the dictionary. */
export function forgetWord(word: string) {
  personal.delete(word);
  known.delete(word);
  post({ type: "remove", words: [word] });
  notify();
}
