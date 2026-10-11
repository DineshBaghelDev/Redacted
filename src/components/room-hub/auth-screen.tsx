import type { ReactNode } from "react";
import Link from "next/link";
import { GameLogo } from "./game-logo";
import { ControlIcon } from "./control-icon";

export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <main className="game-ui game-menu-scene flex min-h-screen items-center bg-[#071014] bg-cover px-5 py-10 sm:px-14" style={{ backgroundImage: "url('/assets/menu-noir.png')" }}>
      <div className="relative z-10 flex w-full max-w-md flex-col items-start gap-6">
        <Link className="game-menu-button text-sm uppercase" href="/"><ControlIcon name="back" />Back to menu</Link>
        <GameLogo />
        {children}
      </div>
    </main>
  );
}
