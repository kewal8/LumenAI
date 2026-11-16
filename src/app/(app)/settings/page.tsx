import Link from "next/link";
import {
  Buildings,
  ClipboardText,
  FileText,
  Gift,
  Keyboard,
  Lightning,
  Microphone,
  Signature,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";
import {
  FloatingBoxSetting,
  LetterheadForm,
  ShortcutsForm,
  SignatureForm,
} from "@/components/app/ReportIdentityForms";
import {
  OrganisationForm,
  ChangePassword,
  PasteFormatForm,
  ProfileForm,
} from "@/components/app/SettingsForms";
import { MacrosManager } from "@/components/app/MacrosManager";
import { ReferralShare } from "@/components/app/Referrals";
import { Page, PageHeader, Section, buttonClass } from "@/components/app/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { parsePasteProfile } from "@/lib/reportFormat";
import { listMacros } from "@/lib/macroStore";
import { getIdentity } from "@/lib/reportIdentity";
import { parseShortcuts } from "@/lib/shortcuts";

// Reads the signed-in user's data on every request, so it is rendered on demand.
export const instant = false;

export const metadata = { title: "Settings · LumenAI" };

const TABS = [
  { id: "profile", label: "Profile", icon: UserCircle },
  { id: "signature", label: "Signature", icon: Signature },
  { id: "letterhead", label: "Letterhead", icon: FileText },
  { id: "format", label: "Paste format", icon: ClipboardText },
  { id: "dictation", label: "Dictation", icon: Microphone },
  { id: "macros", label: "Macros", icon: Lightning },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
  { id: "referrals", label: "Referrals", icon: Gift },
] as const;

type Tab = (typeof TABS)[number]["id"];

// One topic at a time, each with the whole width, instead of one long page.
export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const [user, { tab: wanted }] = await Promise.all([requireUser(), searchParams]);
  const tab: Tab = TABS.find((item) => item.id === wanted)?.id ?? "profile";
  const [[row], identity, macros] = await Promise.all([
    db()`select paste_profile, shortcuts, floating_box, referral_code from users where id = ${user.id}`,
    getIdentity(user.id),
    tab === "macros" ? listMacros(user.id) : [],
  ]);

  return (
    <Page>
      <PageHeader title="Settings" description="Your account, and how your reports look and are signed." />

      <nav aria-label="Settings" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            href={id === "profile" ? "/settings" : `/settings?tab=${id}`}
            aria-current={id === tab ? "page" : undefined}
            className={`inline-flex h-11 shrink-0 items-center gap-2.5 rounded-full px-4 text-[0.98rem] font-semibold transition-colors ${
              id === tab
                ? "bg-ink text-surface"
                : "border border-ink/25 bg-surface text-ink hover:border-ink/60 hover:bg-ink/[0.05]"
            }`}
          >
            <Icon weight={id === tab ? "fill" : "regular"} className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>

      {tab === "profile" && (
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <Section
            title="Profile"
            description="Your name, the email you sign in with, and your password."
            icon={<UserCircle weight="fill" className="h-5 w-5" />}
          >
            <div className="flex max-w-2xl flex-col gap-6">
              <ProfileForm name={user.name} email={user.email} />
              <ChangePassword />
            </div>
          </Section>
          {user.org?.role === "owner" && (
            <Section
              icon={<Buildings weight="fill" className="h-5 w-5" />}
              title="Organisation"
              description="Shown to everyone in your team."
            >
              <OrganisationForm name={user.org.name} />
            </Section>
          )}
        </div>
      )}

      {tab === "signature" && (
        <Section
          icon={<Signature weight="fill" className="h-5 w-5" />}
          title="Signature"
          description="Added under the impression of every report you copy, print or save as PDF."
        >
          <SignatureForm text={identity.signatureText} image={identity.signatureImage} />
        </Section>
      )}

      {tab === "letterhead" && (
        <Section
          icon={<FileText weight="fill" className="h-5 w-5" />}
          title="Report letterhead"
          description="Header and footer for reports you print or save as PDF. A report copied for PACS never carries it."
        >
          <LetterheadForm identity={identity} />
        </Section>
      )}

      {tab === "format" && (
        <Section
          icon={<ClipboardText weight="fill" className="h-5 w-5" />}
          title="Report paste format"
          description="How a report is formatted when it is copied for your PACS editor. Change it if the paste loses its font or headings."
        >
          <PasteFormatForm profile={parsePasteProfile(row?.paste_profile)} />
        </Section>
      )}

      {tab === "dictation" && (
        <Section
          icon={<Microphone weight="fill" className="h-5 w-5" />}
          title="Dictation"
          description="How speaking works on the report screen."
        >
          <FloatingBoxSetting enabled={row?.floating_box !== false} />
        </Section>
      )}

      {tab === "macros" && (
        <Section
          icon={<Lightning weight="fill" className="h-5 w-5" />}
          title="Macros"
          description="Short forms for sentences you use often. They work the same when you speak or type."
        >
          <MacrosManager macros={macros} />
        </Section>
      )}

      {tab === "shortcuts" && (
        <Section
          icon={<Keyboard weight="fill" className="h-5 w-5" />}
          title="Keyboard shortcuts"
          description="Work on the report screen without the mouse."
        >
          <ShortcutsForm shortcuts={parseShortcuts(row?.shortcuts)} />
        </Section>
      )}

      {tab === "referrals" && (
        <Section
          icon={<Gift weight="fill" className="h-5 w-5" />}
          title="Referral code"
          description="Share it with colleagues. When they pay for their first plan, your account gets bonus AI updates."
        >
          <div className="flex flex-col gap-6">
            <ReferralShare
              code={row?.referral_code ?? ""}
              reward="Half a month of their plan's AI updates, used after your daily allowance runs out."
            />
            <div>
              <Link href="/referrals" className={buttonClass.secondary}>
                See who used your code
              </Link>
            </div>
          </div>
        </Section>
      )}
    </Page>
  );
}
