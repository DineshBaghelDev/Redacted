"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "../../../../convex/_generated/api";
import { InvestigationIcon } from "../investigation-icon";

function normalizedTerm(search: string) {
  return search.trim().replace(/\s+/g, " ").toLowerCase();
}

export function EvidenceScreen({ roomCode, onBack }: { roomCode: string; onBack: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [startingSearch, setStartingSearch] = useState(false);
  const [pinning, setPinning] = useState("");
  const [error, setError] = useState("");
  const result = useQuery(
    api.publicRecords.search,
    isLoaded && isSignedIn && roomCode ? { roomCode, search: submittedSearch } : "skip",
  );
  const boardNodes = useQuery(api.clueBoard.getNodes, isLoaded && isSignedIn && roomCode ? { roomCode } : "skip");
  const createReference = useMutation(api.clueBoard.createReferenceNode);
  const performSearch = useMutation(api.publicRecords.performSearch);
  const records = hasSubmitted && result?.status === "ready" ? result.records : [];
  const currentTerm = normalizedTerm(search);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = search.trim();
    if (startingSearch) return;
    setSubmittedSearch(term);
    setHasSubmitted(true);
    if (result?.savedTerms.includes(currentTerm)) return;
    setStartingSearch(true);
    setError("");
    void performSearch({ roomCode, search: term }).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "Could not search these records.");
    }).finally(() => setStartingSearch(false));
  }

  function pinRecord(referenceId: string) {
    const count = boardNodes?.length ?? 0;
    setPinning(referenceId);
    setError("");
    void createReference({
      roomCode,
      type: "public_record",
      referenceId,
      x: 80 + (count % 4) * 220,
      y: 90 + Math.floor(count / 4) * 180,
    }).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "Could not pin this record.");
    }).finally(() => setPinning(""));
  }

  return (
    <section className="game-evidence-scene game-records-scene absolute inset-0 z-20 flex flex-col overflow-hidden text-[#c8d8d2]">
      <header className="game-station-header flex shrink-0 items-start justify-between gap-4 p-4 sm:p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#e8ac51]/75">Bureau records terminal</p>
          <h2 className="mt-1 text-2xl uppercase text-[#e4e6d8] sm:text-3xl">Public records</h2>
        </div>
        <button
          aria-label="Return to bureau"
          className="min-h-11 shrink-0 border border-[#6f9f98] px-4 text-sm uppercase hover:border-[#e8ac51] hover:text-[#e8ac51] focus-visible:outline-2 focus-visible:outline-[#e8ac51]"
          onClick={onBack}
          type="button"
        >
          Back
        </button>
      </header>

      <form className="shrink-0 border-b border-[#6f9f98]/25 bg-[#071014]/75 p-4 sm:px-6" onSubmit={submitSearch}>
        <label className="block text-xs uppercase tracking-[0.18em] text-[#c8d8d2]/60" htmlFor="record-search">Search records</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            autoComplete="off"
            className="h-12 min-w-0 w-full border border-[#6f9f98]/60 bg-[#0b1a1c] px-4 text-base text-[#e4e6d8] outline-none placeholder:text-[#c8d8d2]/65 focus:border-[#e8ac51] sm:w-auto sm:flex-1"
            id="record-search"
            maxLength={80}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Try a name, address, employment, or card payment"
            type="search"
            value={search}
          />
          <button
            className="min-h-12 border border-[#e8ac51] px-5 text-sm uppercase text-[#e8ac51] hover:bg-[#e8ac51] hover:text-[#071014] focus-visible:outline-2 focus-visible:outline-[#e8ac51] disabled:cursor-wait disabled:opacity-50"
            disabled={startingSearch || (result?.status === "pending" && normalizedTerm(submittedSearch) === currentTerm)}
            type="submit"
          >
            {startingSearch ? "Starting search..." : !search.trim() ? "Browse files" : result?.savedTerms.includes(currentTerm) ? "Open saved search" : "Search records"}
          </button>
        </div>
        {result?.savedTerms.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Recent shared searches">
            <span className="mr-1 text-xs uppercase tracking-[0.16em] text-[#c8d8d2]/65">Shared searches</span>
            {result.savedTerms.map((term) => (
              <button
                aria-pressed={search === term}
                className={`min-h-9 border px-3 text-xs uppercase focus-visible:outline-2 focus-visible:outline-[#e8ac51] ${search === term ? "border-[#e8ac51] text-[#f1c987]" : "border-[#6f9f98]/25 text-[#c8d8d2]/70 hover:border-[#a5c6bb]"}`}
                key={term}
                onClick={() => { setSearch(term); setSubmittedSearch(term); setHasSubmitted(true); setError(""); }}
                type="button"
              >
                {term || "General browse"}
              </button>
            ))}
          </div>
        ) : null}
        <p className="mt-2 text-xs text-[#c8d8d2]/65">New searches take 10 case minutes. Reopen a saved search for free.</p>
      </form>

      <div className="game-station-main min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        {error ? <p className="mx-auto mb-4 max-w-5xl border border-red-300 bg-red-950/80 p-3 text-sm text-red-100" role="alert">{error}</p> : null}
        {result === undefined ? <TerminalMessage>Connecting to the records desk...</TerminalMessage> : null}
        {result === null ? <TerminalMessage>This room cannot access these records.</TerminalMessage> : null}
        {!startingSearch && result?.status === "available" ? (
          <TerminalMessage>{hasSubmitted ? `Ready to search for “${submittedSearch || "general browse"}”.` : "Search a title or browse the files to begin."}</TerminalMessage>
        ) : null}
        {startingSearch || result?.status === "pending" ? (
          <TerminalMessage role="status">Search in progress. Records will appear when it finishes.</TerminalMessage>
        ) : null}
        {result?.status === "ready" && hasSubmitted && records.length === 0 ? (
          <TerminalMessage>No matching records.</TerminalMessage>
        ) : null}
        {records.length ? (
          <ul className="mx-auto grid max-w-5xl gap-3 md:grid-cols-2">
            {records.map((record) => {
              const isPinned = boardNodes?.some((node) => node.type === "public_record" && node.referenceId === record.id);
              return (
                <li className="game-dossier p-3 text-[#211d17]" key={record.id}>
                  <div className="flex items-start gap-3 border-b border-[#211d17]/30 pb-2">
                    <InvestigationIcon className="size-10" name="file" />
                    <div className="min-w-0">
                      <span className="text-xs uppercase tracking-wide text-red-800">{record.type}</span>
                      <h3 className="break-words text-lg uppercase leading-tight">{record.title}</h3>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed sm:text-base">{record.content}</p>
                  <button
                    className="mt-4 min-h-11 border border-[#211d17]/60 px-3 text-xs uppercase hover:border-red-800 hover:text-red-800 focus-visible:outline-2 focus-visible:outline-red-800 disabled:cursor-default disabled:opacity-55"
                    disabled={pinning === record.id || isPinned}
                    onClick={() => pinRecord(record.id)}
                    type="button"
                  >
                    {pinning === record.id ? "Pinning..." : isPinned ? "Pinned to clueboard" : "Pin to clueboard"}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function TerminalMessage({ children, role }: { children: React.ReactNode; role?: "status" }) {
  return <p className="mx-auto mt-12 flex max-w-lg items-center gap-3 border-b border-[#6f9f98]/35 bg-[#071619]/70 p-5 text-sm uppercase text-[#c8d8d2]" role={role}><InvestigationIcon className="size-9" name="file" />{children}</p>;
}
