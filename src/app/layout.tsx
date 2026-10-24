import type { Metadata } from "next";
import "./globals.css";
import { archivo, jetbrainsMono, publicSans } from "@/lib/fonts";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionProvider } from "@/components/SessionProvider";
import { getSession, toCookieSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Bhatia Brothers Staff Portal",
  description: "One sign-in for every Bhatia Brothers staff app and agent.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialSession = toCookieSession(await getSession());

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${archivo.variable} ${publicSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-body text-[15px] leading-relaxed antialiased">
        <ThemeProvider>
          <SessionProvider initialSession={initialSession}>{children}</SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
