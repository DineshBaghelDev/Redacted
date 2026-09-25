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
    <main className="min-h-screen w-full bg-[#050712] text-cyan-100">
      <Show when="signed-out">
        <section
          className="flex min-h-screen w-full items-center justify-start border-0 bg-cover bg-center px-6 shadow-[inset_0_0_24px_rgba(34,211,238,0.22)] sm:px-16"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(5,7,18,0.82), rgba(5,7,18,0.18)), url('/home-background.png')",
          }}
        >
          <div className="flex w-full max-w-xs flex-col gap-3">
            <h1 className="mb-8 text-5xl leading-none text-cyan-50 drop-shadow-[0_3px_0_rgba(236,72,153,0.9)] sm:text-7xl">
              REDACTED
            </h1>
            <SignInButton>
              <button className="h-12 border border-cyan-300 bg-[#06142d]/80 px-5 text-left text-xl uppercase text-yellow-200 shadow-[0_0_16px_rgba(34,211,238,0.25)]">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton>
              <button className="h-12 border border-cyan-300 bg-[#06142d]/80 px-5 text-left text-xl uppercase text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.25)]">
                Sign up
              </button>
            </SignUpButton>
          </div>
        </section>
      </Show>

      <Show when="signed-in">
        <section
          className="relative flex h-screen w-full items-center justify-start overflow-hidden border-0 bg-[#050712] px-0 shadow-[inset_0_0_24px_rgba(34,211,238,0.22)]"
        >
          <RoomHub />
        </section>
      </Show>
    </main>
  );
}
