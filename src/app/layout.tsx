import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Hanken_Grotesk,
} from "next/font/google";
import { SpeedMeter } from "@/components/SpeedMeter";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LumenAI",
  description:
    "Dictate only the abnormal findings. LumenAI writes the radiology report in your template. Paste it into PACS, or finalise, sign and print it in LumenAI.",
};

// Phones: the page reaches under the notch and home bar (the app's bars pad
// themselves with the safe-area insets), and the browser bar takes the page colour.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fefefe" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1514" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${hanken.variable} h-full antialiased`}
    >
      {/* Browser extensions add attributes to <body> before React loads. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <SpeedMeter />
      </body>
    </html>
  );
}
