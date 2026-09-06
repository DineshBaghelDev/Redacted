import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppConvexProvider } from "@/components/convex-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Redacted",
  description: "A Next.js app with shadcn/ui and Convex ready.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppConvexProvider>{children}</AppConvexProvider>
      </body>
    </html>
  );
}
