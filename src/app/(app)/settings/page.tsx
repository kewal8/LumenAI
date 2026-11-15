import {
  Buildings,
  ClipboardText,
  FileText,
  Keyboard,
  LockKey,
  Signature,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";
import { LetterheadForm, ShortcutsForm, SignatureForm } from "@/components/app/ReportIdentityForms";
import {
  OrganisationForm,
  PasswordForm,
  PasteFormatForm,
  ProfileForm,
} from "@/components/app/SettingsForms";
import { Page, PageHeader, Section } from "@/components/app/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { parsePasteProfile } from "@/lib/reportFormat";
import { getIdentity } from "@/lib/reportIdentity";
import { parseShortcuts } from "@/lib/shortcuts";

// Reads the signed-in user's data on every request, so it is rendered on demand.
export const instant = false;

export const metadata = { title: "Settings · LumenAI" };

export default async function SettingsPage() {
  const user = await requireUser();
  const [[row], identity] = await Promise.all([
    db()`select paste_profile, shortcuts from users where id = ${user.id}`,
    getIdentity(user.id),
  ]);

  return (
    <Page>
      <PageHeader title="Settings" description="Your account, and how your reports look and are signed." />

      <Section title="Profile" icon={<UserCircle weight="fill" className="h-5 w-5" />}>
        <ProfileForm name={user.name} email={user.email} />
      </Section>

      <Section
        icon={<ClipboardText weight="fill" className="h-5 w-5" />}
        title="Report paste format"
        description="How a report is formatted when it is copied for your PACS editor. Change it if the paste loses its font or headings."
      >
        <PasteFormatForm profile={parsePasteProfile(row?.paste_profile)} />
      </Section>

      <Section
        icon={<Signature weight="fill" className="h-5 w-5" />}
        title="Signature"
        description="Added under the impression of every report you copy, print or save as PDF."
      >
        <SignatureForm text={identity.signatureText} image={identity.signatureImage} />
      </Section>

      <Section
        icon={<FileText weight="fill" className="h-5 w-5" />}
        title="Report letterhead"
        description="Header and footer for reports you print or save as PDF. A report copied for PACS never carries it."
      >
        <LetterheadForm identity={identity} />
      </Section>

      <Section
        icon={<Keyboard weight="fill" className="h-5 w-5" />}
        title="Keyboard shortcuts"
        description="Work on the report screen without the mouse."
      >
        <ShortcutsForm shortcuts={parseShortcuts(row?.shortcuts)} />
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

      <Section title="Password" icon={<LockKey weight="fill" className="h-5 w-5" />}>
        <PasswordForm />
      </Section>
    </Page>
  );
}
