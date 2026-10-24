import { redirect } from "next/navigation";
import { BrandPanel } from "@/components/BrandPanel";
import { SignInForm } from "@/components/SignInForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getSession, isDemoLoginEnabled } from "@/lib/auth";
import { isKeycloakEnabled, safeReturnPath } from "@/lib/keycloak";

// Shown when /api/auth/* sends someone back here with ?error=...
const ERROR_MESSAGES: Record<string, string> = {
  denied: "Sign-in was cancelled. Try again when you're ready.",
  expired: "That sign-in took too long or was already used. Please sign in again.",
  keycloak: "Keycloak couldn't complete the sign-in. Try again, or contact IT if it keeps happening.",
  unavailable: "The sign-in service isn't responding right now. Try again in a minute.",
  not_configured: "Keycloak sign-in isn't set up on this server yet.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  if (await getSession()) {
    redirect("/dashboard");
  }

  const { from, error } = await searchParams;

  return (
    <section className="relative grid min-h-screen grid-cols-1 md:grid-cols-2">
      <BrandPanel />
      <div className="relative">
        <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>
        <SignInForm
          keycloakEnabled={isKeycloakEnabled()}
          demoEnabled={isDemoLoginEnabled()}
          from={safeReturnPath(from)}
          error={error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.keycloak) : null}
        />
      </div>
    </section>
  );
}
