import {
  Show,
  SignInButton,
  SignUpButton,
} from "@clerk/nextjs";
import { RoomHub } from "@/components/room-hub/room-hub";

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
          className="flex min-h-screen w-full items-center justify-start bg-cover bg-left px-6 sm:bg-center sm:px-16"
          style={{
            backgroundImage:
              "url('/assets/menu-noir.png')",
          }}
        >
          <div className="flex w-full max-w-xs flex-col gap-3">
            <h1 className="game-title mb-8 text-5xl leading-none sm:text-7xl">
              REDACTED
            </h1>
            <SignInButton>
              <button className="game-menu-button w-full text-xl uppercase">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton>
              <button className="game-menu-button w-full text-xl uppercase">
                Sign up
              </button>
            </SignUpButton>
          </div>
        </section>
      </Show>

      <Show when="signed-in">
        <section
          className="relative flex h-screen w-full items-center justify-start overflow-hidden bg-[#071014] bg-cover bg-left sm:bg-center"
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
