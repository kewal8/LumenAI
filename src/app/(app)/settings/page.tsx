import { Buildings, ClipboardText, LockKey, UserCircle } from "@phosphor-icons/react/dist/ssr";
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

// Reads the signed-in user's data on every request, so it is rendered on demand.
export const instant = false;

export const metadata = { title: "Settings · LumenAI" };

export default async function SettingsPage() {
  const user = await requireUser();
  const [row] = await db()`select paste_profile from users where id = ${user.id}`;

  return (
    <Page>
      <PageHeader title="Settings" description="Your account and how reports are formatted." />

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
