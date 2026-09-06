import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

const roomActions = ["My rooms", "Create Room", "join room"];

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
          <div className="flex w-full max-w-60 flex-col items-center gap-8">
            <div className="grid size-17 place-items-center rounded-full border-[3px] border-[#1976d2] text-base">
              logo
            </div>
            <div className="flex w-full flex-col gap-3">
              {roomActions.map((action) => (
                <button
                  className="h-10 rounded-lg border-[3px] border-[#1976d2] bg-background text-base text-[#1976d2]"
                  key={action}
                  type="button"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </section>
      </Show>
    </main>
  );
}
