"use client";

import {
  ArrowLeft,
  CaretRight,
  ChartLineUp,
  Checks,
  Copy,
  DotsThree,
  DownloadSimple,
  FileDashed,
  FileText,
  Files,
  Gift,
  Keyboard,
  Lightning,
  MagnifyingGlass,
  Microphone,
  PaperPlaneTilt,
  Plus,
  SealCheck,
  Signature,
  SignOut,
  Sparkle,
  TextB,
  TextItalic,
  TextUnderline,
  Trash,
  UserCircle,
  UsersThree,
  CreditCard,
  ClipboardText,
  ListBullets,
  X,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";

/*
 * A clickable design study of LumenAI as a phone app: the app shell (screen
 * title, back arrow, tab bar with New in the middle), list rows you can swipe,
 * two report screens to compare, and settings as a list. Made-up data only.
 */

type Tab = "reports" | "templates" | "insights" | "me";
type Variant = "dictate" | "editor";
type Route = { kind: "tabs" } | { kind: "report"; title: string } | { kind: "setting"; name: string };

const REPORTS = [
  { id: 1, title: "R. Sharma", meta: "42 M · CT Brain (Plain)", status: "Draft", when: "10:42 am" },
  { id: 2, title: "Report · 25 Nov, 1:00 am", meta: "USG Abdomen", status: "Final", when: "1:12 am" },
  { id: 3, title: "A. Iyer", meta: "61 F · MRI Lumbar Spine", status: "Final", when: "Yesterday" },
  { id: 4, title: "K. Rao", meta: "35 M · CT KUB (Plain)", status: "Final", when: "Yesterday" },
  { id: 5, title: "Report · 23 Nov, 9:15 pm", meta: "HRCT Chest", status: "Draft", when: "23 Nov" },
  { id: 6, title: "S. Menon", meta: "29 F · USG Pelvis", status: "Final", when: "22 Nov" },
  { id: 7, title: "P. Nair", meta: "54 M · MDCT Brain (Trauma)", status: "Final", when: "21 Nov" },
];

const TEMPLATES = [
  { name: "CT Brain (Plain)", modality: "CT" },
  { name: "MDCT Brain (Trauma)", modality: "CT" },
  { name: "CT KUB (Plain)", modality: "CT" },
  { name: "USG Abdomen", modality: "US" },
  { name: "MRI Lumbar Spine", modality: "MRI" },
  { name: "HRCT Chest", modality: "CT" },
];

const REPORT_LINES = [
  { heading: "TECHNIQUE", lines: ["Axial sections of the brain were obtained without intravenous contrast."] },
  {
    heading: "FINDINGS",
    lines: [
      "Acute subdural haemorrhage is noted along the right frontoparietal convexity, measuring 10 mm in maximum thickness.",
      "Midline shift of 5 mm to the left is noted.",
      "Ventricular system, sulci and basal cisterns are normal.",
      "Brainstem and cerebellum are normal.",
      "Calvarium and skull base are intact. No fracture.",
      "Visualised paranasal sinuses and mastoid air cells are clear.",
    ],
  },
  {
    heading: "IMPRESSION",
    lines: ["Acute right frontoparietal subdural haemorrhage with 5 mm leftward midline shift.", "Clinical correlation is advised."],
  },
];
// Lines the AI just wrote, still waiting for review (amber on screen).
const PENDING = new Set([REPORT_LINES[1].lines[0], REPORT_LINES[1].lines[1], REPORT_LINES[2].lines[0]]);

// ——— Shared pieces ———

function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[0.72rem] font-bold ${
        status === "Final" ? "bg-teal/[0.12] text-teal-deep" : "bg-amber-tint text-amber-deep"
      }`}
    >
      {status}
    </span>
  );
}

/** Top bar: the screen's name, a back arrow on inner screens, and actions on the right. */
function TopBar({
  title,
  small,
  onBack,
  right,
}: {
  title: string;
  /** The large title has scrolled away, so the name shows here. */
  small: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-1 border-b border-transparent bg-canvas/90 px-2 backdrop-blur-xl data-[small=true]:border-line" data-small={small}>
      {onBack ? (
        <button type="button" onClick={onBack} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full text-ink active:bg-ink/10">
          <ArrowLeft weight="bold" className="h-5 w-5" />
        </button>
      ) : (
        <span className="w-10" />
      )}
      <p className={`min-w-0 flex-1 truncate text-center text-[1rem] font-semibold transition-opacity ${small || onBack ? "opacity-100" : "opacity-0"}`}>
        {title}
      </p>
      <span className="flex w-10 justify-end">{right}</span>
    </div>
  );
}

/** A scrolling screen with a large title that hands over to the top bar as it scrolls away. */
function Scroller({
  title,
  onBack,
  right,
  children,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [small, setSmall] = useState(false);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title={title} small={small} onBack={onBack} right={right} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6" onScroll={(event) => setSmall(event.currentTarget.scrollTop > 36)}>
        {!onBack && <h1 className="px-4 pb-3 pt-1 text-[2rem] font-bold leading-tight tracking-[-0.03em]">{title}</h1>}
        {children}
      </div>
    </div>
  );
}

function SearchBar({ placeholder }: { placeholder: string }) {
  return (
    <label className="mx-4 flex h-11 items-center gap-2 rounded-xl bg-ink/[0.07] px-3 text-ink-soft">
      <MagnifyingGlass weight="bold" className="h-[18px] w-[18px] shrink-0" />
      <input placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-[1rem] text-ink outline-none placeholder:text-ink-quiet" />
    </label>
  );
}

/** One row of filters that scrolls sideways, instead of dropdowns that wrap. */
function Chips({ items }: { items: string[] }) {
  const [on, setOn] = useState(items[0]);
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setOn(item)}
          className={`h-9 shrink-0 rounded-full px-3.5 text-[0.9rem] font-semibold ${on === item ? "bg-ink text-surface" : "bg-ink/[0.07] text-ink"}`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

/** A list row: the whole row opens it; swiping left shows Download and Delete. */
function SwipeRow({ children, onOpen }: { children: React.ReactNode; onOpen: () => void }) {
  const [x, setX] = useState(0);
  const start = useRef<{ x: number; base: number; moved: boolean } | null>(null);
  const SHOWN = -148;
  return (
    <li className="group/row relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex">
        <button type="button" className="grid w-[74px] place-items-center bg-teal text-white" aria-label="Download PDF">
          <span className="flex flex-col items-center gap-1 text-[0.75rem] font-semibold">
            <DownloadSimple weight="bold" className="h-5 w-5" />
            PDF
          </span>
        </button>
        <button type="button" className="grid w-[74px] place-items-center bg-flag text-white" aria-label="Delete">
          <span className="flex flex-col items-center gap-1 text-[0.75rem] font-semibold">
            <Trash weight="bold" className="h-5 w-5" />
            Delete
          </span>
        </button>
      </div>
      <button
        type="button"
        onPointerDown={(event) => (start.current = { x: event.clientX, base: x, moved: false })}
        onPointerMove={(event) => {
          if (!start.current) return;
          const dx = event.clientX - start.current.x;
          if (Math.abs(dx) > 6) start.current.moved = true;
          setX(Math.max(SHOWN, Math.min(0, start.current.base + dx)));
        }}
        onPointerUp={() => {
          const moved = start.current?.moved;
          start.current = null;
          setX((current) => (current < SHOWN / 2 ? SHOWN : 0));
          if (!moved && x === 0) onOpen();
          if (!moved && x !== 0) setX(0);
        }}
        onPointerLeave={() => {
          if (start.current) {
            start.current = null;
            setX((current) => (current < SHOWN / 2 ? SHOWN : 0));
          }
        }}
        style={{ transform: `translateX(${x}px)`, touchAction: "pan-y" }}
        // The divider is drawn on the row itself, so the actions behind never show through it.
        className="relative flex w-full items-center gap-3 bg-surface px-4 py-3 text-left shadow-[inset_0_-1px_0_var(--c-line)] transition-transform duration-150 group-last/row:shadow-none active:bg-ink/[0.03]"
      >
        {children}
      </button>
    </li>
  );
}

// ——— Tabs ———

function ReportsTab({ open }: { open: (title: string) => void }) {
  return (
    <Scroller
      title="Reports"
      right={
        <button type="button" aria-label="More" className="grid h-10 w-10 place-items-center rounded-full text-ink">
          <DotsThree weight="bold" className="h-6 w-6" />
        </button>
      }
    >
      <SearchBar placeholder="Patient, study or a word" />
      <Chips items={["All", "Drafts", "Final", "Today", "CT", "MRI", "USG"]} />
      <p className="mt-4 px-4 pb-2 text-[0.8rem] font-bold uppercase tracking-[0.06em] text-ink-quiet">Today</p>
      <ul className="bg-surface">
        {REPORTS.map((report, index) => (
          <SwipeRow key={report.id} onOpen={() => open(report.title)}>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-[1.02rem] font-semibold">{report.title}</span>
                <StatusChip status={report.status} />
              </span>
              <span className="mt-0.5 block truncate text-[0.9rem] text-ink-soft">{report.meta}</span>
            </span>
            <span className="shrink-0 text-[0.82rem] text-ink-quiet">{report.when}</span>
            <CaretRight weight="bold" className="h-4 w-4 shrink-0 text-ink-quiet" />
            {index === 1 && <span className="sr-only">Swipe left for Download and Delete</span>}
          </SwipeRow>
        ))}
      </ul>
      <p className="px-4 pt-4 text-center text-[0.85rem] text-ink-quiet">Swipe a report left for PDF and Delete.</p>
    </Scroller>
  );
}

function TemplatesTab({ open }: { open: (title: string) => void }) {
  return (
    <Scroller
      title="Templates"
      right={
        <button type="button" aria-label="New template" className="grid h-10 w-10 place-items-center rounded-full text-teal-deep">
          <Plus weight="bold" className="h-6 w-6" />
        </button>
      }
    >
      <SearchBar placeholder="Name or modality" />
      <Chips items={["All", "Mine", "Shared", "CT", "MRI", "USG", "X-ray"]} />
      <ul className="mt-3 bg-surface">
        {TEMPLATES.map((template) => (
          <SwipeRow key={template.name} onOpen={() => open(`New · ${template.name}`)}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal/[0.12] text-teal-deep">
              <FileText weight="fill" className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[1.02rem] font-semibold">{template.name}</span>
              <span className="block text-[0.9rem] text-ink-soft">{template.modality}</span>
            </span>
            <CaretRight weight="bold" className="h-4 w-4 shrink-0 text-ink-quiet" />
          </SwipeRow>
        ))}
      </ul>
    </Scroller>
  );
}

function InsightsTab() {
  const bars = [3, 6, 4, 8, 0, 5, 9, 7, 4, 6, 10, 8, 5, 7];
  return (
    <Scroller title="Insights">
      <section className="on-night mx-4 overflow-hidden rounded-3xl bg-night p-5 text-on-night">
        <p className="text-[0.9rem] font-semibold text-on-night-soft">Reports finalized, last 30 days</p>
        <p className="mt-1 text-[3rem] font-semibold leading-none tracking-[-0.05em]">128</p>
        <p className="mt-2 inline-flex rounded-full bg-teal-glow/20 px-2.5 py-1 text-[0.8rem] font-bold text-teal-glow">↗ 14% more than before</p>
        <div className="mt-5 flex h-24 items-end gap-[3px]">
          {bars.map((bar, index) => (
            <span
              key={index}
              className={`flex-1 rounded-t-[3px] ${index === bars.length - 1 ? "bg-amber" : "bg-teal-glow"}`}
              style={{ height: `${Math.max(bar * 10, 3)}%` }}
            />
          ))}
        </div>
      </section>
      <ul className="mx-4 mt-4 divide-y divide-line overflow-hidden rounded-2xl bg-surface">
        {[
          ["Typical time, normal study", "52 s"],
          ["Normal studies", "41%"],
          ["AI updates left today", "64 of 100"],
        ].map(([label, value]) => (
          <li key={label} className="flex items-center justify-between px-4 py-3.5">
            <span className="text-[0.98rem]">{label}</span>
            <span className="font-semibold">{value}</span>
          </li>
        ))}
      </ul>
    </Scroller>
  );
}

/** Settings as a list: each row opens its own screen, like a phone's Settings app. */
function MeTab({ open }: { open: (name: string) => void }) {
  const groups: { title: string; rows: { icon: typeof UserCircle; label: string; tone: string }[] }[] = [
    {
      title: "Reporting",
      rows: [
        { icon: Signature, label: "Signature", tone: "bg-teal/[0.12] text-teal-deep" },
        { icon: FileText, label: "Letterhead", tone: "bg-teal/[0.12] text-teal-deep" },
        { icon: ClipboardText, label: "Paste format", tone: "bg-teal/[0.12] text-teal-deep" },
        { icon: Microphone, label: "Dictation", tone: "bg-teal/[0.12] text-teal-deep" },
        { icon: Lightning, label: "Macros", tone: "bg-amber-tint text-amber-deep" },
        { icon: Keyboard, label: "Shortcuts", tone: "bg-ink/[0.07] text-ink" },
      ],
    },
    {
      title: "Practice",
      rows: [
        { icon: UsersThree, label: "Team", tone: "bg-teal/[0.12] text-teal-deep" },
        { icon: CreditCard, label: "Plans", tone: "bg-teal/[0.12] text-teal-deep" },
        { icon: Gift, label: "Referrals", tone: "bg-amber-tint text-amber-deep" },
      ],
    },
  ];
  return (
    <Scroller title="Me">
      <button type="button" onClick={() => open("Profile")} className="mx-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl bg-surface p-4 text-left">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-teal text-[1.1rem] font-bold text-white">AR</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[1.1rem] font-semibold">Dr. Anita Rao</span>
          <span className="block truncate text-[0.9rem] text-ink-soft">Pro plan · 64 AI updates left today</span>
        </span>
        <CaretRight weight="bold" className="h-4 w-4 shrink-0 text-ink-quiet" />
      </button>
      {groups.map((group) => (
        <section key={group.title} className="mt-5">
          <h2 className="px-8 pb-1.5 text-[0.8rem] font-bold uppercase tracking-[0.06em] text-ink-quiet">{group.title}</h2>
          <ul className="mx-4 overflow-hidden rounded-2xl bg-surface">
            {group.rows.map(({ icon: Icon, label, tone }) => (
              <li key={label} className="border-b border-line last:border-b-0">
                <button type="button" onClick={() => open(label)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-ink/[0.04]">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone}`}>
                    <Icon weight="fill" className="h-[18px] w-[18px]" />
                  </span>
                  <span className="flex-1 text-[1rem]">{label}</span>
                  <CaretRight weight="bold" className="h-4 w-4 text-ink-quiet" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <button type="button" className="mx-4 mt-5 flex w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-2xl bg-surface py-3.5 font-semibold text-flag">
        <SignOut weight="bold" className="h-5 w-5" />
        Sign out
      </button>
    </Scroller>
  );
}

