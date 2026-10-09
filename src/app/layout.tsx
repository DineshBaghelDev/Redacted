import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark, shadcn } from "@clerk/ui/themes";
import { Geist_Mono, Pixelify_Sans } from "next/font/google";
import { AppConvexProvider } from "@/components/convex-provider";
import "@xyflow/react/dist/style.css";
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
  description: "A cooperative cyberpunk detective game.",
};

/**
 * Provides the root HTML structure and application providers for page content.
 *
 * @param children - The content rendered within the application layout
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${pixelifySans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full vsc-initialized">
        <ClerkProvider appearance={{ theme: [shadcn, dark], variables: { colorPrimary: "#e8ac51", colorBackground: "#0b1a1c", borderRadius: "0" } }}>
          <AppConvexProvider>{children}</AppConvexProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
