"use client";

import { Popover } from "@base-ui/react/popover";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  Eraser,
  Highlighter,
  ListBullets,
  ListNumbers,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  Minus,
  Palette,
  Plus,
  TextAlignCenter,
  TextAlignJustify,
  TextAlignLeft,
  TextAlignRight,
  TextB,
  TextItalic,
  TextUnderline,
} from "@phosphor-icons/react";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { Color, FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useImperativeHandle, useSyncExternalStore } from "react";
import { Select } from "@/components/app/ui";
import type { DocNode, PatchPlan } from "@/lib/reportDoc";
import { PASTE_FONTS, type PasteProfile } from "@/lib/reportFormat";
import { ReportLines, applyPatchToEditor } from "./reportLines";
import "./editor.css";

export type ReportEditorHandle = {
  /** Writes a dictation into the document. */
  applyPatch: (plan: PatchPlan) => void;
  getDoc: () => DocNode;
};

const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24];
const TEXT_COLOURS = [
  { name: "Black", value: null, swatch: "#000000" },
  { name: "Red", value: "#b3261e", swatch: "#b3261e" },
  { name: "Blue", value: "#1a4fb5", swatch: "#1a4fb5" },
  { name: "Green", value: "#1b6e3c", swatch: "#1b6e3c" },
  { name: "Orange", value: "#a85400", swatch: "#a85400" },
  { name: "Purple", value: "#63399a", swatch: "#63399a" },
];
const HIGHLIGHTS = [
  { name: "No highlight", value: null, swatch: "#ffffff" },
  { name: "Yellow", value: "#fff3a3", swatch: "#fff3a3" },
  { name: "Green", value: "#c9f2c7", swatch: "#c9f2c7" },
  { name: "Pink", value: "#ffd1dc", swatch: "#ffd1dc" },
  { name: "Blue", value: "#cfe8ff", swatch: "#cfe8ff" },
];

// Zoom is a reading comfort setting, remembered on this computer only.
const ZOOM_KEY = "lumenai-report-zoom";
const ZOOM_STEPS = [80, 90, 100, 110, 120, 135, 150, 175];
const DEFAULT_ZOOM = 120;
const zoomListeners = new Set<() => void>();

function readZoom() {
  try {
    const stored = Number(localStorage.getItem(ZOOM_KEY));
    return ZOOM_STEPS.includes(stored) ? stored : DEFAULT_ZOOM;
  } catch {
    return DEFAULT_ZOOM;
  }
}

function writeZoom(value: number) {
  try {
    localStorage.setItem(ZOOM_KEY, String(value));
  } catch {
    // Not remembered next time; applies for this visit through the listeners.
  }
  zoomListeners.forEach((listener) => listener());
}

function useZoom() {
  return useSyncExternalStore(
    (listener) => {
      zoomListeners.add(listener);
      return () => zoomListeners.delete(listener);
    },
    readZoom,
    () => DEFAULT_ZOOM,
  );
}

function ToolButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keeps the selection in the report while the button is pressed.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors disabled:opacity-35 [&>svg]:h-5 [&>svg]:w-5 ${
        active ? "bg-ink text-surface" : "text-ink hover:bg-ink/[0.1]"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-0.5 h-6 w-px shrink-0 bg-ink/30" />;
}

function SwatchMenu({
  label,
  icon,
  options,
  current,
  onPick,
}: {
  label: string;
  icon: React.ReactNode;
  options: { name: string; value: string | null; swatch: string }[];
  current: string | null;
  onPick: (value: string | null) => void;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        title={label}
        aria-label={label}
        onMouseDown={(event) => event.preventDefault()}
        className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.1] data-[popup-open]:bg-ink/[0.1] [&>svg]:h-5 [&>svg]:w-5"
      >
        {icon}
        <span
          aria-hidden="true"
          className="absolute bottom-1.5 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full border border-ink/40"
          style={{ backgroundColor: current ?? options[0].swatch }}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} className="z-50">
          <Popover.Popup className="app-layer rounded-2xl border border-ink/25 bg-surface p-2.5 shadow-[0_18px_50px_-18px_rgb(6_17_15/0.55)] outline-none">
            <div className="flex gap-1.5">
              {options.map((option) => (
                <Popover.Close
                  key={option.name}
                  title={option.name}
                  aria-label={option.name}
                  onClick={() => onPick(option.value)}
                  className={`h-9 w-9 rounded-full border-2 transition-transform hover:scale-110 ${
                    (current ?? null) === option.value ? "border-ink" : "border-ink/30"
                  }`}
                  style={{ backgroundColor: option.swatch }}
                />
              ))}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Runs a formatting command on the selection, or on the whole report when nothing is selected. */
