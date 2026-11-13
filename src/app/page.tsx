import {
  ArrowsLeftRight,
  Browsers,
  Check,
  ClipboardText,
  Layout,
  ListChecks,
  Microphone,
  PencilSimple,
  Prohibit,
  ShieldCheck,
  UsersThree,
  X,
} from "@phosphor-icons/react/dist/ssr";
import {
  DrawLine,
  HeroTilt,
  Item,
  MotionRoot,
  Pop,
  Reveal,
  Stagger,
} from "@/components/landing/motion";
import { ScreenshotFrame } from "@/components/landing/ScreenshotFrame";
import {
  PrimaryButton,
  SHELL,
  SecondaryButton,
  SiteFooter,
  SiteHeader,
} from "@/components/landing/site";

// Shape rule for the page: controls are pills, cards are 24px, blocks are 40px.
const H2 =
  "text-balance text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.12] tracking-[-0.03em]";
const CARD = "rounded-3xl border border-ink/[0.12] bg-surface";

/**
 * Small round icon badge. Fills are translucent so a badge takes on the
 * surface it sits on. Amber is only for neutral surfaces: on a teal-tinted
 * tile every badge is the light `onTint` version, because cream on mint clashes.
 */
function IconTile({
  children,
  warm = false,
  onTint = false,
}: {
  children: React.ReactNode;
  warm?: boolean;
  onTint?: boolean;
}) {
  const tone = onTint
    ? "border-teal/15 bg-surface/75 text-teal-deep"
    : warm
      ? "border-amber/30 bg-amber/[0.14] text-amber-deep"
      : "border-teal/20 bg-teal/[0.09] text-teal-deep";
  return (
    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border ${tone}`}>
      {children}
    </span>
  );
}

const PROBLEMS = [
  {
    title: "Most of a report is normal",
    body: "Yet every normal line is still typed, dictated or checked on each case.",
  },
  {
    title: "Dictation software types every word",
    body: "It hears what you say, not which line of the report a finding belongs to.",
  },
  {
    title: "The PACS editor is where time goes",
    body: "Headings, spacing and the impression get fixed by hand after the reading is done.",
  },
];

const STEPS = [
  { title: "Open it beside your viewer", body: "A browser tab next to PACS." },
  { title: "Choose the template", body: "The report starts complete and normal." },
  { title: "Dictate the abnormal", body: "Speak, stop, and the report updates." },
  { title: "Paste and sign in PACS", body: "Ctrl+V, read once, finalise as usual." },
];

const OLD_WAY = [
  "Type or dictate every line, normal ones included",
  "Correct the typist’s or the software’s draft",
  "Write the impression from scratch",
  "Fix headings and spacing in the PACS editor",
];

const NEW_WAY = [
  "Say only what is abnormal",
  "See the words each line came from",
  "Impression written from your findings",
  "Paste once, already formatted",
];

const RESPONSIBILITIES = [
  { not: "Read the images", you: "Read every study yourself" },
  { not: "Add a diagnosis you did not dictate", you: "Decide what the report says" },
  { not: "Sign or send the report", you: "Review, sign and send it" },
];

const CENTRE_POINTS = [
  {
    icon: <Layout className="h-5 w-5" />,
    title: "One report layout",
    body: "Every report leaves in the format your centre already uses.",
  },
  {
    icon: <Browsers className="h-5 w-5" />,
    title: "Nothing to install",
    body: "Runs in the browser beside your PACS. No server to size.",
  },
  {
    icon: <UsersThree className="h-5 w-5" />,
    title: "Roles for your team",
    body: "Owner, admin and radiologist accounts under one centre.",
  },
];

const STATUS = [
  { label: "Built with", value: "A senior radiologist and teacher" },
  { label: "Cases used", value: "Anonymised or made-up studies only" },
  { label: "Data agreements", value: "Being completed before real patient data" },
];

export default function LandingPage() {
  return (
    <MotionRoot>
    <div className="landing flex-1">
      <SiteHeader />

      <header className="relative">
        {/* Teal light behind the lower half of the hero and the screenshot. */}
        <div
          aria-hidden="true"
          className="glow-hero pointer-events-none absolute inset-x-0 bottom-0 top-[18%]"
        />
        <div className={`${SHELL} relative flex flex-col items-center pt-16 text-center sm:pt-20`}>
          <h1 className="hero-in text-balance text-[clamp(2.5rem,5.4vw,3.75rem)] font-semibold leading-[1.14] tracking-[-0.03em]">
            Dictate the abnormal.
            <br className="hidden sm:inline" />{" "}
            <span className="text-teal">Get the finished report.</span>
          </h1>
          <p className="hero-in mt-6 max-w-[46ch] text-[1.1rem] leading-relaxed text-ink-soft [--i:1]">
            Speak your findings. LumenAI writes the full report in your template,
            ready to paste into PACS.
          </p>
          <div className="hero-in mt-9 flex flex-wrap items-center justify-center gap-3 [--i:2]">
            <PrimaryButton>Book a demo</PrimaryButton>
            <SecondaryButton href="#features">See how it works</SecondaryButton>
          </div>

          {/* TODO: replace with a real screenshot of the report screen (1600x1000). */}
          <div className="hero-in mt-14 w-full max-w-[64rem] [--i:3]">
            <HeroTilt>
              <ScreenshotFrame label="Report screen" layout="dictation" className="text-left" />
            </HeroTilt>
          </div>
        </div>
      </header>

      <section className="px-3 pt-20 sm:px-5 lg:pt-28">
        <Reveal className="on-night mx-auto max-w-[88rem] rounded-[40px] bg-night px-5 py-20 text-on-night sm:px-8 lg:py-24">
          <div className="mx-auto grid max-w-[72rem] gap-x-16 gap-y-12 lg:grid-cols-2">
            <h2 className={H2}>Reporting still means typing what you already know.</h2>
            <Stagger as="ul">
              {PROBLEMS.map((problem) => (
                <Item
                  as="li"
                  key={problem.title}
                  className="border-t border-night-line py-6 first:border-t-0 first:pt-0 last:pb-0"
                >
                  <h3 className="text-[1.35rem] font-semibold leading-snug">{problem.title}</h3>
                  <p className="mt-2 max-w-[46ch] leading-relaxed text-on-night-soft">
                    {problem.body}
                  </p>
                </Item>
              ))}
            </Stagger>
          </div>
        </Reveal>
      </section>

      <div id="features" className="scroll-mt-24">
        <section className={`${SHELL} py-20 lg:py-28`}>
          <Reveal className="grid items-center gap-x-16 gap-y-12 lg:grid-cols-2">
            <div>
              <h2 className={H2}>
                Say what is abnormal.{" "}
                <span className="text-teal">Everything else stays normal.</span>
              </h2>
              <p className="mt-6 max-w-[48ch] text-[1.05rem] leading-relaxed text-ink-soft">
                Look at the images and talk, in any order. LumenAI starts from
                your template and changes only the lines you mention.
              </p>
              <ul className="mt-9 flex flex-col gap-6">
                <li className="flex gap-4">
                  <IconTile>
                    <Microphone className="h-5 w-5" />
                  </IconTile>
                  <div>
                    <h3 className="font-semibold leading-snug">Medical speech recognition</h3>
                    <p className="mt-1 text-[0.98rem] leading-relaxed text-ink-soft">
                      Clinical vocabulary, with Indian English supported.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <IconTile warm>
                    <Browsers className="h-5 w-5" />
                  </IconTile>
                  <div>
                    <h3 className="font-semibold leading-snug">Beside the PACS you already use</h3>
                    <p className="mt-1 text-[0.98rem] leading-relaxed text-ink-soft">
                      A browser tab next to your viewer. Nothing to install.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="glow-up rounded-[40px] border border-line bg-surface/60 p-5 sm:p-8">
              {/* TODO: real screenshot, dictation in progress. */}
              <ScreenshotFrame label="Dictation" layout="dictation" />
            </div>
          </Reveal>
        </section>

        <section className={`${SHELL} pb-20 lg:pb-28`}>
          <Reveal className="grid items-center gap-x-16 gap-y-12 lg:grid-cols-2">
            <div className="lg:order-2">
              <h2 className={H2}>
                Your template, filled in.{" "}
                <span className="text-teal">Impression included.</span>
              </h2>
              <p className="mt-6 max-w-[48ch] text-[1.05rem] leading-relaxed text-ink-soft">
                Each finding replaces the line it belongs to. The impression is
                written from the abnormal lines only.
              </p>
              <ul className="mt-9 flex flex-col gap-6">
                <li className="flex gap-4">
                  <IconTile>
                    <ListChecks className="h-5 w-5" />
                  </IconTile>
                  <div>
                    <h3 className="font-semibold leading-snug">Findings land in the right section</h3>
                    <p className="mt-1 text-[0.98rem] leading-relaxed text-ink-soft">
                      Speak in any order. The report keeps the order of your template.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <IconTile warm>
                    <Prohibit className="h-5 w-5" />
                  </IconTile>
                  <div>
                    <h3 className="font-semibold leading-snug">No contradictions left behind</h3>
                    <p className="mt-1 text-[0.98rem] leading-relaxed text-ink-soft">
                      A finding never sits beside a normal line that denies it.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="glow-up rounded-[40px] border border-line bg-surface/60 p-5 sm:p-8">
              {/* TODO: real screenshot, finished report with impression. */}
              <ScreenshotFrame label="Report" layout="report" />
            </div>
          </Reveal>
        </section>

        <section className={`${SHELL} pb-20 lg:pb-28`}>
          <Reveal>
            <h2 className={`${H2} mx-auto max-w-[18ch] text-center`}>
              Built so you can <span className="text-teal">sign it.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-[50ch] text-center text-[1.05rem] leading-relaxed text-ink-soft">
              Every line is tied to what you said, and the finished report goes
              into PACS without retyping.
            </p>
          </Reveal>

          <Stagger className="mt-12 grid gap-5 lg:grid-cols-6">
            <Item as="article" lift className={`${CARD} flex flex-col gap-8 overflow-hidden p-7 sm:p-9 lg:col-span-4`}>
              <div className="flex gap-4">
                <IconTile>
                  <ShieldCheck className="h-5 w-5" />
                </IconTile>
                <div>
                  <h3 className="text-[1.4rem] font-semibold leading-snug tracking-[-0.03em]">
                    Every line traced to your words
                  </h3>
                  <p className="mt-2 max-w-[50ch] leading-relaxed text-ink-soft">
                    A wrong side, a number you never gave or a missing “no” is
                    flagged before sign-off.
                  </p>
                </div>
              </div>
              {/* TODO: real screenshot, a flagged line. */}
              <ScreenshotFrame label="Safety checks" layout="flags" />
            </Item>

            <Item as="article" lift className="flex flex-col justify-between gap-10 rounded-3xl bg-teal-tint p-7 sm:p-9 lg:col-span-2">
              <p className="text-[clamp(1.6rem,2.4vw,2.1rem)] font-semibold leading-[1.15] tracking-[-0.03em] text-teal-deep">
                “Change the size to 18&nbsp;mm.”
              </p>
              <div>
                <IconTile onTint>
                  <ArrowsLeftRight className="h-5 w-5" />
                </IconTile>
                <h3 className="mt-4 text-[1.4rem] font-semibold leading-snug tracking-[-0.03em]">
                  Corrections are spoken too
                </h3>
                <p className="mt-2 leading-relaxed text-ink-soft">
                  Say the change. Only that line is rewritten.
                </p>
              </div>
            </Item>

            <Item as="article" lift className={`${CARD} flex flex-col justify-end gap-4 p-7 sm:p-9 lg:col-span-2`}>
              <IconTile>
                <PencilSimple className="h-5 w-5" />
              </IconTile>
              <div>
                <h3 className="text-[1.4rem] font-semibold leading-snug tracking-[-0.03em]">
                  Edit by hand any time
                </h3>
                <p className="mt-2 leading-relaxed text-ink-soft">
                  Every line stays editable. A new case clears everything, so
                  nothing carries between patients.
                </p>
              </div>
            </Item>

            <Item as="article" lift className={`${CARD} flex flex-col gap-8 overflow-hidden p-7 sm:p-9 lg:col-span-4`}>
              <div className="flex gap-4">
                <IconTile warm>
                  <ClipboardText className="h-5 w-5" />
                </IconTile>
                <div>
                  <h3 className="text-[1.4rem] font-semibold leading-snug tracking-[-0.03em]">
                    Already copied, formatted for PACS
                  </h3>
                  <p className="mt-2 max-w-[50ch] leading-relaxed text-ink-soft">
                    Press Ctrl+V in your report editor. Bold headings, Arial 10
                    and spacing survive the paste.
                  </p>
                </div>
              </div>
              {/* TODO: real screenshot, report pasted into a PACS editor. */}
              <ScreenshotFrame label="Pasted into PACS" layout="paste" />
            </Item>
          </Stagger>
        </section>
      </div>

      <section id="how" className={`${SHELL} scroll-mt-24 pb-20 lg:pb-28`}>
        <Reveal>
          <h2 className={`${H2} mx-auto max-w-[20ch] text-center`}>
            Four steps from images to signed report.
          </h2>
        </Reveal>
        <Stagger as="ol" className="relative mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Line joining the four step numbers on wide screens. */}
            <DrawLine className="absolute left-5 right-[calc(25%-1.25rem)] top-5 hidden h-px bg-line lg:block" />
            {STEPS.map((step, index) => (
              <Item as="li" key={step.title} className="relative">
                <Pop className="grid h-10 w-10 place-items-center rounded-full bg-btn text-[0.95rem] font-bold text-btn-text">
                  {index + 1}
                </Pop>
                <h3 className="mt-5 text-[1.25rem] font-semibold leading-snug tracking-[-0.03em]">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-[0.98rem] leading-relaxed text-ink-soft">{step.body}</p>
              </Item>
            ))}
        </Stagger>
      </section>

      <section className={`${SHELL} pb-20 lg:pb-28`}>
        <Reveal className="grid gap-5 md:grid-cols-2">
          <div className={`${CARD} p-8 sm:p-10`}>
            <h2 className="text-[1.6rem] font-semibold tracking-[-0.03em] text-ink-quiet">
              Reporting today
            </h2>
            <ul className="mt-6 flex flex-col gap-4 text-ink-soft">
              {OLD_WAY.map((item) => (
                <li key={item} className="flex gap-3.5">
                  <span className="mt-[0.7rem] h-px w-4 shrink-0 bg-ink-quiet" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-teal-tint p-8 sm:p-10">
            <h2 className="text-[1.6rem] font-semibold tracking-[-0.03em]">
              With Lumen<span className="text-teal">AI</span>
            </h2>
            <ul className="mt-6 flex flex-col gap-4">
              {NEW_WAY.map((item) => (
                <li key={item} className="flex gap-3.5">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-teal text-btn-text">
                    <Check weight="bold" className="h-3.5 w-3.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      <section id="limits" className="scroll-mt-24 px-3 pb-20 sm:px-5 lg:pb-28">
        <Reveal className="mx-auto max-w-[88rem] rounded-[40px] border border-ink/[0.12] bg-surface px-5 py-14 sm:px-8 lg:py-20">
          <div className="mx-auto grid max-w-[72rem] gap-x-16 gap-y-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className={H2}>
                A writing tool.{" "}
                <span className="text-teal lg:block">The reading stays with you.</span>
              </h2>
              <p className="mt-6 max-w-[40ch] text-[1.05rem] leading-relaxed text-ink-soft">
                Nothing reaches a report unless you said it, and nothing leaves
                without your signature.
              </p>
            </div>

            {/* Who does what: LumenAI's limits on the left, the radiologist's part on the right. */}
            <div role="table" aria-label="What LumenAI does not do, and what stays with you">
              <div role="row" className="grid grid-cols-2 gap-6 pb-3 text-[0.95rem] font-semibold">
                <span role="columnheader" className="text-ink-quiet">LumenAI does not</span>
                <span role="columnheader" className="text-teal">You do</span>
              </div>
              {RESPONSIBILITIES.map((row) => (
                <div
                  key={row.not}
                  role="row"
                  className="grid grid-cols-2 gap-6 border-t border-line py-5"
                >
                  <p role="cell" className="flex gap-3 text-[1.1rem] font-semibold leading-snug text-ink-quiet">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-ink/20">
                      <X weight="bold" className="h-3 w-3" />
                    </span>
                    {row.not}
                  </p>
                  <p role="cell" className="flex gap-3 text-[1.1rem] font-semibold leading-snug">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-teal text-btn-text">
                      <Check weight="bold" className="h-3.5 w-3.5" />
                    </span>
                    {row.you}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <section id="centres" className={`${SHELL} scroll-mt-24 pb-20 lg:pb-28`}>
        <Stagger className="grid gap-5 lg:grid-cols-5">
          <Item as="article" lift className="flex flex-col gap-8 rounded-3xl bg-teal-tint p-8 sm:p-10 lg:col-span-3">
            <div>
              <h2 className="text-[clamp(1.7rem,3vw,2.25rem)] font-semibold leading-tight tracking-[-0.03em]">
                For diagnostic centres
              </h2>
              <p className="mt-3 max-w-[46ch] text-[1.05rem] leading-relaxed text-ink-soft">
                One way of reporting across every radiologist who reads for you.
              </p>
            </div>
            <ul className="grid gap-5 sm:grid-cols-3">
              {CENTRE_POINTS.map((point) => (
                <li key={point.title}>
                  <IconTile onTint>{point.icon}</IconTile>
                  <h3 className="mt-4 font-semibold leading-snug">{point.title}</h3>
                  <p className="mt-1 text-[0.95rem] leading-relaxed text-ink-soft">{point.body}</p>
                </li>
              ))}
            </ul>
            <div>
              <SecondaryButton href="/book-a-demo">Talk to us about your centre</SecondaryButton>
            </div>
          </Item>

          <Item as="article" lift className={`${CARD} flex flex-col gap-6 p-8 sm:p-10 lg:col-span-2`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[clamp(1.7rem,3vw,2.25rem)] font-semibold leading-tight tracking-[-0.03em]">
                Where it stands
              </h2>
              <span className="inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber/[0.14] px-3.5 py-1.5 text-[0.9rem] font-semibold text-amber-deep">
                <span className="h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
                In pilot
              </span>
            </div>
            <ul className="flex flex-col">
              {STATUS.map((item) => (
                <li
                  key={item.label}
                  className="border-t border-line py-4 first:border-t-0 first:pt-0 last:pb-0"
                >
                  <p className="text-[0.9rem] text-ink-quiet">{item.label}</p>
                  <p className="mt-0.5 font-semibold leading-snug">{item.value}</p>
                </li>
              ))}
            </ul>
          </Item>
        </Stagger>
      </section>

      <section id="demo" className="scroll-mt-24 px-3 pb-6 sm:px-5">
        <Reveal className="glow-up mx-auto flex max-w-[88rem] flex-col items-center rounded-[40px] border border-line bg-surface/70 px-5 py-20 text-center sm:px-8 lg:py-28">
          <h2 className={`${H2} max-w-[18ch]`}>
            See it on three of <span className="text-teal">your own cases.</span>
          </h2>
          <p className="mt-5 max-w-[44ch] text-[1.05rem] leading-relaxed text-ink-soft">
            Dictate them yourself and watch the report being written, line by line.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <PrimaryButton>Book a demo</PrimaryButton>
            <SecondaryButton href="/login">Sign in</SecondaryButton>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
    </MotionRoot>
  );
}
