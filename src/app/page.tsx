import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { RoomHub } from "@/components/room-hub";

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-2 text-[#1976d2] sm:p-3">
      <Show when="signed-out">
        <section className="flex min-h-[calc(100vh-1rem)] items-center justify-center rounded-[2rem] border-[3px] border-[#1976d2] px-6">
          <div className="flex w-full max-w-xs flex-col gap-3">
            <SignInButton>
              <button className="h-11 rounded-lg border-[3px] border-[#1976d2] bg-background text-lg text-[#1976d2]">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton>
              <button className="h-11 rounded-lg border-[3px] border-[#1976d2] bg-background text-lg text-[#1976d2]">
                Sign up
              </button>
            </SignUpButton>
          </div>
        </section>
      </Show>

      <Show when="signed-in">
        <section className="relative flex min-h-[calc(100vh-1rem)] items-center justify-center rounded-[2rem] border-[3px] border-[#1976d2] px-6 py-12 sm:min-h-[calc(100vh-1.5rem)]">
          <div className="absolute right-6 top-6">
            <UserButton />
          </div>
          <RoomHub />
        </section>
      </Show>
    </main>
  );
}
