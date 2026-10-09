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
  const cameraIndex = data.cameras.findIndex((item) => item.id === cameraId);
  const records = visibleWindow?.status === "ready" ? visibleWindow.records : [];

  function selectCamera(id: string) {
    setCameraId(id);
    setMinute(null);
    setError("");
  }

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
    <section className="game-cctv-scene game-records-scene absolute inset-0 z-20 flex flex-col overflow-hidden text-[#e4e6d8]">
      <header className="game-station-header flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
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

      <div className="game-station-main min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto grid max-w-6xl items-start gap-6 lg:grid-cols-[minmax(15rem,19rem)_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-[#6f9f98]/35 pb-5 lg:border-b-0 lg:border-r lg:pr-6">
          <label className="block text-xs uppercase tracking-[0.18em] text-[#e8ac51]" htmlFor="camera-picker">01 / Choose camera</label>
          <select
            className="mt-3 min-h-12 w-full min-w-0 border border-[#6f9f98] bg-[#0b1a1c] px-3 text-sm text-[#e4e6d8]"
            id="camera-picker"
            onChange={(event) => selectCamera(event.target.value)}
            value={cameraId}
          >
            {data.cameras.map((item, index) => (
              <option key={item.id} value={item.id}>{String(index + 1).padStart(2, "0")} · {item.name}{item.faulty ? " (offline)" : ""}</option>
            ))}
          </select>
          <div className="mt-3 flex items-center justify-between gap-3">
            <button className="min-h-10 border border-[#6f9f98]/60 px-3 text-sm uppercase disabled:opacity-40" disabled={cameraIndex <= 0} onClick={() => selectCamera(data.cameras[cameraIndex - 1].id)} type="button">← Previous</button>
            <span className="text-xs text-[#b8ccc1]">{cameraIndex + 1} / {data.cameras.length}</span>
            <button className="min-h-10 border border-[#6f9f98]/60 px-3 text-sm uppercase disabled:opacity-40" disabled={cameraIndex >= data.cameras.length - 1} onClick={() => selectCamera(data.cameras[cameraIndex + 1].id)} type="button">Next →</button>
          </div>
          <p className="mt-4 break-words text-sm leading-relaxed text-[#b8ccc1]">{camera.faulty ? "This camera has no recording for the case period." : "Pick a time, then review its written activity log."}</p>
        </aside>

        <main className="min-w-0">
          {error ? <p className="mb-4 border border-red-300 bg-red-950/80 p-3 text-sm text-red-100" role="alert">{error}</p> : null}
          <h3 className="break-words text-2xl uppercase leading-tight text-[#e4e6d8] sm:text-3xl">{camera.name}</h3>

          <div className="game-panel mt-6 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-[#c8d8d2]/55" htmlFor="cctv-time">
                02 / Choose time
              </label>
              <output className="font-mono text-lg text-[#e8ac51]" htmlFor="cctv-time" aria-live="polite">
                {formatTime(minute)}
              </output>
            </div>

            <div className="mt-7">
              <input
                aria-valuetext={formatTime(minute)}
                className="relative z-10 h-2 w-full cursor-ew-resize appearance-none bg-[#102224] accent-[#d69943]"
                disabled={camera.faulty}
                id="cctv-time"
                max={camera.end}
                min={camera.start}
                onChange={(event) => setMinute(Number(event.target.value))}
                step={1}
                type="range"
                value={minute}
              />
              <div className="mt-2 flex justify-between gap-3 font-mono text-xs text-[#c8d8d2]/65">
                <span>{formatTime(camera.start)}</span>
                <span className="text-right">{formatTime(camera.end)}</span>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#c8d8d2]">Review written records from 20 minutes before to 20 minutes after this time. It takes 5 game minutes.</p>
            {!camera.faulty && visibleWindow?.status === "available" ? (
              <button className="mt-4 min-h-11 border border-[#e8ac51] px-4 text-sm uppercase text-[#e8ac51] hover:bg-[#e8ac51] hover:text-[#071014] disabled:opacity-50" disabled={reviewing} onClick={reviewWindow} type="button">
                {reviewing ? "Starting review..." : "Review this time · 5 min"}
              </button>
            ) : null}
            {visibleWindow?.status === "pending" ? <p className="mt-4 text-sm uppercase text-[#e8ac51]" role="status">Review in progress. Records will appear when it finishes.</p> : null}
            {visibleWindow?.status === "ready" ? <p className="mt-4 text-sm text-[#a9d1b7]" role="status">This time has been reviewed. Its log is below.</p> : null}
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm uppercase tracking-[0.18em] text-[#e8ac51]">03 / Activity log</h4>
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
              <ul className="mt-3 space-y-2">
                {records.map((record) => (
                  <li className={`border-l-2 bg-[#0b1a1c]/85 p-4 ${record.kind === "offline" ? "border-red-400 text-red-100" : "border-[#6f9f98]"}`} key={record.id}>
                    <p className="font-mono text-xs text-[#e8ac51]">{formatTime(record.start)}–{formatTime(record.end).split(" · ")[1]}</p>
                    <p className="mt-2 break-words text-base leading-relaxed text-[#e4e6d8]">{record.summary}</p>
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

          <p className="pb-4 pt-6 text-xs uppercase tracking-[0.14em] text-[#c8d8d2]/65">Written descriptions only · identities are not provided</p>
        </main>
        </div>
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
