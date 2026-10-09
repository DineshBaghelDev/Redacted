import {
  Show,
  SignInButton,
  SignUpButton,
} from "@clerk/nextjs";
import { RoomHub } from "@/components/room-hub/room-hub";
import { GameIcon } from "@/components/room-hub/game-icon";

/**
 * Renders the authentication-dependent home page.
 *
 * @returns The home page with sign-in and sign-up controls for signed-out users, or the room hub and user menu for signed-in users.
 */
export default function Home() {
  return (
    <main className="game-ui min-h-screen w-full">
      <Show when="signed-out">
        <section
          className="game-menu-scene flex min-h-screen w-full items-center justify-start bg-cover px-6 sm:px-16"
          style={{
            backgroundImage:
              "url('/assets/menu-noir.png')",
          }}
        >
          <div className="relative z-10 flex w-full max-w-xs flex-col gap-3">
            <h1 className="game-title mb-8 text-5xl leading-none sm:text-7xl">
              REDACTED
            </h1>
            <SignInButton>
              <button className="game-menu-button w-full text-xl uppercase">
                <GameIcon name="badge" />
                Sign in
              </button>
            </SignInButton>
            <SignUpButton>
              <button className="game-menu-button w-full text-xl uppercase">
                <GameIcon name="case" />
                Sign up
              </button>
            </SignUpButton>
          </div>
        </section>
      </Show>

      <Show when="signed-in">
        <section
          className="game-menu-scene relative flex h-screen w-full items-center justify-start overflow-hidden bg-[#071014] bg-cover"
          style={{
            backgroundImage:
              "url('/assets/menu-noir.png')",
          }}
        >
          <RoomHub />
        </section>
      </Show>
    </main>
  );
}
