"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";

function formatTime(minutes: number) {
  const day = Math.floor(minutes / 1440) + 1;
  const withinDay = minutes % 1440;
  return `Day ${day} · ${String(Math.floor(withinDay / 60)).padStart(2, "0")}:${String(withinDay % 60).padStart(2, "0")}`;
}

export function CctvScreen({ roomCode, onBack }: { roomCode: string; onBack: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const data = useQuery(api.cases.getCctv, isLoaded && isSignedIn ? { roomCode } : "skip");
  const [chosenCameraId, setCameraId] = useState("");
  const [chosenMinute, setMinute] = useState<number | null>(null);
  const [pinning, setPinning] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  const boardNodes = useQuery(api.clueBoard.getNodes, isLoaded && isSignedIn ? { roomCode } : "skip");
  const createReference = useMutation(api.clueBoard.createReferenceNode);
  const startReview = useMutation(api.cases.startCctvReview);

  const cameraId = data?.cameras.some((camera) => camera.id === chosenCameraId)
    ? chosenCameraId
    : data?.cameras[0]?.id ?? "";
  const chosenCamera = data?.cameras.find((item) => item.id === cameraId);
  const minute = chosenCamera && chosenMinute !== null && chosenMinute >= chosenCamera.start && chosenMinute <= chosenCamera.end
    ? chosenMinute
    : chosenCamera ? Math.min(chosenCamera.end, Math.max(chosenCamera.start, Math.round((chosenCamera.start + chosenCamera.end) / 10) * 5)) : 0;
  const visibleWindow = useQuery(
    api.cases.getCctvWindow,
    data && cameraId ? { roomCode, cameraId, minute } : "skip",
  );

  if (data === undefined) return <CctvMessage message="Loading camera records..." onBack={onBack} />;
  if (!data) return <CctvMessage message="Camera records are not available for this case." onBack={onBack} />;

  const camera = data.cameras.find((item) => item.id === cameraId)!;
  const records = visibleWindow?.status === "ready" ? visibleWindow.records : [];

  function reviewWindow() {
    setReviewing(true);
    setError("");
    void startReview({ roomCode, cameraId, minute }).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "Could not review this camera window.");
    }).finally(() => setReviewing(false));
  }

  function pinRecord(referenceId: string) {
    const count = boardNodes?.length ?? 0;
    setPinning(referenceId);
    setError("");
    void createReference({
      roomCode,
      type: "cctv",
      referenceId,
      x: 80 + (count % 4) * 220,
      y: 90 + Math.floor(count / 4) * 180,
    }).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "Could not pin this camera record.");
    }).finally(() => setPinning(""));
  }

  return (
    <section className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-[#071014] text-[#e4e6d8]">
      <header className="flex items-center justify-between gap-4 border-b border-[#6f9f98]/30 bg-[#0b1a1c] px-4 py-3 sm:px-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#a5c6bb]/80">{data.caseTitle} · security records</p>
          <h2 className="mt-1 text-xl uppercase tracking-wide sm:text-2xl">Camera records</h2>
        </div>
        <button
          aria-label="Return to bureau"
          className="border border-[#6f9f98]/70 px-3 py-2 text-sm uppercase text-[#c8d8d2] hover:border-[#e8ac51] hover:text-[#e8ac51] focus-visible:outline-2 focus-visible:outline-[#e8ac51]"
          onClick={onBack}
          type="button"
        >
          Back
        </button>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[17rem_1fr] md:grid-rows-1">
        <aside className="max-h-[38vh] overflow-y-auto border-b border-[#6f9f98]/25 bg-[#081417] p-3 md:max-h-none md:border-b-0 md:border-r">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[#c8d8d2]/65">Choose camera</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
            {data.cameras.map((item, index) => (
              <button
                aria-pressed={item.id === cameraId}
                className={`min-w-0 border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-[#e8ac51] ${
                  item.id === cameraId
                    ? "border-[#e8ac51] bg-[#e8ac51]/10 shadow-[inset_3px_0_0_#e8ac51]"
                    : "border-[#6f9f98]/15 bg-[#0b1a1c] hover:border-[#6f9f98]/50"
                }`}
                key={item.id}
                onClick={() => setCameraId(item.id)}
                type="button"
              >
                <span className="flex items-center justify-between gap-2 text-sm uppercase">
                  <span className="truncate">{String(index + 1).padStart(2, "0")} · {item.name}</span>
                  <span className={`h-2 w-2 shrink-0 ${item.faulty ? "bg-red-500" : "bg-[#89ae9c]"}`} />
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex min-h-0 flex-col overflow-y-auto p-4 sm:p-6 lg:p-8">
          {error ? <p className="mb-4 border border-red-300 bg-red-950/80 p-3 text-sm text-red-100" role="alert">{error}</p> : null}
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#6f9f98]/20 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#c8d8d2]/65">Camera {String(data.cameras.indexOf(camera) + 1).padStart(2, "0")}</p>
              <h3 className="mt-1 text-2xl uppercase text-[#e4e6d8] sm:text-3xl">{camera.name}</h3>
            </div>
            <p className={`border px-3 py-1 text-xs uppercase tracking-[0.18em] ${camera.faulty ? "border-red-400/50 text-red-300" : "border-emerald-400/50 text-emerald-300"}`}>
              {camera.faulty ? "offline" : "online"}
            </p>
          </div>

          <div className="mt-6 border border-[#6f9f98]/20 bg-[#081417] p-4 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-[#c8d8d2]/55" htmlFor="cctv-time">
                Choose a time to review
              </label>
              <output className="font-mono text-lg text-[#e8ac51]" htmlFor="cctv-time" aria-live="polite">
                {formatTime(minute)}
              </output>
            </div>

            <div className="relative mt-7 pb-6">
              <input
                aria-valuetext={formatTime(minute)}
                className="relative z-10 h-2 w-full cursor-ew-resize appearance-none bg-[#102224] accent-[#d69943]"
                id="cctv-time"
                max={camera.end}
                min={camera.start}
                onChange={(event) => setMinute(Number(event.target.value))}
                step={1}
                type="range"
                value={minute}
              />
              <span className="absolute bottom-0 left-0 font-mono text-xs text-[#c8d8d2]/65">{formatTime(camera.start)}</span>
              <span className="absolute bottom-0 right-0 font-mono text-xs text-[#c8d8d2]/65">{formatTime(camera.end)}</span>
            </div>
            <p className="mt-3 text-xs text-[#c8d8d2]/65">Each review covers 20 minutes before and after the selected time.</p>
            {!camera.faulty && visibleWindow?.status === "available" ? (
              <button className="mt-4 min-h-11 border border-[#e8ac51] px-4 text-sm uppercase text-[#e8ac51] hover:bg-[#e8ac51] hover:text-[#071014] disabled:opacity-50" disabled={reviewing} onClick={reviewWindow} type="button">
                {reviewing ? "Starting review..." : "Review window · 5 min"}
              </button>
            ) : null}
            {visibleWindow?.status === "pending" ? <p className="mt-4 text-sm uppercase text-[#e8ac51]" role="status">Review in progress. Records will appear when it finishes.</p> : null}
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm uppercase tracking-[0.18em] text-[#c8d8d2]/65">Recorded activity</h4>
              <span className="font-mono text-xs text-[#c8d8d2]/65">{visibleWindow?.status === "ready" ? `${records.length} ${records.length === 1 ? "record" : "records"}` : "Not reviewed"}</span>
            </div>

            {camera.faulty ? (
              <div className="mt-3 border border-red-400/30 bg-red-950/20 p-5 text-red-100">
                <p className="uppercase">No signal</p>
                <p className="mt-2 text-sm text-red-100/60">This camera was not recording during the case window.</p>
              </div>
            ) : visibleWindow === undefined ? (
              <div className="mt-3 border border-[#6f9f98]/20 p-6 text-center text-sm uppercase text-[#c8d8d2]/65">
                Checking this time window...
              </div>
            ) : visibleWindow?.status === "available" || visibleWindow?.status === "pending" ? (
              <div className="mt-3 border border-[#6f9f98]/20 p-6 text-center text-sm uppercase text-[#c8d8d2]/65">
                {visibleWindow.status === "pending" ? "Review in progress." : "Review this time window to see its records."}
              </div>
            ) : records.length ? (
              <ul className="mt-3 grid gap-3 lg:grid-cols-2">
                {records.map((record) => (
                  <li className={`border p-4 ${record.kind === "offline" ? "border-red-400/30 bg-red-950/20" : "border-[#6f9f98]/25 bg-[#0b1a1c] shadow-[inset_3px_0_0_#6f9f98]"}`} key={record.id}>
                    <p className="font-mono text-xs text-[#e8ac51]">{formatTime(record.start)}–{formatTime(record.end).split(" · ")[1]}</p>
                    <p className="mt-3 text-base leading-relaxed text-[#e4e6d8]">{record.summary}</p>
                    <button
                      className="mt-4 min-h-11 border border-[#6f9f98]/60 px-3 text-xs uppercase text-[#c8d8d2] hover:border-[#e8ac51] hover:text-[#e8ac51] disabled:cursor-default disabled:opacity-50"
                      disabled={pinning === record.id || boardNodes?.some((node) => node.type === "cctv" && node.referenceId === record.id)}
                      onClick={() => pinRecord(record.id)}
                      type="button"
                    >
                      {pinning === record.id ? "Pinning..." : boardNodes?.some((node) => node.type === "cctv" && node.referenceId === record.id) ? "Pinned to clueboard" : "Pin to clueboard"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 border border-dashed border-[#6f9f98]/20 p-6 text-center text-sm text-[#c8d8d2]/65">
                No one was recorded near this time.
              </div>
            )}
          </div>

          <p className="pb-4 pt-6 text-xs uppercase tracking-[0.14em] text-[#c8d8d2]/65">Recorded descriptions only · identities are not provided</p>
        </main>
      </div>
    </section>
  );
}

function CctvMessage({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <section className="absolute inset-0 z-20 flex items-center justify-center bg-[#071014] p-4 text-[#e4e6d8]">
      <div className="w-full max-w-lg border border-[#6f9f98]/30 bg-[#0b1a1c] p-6 text-center">
        <p className="text-lg uppercase text-[#c8d8d2]">{message}</p>
        <button className="mt-5 border border-[#6f9f98]/70 px-4 py-2 uppercase hover:border-[#e8ac51] hover:text-[#e8ac51]" onClick={onBack} type="button">
          Back to bureau
        </button>
      </div>
    </section>
  );
}
