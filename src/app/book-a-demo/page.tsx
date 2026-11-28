import { DemoRequestForm } from "@/components/demo/DemoRequestForm";
import { FeatureSlider } from "@/components/demo/FeatureSlider";
import { SiteFooter, SiteHeader } from "@/components/landing/site";

export const metadata = {
  title: "Book a demo · Radmatic",
  description:
    "See Radmatic write a radiology report from your own dictation. Request a demo and we will agree a time.",
};

export default function BookADemoPage() {
  return (
    <div className="landing flex-1">
      <SiteHeader />

      {/* On wide screens the showcase and the form share exactly one screen
          below the navigation, so nothing has to be scrolled to fill it in.
          The floor keeps everything visible on very short windows. */}
      <main className="mx-auto grid w-full max-w-[88rem] gap-4 px-3 pb-4 pt-8 sm:px-5 lg:h-[max(calc(100dvh-4.25rem),44rem)] lg:pt-13 lg:grid-cols-[1fr_1.05fr]">
        <div className="focus-dim on-night glow-up flex min-w-0 flex-col justify-between gap-8 rounded-[40px] bg-night p-7 text-on-night sm:p-9 lg:p-10">
          <div>
            <h1 className="text-balance text-[clamp(2rem,3.6vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
              See it on your own cases.
            </h1>
            <p className="mt-3 max-w-[40ch] leading-relaxed text-on-night-soft">
              A live session with the people building Radmatic, on studies you bring.
            </p>
          </div>
          <FeatureSlider />
        </div>

        <section
          aria-labelledby="demo-form-title"
          className="flex min-w-0 flex-col justify-center rounded-[40px] border border-ink/[0.12] bg-surface p-7 sm:p-9 lg:px-10 lg:py-8"
        >
          <h2
            id="demo-form-title"
            className="focus-dim text-[1.6rem] font-semibold leading-tight tracking-[-0.03em]"
          >
            Request a demo
          </h2>
          <p className="focus-dim mb-6 mt-1.5 leading-relaxed text-ink-soft">
            Tell us how to reach you and we will agree a time.
          </p>
          <DemoRequestForm />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
