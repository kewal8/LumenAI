import { ConceptFuture } from "@/components/concept/ConceptFuture";
import { requireUser } from "@/lib/auth/session";

// Signed-in only, and rendered on demand like the other app screens: the
// editor inside it cannot be built ahead of time.
export const instant = false;

export const metadata = { title: "Concept Future · LumenAI" };

// "Concept Future": a design study for the report screen. Report on the left
// with the real editor and toolbar, dictation as a conversation panel on the
// right. Made-up content and no working microphone. Keep it or delete this
// page and components/concept.
export default async function ConceptFuturePage() {
  await requireUser();
  return <ConceptFuture />;
}
