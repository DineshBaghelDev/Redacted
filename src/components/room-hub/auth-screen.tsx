import type { ReactNode } from "react";
import Link from "next/link";

export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <main className="game-ui game-menu-scene flex min-h-screen items-center bg-[#071014] bg-cover px-5 py-10 sm:px-14" style={{ backgroundImage: "url('/assets/menu-noir.png')" }}>
      <div className="relative z-10 flex w-full max-w-md flex-col items-start gap-6">
        <Link className="game-menu-button text-sm uppercase" href="/">← Back to menu</Link>
        <h1 className="game-title text-4xl sm:text-6xl">REDACTED</h1>
        {children}
      </div>
    </main>
  );
}
