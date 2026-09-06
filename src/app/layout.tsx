import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { Geist_Mono, Pixelify_Sans } from "next/font/google";
import { AppConvexProvider } from "@/components/convex-provider";
import "./globals.css";

const pixelifySans = Pixelify_Sans({
  variable: "--font-pixelify-sans",
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

/**
 * Provides the root HTML structure and application providers for the page content.
 *
 * @param children - The content rendered within the application layout
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${pixelifySans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ClerkProvider appearance={{ theme: shadcn }}>
          <AppConvexProvider>{children}</AppConvexProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
