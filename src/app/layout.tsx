import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/providers";
import { IS_CLERK_AUTH } from "@/lib/dev-auth";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Badger — Your friendly money companion",
  description:
    "Track spending, plan budgets, manage loans and reach your goals — without the accounting headache.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const tree = (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );

  // Local-auth mode runs without ClerkProvider (and without Clerk keys).
  if (IS_CLERK_AUTH) return <ClerkProvider>{tree}</ClerkProvider>;
  return tree;
}
