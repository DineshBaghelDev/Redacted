"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";

export function EvidenceScreen({ roomCode, onBack }: { roomCode: string; onBack: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [search, setSearch] = useState("");
  const [pinning, setPinning] = useState("");
  const [error, setError] = useState("");
  const records = useQuery(api.publicRecords.search, isLoaded && isSignedIn && roomCode ? { roomCode, search } : "skip");
  const boardNodes = useQuery(api.clueBoard.getNodes, isLoaded && isSignedIn && roomCode ? { roomCode } : "skip");
  const createReference = useMutation(api.clueBoard.createReferenceNode);

  function pinRecord(referenceId: string) {
    const count = boardNodes?.length ?? 0;
    setPinning(referenceId);
    setError("");
    void createReference({
      roomCode,
      type: "public_record",
      referenceId,
      x: 80 + (count % 4) * 220,
      y: 90 + (Math.floor(count / 4) % 4) * 180,
    }).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "Could not pin this record.");
    }).finally(() => setPinning(""));
  }

  return (
    <section className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-[#050712]/96 text-cyan-100 backdrop-blur-sm">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-cyan-300/35 bg-[#06142d] p-4 sm:p-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-yellow-200/75">Bureau records terminal</p>
          <h2 className="mt-1 text-2xl uppercase text-cyan-50 sm:text-3xl">Public records</h2>
          <p className="mt-2 max-w-xl text-sm text-cyan-100/60">Search addresses, employment, background records, and card payments already stored with this case.</p>
        </div>
        <button
          aria-label="Return to bureau"
          className="min-h-11 shrink-0 border border-cyan-300 px-4 text-sm uppercase hover:border-yellow-200 hover:text-yellow-200"
          onClick={onBack}
          type="button"
        >
          Back
        </button>
      </header>

      <div className="shrink-0 border-b border-cyan-300/25 bg-[#020817] p-4 sm:px-6">
        <label className="block text-xs uppercase tracking-[0.18em] text-cyan-100/60" htmlFor="record-search">Search record titles</label>
        <input
          autoComplete="off"
          className="mt-2 h-12 w-full border border-cyan-300/60 bg-[#06142d] px-4 text-base text-cyan-50 outline-none placeholder:text-cyan-100/35 focus:border-yellow-200"
          id="record-search"
          maxLength={80}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Try a name, address, employment, or card payment"
          type="search"
          value={search}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        {error ? <p className="mx-auto mb-4 max-w-5xl border border-red-300 bg-red-950/80 p-3 text-sm text-red-100" role="alert">{error}</p> : null}
        {records === undefined ? <TerminalMessage>Searching case records...</TerminalMessage> : null}
        {records === null ? <TerminalMessage>This room cannot access these records.</TerminalMessage> : null}
        {records?.length === 0 ? <TerminalMessage>No matching records.</TerminalMessage> : null}
        {records?.length ? (
          <ul className="mx-auto grid max-w-5xl gap-3 md:grid-cols-2">
            {records.map((record) => (
              <li className="border border-[#b8a77d] bg-[#e9dfc5] p-4 text-[#211d17] shadow-[4px_4px_0_rgba(0,0,0,0.3)]" key={record.id}>
                <div className="flex items-start justify-between gap-3 border-b border-[#211d17]/30 pb-2">
                  <h3 className="text-lg uppercase leading-tight">{record.title}</h3>
                  <span className="shrink-0 border border-red-800 px-2 py-1 text-[10px] uppercase tracking-wide text-red-800">{record.type}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed sm:text-base">{record.content}</p>
                <button
                  className="mt-4 min-h-11 border border-[#211d17]/60 px-3 text-xs uppercase hover:border-red-800 hover:text-red-800 disabled:cursor-default disabled:opacity-55"
                  disabled={pinning === record.id || boardNodes?.some((node) => node.type === "public_record" && node.referenceId === record.id)}
                  onClick={() => pinRecord(record.id)}
                  type="button"
                >
                  {pinning === record.id ? "Pinning..." : boardNodes?.some((node) => node.type === "public_record" && node.referenceId === record.id) ? "Pinned to clueboard" : "Pin to clueboard"}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function TerminalMessage({ children }: { children: React.ReactNode }) {
  return <p className="mx-auto mt-12 max-w-lg border border-cyan-300/35 bg-[#06142d] p-5 text-center text-sm uppercase text-cyan-100/70">{children}</p>;
}
