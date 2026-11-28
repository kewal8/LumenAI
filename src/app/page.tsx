import {
  ArrowsLeftRight,
  Browsers,
  Check,
  ClipboardText,
  DeviceMobile,
  FileDashed,
  Files,
  Layout,
  ListChecks,
  Microphone,
  PencilSimple,
  Printer,
  Prohibit,
  SealCheck,
  ShieldCheck,
  Signature,
  UsersThree,
  X,
} from "@phosphor-icons/react/dist/ssr";
import {
  HeroTilt,
  Item,
  MotionRoot,
  Reveal,
  Stagger,
} from "@/components/landing/motion";
import { Compare, FeatureTurns, Highlights, Steps } from "@/components/landing/Highlights";
import { ScreenshotFrame } from "@/components/landing/ScreenshotFrame";
import { KeyCombo } from "@/components/KeyCombo";
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
    icon: <Files className="h-5 w-5" />,
    title: "Most of a report is normal",
    body: "Yet every normal line is still typed, dictated or checked, case after case, until the evening.",
  },
  {
    icon: <Microphone className="h-5 w-5" />,
    title: "Dictation software types every word",
    body: "Even the “sorry, I mean 15 mm”. It hears what you say, not which line a finding belongs to.",
  },
  {
    icon: <PencilSimple className="h-5 w-5" />,
    title: "The report editor is where time goes",
    body: "Headings, spacing and the impression get fixed by hand after the reading is done.",
  },
];

/**
 * A report in outline: the normal lines are bars of these widths, the one
 * finding is the only line with words.
 */
const SAMPLE_LINES = ["78%", null, "92%", "34%", "66%", "58%", "84%"];

const STEPS = [
  { title: "Open a template, or start blank", body: "Beside your image viewer, or on its own. A template starts the report complete and normal." },
  { title: "Dictate the abnormal", body: "Speak, stop, and the report updates. Correct yourself out loud." },
  { title: "Review and finalise", body: "Read it once, with anything doubtful flagged. It is saved under the patient." },
  { title: "Pasted, or printed", body: <>Paste it with <KeyCombo combo="Ctrl+V" /> into your reporting software, or print it signed on your letterhead.</> },
];

const OLD_WAY = [
  "Type or dictate every line, normal ones included",
  "Retype a line every time you misspeak",
  "Write the impression from scratch",
  "Proofread for a wrong side or a lost “no”",
  "Fix headings and spacing in the report editor",
];

const NEW_WAY = [
  "Say only what is abnormal",
  "Correct yourself out loud: “sorry, 15 mm”",
  "Impression written from your findings",
  "Side, numbers and negation checked against your words",
  "Paste it in one press, or print it signed",
];

const RESPONSIBILITIES = [
  { not: "Read the images", you: "Read every study yourself" },
  { not: "Add a diagnosis you did not dictate", you: "Decide what the report says" },
  { not: "Sign or send the report", you: "Review, sign and send it" },
];

