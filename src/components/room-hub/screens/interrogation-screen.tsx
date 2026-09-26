"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

const roleLabels = {
  victim: "Victim",
  suspect: "Person of interest",
  witness: "Witness",
} as const;

export function InterrogationScreen({ roomCode, onBack }: { roomCode: string; onBack: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const people = useQuery(api.npcs.list, isLoaded && isSignedIn ? { roomCode } : "skip");

  if (people === undefined) return <Message message="Opening interview files..." onBack={onBack} />;
  if (!people) return <Message message="Interview files are unavailable for this room." onBack={onBack} />;

  return (
    <section className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-[#090807] text-[#211d17]">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b-4 border-[#573821] bg-[#d8c8a7] px-4 py-3 sm:px-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-red-900/70">Bureau interview desk</p>
          <h2 className="mt-1 text-xl uppercase tracking-wide sm:text-2xl">People in this case</h2>
        </div>
        <button className="border-2 border-[#573821] px-3 py-2 text-sm uppercase hover:bg-[#573821] hover:text-[#f4ead2]" onClick={onBack} type="button">
          Back
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(rgba(35,27,20,0.06)_1px,transparent_1px)] bg-[size:100%_2rem] p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-[#573821] pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-red-900">Case roster</p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#3e342a]">
                Review the known people before arranging an interview. A person must be present before questions can begin.
              </p>
            </div>
            <span className="border border-[#8b5b38] bg-[#e9dfc5] px-3 py-1 font-mono text-xs uppercase">{people.length} files</span>
          </div>

          {people.length ? (
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {people.map((person, index) => (
                <li className="relative min-h-48 rotate-[0.15deg] border-2 border-[#8b7355] bg-[#e9dfc5] p-5 shadow-[5px_5px_0_rgba(38,26,17,0.22)]" key={person.id}>
                  <span className="absolute right-3 top-3 font-mono text-xs text-[#725f42]">#{String(index + 1).padStart(2, "0")}</span>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-red-800">{roleLabels[person.role]}</p>
                  <h3 className="mt-2 pr-10 text-2xl uppercase leading-none">{person.name}</h3>
                  <p className="mt-3 text-sm uppercase text-[#5d4d3d]">
                    {[person.age ? `Age ${person.age}` : null, person.occupation].filter(Boolean).join(" · ") || "No public occupation"}
                  </p>
                  <p className="mt-5 border-t border-[#8b7355]/50 pt-4 text-sm leading-relaxed text-[#3e342a]">{person.publicDescription}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5 border-2 border-dashed border-[#8b7355] bg-[#e9dfc5]/70 p-8 text-center uppercase text-[#5d4d3d]">
              No interview files are available yet.
            </div>
          )}
        </div>
      </main>
    </section>
  );
}

function Message({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <section className="absolute inset-0 z-20 flex items-center justify-center bg-[#090807] p-4 text-[#211d17]">
      <div className="w-full max-w-lg border-4 border-[#8b5b38] bg-[#e9dfc5] p-6 text-center shadow-[8px_8px_0_rgba(0,0,0,0.45)]">
        <p className="text-lg uppercase">{message}</p>
        <button className="mt-5 border-2 border-[#573821] px-4 py-2 uppercase hover:bg-[#573821] hover:text-[#f4ead2]" onClick={onBack} type="button">Back to bureau</button>
      </div>
    </section>
  );
}
