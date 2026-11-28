import Link from "next/link";
import { EditorPreview } from "@/components/report/editor/EditorPreview";
import { openPreviewLink } from "@/lib/previewLinks";
import { LogoMark } from "@/components/brand/Logo";

// Checks the link against the database on every visit.
export const instant = false;

export const metadata = {
  title: "Editor preview · Radmatic",
  robots: { index: false, follow: false },
};

// The editor preview for someone without an account, reached by a link that
// staff create and can turn off. It uses a made-up report and saves nothing.
export default async function SharedEditorPreviewPage({ params }: PageProps<"/preview/editor/[token]">) {
  const label = await openPreviewLink((await params).token);

  if (!label) {
    return (
      <div className="app grid min-h-dvh place-items-center px-6">
        <main className="max-w-md text-center">
          <h1 className="text-[1.6rem] font-semibold tracking-[-0.03em]">This link is no longer active</h1>
          <p className="mt-3 text-ink-soft">
            It has expired or was turned off. Ask the person who sent it for a new one.
          </p>
          <Link href="/" className="mt-6 inline-block font-semibold underline underline-offset-4">
            Go to Radmatic
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="app flex min-h-dvh flex-col">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line bg-surface px-5 py-3 sm:px-8 lg:px-10">
        <p className="text-[1.15rem] font-bold tracking-[-0.03em]">
          <LogoMark className="h-6 w-auto" />
        </p>
        <p className="font-semibold text-ink-soft">Editor preview for {label}</p>
        <p className="ml-auto text-[0.9rem] font-semibold text-ink-soft">
          Sample report only. Please do not type patient details.
        </p>
      </header>
      <EditorPreview />
    </div>
  );
}