function onSelectionOrAll(editor: Editor, run: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) {
  const { from, to, empty } = editor.state.selection;
  if (!empty) {
    run(editor.chain().focus()).run();
    return;
  }
  run(editor.chain().focus().selectAll()).setTextSelection({ from, to }).run();
}

function Toolbar({ editor, profile, flat = false }: { editor: Editor; profile: PasteProfile; flat?: boolean }) {
  const zoom = useZoom();
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const style = current.getAttributes("textStyle");
      return {
        canUndo: current.can().undo(),
        canRedo: current.can().redo(),
        bold: current.isActive("bold"),
        italic: current.isActive("italic"),
        underline: current.isActive("underline"),
        bullets: current.isActive("bulletList"),
        numbers: current.isActive("orderedList"),
        align:
          ["center", "right", "justify"].find((value) => current.isActive({ textAlign: value })) ?? "left",
        font: (style.fontFamily as string | undefined) ?? profile.font,
        size: parseInt((style.fontSize as string | undefined) ?? "", 10) || profile.size,
        colour: (style.color as string | undefined) ?? null,
        highlight: (current.getAttributes("highlight").color as string | undefined) ?? null,
      };
    },
  });

  const step = (direction: 1 | -1) => {
    const index = SIZES.findIndex((size) => size >= state.size);
    const next = SIZES[Math.min(Math.max((index === -1 ? SIZES.length - 1 : index) + direction, 0), SIZES.length - 1)];
    onSelectionOrAll(editor, (chain) => chain.setFontSize(`${next}pt`));
  };
  const zoomStep = (direction: 1 | -1) => {
    const index = ZOOM_STEPS.indexOf(zoom);
    writeZoom(ZOOM_STEPS[Math.min(Math.max(index + direction, 0), ZOOM_STEPS.length - 1)]);
  };

  return (
    <div
      role="toolbar"
      aria-label="Report formatting"
      // Flat (inside a card): always one row, scrolling sideways on a narrow
      // screen, so the report below never jumps when the window is resized.
      className={`flex items-center gap-0.5 ${
        flat
          ? "flex-nowrap overflow-x-auto [scrollbar-width:thin]"
          : "flex-wrap rounded-[1.75rem] border border-ink/30 bg-surface px-2 py-1.5"
      }`}
    >
      <ToolButton label="Undo" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}>
        <ArrowCounterClockwise weight="bold" />
      </ToolButton>
      <ToolButton label="Redo" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}>
        <ArrowClockwise weight="bold" />
      </ToolButton>
      <Divider />

      <Select
        aria-label="Font"
        value={state.font}
        onChange={(event) => onSelectionOrAll(editor, (chain) => chain.setFontFamily(event.target.value))}
        className="!h-10 min-w-[8rem]"
      >
        {PASTE_FONTS.map((font) => (
          <option key={font}>{font}</option>
        ))}
      </Select>
      <ToolButton label="Smaller text" disabled={state.size <= SIZES[0]} onClick={() => step(-1)}>
        <Minus weight="bold" />
      </ToolButton>
      <span
        aria-label={`Text size ${state.size} points`}
        className="grid h-10 min-w-9 place-items-center text-[0.98rem] font-bold tabular-nums"
      >
        {state.size}
      </span>
      <ToolButton label="Larger text" disabled={state.size >= SIZES[SIZES.length - 1]} onClick={() => step(1)}>
        <Plus weight="bold" />
      </ToolButton>
      <Divider />

      <ToolButton label="Bold" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <TextB weight="bold" />
      </ToolButton>
      <ToolButton label="Italic" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <TextItalic weight="bold" />
      </ToolButton>
      <ToolButton
        label="Underline"
        active={state.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <TextUnderline weight="bold" />
      </ToolButton>
      <SwatchMenu
        label="Text colour"
        icon={<Palette weight="bold" />}
        options={TEXT_COLOURS}
        current={state.colour}
        onPick={(value) =>
          value ? editor.chain().focus().setColor(value).run() : editor.chain().focus().unsetColor().run()
        }
      />
      <SwatchMenu
        label="Highlight"
        icon={<Highlighter weight="bold" />}
        options={HIGHLIGHTS}
        current={state.highlight}
        onPick={(value) =>
          value
            ? editor.chain().focus().setHighlight({ color: value }).run()
            : editor.chain().focus().unsetHighlight().run()
        }
      />
      <Divider />

      {(
        [
          ["left", "Align left", <TextAlignLeft key="l" weight="bold" />],
          ["center", "Centre", <TextAlignCenter key="c" weight="bold" />],
          ["right", "Align right", <TextAlignRight key="r" weight="bold" />],
          ["justify", "Justify", <TextAlignJustify key="j" weight="bold" />],
        ] as const
      ).map(([value, label, icon]) => (
        <ToolButton
          key={value}
          label={label}
          active={state.align === value}
          onClick={() => editor.chain().focus().setTextAlign(value).run()}
        >
          {icon}
        </ToolButton>
      ))}
      <Divider />

      <ToolButton
        label="Bullet list"
        active={state.bullets}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <ListBullets weight="bold" />
      </ToolButton>
      <ToolButton
        label="Numbered list"
        active={state.numbers}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListNumbers weight="bold" />
      </ToolButton>
      <ToolButton
        label="Remove formatting"
        onClick={() => editor.chain().focus().unsetAllMarks().unsetTextAlign().run()}
      >
        <Eraser weight="bold" />
      </ToolButton>
      <Divider />

      <ToolButton label="Zoom out" disabled={zoom <= ZOOM_STEPS[0]} onClick={() => zoomStep(-1)}>
        <MagnifyingGlassMinus weight="bold" />
      </ToolButton>
      <span
        aria-label={`Zoom ${zoom} percent`}
        className="grid h-10 min-w-12 place-items-center text-[0.95rem] font-bold tabular-nums"
      >
        {zoom}%
      </span>
      <ToolButton
        label="Zoom in"
        disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
        onClick={() => zoomStep(1)}
      >
        <MagnifyingGlassPlus weight="bold" />
      </ToolButton>
    </div>
  );
}

