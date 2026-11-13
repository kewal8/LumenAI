"use client";

import {
  CaretLeft,
  CaretRight,
  CheckCircle,
  Microphone,
  WarningCircle,
} from "@phosphor-icons/react";
import { useState } from "react";

function Spoken({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 rounded-3xl bg-on-night/10 px-4 py-3 text-[0.98rem] leading-snug text-on-night">
      <Microphone weight="fill" className="mt-0.5 h-4 w-4 shrink-0 text-[#f6c777]" />
      <span>“{children}”</span>
    </p>
  );
}

function Paper({ children }: { children: React.ReactNode }) {
  // Report text is set in Arial, as a PACS editor shows it.
  return (
    <div className="rounded-3xl bg-[#fbfdfc] p-5 font-[Arial,Helvetica,sans-serif] text-[0.86rem] leading-[1.5] tracking-normal text-[#0e1f1e] shadow-[0_18px_40px_-18px_rgb(0_0_0/0.5)]">
      {children}
    </div>
  );
}

const QUIET = "text-[#6b807e]";
const NOTE = "mt-1 font-[family-name:var(--font-brand)] text-[0.8rem]";

const SLIDES = [
  {
    title: "Say only what is abnormal",
    body: "Every line you do not mention keeps the normal wording of your template.",
    visual: (
      <>
        <Spoken>undisplaced fracture of the right temporal bone</Spoken>
        <Paper>
          <p className={QUIET}>No intracranial haemorrhage or mass lesion.</p>
          <p className="my-1.5 rounded-lg bg-[#dcf1ed] px-2 py-1 font-bold">
            Undisplaced fracture of the right temporal bone.
          </p>
          <p className={QUIET}>No midline shift.</p>
        </Paper>
      </>
    ),
  },
  {
    title: "Every line traced to your words",
    body: "If the side, a number or a “no” does not match what you said, the line is flagged.",
    visual: (
      <Paper>
        <p>Small extradural collection along the right temporal convexity.</p>
        <p className={`${NOTE} ${QUIET}`}>Dictated: “…along the left temporal convexity”</p>
        <p className={`${NOTE} flex items-center gap-1.5 font-semibold text-[#b23a26]`}>
          <WarningCircle weight="fill" className="h-4 w-4 shrink-0" />
          Side does not match your words.
        </p>
      </Paper>
    ),
  },
  {
    title: "Corrections are spoken too",
    body: "Say the change. Only that line is rewritten.",
    visual: (
      <>
        <Spoken>change the size to 18 mm</Spoken>
        <Paper>
          <p>
            Soft tissue swelling in the right maxillary region measuring{" "}
            <span className={`${QUIET} line-through`}>16 mm</span>{" "}
            <span className="rounded bg-[#dcf1ed] px-1 font-bold">18&nbsp;mm</span>.
          </p>
        </Paper>
      </>
    ),
  },
  {
    title: "Already copied for PACS",
    body: "Press Ctrl+V in your report editor. Headings and spacing survive the paste.",
    visual: (
      <>
        <p className="flex items-center gap-2 self-start rounded-full bg-teal-glow px-4 py-2 text-[0.92rem] font-bold text-[#08302d]">
          <CheckCircle weight="fill" className="h-4 w-4" />
          Copied. Press Ctrl+V in PACS
        </p>
        <Paper>
          <p className="font-bold">FINDINGS:</p>
          <p>Undisplaced fracture of the right temporal bone.</p>
          <p className="mt-2 font-bold">IMPRESSION:</p>
          <p>Right temporal bone fracture.</p>
        </Paper>
      </>
    ),
  },
];

/**
 * Slides through the product's main features. Each slide advances when its
 * progress bar finishes; hovering or focusing the slider pauses it, and with
 * reduced motion it never moves on its own.
 */
export function FeatureSlider() {
  const [index, setIndex] = useState(0);
  const last = SLIDES.length - 1;
  const go = (next: number) => setIndex(next < 0 ? last : next > last ? 0 : next);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="What LumenAI does"
      className="feature-slider flex min-w-0 flex-col"
    >
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {SLIDES.map((slide, position) => (
            <article
              key={slide.title}
              aria-roledescription="slide"
              aria-label={`${position + 1} of ${SLIDES.length}`}
              aria-hidden={position !== index}
              className="flex w-full shrink-0 flex-col"
            >
              <div className="flex min-h-[11.5rem] flex-col justify-center gap-3">
                {slide.visual}
              </div>
              <h2 className="mt-5 text-[1.4rem] font-semibold leading-tight tracking-[-0.03em]">
                {slide.title}
              </h2>
              <p className="mt-1.5 max-w-[40ch] leading-relaxed text-on-night-soft">{slide.body}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <div className="flex flex-1 gap-2">
          {SLIDES.map((slide, position) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => go(position)}
              aria-label={`Show: ${slide.title}`}
              aria-current={position === index}
              className="group flex h-6 flex-1 items-center"
            >
              <span className="relative block h-1 w-full overflow-hidden rounded-full bg-on-night/20 transition-colors group-hover:bg-on-night/35">
                {position < index && <span className="absolute inset-0 bg-teal-glow" />}
                {position === index && (
                  <span
                    key={index}
                    onAnimationEnd={() => go(index + 1)}
                    className="slide-progress absolute inset-0 bg-teal-glow"
                  />
                )}
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {[
            { label: "Previous feature", step: -1, Icon: CaretLeft },
            { label: "Next feature", step: 1, Icon: CaretRight },
          ].map(({ label, step, Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => go(index + step)}
              aria-label={label}
              className="grid h-10 w-10 place-items-center rounded-full border border-on-night/30 transition-[background-color,color,transform] duration-200 hover:bg-on-night hover:text-night active:scale-[0.95]"
            >
              <Icon weight="bold" className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
