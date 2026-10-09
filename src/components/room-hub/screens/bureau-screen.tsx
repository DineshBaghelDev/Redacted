import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Database, DoorOpen, FileText, FlaskConical, Map, Network, ScanLine, Users, type LucideIcon } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { currentGameMinute, formatGameMinute } from "../../../lib/game-time";

const ClueBoardScreen = dynamic(() =>
  import("./clue-board-screen").then((module) => module.ClueBoardScreen),
);

const CctvScreen = dynamic(() =>
  import("./cctv-screen").then((module) => module.CctvScreen),
);

const MapScreen = dynamic(() =>
  import("./map-screen").then((module) => module.MapScreen),
);

const PlaceScreen = dynamic(() =>
  import("./place-screen").then((module) => module.PlaceScreen),
);

const ForensicLabScreen = dynamic(() =>
  import("./forensic-lab-screen").then((module) => module.ForensicLabScreen),
);

const InterrogationScreen = dynamic(() =>
  import("./interrogation-screen").then((module) => module.InterrogationScreen),
);

const EvidenceScreen = dynamic(() =>
  import("./evidence-screen").then((module) => module.EvidenceScreen),
);

const CaseFileScreen = dynamic(() =>
  import("./case-file-screen").then((module) => module.CaseFileScreen),
);

type Station = "interrogate" | "cctv" | "clueboard" | "evidence" | "map" | "place" | "lab" | "case";

const stations: Record<Station, { label: string; description: string }> = {
  interrogate: {
    label: "People",
    description: "Review the people connected to this case and pin them to the clueboard.",
  },
  cctv: {
    label: "CCTV",
    description: "Review the station and street camera records already in the case file.",
  },
  clueboard: {
    label: "Clueboard",
    description: "Lay out the facts you have found and connect your own deductions.",
  },
  evidence: {
    label: "Public records",
    description: "Search addresses, employment records, background checks, and card payments.",
  },
  map: {
    label: "City map",
    description: "Plan where to go next and review the places connected to this case.",
  },
  place: { label: "Explore", description: "Move through rooms and examine what you find." },
  lab: { label: "Forensic lab", description: "Request tests for evidence your team has found." },
  case: {
    label: "Case file",
    description: "Review the briefing and submit the final report when your theory is ready.",
  },
};

const stationOrder: Station[] = ["interrogate", "cctv", "clueboard", "evidence", "map", "case"];
const stationIcons: Record<Station, LucideIcon> = { interrogate: Users, cctv: ScanLine, clueboard: Network, evidence: Database, map: Map, place: DoorOpen, lab: FlaskConical, case: FileText };

