import Link from "next/link";

const PAGES = [
  {
    href: "/report",
    title: "Report",
    description: "Dictate positive findings and get a PACS-ready report.",
  },
  {
    href: "/dictate",
    title: "Dictation test",
    description: "Check speech recognition accuracy on radiology dictation.",
  },
  {
    href: "/paste-test",
    title: "PACS paste test",
    description: "Check that a copied report keeps its formatting in the PACS editor.",
  },
];

export default function ToolsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">LumenAI</h1>
      <ul className="flex flex-col gap-3">
        {PAGES.map((page) => (
          <li key={page.href}>
            <Link
              href={page.href}
              className="block rounded border border-ink/25 p-4 hover:border-teal"
            >
              <span className="font-medium">{page.title}</span>
              <span className="block text-sm text-ink-soft">
                {page.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