function SettingScreen({ name, back }: { name: string; back: () => void }) {
  return (
    <Scroller title={name} onBack={back}>
      <div className="mx-4 mt-3 rounded-2xl bg-surface p-4">
        <p className="text-[0.95rem] text-ink-soft">
          {name} opens as its own screen, full width, with a back arrow. The same fields as on the computer, one per row.
        </p>
      </div>
    </Scroller>
  );
}

// ——— Report screens ———

/** The bottom sheet that rises from the bottom; swipe or tap the handle to close. */
function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <>
      <div onClick={onClose} className={`absolute inset-0 z-30 bg-[#06110f]/40 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} />
      <div
        // Closed, it cannot take focus, so Tab never scrolls the phone to it.
        inert={!open}
        className={`absolute inset-x-0 bottom-0 z-40 max-h-[82%] rounded-t-[1.6rem] bg-surface pb-6 shadow-[0_-18px_40px_-20px_rgb(6_17_15/0.5)] transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <button type="button" onClick={onClose} aria-label="Close" className="mx-auto mt-2.5 block h-1.5 w-10 rounded-full bg-ink/20" />
        <div className="flex items-center justify-between px-5 pt-3">
          <h3 className="text-[1.1rem] font-semibold">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-ink/[0.07]">
            <X weight="bold" className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 pt-3">{children}</div>
      </div>
    </>
  );
}

