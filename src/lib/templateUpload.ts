import { generateJSON } from "@tiptap/core";
import JSZip from "jszip";
import mammoth from "mammoth";
import { EDITOR_EXTENSIONS } from "@/components/report/editor/extensions";
import type { DocNode } from "./reportDoc";
import { readTemplate } from "./templateDoc";

/** One Word file read from an upload, ready to become a template or with the reason it cannot. */
export type UploadedTemplate = {
  key: string;
  file: string;
  name: string;
  doc: DocNode | null;
  error: string;
  /** Read fine, but has no IMPRESSION section. */
  noImpression?: boolean;
};

export const UPLOAD_LIMITS = { files: 100, fileBytes: 10 * 1024 * 1024, zipBytes: 50 * 1024 * 1024 };

const extension = (file: string) => file.split(".").pop()?.toLowerCase() ?? "";
const baseName = (path: string) => path.split("/").pop() ?? path;
// "CT Brain (Plain).docx" → "CT Brain (Plain)".
const nameOf = (file: string) =>
  baseName(file).replace(/\.[^.]+$/, "").replace(/\s+/g, " ").trim().slice(0, 120);

let count = 0;
const entry = (file: string, doc: DocNode | null, error: string): UploadedTemplate => ({
  key: `${Date.now()}-${count++}`,
  file: baseName(file),
  name: nameOf(file),
  doc,
  error,
});

/** A document's HTML as the template editor would hold it, as if it was pasted in. */
function fromHtml(file: string, html: string): UploadedTemplate {
  const doc = generateJSON(html, EDITOR_EXTENSIONS) as DocNode;
  if (JSON.stringify(doc).length > 300_000) return entry(file, null, "This document is too long for a template.");
  const read = readTemplate(doc, nameOf(file) || "Template");
  if (typeof read === "string") return entry(file, doc, read);
  return { ...entry(file, doc, ""), noImpression: read.draft.noImpression === true };
}

async function readWord(file: string, data: ArrayBuffer): Promise<UploadedTemplate> {
  try {
    const { value } = await mammoth.convertToHtml(
      { arrayBuffer: data },
      // Pictures, such as a letterhead logo, are not part of a template.
      { ignoreEmptyParagraphs: false, convertImage: mammoth.images.imgElement(async () => ({ src: "" })) },
    );
    return fromHtml(file, value.replace(/<img[^>]*>/g, ""));
  } catch {
    return entry(file, null, "This file could not be read. Open it in Word and save it again as .docx.");
  }
}

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * A PDF's text, line by line. A PDF keeps only where each piece of text sits,
 * so lines are rebuilt from their height on the page; a whole line in a bold
 * font stays bold, and a wide gap becomes a blank line.
 */
async function readPdf(file: string, data: ArrayBuffer): Promise<UploadedTemplate> {
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
    const paragraphs: string[] = [];
    for (let number = 1; number <= Math.min(pdf.numPages, 20); number++) {
      const page = await pdf.getPage(number);
      // Loads the fonts, so whether each is bold can be read.
      await page.getOperatorList();
      const content = await page.getTextContent();
      const bold = (fontName: string) => {
        try {
          const font = page.commonObjs.get(fontName);
          return Boolean(font?.bold || font?.black) || /bold|black|heavy/i.test(font?.name ?? "");
        } catch {
          return false;
        }
      };
      type Piece = { text: string; x: number; y: number; size: number; bold: boolean };
      const pieces: Piece[] = [];
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        pieces.push({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          size: Math.abs(item.transform[3]) || 10,
          bold: bold(item.fontName),
        });
      }
      // Top of the page first; pieces within half a line of each other share a line.
      pieces.sort((a, b) => b.y - a.y || a.x - b.x);
      const lines: Piece[][] = [];
      for (const piece of pieces) {
        const line = lines.at(-1);
        if (line && Math.abs(line[0].y - piece.y) < piece.size * 0.5) line.push(piece);
        else lines.push([piece]);
      }
      let lastY: number | null = null;
      for (const line of lines) {
        line.sort((a, b) => a.x - b.x);
        const size = line[0].size;
        if (lastY !== null && lastY - line[0].y > size * 2.1) paragraphs.push("<p></p>");
        lastY = line[0].y;
        const text = escape(line.map((piece) => piece.text).join(" ").replace(/\s+/g, " ").trim());
        paragraphs.push(line.every((piece) => piece.bold) ? `<p><strong>${text}</strong></p>` : `<p>${text}</p>`);
      }
    }
    if (paragraphs.length === 0) {
      return entry(file, null, "This PDF has no text to read, such as a scanned page. Upload the Word file instead.");
    }
    return fromHtml(file, paragraphs.join(""));
  } catch {
    return entry(file, null, "This PDF could not be read. It may be locked with a password.");
  }
}

const OLD_WORD = "Old Word format (.doc). Open it in Word and save it as .docx.";

/**
 * Reads the chosen files: Word documents (.docx) and PDFs, on their own or
 * inside ZIP files. Each document becomes one template, named after the file.
 */
export async function readUploads(files: File[]): Promise<{ templates: UploadedTemplate[]; skipped: number }> {
  const templates: UploadedTemplate[] = [];
  let skipped = 0;
  const add = async (file: string, size: number, data: () => Promise<ArrayBuffer>) => {
    if (templates.length >= UPLOAD_LIMITS.files) return void skipped++;
    const kind = extension(file);
    if (kind === "doc") return void templates.push(entry(file, null, OLD_WORD));
    if (kind !== "docx" && kind !== "pdf") return void skipped++;
    if (size > UPLOAD_LIMITS.fileBytes) return void templates.push(entry(file, null, "This file is larger than 10 MB."));
    templates.push(await (kind === "pdf" ? readPdf : readWord)(file, await data()));
  };

  for (const file of files) {
    if (extension(file.name) !== "zip") {
      await add(file.name, file.size, () => file.arrayBuffer());
      continue;
    }
    if (file.size > UPLOAD_LIMITS.zipBytes) {
      templates.push(entry(file.name, null, "This ZIP file is larger than 50 MB."));
      continue;
    }
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(file);
    } catch {
      templates.push(entry(file.name, null, "This ZIP file could not be opened."));
      continue;
    }
    const inside = Object.values(zip.files)
      // Folders, Mac copies (__MACOSX, ._file) and Word's lock files (~$file) are not templates.
      .filter((item) => !item.dir && !/(^|\/)(__MACOSX\/|\._|~\$)/.test(item.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    for (const item of inside) {
      if (!["doc", "docx", "pdf"].includes(extension(item.name))) {
        skipped++;
        continue;
      }
      // The real size is only known once unpacked; checked by add.
      const data = await item.async("arraybuffer");
      await add(item.name, data.byteLength, async () => data);
    }
  }
  return { templates, skipped };
}