/**
 * The report as an editable document with a formatting toolbar. Dictation
 * updates are written in through the handle; everything typed or formatted is
 * reported through `onChange`.
 */
export function ReportEditor({
  ref,
  initialDoc,
  profile,
  onChange,
  variant = "card",
  overlay,
  footer,
}: {
  ref?: React.Ref<ReportEditorHandle>;
  initialDoc: DocNode;
  profile: PasteProfile;
  onChange?: (doc: DocNode) => void;
  /** Drawn alongside the editor once it exists, such as the Speak button at the cursor. */
  overlay?: (editor: Editor) => React.ReactNode;
  /** Shown under the report on the same sheet and not editable, such as the sign-off. */
  footer?: React.ReactNode;
  /**
   * "card": the editor draws its own toolbar pill and sheet.
   * "embedded": it fills a card someone else drew; the toolbar is a flat strip
   * and the report scrolls underneath it.
   */
  variant?: "card" | "embedded";
}) {
  const zoom = useZoom();
  const editor = useEditor({
    // The page is rendered on the server first; the editor starts in the browser.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
        strike: false,
      }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      ReportLines,
    ],
    content: initialDoc,
    editorProps: {
      attributes: { class: "report-doc", "aria-label": "Report", spellcheck: "true" },
    },
    onUpdate: ({ editor: current }) => onChange?.(current.getJSON() as DocNode),
  });

  useImperativeHandle(
    ref,
    () => ({
      applyPatch: (plan) => {
        if (editor) applyPatchToEditor(editor, plan);
      },
      getDoc: () => (editor?.getJSON() as DocNode | undefined) ?? initialDoc,
    }),
    [editor, initialDoc],
  );

  if (variant === "embedded") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {editor && (
          <div className="shrink-0 border-b border-line bg-ink/[0.025] px-3 py-1.5">
            <Toolbar editor={editor} profile={profile} flat />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-9">
          <div
            className="mx-auto max-w-[46rem]"
            style={{ fontFamily: `'${profile.font}', Arial, sans-serif`, fontSize: `${profile.size}pt`, zoom: zoom / 100 }}
          >
            <EditorContent editor={editor} />
            {footer}
          </div>
        </div>
        {editor && overlay?.(editor)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {editor && (
        <div className="sticky top-0 z-10">
          <Toolbar editor={editor} profile={profile} />
        </div>
      )}
      <div
        className="rounded-3xl border border-ink/25 bg-surface px-5 py-7 shadow-[0_1px_2px_rgb(15_38_36/0.06)] sm:px-9 sm:py-9"
        style={{ fontFamily: `'${profile.font}', Arial, sans-serif`, fontSize: `${profile.size}pt`, zoom: zoom / 100 }}
      >
        <EditorContent editor={editor} />
        {footer}
      </div>
      {editor && overlay?.(editor)}
    </div>
  );
}
