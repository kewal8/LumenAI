/// <reference lib="webworker" />
// Spelling check in the background, so loading the dictionary and finding
// suggestions never holds up typing. British English, plus the radiology words
// and the account's own words.

import NSpell from "nspell";
import { MEDICAL_WORDS } from "@/lib/spelling/medicalWords";

export type SpellRequest =
  | { type: "check"; id: number; words: string[] }
  | { type: "suggest"; id: number; word: string }
  | { type: "add"; words: string[] }
  | { type: "remove"; words: string[] };

export type SpellReply =
  | { type: "ready" }
  | { type: "failed" }
  | { type: "checked"; id: number; wrong: string[] }
  | { type: "suggested"; id: number; suggestions: string[] };

const scope = self as unknown as DedicatedWorkerGlobalScope;
const reply = (message: SpellReply) => scope.postMessage(message);

const loading = (async () => {
  const [aff, dic] = await Promise.all(
    ["/spelling/en-GB.aff", "/spelling/en-GB.dic"].map(async (path) => {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`${path}: ${response.status}`);
      return response.text();
    }),
  );
  const spell = NSpell(aff, dic);
  for (const word of MEDICAL_WORDS) spell.add(word);
  return spell;
})();

loading.then(
  () => reply({ type: "ready" }),
  () => reply({ type: "failed" }),
);

scope.onmessage = async (event: MessageEvent<SpellRequest>) => {
  const message = event.data;
  let spell: NSpell;
  try {
    spell = await loading;
  } catch {
    return;
  }
  switch (message.type) {
    case "add":
      for (const word of message.words) spell.add(word);
      break;
    case "remove":
      for (const word of message.words) spell.remove(word);
      break;
    case "check":
      reply({ type: "checked", id: message.id, wrong: message.words.filter((word) => !spell.correct(word)) });
      break;
    case "suggest":
      reply({ type: "suggested", id: message.id, suggestions: spell.suggest(message.word).slice(0, 6) });
      break;
  }
};
