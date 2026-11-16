import * as motion from "motion/react-client";
import Image from "next/image";

type Props = {
  /** What the screenshot will show, e.g. "Report screen". */
  label: string;
  /** Path under /public, e.g. "/screenshots/report.png". Leave out until the screenshot exists. */
  src?: string;
  /** Skeleton drawn while there is no screenshot. */
  layout?: "report" | "dictation" | "flags" | "paste" | "blank";
  className?: string;
};

function Bar({
  w,
  tone = "soft",
  order = 0,
}: {
  w: string;
  tone?: "soft" | "strong" | "teal" | "amber" | "flag";
  order?: number;
}) {
  const colour = {
    soft: "bg-ink/[0.07]",
    strong: "bg-ink/[0.16]",
    teal: "bg-teal/30",
    amber: "bg-amber/50",
    flag: "bg-[#c2523c]/35",
  }[tone];
  // Lines write themselves in from the left, one after another, the first
  // time the frame is seen: the report being written.
  return (
    <motion.span
      className={`block h-2 rounded-full ${colour}`}
      style={{ width: w, originX: 0 }}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.7, delay: 0.15 + order * 0.06, ease: [0.16, 1, 0.3, 1] }}
    />
  );
}

function Skeleton({ layout }: { layout: NonNullable<Props["layout"]> }) {
  if (layout === "blank") return null;

  const report = (
    <div className="flex flex-1 flex-col gap-2.5 rounded-xl border border-line bg-surface p-5">
      <Bar order={0} w="34%" tone="strong" />
      <span className="h-1" />
      <Bar order={1} w="22%" tone="strong" />
      <Bar order={2} w="88%" />
      <Bar order={3} w="72%" />
      <Bar order={4} w="80%" tone={layout === "flags" ? "flag" : "teal"} />
      <Bar order={5} w="64%" />
      <Bar order={6} w="76%" tone="amber" />
      <span className="h-1" />
      <Bar order={7} w="26%" tone="strong" />
      <Bar order={8} w="58%" tone="teal" />
      <Bar order={9} w="46%" tone="amber" />
    </div>
  );

  const side = (
    <div className="flex w-[34%] flex-col gap-2.5">
      <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
        <Bar order={10} w="90%" />
        <Bar order={11} w="70%" />
        <Bar order={12} w="40%" />
      </div>
      <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
        <Bar order={13} w="80%" />
        <Bar order={14} w="55%" />
      </div>
      {/* The main button, in the accent: the button colour turns near-white in dark mode and glared. */}
      <span className="mt-auto h-9 rounded-full bg-teal/70" />
    </div>
  );

  if (layout === "paste") {
    return (
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
          <span className="h-4 w-16 rounded bg-ink/[0.08]" />
          <span className="h-4 w-8 rounded bg-ink/[0.08]" />
          <span className="h-4 w-4 rounded bg-ink/[0.16]" />
          <span className="h-4 w-4 rounded bg-ink/[0.08]" />
          <span className="h-4 w-4 rounded bg-ink/[0.08]" />
        </div>
        {report}
      </div>
    );
  }

  return (
    <div className="flex flex-1 gap-3">
      {layout === "dictation" ? (
        <>
          {side}
          {report}
        </>
      ) : (
        <>
          {report}
          {side}
        </>
      )}
    </div>
  );
}

/**
 * Browser-window frame for product screenshots. Shows a neutral skeleton and a
 * label until a real screenshot is supplied through `src`.
 */
export function ScreenshotFrame({ label, src, layout = "report", className = "" }: Props) {
  return (
    <figure
      className={`overflow-hidden rounded-3xl border border-ink/[0.12] bg-surface shadow-[0_24px_60px_-12px_rgb(6_35_33/0.22),0_2px_6px_rgb(6_35_33/0.06)] ${className}`}
    >
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        </span>
        <span className="mx-auto rounded-full bg-canvas px-4 py-1 text-xs text-ink-quiet">
          LumenAI · {label}
        </span>
        <span className="w-10" aria-hidden="true" />
      </div>

      {src ? (
        <Image
          src={src}
          alt={`LumenAI ${label.toLowerCase()}`}
          width={1600}
          height={1000}
          className="block h-auto w-full"
        />
      ) : (
        <div className="relative flex aspect-[16/10] bg-canvas p-4 sm:p-5">
          <Skeleton layout={layout} />
          <figcaption className="absolute inset-x-0 bottom-4 flex justify-center">
            <span className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs text-ink-soft shadow-sm">
              Screenshot to be added: {label}
            </span>
          </figcaption>
        </div>
      )}
    </figure>
  );
}
