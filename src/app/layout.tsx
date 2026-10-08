import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { AmbientBackground } from "@/components/ambient-background";
import { PwaRegister } from "@/components/pwa";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// One UI family (kit rule) + one mono for STR numbers, timers and counters.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-jakarta", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: { default: "PureBloodMD", template: "%s · PureBloodMD" },
  description: "The matchmaker for doctors who want to marry doctors. Est. post-call.",
  applicationName: "PureBloodMD",
  appleWebApp: { capable: true, title: "PureBloodMD", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // Edge to edge when installed; the app shell pads for the notch (pt-safe / pb-safe).
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: next-themes writes the class before React hydrates.
    <html lang="en" className={`${jakarta.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AmbientBackground />
          <div className="pt-safe relative z-20">{children}</div>
          <Toaster position="top-center" richColors closeButton offset={{ top: "calc(env(safe-area-inset-top) + 16px)" }} />
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