const CENTRE_POINTS = [
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Errors caught before signing",
    body: "A wrong side, a number nobody gave or a missing “no” is flagged before a report is signed.",
  },
  {
    icon: <Files className="h-5 w-5" />,
    title: "Templates shared once",
    body: "Make a template once and every radiologist in the centre reports from it.",
  },
  {
    icon: <Layout className="h-5 w-5" />,
    title: "One report layout",
    body: "Every report leaves in the format your centre already uses, pasted or printed on your letterhead.",
  },
  {
    icon: <UsersThree className="h-5 w-5" />,
    title: "Roles for your team",
    body: "Owner, admin and radiologist accounts under one centre.",
  },
  {
    icon: <Browsers className="h-5 w-5" />,
    title: "Nothing to install",
    body: "Runs in the browser, beside your viewer or on its own. No server, no IT project.",
  },
  {
    icon: <DeviceMobile className="h-5 w-5" />,
    title: "On a laptop or a phone",
    body: "Radiologists can report from the centre, from home or on the move.",
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
          <p className="hero-in mt-6 max-w-[50ch] text-[1.1rem] leading-relaxed text-ink-soft [--i:1]">
            Say only your findings. Radmatic writes the full report in your template,
            checks every line against your words, and gives it to you ready to paste, or prints it signed.
            Less typing, fewer slips, and you finish on time.
          </p>
          <div className="hero-in mt-9 flex flex-wrap items-center justify-center gap-3 [--i:2]">
            <PrimaryButton>Book a demo</PrimaryButton>
            <SecondaryButton href="#features">See how it works</SecondaryButton>
          </div>
          {/* Three facts doctors and centres ask about first. */}
          <ul className="hero-in mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[0.95rem] font-semibold text-ink-soft [--i:2]">
            <li className="flex items-center gap-2">
              <ShieldCheck weight="fill" className="h-4 w-4 text-teal" />
              Nothing added that you did not say
            </li>
            <li className="flex items-center gap-2">
              <Browsers weight="fill" className="h-4 w-4 text-teal" />
              Nothing to install
            </li>
            <li className="flex items-center gap-2">
              <DeviceMobile weight="fill" className="h-4 w-4 text-teal" />
              Works on your phone too
            </li>
          </ul>

          <div className="hero-in mt-14 w-full max-w-[64rem] [--i:3]">
            <HeroTilt>
              <ScreenshotFrame label="Report screen" layout="desk" className="text-left" />
            </HeroTilt>
          </div>
        </div>
      </header>

      <section className="px-3 pt-20 sm:px-5 lg:pt-28">
        <Reveal className="on-night mx-auto max-w-[88rem] rounded-[40px] bg-night px-5 py-20 text-on-night sm:px-8 lg:py-24">
          <div className="mx-auto grid max-w-[72rem] items-center gap-x-16 gap-y-12 lg:grid-cols-2">
            <div>
              <h2 className={H2}>Reporting still means typing what you already know.</h2>
              {/* The point made visible: one finding in a report of normal lines. */}
              <figure className="mt-10 rounded-3xl border border-night-line bg-on-night/[0.05] p-5 sm:p-7">
                <Stagger as="ul" className="flex flex-col gap-3.5" aria-hidden="true">
                  {SAMPLE_LINES.map((width, index) =>
                    width ? (
                      <Item as="li" key={index}>
                        <span className="block h-2.5 rounded-full bg-on-night/[0.14]" style={{ width }} />
                      </Item>
                    ) : (
                      <Item
                        as="li"
                        key={index}
                        className="-mx-2 w-fit rounded-xl bg-teal-glow/[0.16] px-3 py-2 font-semibold leading-snug text-on-night"
                      >
                        Small acute infarct, left basal ganglia.
                      </Item>
                    ),
                  )}
                </Stagger>
                <figcaption className="mt-6 text-[0.95rem] leading-relaxed text-on-night-soft">
                  One finding. The rest is normal, and still gets written.
                </figcaption>
              </figure>
            </div>
            <Stagger as="ul" className="lg:pt-2">
              {PROBLEMS.map((problem) => (
                <Item
                  as="li"
                  key={problem.title}
                  className="flex gap-4 border-t border-night-line py-7 first:border-t-0 first:pt-0 last:pb-0"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-on-night/[0.1] text-teal-glow">
                    {problem.icon}
                  </span>
                  <div>
                    <h3 className="text-[1.35rem] font-semibold leading-snug">{problem.title}</h3>
                    <p className="mt-2 max-w-[44ch] leading-relaxed text-on-night-soft">
                      {problem.body}
                    </p>
                  </div>
                </Item>
              ))}
            </Stagger>
          </div>
        </Reveal>
      </section>

      <div id="features" className="scroll-mt-24">
        <section className={`${SHELL} py-20 lg:py-28`}>
          <Reveal>
            <FeatureTurns
              intro={
                <>
                  <h2 className={H2}>
                    Say what is abnormal.{" "}
                    <span className="text-teal">Everything else stays normal.</span>
                  </h2>
                  <p className="mt-6 max-w-[48ch] text-[1.05rem] leading-relaxed text-ink-soft">
                    Look at the images and talk, in any order. Radmatic starts from
                    your template and changes only the lines you mention.
                  </p>
                </>
              }
              points={[
                {
                  icon: <IconTile><Microphone className="h-5 w-5" /></IconTile>,
                  title: "Medical speech recognition",
                  body: "Clinical vocabulary, with Indian English supported.",
                  mock: <ScreenshotFrame label="Dictation" layout="dictation" />,
                },
                {
                  icon: <IconTile warm><Browsers className="h-5 w-5" /></IconTile>,
                  title: "With your own software, or on its own",
                  body: "A browser tab next to your viewer, or a complete reporting desk by itself. Nothing to install.",
                  mock: <ScreenshotFrame label="Beside your viewer" layout="beside" />,
                },
                {
                  icon: <IconTile><DeviceMobile className="h-5 w-5" /></IconTile>,
                  title: "On your phone, like an app",
                  body: "Add it to your home screen. Dictate, check and copy a report wherever you are.",
                  mock: <ScreenshotFrame label="On your phone" layout="phone" />,
                },
              ]}
            />
          </Reveal>
        </section>

        <section className={`${SHELL} pb-20 lg:pb-28`}>
          <Reveal>
            <FeatureTurns
              flip
              intro={
                <>
                  <h2 className={H2}>
                    Your template, filled in.{" "}
                    <span className="text-teal">Impression included.</span>
                  </h2>
                  <p className="mt-6 max-w-[48ch] text-[1.05rem] leading-relaxed text-ink-soft">
                    Each finding replaces the line it belongs to. The impression is
                    written from the abnormal lines only.
                  </p>
                </>
              }
              points={[
                {
                  icon: <IconTile><Signature className="h-5 w-5" /></IconTile>,
                  title: "Impression written for you",
                  body: "Built from your abnormal lines, ready to read and sign.",
                  mock: <ScreenshotFrame label="Report" layout="report" />,
                },
                {
                  icon: <IconTile><ListChecks className="h-5 w-5" /></IconTile>,
                  title: "Findings land in the right section",
                  body: "Speak in any order. The report keeps the order of your template.",
                  mock: <ScreenshotFrame label="Report" layout="order" />,
                },
                {
                  icon: <IconTile warm><Prohibit className="h-5 w-5" /></IconTile>,
                  title: "No contradictions left behind",
                  body: "A finding never sits beside a normal line that denies it.",
                  mock: <ScreenshotFrame label="Report" layout="replace" />,
                },
              ]}
            />
          </Reveal>
        </section>

        {/* No template: the report is built from the positive findings alone. */}
        <section className={`${SHELL} pb-20 lg:pb-28`}>
          <Reveal className="grid items-center gap-x-16 gap-y-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-teal/50 bg-teal-tint px-3 py-1 text-[0.85rem] font-semibold text-teal-deep">
                <FileDashed weight="bold" className="h-4 w-4" />
                Start from blank
              </span>
              <h2 className={`${H2} mt-5`}>
                No template? <span className="text-teal">Just the findings.</span>
              </h2>
              <p className="mt-6 max-w-[48ch] text-[1.05rem] leading-relaxed text-ink-soft">
                For a study you have no template for, start from blank. Say only what you see.
                Radmatic writes each finding as a finished line and builds the impression from them.
              </p>
              <ul className="mt-9 flex flex-col gap-6">
                <li className="flex gap-4">
                  <IconTile>
                    <ListChecks className="h-5 w-5" />
                  </IconTile>
                  <div>
                    <h3 className="font-semibold leading-snug">Positive findings only</h3>
                    <p className="mt-1 text-[0.98rem] leading-relaxed text-ink-soft">
                      Nothing normal is added that you did not say.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <IconTile>
                    <ShieldCheck className="h-5 w-5" />
                  </IconTile>
                  <div>
                    <h3 className="font-semibold leading-snug">The same checks as every report</h3>
                    <p className="mt-1 text-[0.98rem] leading-relaxed text-ink-soft">
                      Side, size and negation are checked against your words.
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            {/* A worked example, in the app's own report style. */}
            <div className="glow-up rounded-[40px] border border-line bg-surface/60 p-5 sm:p-8">
              <div className={`${CARD} flex flex-col gap-4 p-5 sm:p-6`}>
                <p className="self-end rounded-[1.1rem] rounded-br-md bg-amber-tint px-3.5 py-2 text-[0.94rem] leading-snug text-ink">
                  Right kidney, twelve mm stone in the lower pole, mild hydronephrosis. Gallbladder wall five mm.
                </p>
                <div className="rounded-2xl border border-line bg-canvas/60 px-5 py-4 font-[Arial,sans-serif] text-[0.92rem] leading-relaxed text-ink">
                  <p className="font-bold">FINDINGS:</p>
                  <p>There is a 12 mm calculus in the lower pole of the right kidney with mild hydronephrosis.</p>
                  <p>The gallbladder wall is thickened, measuring 5 mm.</p>
                  <p className="mt-3 font-bold">IMPRESSION:</p>
                  <p>12 mm right lower pole renal calculus with mild hydronephrosis.</p>
                  <p>Gallbladder wall thickening (5 mm).</p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <section className={`${SHELL} pb-20 lg:pb-28`}>
          <Reveal>
            <h2 className={`${H2} mx-auto max-w-[20ch] text-center`}>
              Nothing in the report <span className="text-teal">that you did not say.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-[54ch] text-center text-[1.05rem] leading-relaxed text-ink-soft">
              Radmatic writes up your findings. It does not add a diagnosis, a stage or a
              differential of its own, and every line is checked against your words before you
              sign. The finished report pastes into your reporting software without retyping, or leaves signed, on your letterhead.
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
              <ScreenshotFrame label="Safety checks" layout="flags" />
            </Item>

            <Item as="article" lift className="flex flex-col justify-between gap-10 rounded-3xl bg-teal-tint p-7 sm:p-9 lg:col-span-2">
              <p className="text-[clamp(1.6rem,2.4vw,2.1rem)] font-semibold leading-[1.15] tracking-[-0.03em] text-teal-deep">
                “18&nbsp;mm… sorry, 15&nbsp;mm.”
              </p>
              <div>
                <IconTile onTint>
                  <ArrowsLeftRight className="h-5 w-5" />
                </IconTile>
                <h3 className="mt-4 text-[1.4rem] font-semibold leading-snug tracking-[-0.03em]">
                  Edit by talking
                </h3>
                <p className="mt-2 leading-relaxed text-ink-soft">
                  Correct yourself the way you speak. Only 15&nbsp;mm is written, in the line you meant.
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
                    Copy in one press, formatting kept
                  </h3>
                  <p className="mt-2 max-w-[50ch] leading-relaxed text-ink-soft">
                    Press <KeyCombo combo="Ctrl+V" /> in your report editor. Bold headings, Arial 10
                    and spacing survive the paste.
                  </p>
                </div>
              </div>
              <ScreenshotFrame label="Your reporting software" layout="paste" />
            </Item>

            {/* The other way out: no PACS needed to finish a report. */}
            <Item as="article" lift className="on-night flex flex-col gap-8 rounded-3xl bg-night p-7 text-on-night sm:p-9 lg:col-span-6 lg:flex-row lg:items-center lg:gap-12">
              <div className="lg:max-w-[24rem]">
                <h3 className="text-[1.4rem] font-semibold leading-snug tracking-[-0.03em]">
                  Nothing to paste into? It finishes the report itself.
                </h3>
                <p className="mt-2 leading-relaxed text-on-night-soft">
                  Finalise, sign and print from Radmatic. Every report is kept, ready to open again.
                </p>
              </div>
              <ul className="grid flex-1 gap-3 sm:grid-cols-3">
                {[
                  { icon: <SealCheck className="h-5 w-5" />, title: "Finalise and save", body: "Kept in your reports" },
                  { icon: <Signature className="h-5 w-5" />, title: "Your signature", body: "Under every report" },
                  { icon: <Printer className="h-5 w-5" />, title: "Print or PDF", body: "On your letterhead" },
                ].map((item) => (
                  <li key={item.title} className="flex items-center gap-3.5 rounded-2xl border border-night-line px-4 py-3.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-on-night/[0.1] text-teal-glow">
                      {item.icon}
                    </span>
                    <span>
                      <span className="block font-semibold leading-snug">{item.title}</span>
                      <span className="block text-[0.92rem] text-on-night-soft">{item.body}</span>
                    </span>
                  </li>
                ))}
              </ul>
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
        <Steps steps={STEPS} />
      </section>

      <section className={`${SHELL} pb-20 lg:pb-28`}>
        <Reveal>
          <Compare pairs={OLD_WAY.map((old, index) => ({ old, now: NEW_WAY[index] }))} />
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

            {/* Who does what: Radmatic's limits on the left, the radiologist's part on the right. */}
            <div role="table" aria-label="What Radmatic does not do, and what stays with you">
              <div role="row" className="grid grid-cols-2 gap-6 pb-3 text-[0.95rem] font-semibold">
                <span role="columnheader" className="text-ink-quiet">Radmatic does not</span>
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
          <Item as="article" className="flex flex-col gap-8 rounded-3xl bg-teal-tint p-8 sm:p-10 lg:col-span-3">
            <div>
              <h2 className="text-[clamp(1.7rem,3vw,2.25rem)] font-semibold leading-tight tracking-[-0.03em]">
                For radiology centres
              </h2>
              <p className="mt-3 max-w-[50ch] text-[1.05rem] leading-relaxed text-ink-soft">
                Faster turnaround from every radiologist who reads for you, one way of
                reporting, and every report checked before it is signed.
              </p>
            </div>
            <Highlights points={CENTRE_POINTS} label="What a centre gets" />
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
            <SecondaryButton href="/signup">Create an account</SecondaryButton>
          </div>
          {/* The price, in the open. */}
          <p className="mt-8 max-w-[52ch] text-[0.98rem] leading-relaxed text-ink-soft">
            <span className="font-semibold text-ink">From ₹1,700 a month</span> + GST for 100 AI report
            updates a day. Editing, copying and printing are always free. Centres:{" "}
            <a href="/book-a-demo" className="font-semibold text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
              talk to us
            </a>
            .
          </p>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
    </MotionRoot>
  );
}
