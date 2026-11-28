import {
  ArrowDown,
  Check,
  Copy,
  Microphone,
  Sparkle,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import * as motion from "motion/react-client";
import Image from "next/image";

type Layout =
  | "desk"
  | "dictation"
  | "report"
  | "flags"
  | "paste"
  | "beside"
  | "phone"
  | "order"
  | "replace";

type Props = {
  /** What the window shows, e.g. "Report screen". */
  label: string;
  /** Path under /public, e.g. "/screenshots/report.png". Replaces the mock-up when given. */
  src?: string;
  /** Mock-up drawn while there is no screenshot. */
  layout?: Layout;
  className?: string;
};

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Every size inside a mock-up is in `em`, and the base size follows the width
 * of the frame, so a mock-up scales like a picture on any screen.
 */
const BASE: Record<Layout, string> = {
  desk: "clamp(8.5px, 1.75cqw, 17px)",
  dictation: "clamp(10px, 2.9cqw, 15px)",
  report: "clamp(10px, 2.9cqw, 15px)",
  flags: "clamp(10px, 2.3cqw, 15px)",
  paste: "clamp(10px, 2.3cqw, 15px)",
  beside: "clamp(10px, 2.9cqw, 15px)",
  phone: "clamp(10px, 2.9cqw, 15px)",
  order: "clamp(10px, 2.9cqw, 15px)",
  replace: "clamp(10px, 2.9cqw, 15px)",
};

const SHEET = "flex flex-col gap-[0.85em] rounded-[1em] border border-line bg-surface p-[1.5em]";
const PILL =
  "inline-flex items-center gap-[0.45em] rounded-full border border-line bg-surface px-[0.9em] py-[0.4em] text-[0.85em] font-semibold text-ink-soft";

/** A line of the report that nobody touched: shown as a plain bar, not words. */
function Line({ w }: { w: string }) {
  return <span aria-hidden="true" className="block h-[0.55em] rounded-full bg-ink/[0.09]" style={{ width: w }} />;
}

/** A report heading, bold as the report itself prints it. */
function Heading({ children }: { children: React.ReactNode }) {
  return <p className="text-[0.82em] font-bold tracking-[0.03em] text-ink">{children}</p>;
}

/** Something that appears in its turn the first time the mock-up is seen. */
function Appear({
  order,
  className,
  children,
}: {
  order: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.6, delay: 0.25 + order * 0.35, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** A line the AI wrote: bold, as in the product. */
function Written({ order, children }: { order: number; children: React.ReactNode }) {
  return (
    <Appear order={order} className="font-bold leading-snug text-ink">
      {children}
    </Appear>
  );
}

/** What the doctor said, in the app's own speech bubble. */
function Said({ order, className = "", children }: { order: number; className?: string; children: React.ReactNode }) {
  return (
    <Appear
      order={order}
      className={`rounded-[1.1em] rounded-br-[0.3em] bg-amber-tint px-[1em] py-[0.7em] leading-snug text-ink ${className}`}
    >
      {children}
    </Appear>
  );
}

/** The microphone, listening: a button and a moving sound wave. */
function Listening({ big = false }: { big?: boolean }) {
  return (
    <div className="flex items-center gap-[0.8em]">
      <span
        className={`grid shrink-0 place-items-center rounded-full bg-teal text-btn-text ${big ? "h-[3.2em] w-[3.2em]" : "h-[2.6em] w-[2.6em]"}`}
      >
        <Microphone weight="fill" className="h-[1.3em] w-[1.3em]" />
      </span>
      <span aria-hidden="true" className="flex h-[1.6em] items-center gap-[0.25em]">
        {[0.5, 1, 0.65, 0.9, 0.4].map((height, index) => (
          <motion.span
            key={index}
            className="block w-[0.25em] rounded-full bg-teal/70"
            style={{ height: `${height * 100}%` }}
            animate={{ scaleY: [1, 0.45, 1] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: index * 0.12, ease: "easeInOut" }}
          />
        ))}
      </span>
      <span className="text-[0.9em] font-semibold text-ink-soft">Listening</span>
    </div>
  );
}

/** The whole desk: the report on the left, the assistant on the right. */
function Desk() {
  return (
    <div className="flex w-full gap-[1em]">
      <div className={`${SHEET} min-w-0 flex-1`}>
        <div className="flex items-center justify-between gap-[0.6em]">
          <span className={PILL}>CT Brain (Plain)</span>
          <span className="inline-flex items-center gap-[0.45em] rounded-full bg-teal px-[1em] py-[0.45em] text-[0.85em] font-semibold text-btn-text">
            <Copy weight="bold" className="h-[1.1em] w-[1.1em]" />
            Copy
          </span>
        </div>
        <span className="h-[0.2em]" />
        <Heading>FINDINGS:</Heading>
        <Line w="84%" />
        <Written order={1}>Small acute infarct is noted in the left basal ganglia.</Written>
        <Line w="68%" />
        <Line w="76%" />
        <span className="h-[0.2em]" />
        <Heading>IMPRESSION:</Heading>
        <Written order={2}>Small acute infarct in the left basal ganglia.</Written>
      </div>

      <div className="flex w-[36%] flex-col gap-[0.9em] rounded-[1em] border border-line bg-surface p-[1.3em]">
        <p className="font-semibold text-ink">AI Assistant</p>
        <Said order={0}>“Small acute infarct, left basal ganglia.”</Said>
        <Appear order={3} className="flex items-center gap-[0.5em] text-[0.9em] font-semibold text-teal-deep">
          <span className="grid h-[1.5em] w-[1.5em] shrink-0 place-items-center rounded-full bg-teal text-btn-text">
            <Check weight="bold" className="h-[0.9em] w-[0.9em]" />
          </span>
          Report updated
        </Appear>
        <div className="mt-auto border-t border-line pt-[1em]">
          <Listening />
        </div>
      </div>
    </div>
  );
}

/** Say one finding, and one line of the report changes. */
function Dictation() {
  return (
    <div className="flex w-full flex-col items-center gap-[1em]">
      <Listening big />
      <Said order={0} className="max-w-[88%] text-center">
        “Mild mucosal thickening, right maxillary sinus.”
      </Said>
      <ArrowDown aria-hidden="true" className="h-[1.4em] w-[1.4em] text-ink-quiet" />
      <div className={`${SHEET} w-full`}>
        <Line w="78%" />
        <Line w="62%" />
        <Written order={1}>Mild mucosal thickening is noted in the right maxillary sinus.</Written>
        <Line w="70%" />
      </div>
      <Appear order={2}>
        <span className={PILL}>Only this line changed</span>
      </Appear>
    </div>
  );
}

/** The finished report, with the impression written from the findings. */
function Report() {
  return (
    <div className={`${SHEET} w-full`}>
      <p className="text-center text-[0.95em] font-bold text-ink">CT BRAIN (PLAIN)</p>
      <Heading>FINDINGS:</Heading>
      <Line w="86%" />
      <Written order={0}>Small acute infarct is noted in the left basal ganglia.</Written>
      <Line w="64%" />
      <Line w="74%" />
      <Appear order={1} className="mt-[0.4em] flex flex-col gap-[0.6em] rounded-[0.9em] bg-teal-tint p-[1.1em]">
        <Heading>IMPRESSION:</Heading>
        <p className="font-bold leading-snug text-ink">Small acute infarct in the left basal ganglia.</p>
        <span className="inline-flex items-center gap-[0.4em] text-[0.82em] font-semibold text-teal-deep">
          <Sparkle weight="fill" className="h-[1.1em] w-[1.1em]" />
          Written from your findings
        </span>
      </Appear>
    </div>
  );
}

/** A line that says something the doctor did not: flagged before signing. */
function Flags() {
  const checked = (w: string) => (
    <div className="flex items-center gap-[0.7em]">
      <span className="grid h-[1.4em] w-[1.4em] shrink-0 place-items-center rounded-full bg-teal/15 text-teal-deep">
        <Check weight="bold" className="h-[0.85em] w-[0.85em]" />
      </span>
      <Line w={w} />
    </div>
  );
  return (
    <div className="flex w-full flex-col gap-[1em]">
      <div className="flex items-center gap-[0.8em]">
        <span className="shrink-0 text-[0.85em] font-semibold text-ink-soft">You said</span>
        <Said order={0}>“12 mm calculus in the right kidney.”</Said>
      </div>
      <div className={SHEET}>
        {checked("72%")}
        <Appear
          order={1}
          className="flex flex-col gap-[0.5em] rounded-[0.8em] border border-flag/40 bg-flag/[0.08] p-[0.9em]"
        >
          <p className="font-bold leading-snug text-ink">
            <span className="underline decoration-flag decoration-2 underline-offset-[0.2em]">Left</span>{" "}
            kidney shows a 12 mm calculus.
          </p>
          <span className="inline-flex items-center gap-[0.4em] text-[0.85em] font-semibold text-flag">
            <Warning weight="fill" className="h-[1.1em] w-[1.1em]" />
            Side does not match what you said
          </span>
        </Appear>
        {checked("58%")}
      </div>
    </div>
  );
}

/** The report inside someone else's editor, formatting intact. */
function Paste() {
  const key = "grid h-[2em] min-w-[2em] place-items-center rounded-[0.5em] border border-line bg-surface px-[0.5em] text-[0.85em] text-ink-soft";
  return (
    <div className="flex w-full flex-col gap-[0.9em]">
      <div className="flex items-center gap-[0.5em] rounded-[0.8em] border border-line bg-surface p-[0.6em]">
        <span className={key}>Arial</span>
        <span className={key}>10</span>
        <span className={`${key} bg-ink/[0.1] font-bold text-ink`}>B</span>
        <span className={`${key} italic`}>I</span>
        <span className={`${key} underline`}>U</span>
      </div>
      <div className={SHEET}>
        <Heading>FINDINGS:</Heading>
        <Line w="88%" />
        <Line w="70%" />
        <Line w="78%" />
        <span className="h-[0.2em]" />
        <Heading>IMPRESSION:</Heading>
        <Line w="60%" />
      </div>
      <Appear order={0} className="flex justify-end">
        <span className="inline-flex items-center gap-[0.5em] rounded-full bg-teal px-[1em] py-[0.5em] text-[0.88em] font-semibold text-btn-text">
          <Check weight="bold" className="h-[1em] w-[1em]" />
          Pasted. Formatting kept.
        </span>
      </Appear>
    </div>
  );
}

/** Radmatic in a tab next to the image viewer the doctor already uses. */
function Beside() {
  return (
    <div className="flex w-full gap-[0.8em]">
      <div className="flex w-[50%] flex-col gap-[0.7em] rounded-[1em] bg-[#12201f] p-[1.1em]">
        <span className="text-[0.82em] font-semibold text-white/65">Your image viewer</span>
        <div className="grid flex-1 place-items-center py-[0.6em]">
          <span
            aria-hidden="true"
            className="block aspect-square w-[68%] rounded-full bg-[radial-gradient(circle_at_42%_40%,#a9bbb9,#465957_58%,#1b2a29)]"
          />
        </div>
      </div>
      <div className={`${SHEET} min-w-0 flex-1`}>
        <span className="text-[0.82em] font-semibold text-teal-deep">Radmatic</span>
        <Heading>FINDINGS:</Heading>
        <Line w="86%" />
        <Written order={0}>Small acute infarct, left basal ganglia.</Written>
        <Line w="64%" />
        <Line w="74%" />
      </div>
    </div>
  );
}

/** The same report screen, on a phone. */
function Phone() {
  return (
    <div className="flex w-full justify-center">
      <div className="flex w-[52%] min-w-[13em] flex-col gap-[0.85em] rounded-[2.2em] border-[0.4em] border-ink/80 bg-surface p-[1.2em]">
        <span aria-hidden="true" className="mx-auto h-[0.4em] w-[28%] rounded-full bg-ink/20" />
        <Heading>FINDINGS:</Heading>
        <Line w="82%" />
        <Written order={1}>Mild mucosal thickening, right maxillary sinus.</Written>
        <Line w="60%" />
        <Said order={0}>“Mild mucosal thickening, right maxillary sinus.”</Said>
        <div className="flex justify-center pt-[0.3em]">
          <Listening />
        </div>
      </div>
    </div>
  );
}

/** Spoken in one order, written in the order of the template. */
function Order() {
  return (
    <div className="flex w-full flex-col gap-[1em]">
      <div className="flex flex-col items-end gap-[0.5em]">
        <Said order={0}>“Right kidney, 12 mm calculus.”</Said>
        <Said order={1}>“Liver, mild fatty change.”</Said>
      </div>
      <div className={SHEET}>
        <Heading>LIVER:</Heading>
        <Written order={2}>Liver shows mild fatty change.</Written>
        <span className="h-[0.2em]" />
        <Heading>KIDNEYS:</Heading>
        <Written order={3}>Right kidney shows a 12 mm calculus.</Written>
      </div>
      <Appear order={4} className="flex justify-center">
        <span className={PILL}>Written in your template’s order</span>
      </Appear>
    </div>
  );
}

/** A finding takes the place of the normal line it contradicts. */
function Replace() {
  return (
    <div className="flex w-full flex-col gap-[1em]">
      <div className={SHEET}>
        <Heading>KIDNEYS:</Heading>
        <p className="leading-snug text-ink-quiet line-through">Both kidneys are normal in size and outline.</p>
        <Written order={0}>Right kidney shows a 12 mm calculus.</Written>
        <Line w="72%" />
        <Line w="58%" />
      </div>
      <Appear order={1} className="flex justify-center">
        <span className={PILL}>The normal line it denies is removed</span>
      </Appear>
    </div>
  );
}

const MOCKS: Record<Layout, () => React.ReactNode> = {
  desk: Desk,
  dictation: Dictation,
  report: Report,
  flags: Flags,
  paste: Paste,
  beside: Beside,
  phone: Phone,
  order: Order,
  replace: Replace,
};

/**
 * Browser-window frame for the product. Draws a simple mock-up of the screen,
 * or a real screenshot once one is supplied through `src`.
 */
export function ScreenshotFrame({ label, src, layout = "report", className = "" }: Props) {
  const Mock = MOCKS[layout];
  return (
    <figure
      aria-label={label}
      className={`@container overflow-hidden rounded-3xl border border-ink/[0.12] bg-surface shadow-[0_24px_60px_-12px_rgb(6_35_33/0.22),0_2px_6px_rgb(6_35_33/0.06)] ${className}`}
    >
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        </span>
        <span className="mx-auto min-w-0 truncate rounded-full bg-canvas px-4 py-1 text-xs text-ink-quiet">
          {layout === "paste" ? label : `Radmatic · ${label}`}
        </span>
        <span className="w-10" aria-hidden="true" />
      </div>

      {src ? (
        <Image
          src={src}
          alt={`Radmatic ${label.toLowerCase()}`}
          width={1600}
          height={1000}
          className="block h-auto w-full"
        />
      ) : (
        <div className="flex bg-canvas p-[1.2em] text-left" style={{ fontSize: BASE[layout] }}>
          <Mock />
        </div>
      )}
    </figure>
  );
}
