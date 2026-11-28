import { EditorPreview } from "@/components/report/editor/EditorPreview";

export const metadata = { title: "Editor preview · Radmatic" };

// A test bench for the report editor while it is built apart from the report
// screen. Not linked from the menu; remove once the editor is wired in.
export default function EditorPreviewPage() {
  return <EditorPreview />;
}
