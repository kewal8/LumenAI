import type { CurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

type ClaudeUsage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

// Recording usage must never break the thing being used, so failures are logged and dropped.
async function record(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    console.error("Could not record usage:", error);
  }
}

export function recordClaudeUsage(
  user: CurrentUser,
  purpose: "report" | "template",
  model: string,
  usage: ClaudeUsage,
  /** How long the model took, in milliseconds. */
  durationMs?: number,
) {
  const input =
    (usage.input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0);
  return record(
    () => db()`
      insert into usage_events (user_id, org_id, provider, purpose, model, input_tokens, output_tokens, duration_ms)
      values (${user.id}, ${user.org?.id ?? null}, 'claude', ${purpose}, ${model}, ${input}, ${usage.output_tokens ?? 0},
              ${durationMs === undefined ? null : Math.round(durationMs)})
    `,
  );
}

export function recordDictation(user: CurrentUser, seconds: number) {
  return record(
    () => db()`
      insert into usage_events (user_id, org_id, provider, purpose, model, seconds)
      values (${user.id}, ${user.org?.id ?? null}, 'deepgram', 'dictation', 'nova-3-medical', ${seconds})
    `,
  );
}

// US dollars per million tokens (input, output), from Anthropic's published
// prices. Update when prices or models change; unknown models are left uncosted.
const CLAUDE_PRICES: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-opus-5": [5, 25],
  "claude-opus-4-8": [5, 25],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};

export function claudeCost(model: string | null, input: number, output: number) {
  const price = model ? CLAUDE_PRICES[model] : undefined;
  return price ? (input * price[0] + output * price[1]) / 1_000_000 : null;
}

/** Deepgram cost, only when the per-minute rate of your plan is set in DEEPGRAM_USD_PER_MINUTE. */
export function deepgramCost(seconds: number) {
  const rate = Number(process.env.DEEPGRAM_USD_PER_MINUTE);
  return rate > 0 ? (seconds / 60) * rate : null;
}
