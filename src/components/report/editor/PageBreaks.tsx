"use client";

import type { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";

/** Screen pixels kept beside the sheet on each side, where the page labels sit. */
export const PAGE_MARGIN = 64;

/** A4 in millimetres, and the side margins the printed page keeps (see buildPrintHtml). */
export const A4 = { width: 210, height: 297, side: 18 };

/**
 * How many millimetres of report fit on one printed page: A4 less the
 * letterhead's header and footer (drawn full width) and the gaps the print
 * page keeps around the body. Image sizes are [width, height] in any unit.
 */
export function pageBodyHeight(header: [number, number] | null, footer: [number, number] | null) {
  const band = (size: [number, number] | null) => (size ? (A4.width * size[1]) / size[0] + 6 : 18);
  return A4.height - band(header) - band(footer);
}

/** The natural size of an image, once it has loaded; null for none or until then. */
export function useImageSize(src: string | null) {
  const [size, setSize] = useState<{ src: string; size: [number, number] } | null>(null);
  useEffect(() => {
    if (!src) return;
    const image = new Image();
    image.onload = () => setSize({ src, size: [image.naturalWidth, image.naturalHeight] });
    image.src = src;
  }, [src]);
  return src && size?.src === src ? size.size : null;
}

/**
 * Each printed line, top to bottom, as [top, bottom] in screen pixels: the
 * line boxes of every piece of text and every image on the sheet, leaving out
 * the page-break marks themselves.
 */
function lineBands(column: HTMLElement) {
  const rects: DOMRect[] = [];
  const walker = document.createTreeWalker(column, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) =>
      node instanceof HTMLElement && node.dataset.pageBreak !== undefined
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.textContent?.trim()) continue;
      range.selectNodeContents(node);
      rects.push(...range.getClientRects());
    } else if (node instanceof HTMLImageElement) {
      rects.push(node.getBoundingClientRect());
    }
  }
  rects.sort((a, b) => a.top - b.top);
  const bands: [number, number][] = [];
  for (const rect of rects) {
    if (rect.height <= 0) continue;
    const last = bands.at(-1);
    // Pieces of the same line overlap vertically; a new line starts below the last.
    if (last && rect.top < last[1] - 1) last[1] = Math.max(last[1], rect.bottom);
    else bands.push([rect.top, rect.bottom]);
  }
  return bands;
}

/**
 * Dashed lines across the report where a printed A4 page will end, worked out
 * from where the lines really sit. A line that would cross the bottom of a
 * page starts the next one, as print does with paragraphs allowed to split
 * at any line. Drawn over the sheet only: never part of the report, so never
 * copied or printed.
 */
export function PageBreaks({
  editor,
  column,
  heightMm,
}: {
  editor: Editor;
  /** The sheet holding the report, laid out at the printed text width. */
  column: HTMLElement | null;
  /** Report height per page, in millimetres. */
  heightMm: number;
}) {
  const [breaks, setBreaks] = useState<number[]>([]);

  useEffect(() => {
    if (!column) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = column.getBoundingClientRect();
        if (!column.offsetHeight) return;
        // Screen pixels per CSS pixel, so zoom does not move the lines.
        const scale = box.height / column.offsetHeight;
        // Millimetres in screen pixels, measured here so zoom and screen density are counted.
        const probe = document.createElement("div");
        probe.style.cssText = "position:absolute;visibility:hidden;height:100mm;width:0";
        column.appendChild(probe);
        const perMm = probe.getBoundingClientRect().height / 100;
        probe.remove();
        const page = heightMm * perMm;
        if (page <= 0) return;

        const found: number[] = [];
        let end = box.top + page;
        let above = box.top;
        for (const [top, bottom] of lineBands(column)) {
          // This line starts the next page; a line taller than a page cannot be helped.
          if (bottom > end + 0.5 && bottom - top < page) {
            // Drawn in the gap between this line and the one before, never over text.
            found.push(((above + top) / 2 - box.top) / scale);
            end = top + page;
          }
          above = bottom;
        }
        setBreaks((current) =>
          current.length === found.length && current.every((value, index) => Math.abs(value - found[index]) < 0.5)
            ? current
            : found,
        );
      });
    };

    measure();
    editor.on("update", measure);
    const observer = new ResizeObserver(measure);
    observer.observe(column);
    document.fonts?.ready.then(measure);
    return () => {
      cancelAnimationFrame(frame);
      editor.off("update", measure);
      observer.disconnect();
    };
  }, [editor, column, heightMm]);

  return (
    <>
      {breaks.map((top, index) => (
        <div
          key={index}
          aria-hidden="true"
          data-page-break=""
          className="pointer-events-none absolute -inset-x-3 h-0 border-t-[1.5px] border-dashed border-teal"
          style={{ top }}
        >
          {/* In the margin beside the sheet, so it never covers a word. */}
          <span className="absolute left-full top-0 ml-2 -translate-y-1/2 whitespace-nowrap rounded-full bg-teal px-2 py-0.5 font-sans text-[10px] font-bold text-white">
            Page {index + 2}
          </span>
        </div>
      ))}
    </>
  );
}