/** The report as a readable page on a phone: text at phone size, amber for lines waiting for review. */
function ReportBody({ onLine }: { onLine?: (line: string) => void }) {
  return (
    <article className="px-5 pb-6 pt-2 font-[Arial,sans-serif] text-[1rem] leading-relaxed text-ink">
      <p className="text-center text-[1.05rem] font-bold">CT BRAIN (PLAIN)</p>
      {REPORT_LINES.map((section) => (
        <section key={section.heading} className="mt-3">
          <p className="font-bold">{section.heading}:</p>
          {section.lines.map((line) => (
            <p
              key={line}
              onClick={() => onLine?.(line)}
              className={`-mx-2 rounded-lg px-2 py-0.5 ${onLine ? "cursor-text active:bg-ink/[0.05]" : ""} ${
                PENDING.has(line) ? "bg-amber/15 shadow-[inset_3px_0_0_var(--c-amber)]" : ""
              }`}
            >
              {PENDING.has(line) ? <strong>{line}</strong> : line}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}

/**
 * Option 1, dictate first: the report fills the screen, the microphone is a big
 * button at the bottom with the three closing actions, and the chat rises as a sheet.
 */
function ReportDictate({ title, back }: { title: string; back: () => void }) {
  const [listening, setListening] = useState(false);
  const [chat, setChat] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <TopBar
        title={title}
        small
        onBack={back}
        right={
          <button type="button" aria-label="More" className="grid h-10 w-10 place-items-center rounded-full">
            <DotsThree weight="bold" className="h-6 w-6" />
          </button>
        }
      />
      <div className="flex items-center gap-2 px-4 py-2 text-[0.82rem]">
        <StatusChip status="Draft" />
        <span className="text-ink-soft">CT Brain (Plain) · Saved</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface">
        <button type="button" onClick={() => setChat(true)} className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center gap-2 rounded-xl bg-amber-tint px-3 py-2.5 text-left text-[0.88rem] font-semibold text-amber-deep">
          <Sparkle weight="fill" className="h-4 w-4" />3 AI changes wait for review
          <CaretRight weight="bold" className="ml-auto h-4 w-4" />
        </button>
        <ReportBody onLine={setLine} />
        <p className="px-5 pb-28 text-[0.85rem] text-ink-quiet">Tap a line to fix it by hand.</p>
      </div>

      {/* The dock: what is being said, the microphone, and the three closing actions. */}
      <div className="shrink-0 border-t border-line bg-canvas/95 px-4 pb-3 pt-2 backdrop-blur-xl">
        <button type="button" onClick={() => setChat(true)} aria-label="Open the chat" className="mx-auto mb-2 block h-1.5 w-10 rounded-full bg-ink/20" />
        {listening && (
          <p className="mb-2 rounded-xl bg-surface px-3 py-2 text-[0.95rem] leading-snug">
            “Mild mucosal thickening in the right maxillary sinus…”
          </p>
        )}
        <div className="flex items-center gap-2">
          <button type="button" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink/[0.07]" aria-label="Validate">
            <Checks weight="bold" className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setListening((on) => !on)}
            className={`flex h-14 flex-1 items-center justify-center gap-2 rounded-full text-[1.05rem] font-bold ${listening ? "voice-ring bg-teal text-white" : "bg-btn text-btn-text"}`}
          >
            <Microphone weight="fill" className="h-5 w-5" />
            {listening ? "Listening… tap to stop" : "Speak"}
          </button>
          <button type="button" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink/[0.07]" aria-label="Copy for PACS">
            <Copy weight="bold" className="h-5 w-5" />
          </button>
        </div>
        <button type="button" className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-ink/30 text-[0.95rem] font-semibold">
          <SealCheck weight="bold" className="h-5 w-5" />
          Finalize
        </button>
      </div>

      <Sheet open={chat} onClose={() => setChat(false)} title="AI Assistant">
        <div className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto">
          <p className="self-end rounded-2xl rounded-br-md bg-amber-tint px-3.5 py-2 text-[0.95rem]">
            Acute right frontoparietal subdural haemorrhage, 10 mm, with 5 mm midline shift to the left.
          </p>
          <div className="rounded-2xl rounded-tl-md border border-line p-3">
            <p className="text-[0.92rem] font-semibold">Report updated · 3 changes</p>
            <p className="mt-1 text-[0.82rem] font-semibold text-amber-deep">3 changes wait for your review</p>
            <div className="mt-2 flex gap-1.5">
              <button type="button" className="h-9 rounded-full bg-btn px-3.5 text-[0.85rem] font-semibold text-btn-text">Accept all</button>
              <button type="button" className="h-9 rounded-full border border-ink/30 px-3.5 text-[0.85rem] font-semibold">Review</button>
              <button type="button" className="h-9 rounded-full px-3 text-[0.85rem] font-semibold text-ink-soft">Ignore all</button>
            </div>
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 rounded-full border border-ink/30 px-4">
          <input placeholder="Type a change" className="h-11 min-w-0 flex-1 bg-transparent outline-none" />
          <PaperPlaneTilt weight="fill" className="h-5 w-5 text-teal" />
        </label>
      </Sheet>

      <Sheet open={line !== null} onClose={() => setLine(null)} title="Fix this line">
        <textarea defaultValue={line ?? ""} key={line ?? ""} rows={4} className="w-full rounded-2xl border border-ink/30 p-3 text-[1rem] leading-relaxed outline-none focus:border-teal" />
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setLine(null)} className="h-12 flex-1 rounded-full bg-btn font-semibold text-btn-text">
            Done
          </button>
          <button type="button" className="grid h-12 w-12 place-items-center rounded-full bg-ink/[0.07]" aria-label="Speak into this line">
            <Microphone weight="fill" className="h-5 w-5" />
          </button>
        </div>
      </Sheet>
    </div>
  );
}

/**
 * Option 2, editor first: the report is a full-screen editor; the formatting
 * toolbar shows only while typing, and the microphone floats as a round button.
 */
function ReportEditor({ title, back }: { title: string; back: () => void }) {
  const [typing, setTyping] = useState(false);
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <TopBar
        title={title}
        small
        onBack={back}
        right={
          <button type="button" aria-label="Copy for PACS" className="grid h-10 w-10 place-items-center rounded-full text-teal-deep">
            <Copy weight="bold" className="h-5 w-5" />
          </button>
        }
      />
      <div className="flex items-center gap-2 px-4 py-2 text-[0.82rem]">
        <StatusChip status="Draft" />
        <span className="text-ink-soft">CT Brain (Plain) · Saved</span>
        <span className="ml-auto flex gap-1">
          <button type="button" className="h-8 rounded-full bg-ink/[0.07] px-3 text-[0.8rem] font-semibold">Validate</button>
          <button type="button" className="h-8 rounded-full bg-btn px-3 text-[0.8rem] font-semibold text-btn-text">Finalize</button>
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface" onClick={() => setTyping(true)}>
        <ReportBody />
        <p className="px-5 pb-24 text-[0.85rem] text-ink-quiet">Tap anywhere to type. The toolbar appears above the keyboard.</p>
      </div>
      {typing ? (
        <div className="flex shrink-0 items-center gap-1 border-t border-line bg-canvas px-2 py-1.5">
          {[TextB, TextItalic, TextUnderline, ListBullets].map((Icon, index) => (
            <button key={index} type="button" className="grid h-10 w-10 place-items-center rounded-lg text-ink active:bg-ink/10">
              <Icon weight="bold" className="h-5 w-5" />
            </button>
          ))}
          <button type="button" className="ml-auto grid h-10 w-10 place-items-center rounded-full bg-teal text-white" aria-label="Speak">
            <Microphone weight="fill" className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setTyping(false)} className="h-10 rounded-lg px-3 font-semibold text-teal-deep">
            Done
          </button>
        </div>
      ) : (
        <button type="button" aria-label="Speak" className="absolute bottom-5 right-5 grid h-16 w-16 place-items-center rounded-full bg-btn text-btn-text shadow-[0_12px_30px_-10px_rgb(6_17_15/0.6)]">
          <Microphone weight="fill" className="h-7 w-7" />
        </button>
      )}
    </div>
  );
}

// ——— The phone ———

function TabBar({ tab, setTab, onNew }: { tab: Tab; setTab: (tab: Tab) => void; onNew: () => void }) {
  const item = (id: Tab, label: string, Icon: typeof Files) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex flex-1 flex-col items-center gap-0.5 pt-2 text-[0.7rem] font-semibold ${tab === id ? "text-teal-deep" : "text-ink-quiet"}`}
    >
      <Icon weight={tab === id ? "fill" : "regular"} className="h-6 w-6" />
      {label}
    </button>
  );
  return (
    <nav className="flex shrink-0 items-start border-t border-line bg-canvas/95 pb-5 backdrop-blur-xl">
      {item("reports", "Reports", FileText)}
      {item("templates", "Templates", Files)}
      <button type="button" onClick={onNew} aria-label="New report" className="-mt-4 flex flex-1 flex-col items-center gap-0.5 text-[0.7rem] font-semibold text-ink">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-btn text-btn-text shadow-[0_8px_20px_-8px_rgb(6_17_15/0.6)]">
          <Plus weight="bold" className="h-6 w-6" />
        </span>
        New
      </button>
      {item("insights", "Insights", ChartLineUp)}
      {item("me", "Me", UserCircle)}
    </nav>
  );
}

function Phone({ variant }: { variant: Variant }) {
  const [tab, setTab] = useState<Tab>("reports");
  const [route, setRoute] = useState<Route>({ kind: "tabs" });
  const [chooser, setChooser] = useState(false);
  const back = () => setRoute({ kind: "tabs" });
  const openReport = (title: string) => setRoute({ kind: "report", title });

  return (
    <div className="app relative flex h-[calc(100dvh-46px)] w-full flex-col overflow-clip bg-canvas text-ink lg:h-[820px] lg:w-[390px] lg:rounded-[52px] lg:border-[12px] lg:border-[#0d1413] lg:shadow-[0_40px_90px_-30px_rgb(6_17_15/0.6)]">
      {/* The phone's own status bar, for the look on a computer. */}
      <div className="hidden h-11 shrink-0 items-end justify-between px-7 pb-1 text-[0.8rem] font-semibold lg:flex">
        <span>9:41</span>
        <span className="h-6 w-28 rounded-full bg-[#0d1413]" />
        <span>100%</span>
      </div>
      {route.kind === "report" ? (
        variant === "dictate" ? (
          <ReportDictate title={route.title} back={back} />
        ) : (
          <ReportEditor title={route.title} back={back} />
        )
      ) : route.kind === "setting" ? (
        <SettingScreen name={route.name} back={back} />
      ) : (
        <>
          {tab === "reports" && <ReportsTab open={openReport} />}
          {tab === "templates" && <TemplatesTab open={openReport} />}
          {tab === "insights" && <InsightsTab />}
          {tab === "me" && <MeTab open={(name) => setRoute({ kind: "setting", name })} />}
          <TabBar tab={tab} setTab={setTab} onNew={() => setChooser(true)} />
        </>
      )}
      <Sheet open={chooser} onClose={() => setChooser(false)} title="Start a new report">
        <SearchBar placeholder="Search templates" />
        <ul className="mt-2 max-h-[45vh] overflow-y-auto">
          {[{ name: "Blank report", modality: "Dictate only your findings" }, ...TEMPLATES].map((template, index) => (
            <li key={template.name}>
              <button
                type="button"
                onClick={() => {
                  setChooser(false);
                  openReport(`New · ${template.name}`);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left active:bg-ink/[0.05]"
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${index === 0 ? "bg-amber-tint text-amber-deep" : "bg-teal/[0.12] text-teal-deep"}`}>
                  {index === 0 ? <FileDashed weight="bold" className="h-5 w-5" /> : <FileText weight="fill" className="h-5 w-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{template.name}</span>
                  <span className="block text-[0.85rem] text-ink-soft">{template.modality}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

export function MobilePrototype() {
  const [variant, setVariant] = useState<Variant>("dictate");
  const segment = (value: Variant, label: string) => (
    <button
      type="button"
      onClick={() => setVariant(value)}
      className={`h-9 flex-1 rounded-full px-3 text-[0.88rem] font-semibold ${variant === value ? "bg-btn text-btn-text" : "text-ink-soft"}`}
    >
      {label}
    </button>
  );

  return (
    <main className="app min-h-[100dvh] bg-canvas text-ink lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16 lg:px-16 lg:py-10">
      <section className="hidden max-w-xl lg:block">
        <h1 className="text-[2rem] font-semibold tracking-[-0.03em]">LumenAI on a phone</h1>
        <p className="mt-2 text-ink-soft">A clickable prototype with made-up data. Nothing here changes the real app.</p>
        <div className="mt-6 flex max-w-sm rounded-full border border-line bg-surface p-1">
          {segment("dictate", "Report: dictate first")}
          {segment("editor", "Report: editor first")}
        </div>
        <ol className="mt-6 flex flex-col gap-3 text-[0.98rem] leading-relaxed">
          <li><strong>Tab bar:</strong> Reports, Templates, New in the middle, Insights, Me. Team, Plans and Referrals live in Me.</li>
          <li><strong>Lists:</strong> the whole row opens a report. Swipe a row left for PDF and Delete. Filters are one row of chips.</li>
          <li><strong>Titles:</strong> large at the top, then they move into the bar as you scroll. Inner screens have a back arrow.</li>
          <li><strong>Report, dictate first:</strong> the report fills the screen, a big Speak button sits at the bottom with Validate and Copy beside it. Tap a line to fix it; pull up the handle for the chat.</li>
          <li><strong>Report, editor first:</strong> the report is a full-screen editor; the toolbar appears only while typing, and the microphone floats.</li>
          <li><strong>New:</strong> the same Start a new report choice, as a sheet from the bottom.</li>
        </ol>
        <p className="mt-6 text-[0.9rem] text-ink-quiet">On a phone, open this address to use it full screen.</p>
      </section>

      <div className="flex flex-col items-center lg:block">
        {/* On a phone the prototype fills the screen; this strip switches the report option. */}
        <div className="flex w-full gap-1 border-b border-line bg-surface p-1 lg:hidden">
          {segment("dictate", "Dictate first")}
          {segment("editor", "Editor first")}
        </div>
        <Phone key={variant} variant={variant} />
      </div>
    </main>
  );
}
