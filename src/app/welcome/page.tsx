import Link from "next/link";
import { ThemeToggle } from "@/components/landing/ThemeToggle";
import { WelcomeScreen } from "@/components/welcome/WelcomeScreen";
import { requireUser } from "@/lib/auth/session";
import { greetingName } from "@/lib/greeting";
import { editorLocked } from "@/lib/subscription";
import { Wordmark } from "@/components/brand/Logo";

// Greets the signed-in doctor by name, so it is rendered on demand.
export const instant = false;

export const metadata = { title: "Welcome · Radmatic" };

export default async function WelcomePage() {
  const user = await requireUser();
  const locked = await editorLocked(user);
  const firstName = greetingName(user.name);

  return (
    <div className="landing flex min-h-[100dvh] flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-[76rem] items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="text-[1.35rem] font-bold tracking-[-0.04em]">
          <Wordmark className="h-7 w-auto" />
        </Link>
        <ThemeToggle />
      </header>
      <WelcomeScreen firstName={firstName} locked={locked} />
    </div>
  );
}