export function BureauScreen({ error, onLeave }: { error: string; onLeave: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const leaveDialogRef = useRef<HTMLDialogElement>(null);
  const [clockError, setClockError] = useState(false);
  const [now, setNow] = useState(0);
  const pathParts = pathname.split("/");
  const roomCode = pathParts[2] ?? "";
  const city = useQuery(api.world.getMap, roomCode && isLoaded && isSignedIn ? { roomCode } : "skip");
  const settleClock = useMutation(api.world.finishTravel);
  const station = (pathParts[3] === "bureau" ? pathParts[4] : pathParts[3]) as Station | undefined;
  const activeStation = station ? stations[station] : null;
  const bureau = city?.places.find((place) => place.kind === "bureau");
  const away = Boolean(city && (city.activeTravel || city.currentPlaceId !== bureau?.id));
  const showAwayNotice = away && station !== "map" && (station !== "place" || !!city?.activeTravel) && station !== "lab" && station !== "clueboard" && station !== "case" && station !== "interrogate";
  const currentPlace = city?.places.find((place) => place.id === city.currentPlaceId);
  const clock = city?.clock;
  const gameTime = clock ? currentGameMinute(clock, now) : null;
  const overdue = gameTime !== null && city?.deadline != null && gameTime > city.deadline;

  useEffect(() => {
    if (!clock || clock.clockStartedAt === null) return;
    const update = () => setNow(Date.now());
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [clock]);

  useEffect(() => {
    if (!city || city.clock.clockStartedAt === null || city.nextCompletionGameTime === null) return;
    const remainingMs = (city.nextCompletionGameTime - city.clock.gameTime) * city.clock.minuteMs - (Date.now() - city.clock.clockStartedAt);
    let cancelled = false;
    let timeout: number;
    const settle = () => { void settleClock({ roomCode }).then(() => setClockError(false)).catch(() => {
      if (!cancelled) {
        setClockError(true);
        timeout = window.setTimeout(settle, 3000);
      }
    }); };
    timeout = window.setTimeout(settle, Math.max(0, remainingMs));
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [city, roomCode, settleClock]);

  useEffect(() => {
    if (!confirmLeave || activeStation) return;
    const dialog = leaveDialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, [confirmLeave, activeStation]);

  function openStation(nextStation: Station) {
    const path = nextStation === "map" || nextStation === "place" || nextStation === "lab" || nextStation === "case"
      ? `/lobby/${roomCode}/${nextStation}`
      : `/lobby/${roomCode}/bureau/${nextStation}`;
    router.push(path);
  }

  return (
    <section className="relative h-screen w-full overflow-hidden bg-[#071014]">
      <div className="absolute inset-x-0 top-0 z-30 flex h-10 items-center justify-center gap-3 border-b border-[#45635d] bg-[#071014]/95 px-2 text-xs uppercase tracking-[0.08em] text-[#e8ac51] sm:gap-5 sm:text-xs sm:tracking-[0.15em]">
        <span>Case time · {gameTime === null ? "Syncing..." : formatGameMinute(gameTime)}</span>
        {city?.deadline != null ? <span className={overdue ? "text-[#e5a18e]" : "text-[#b8ccc1]"}>{overdue ? "Overdue" : `Due · ${formatGameMinute(city.deadline)}`}</span> : null}
      </div>
      {clockError ? <p className="absolute inset-x-3 top-11 z-50 mx-auto w-fit border border-red-300/60 bg-red-950/95 px-3 py-2 text-sm text-red-100" role="status">Clock sync delayed. Retrying...</p> : null}
      {!activeStation ? (
        <div className="absolute right-4 top-12 z-30 flex flex-col items-end gap-2">
          {confirmLeave ? (
            <dialog aria-labelledby="leave-game-title" className="fixed right-4 top-12 m-0 ml-auto w-64 border border-red-300 bg-[#13070a]/95 p-3 text-red-50 shadow-[0_0_20px_rgba(248,113,113,0.3)] backdrop:bg-black/70" onCancel={(event) => { event.preventDefault(); setConfirmLeave(false); }} ref={leaveDialogRef} role="alertdialog">
              <p className="text-sm uppercase" id="leave-game-title">Leave this investigation?</p>
              <p className="mt-2 text-xs leading-relaxed text-red-100/75">You cannot rejoin after leaving a started room.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button autoFocus className="min-h-10 border border-[#6f9f98]/60 text-xs uppercase text-[#c8d8d2] hover:border-[#c8d8d2]" onClick={() => setConfirmLeave(false)} type="button">Stay</button>
                <button className="min-h-10 border border-red-400 bg-red-950 text-xs uppercase hover:border-red-200" onClick={onLeave} type="button">Leave</button>
              </div>
              {error ? <p className="mt-3 text-sm text-red-200" role="alert">{error}</p> : null}
            </dialog>
          ) : (
            <button
              className="border border-red-400 bg-red-950/90 px-4 py-2 text-sm uppercase text-red-100 shadow-[0_0_16px_rgba(248,113,113,0.25)] hover:border-red-200"
              onClick={() => setConfirmLeave(true)}
              type="button"
            >
              Leave game
            </button>
          )}
          {error && !confirmLeave ? <p className="max-w-xs bg-[#071014]/90 px-3 py-2 text-sm text-red-200" role="alert">{error}</p> : null}
        </div>
      ) : null}
      <div className="relative h-full w-full bg-black">
        <Image
          alt="The investigation bureau"
          className="object-cover"
          fill
          priority
          src="/assets/bureau-noir.png"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#071014]/15 via-transparent to-[#071014]/20" />

        <Hotspot label="People" className="left-[2%] top-[23%] h-[43%] w-[15%]" onClick={() => openStation("interrogate")} />
        <Hotspot label="CCTV" className="left-[19%] top-[34%] h-[33%] w-[18%]" onClick={() => openStation("cctv")} />
        <Hotspot label="Clueboard" className="left-[38%] top-[23%] h-[34%] w-[23%]" onClick={() => openStation("clueboard")} />
        <Hotspot label="Public records" className="left-[63%] top-[34%] h-[33%] w-[16%]" onClick={() => openStation("evidence")} />
        <Hotspot label="Map" className="left-[80%] top-[23%] h-[34%] w-[19%]" onClick={() => openStation("map")} />
        <Hotspot label="Case" className="left-[39%] top-[76%] h-[22%] w-[23%]" onClick={() => openStation("case")} />

      </div>

      {!activeStation ? (
        <nav aria-label="Investigation stations" className="game-panel absolute inset-x-2 bottom-2 z-20 grid grid-cols-3 gap-1.5 p-2 sm:hidden">
          <p className="col-span-3 px-1 text-xs uppercase tracking-[0.12em] text-[#b8ccc1]">Bureau stations</p>
          {stationOrder.map((item) => {
            const Icon = stationIcons[item];
            return (
              <button
                className="flex min-h-14 flex-col items-center justify-center gap-1 border border-[#45635d] bg-[#0b1a1c] px-1 text-xs uppercase text-[#e4e6d8] active:border-[#e8ac51] active:text-[#e8ac51]"
                key={item}
                onClick={() => openStation(item)}
                type="button"
              >
                <Icon aria-hidden="true" className="size-4" />
                {stations[item].label}
              </button>
            );
          })}
        </nav>
      ) : null}

      {activeStation || showAwayNotice ? (
        <div className="absolute inset-x-0 bottom-0 top-10 z-20">
          {station === "clueboard" ? <ClueBoardScreen roomCode={roomCode} onBack={() => router.push(`/lobby/${roomCode}/bureau`)} /> : null}
          {station === "cctv" ? <CctvScreen roomCode={roomCode} onBack={() => router.push(`/lobby/${roomCode}/bureau`)} /> : null}
          {station === "map" ? <MapScreen roomCode={roomCode} onBack={() => router.push(`/lobby/${roomCode}/bureau`)} /> : null}
          {station === "place" ? <PlaceScreen roomCode={roomCode} onBack={() => router.push(`/lobby/${roomCode}/map`)} /> : null}
          {station === "lab" ? <ForensicLabScreen roomCode={roomCode} onBack={() => router.push(`/lobby/${roomCode}/map`)} /> : null}
          {station === "interrogate" ? <InterrogationScreen roomCode={roomCode} onBack={() => router.push(`/lobby/${roomCode}/bureau`)} /> : null}
          {station === "evidence" ? <EvidenceScreen roomCode={roomCode} onBack={() => router.push(`/lobby/${roomCode}/bureau`)} /> : null}
          {station === "case" ? <CaseFileScreen roomCode={roomCode} onBack={() => router.push(`/lobby/${roomCode}/bureau`)} /> : null}
          {showAwayNotice ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#071014]/95 p-4 text-[#e4e6d8]">
              <div className="game-panel w-full max-w-lg p-6 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-[#c8d8d2]/55">Current location</p>
                <h2 className="mt-2 text-2xl uppercase text-[#f1c987]">{city?.activeTravel ? `On the way to ${city.activeTravel.destinationName}` : currentPlace?.name ?? "Away from bureau"}</h2>
                <p className="mt-3 text-sm text-[#c8d8d2]/70">Bureau terminals are available when you return. You can still review your case and clueboard.</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <button className="min-h-11 border border-[#e8ac51]/70 px-3 text-sm uppercase text-[#f1c987]" onClick={() => openStation("map")} type="button">City map</button>
                  {!city?.activeTravel && currentPlace?.hasInterior ? <button className="min-h-11 border border-[#e8ac51]/70 px-3 text-sm uppercase text-[#f1c987]" onClick={() => openStation("place")} type="button">Explore this place</button> : null}
                  {!city?.activeTravel && currentPlace?.kind === "lab" ? <button className="min-h-11 border border-[#e8ac51]/70 px-3 text-sm uppercase text-[#f1c987]" onClick={() => openStation("lab")} type="button">Forensic lab</button> : null}
                  <button className="min-h-11 border border-[#6f9f98]/50 px-3 text-sm uppercase" onClick={() => openStation("clueboard")} type="button">Clueboard</button>
                  <button className="min-h-11 border border-[#6f9f98]/50 px-3 text-sm uppercase" onClick={() => openStation("case")} type="button">Case file</button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Hotspot({
  label,
  className,
  onClick,
}: {
  label: string;
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`group absolute hidden border border-transparent transition hover:border-[#e8ac51]/80 hover:bg-[#e8ac51]/10 focus-visible:border-[#e8ac51] focus-visible:bg-[#e8ac51]/10 sm:block ${className}`}
      onClick={onClick}
      type="button"
    >
      <span className="absolute left-1/2 top-2 -translate-x-1/2 -translate-y-full whitespace-nowrap border border-[#e8ac51] bg-[#071014]/95 px-2 py-1 text-xs uppercase text-[#f5c87f] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
        {label}
      </span>
    </button>
  );
}
