import type { Metadata } from "next";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
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
        <ClerkProvider appearance={{ theme: shadcn }}>
          <AppConvexProvider>
            <header className="flex h-16 items-center justify-end gap-3 border-b px-6">
              <Show when="signed-out">
                <SignInButton>
                  <button className="text-sm font-medium text-foreground">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton>
                  <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                    Sign up
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </header>
            {children}
          </AppConvexProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
