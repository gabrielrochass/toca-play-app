import type { Metadata } from "next";
import { Silkscreen, Rubik, VT323 } from "next/font/google";
import { cookies } from "next/headers";
import { THEME_COOKIE, themeInitScript } from "@/lib/theme";
import "./globals.css";

const silkscreen = Silkscreen({
  variable: "--font-silkscreen",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  display: "swap",
});

const vt323 = VT323({
  variable: "--font-vt323",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TocaPlay — Check-in",
  description:
    "Check-in do ministério TocaPlay — cadastro, entrada e saída dos pré-adolescentes.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Explicit light/dark can render server-side; "system"/absent is resolved by
  // the pre-paint inline script below (which also avoids any theme flash).
  const choice = (await cookies()).get(THEME_COOKIE)?.value;
  const serverTheme = choice === "light" || choice === "dark" ? choice : undefined;
  return (
    <html
      lang="pt-BR"
      data-theme={serverTheme}
      suppressHydrationWarning
      className={`${silkscreen.variable} ${rubik.variable} ${vt323.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
