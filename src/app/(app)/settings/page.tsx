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

export const metadata = { title: "Settings · LumenAI" };

export default async function SettingsPage() {
  const user = await requireUser();
  const [row] = await db()`select paste_profile from users where id = ${user.id}`;

  return (
    <Page narrow>
      <PageHeader title="Settings" description="Your account and how reports are formatted." />

      <Section title="Profile">
        <ProfileForm name={user.name} email={user.email} />
      </Section>

      <Section
        title="Report paste format"
        description="How a report is formatted when it is copied for your PACS editor. Change it if the paste loses its font or headings."
      >
        <PasteFormatForm profile={parsePasteProfile(row?.paste_profile)} />
      </Section>

      {user.org?.role === "owner" && (
        <Section title="Organisation" description="Shown to everyone in your team.">
          <OrganisationForm name={user.org.name} />
        </Section>
      )}

      <Section title="Password">
        <PasswordForm />
      </Section>
    </Page>
  );
}
