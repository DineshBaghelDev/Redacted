import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
    <section className="relative h-screen w-full overflow-hidden border border-cyan-300/70 bg-[#050712] shadow-[0_0_30px_rgba(34,211,238,0.22)]">
      <div className="absolute inset-x-0 top-0 z-30 flex h-9 items-center justify-center gap-2 border-b border-cyan-300/30 bg-[#050712]/95 px-2 text-[10px] uppercase tracking-[0.06em] text-yellow-100 sm:gap-4 sm:text-xs sm:tracking-[0.15em]">
        <span>Case time · {gameTime === null ? "Syncing..." : formatGameMinute(gameTime)}</span>
        {city?.deadline != null ? <span className="text-cyan-100">Due · {formatGameMinute(city.deadline)}</span> : null}
      </div>
      {clockError ? <p className="absolute inset-x-3 top-11 z-50 mx-auto w-fit border border-red-300/60 bg-red-950/95 px-3 py-2 text-sm text-red-100" role="status">Clock sync delayed. Retrying...</p> : null}
      {!activeStation ? (
        <div className="absolute right-4 top-12 z-30 flex flex-col items-end gap-2">
          {confirmLeave ? (
            <dialog aria-labelledby="leave-game-title" className="fixed right-4 top-12 m-0 ml-auto w-64 border border-red-300 bg-[#13070a]/95 p-3 text-red-50 shadow-[0_0_20px_rgba(248,113,113,0.3)] backdrop:bg-black/70" onCancel={(event) => { event.preventDefault(); setConfirmLeave(false); }} ref={leaveDialogRef} role="alertdialog">
              <p className="text-sm uppercase" id="leave-game-title">Leave this investigation?</p>
              <p className="mt-2 text-xs leading-relaxed text-red-100/75">You cannot rejoin after leaving a started room.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button autoFocus className="min-h-10 border border-cyan-300/60 text-xs uppercase text-cyan-100 hover:border-cyan-100" onClick={() => setConfirmLeave(false)} type="button">Stay</button>
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
          {error && !confirmLeave ? <p className="max-w-xs bg-[#050712]/90 px-3 py-2 text-sm text-red-200" role="alert">{error}</p> : null}
        </div>
      ) : null}
      <div className="relative h-full w-full bg-black">
        <Image
          alt="The investigation bureau"
          className="object-cover"
          fill
          priority
          src="/assets/bureau.jpg"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050712]/35 via-transparent to-[#050712]/45" />

        <Hotspot label="People" className="left-[4%] top-[26%] h-[40%] w-[18%]" onClick={() => openStation("interrogate")} />
        <Hotspot label="CCTV" className="left-[24%] top-[27%] h-[39%] w-[17%]" onClick={() => openStation("cctv")} />
        <Hotspot label="Clueboard" className="left-[41%] top-[27%] h-[29%] w-[21%]" onClick={() => openStation("clueboard")} />
        <Hotspot label="Public records" className="left-[62%] top-[26%] h-[40%] w-[19%]" onClick={() => openStation("evidence")} />
        <Hotspot label="Map" className="left-[82%] top-[17%] h-[43%] w-[18%]" onClick={() => openStation("map")} />
        <Hotspot label="Case" className="left-[18%] top-[59%] h-[39%] w-[64%]" onClick={() => openStation("case")} />

      </div>

      {!activeStation ? (
        <nav aria-label="Investigation stations" className="absolute inset-x-3 bottom-3 z-20 grid grid-cols-2 gap-2 border border-cyan-300/50 bg-[#050712]/95 p-3 shadow-[0_0_24px_rgba(34,211,238,0.2)] sm:hidden">
          <p className="col-span-2 text-xs uppercase tracking-[0.2em] text-cyan-100/55">Choose a bureau station</p>
          {stationOrder.map((item) => (
            <button
              className="min-h-12 border border-cyan-300/40 bg-[#06142d] px-2 text-sm uppercase text-cyan-50 active:border-yellow-200 active:text-yellow-200"
              key={item}
              onClick={() => openStation(item)}
              type="button"
            >
              {stations[item].label}
            </button>
          ))}
        </nav>
      ) : null}

      {activeStation || showAwayNotice ? (
        <div className="absolute inset-x-0 bottom-0 top-9 z-20">
          {station === "clueboard" ? <ClueBoardScreen roomCode={roomCode} onBack={() => router.push(`/lobby/${roomCode}/bureau`)} /> : null}
          {station === "cctv" ? <CctvScreen roomCode={roomCode} onBack={() => router.push(`/lobby/${roomCode}/bureau`)} /> : null}
          {station === "map" ? <MapScreen roomCode={roomCode} onBack={() => router.push(`/lobby/${roomCode}/bureau`)} /> : null}
          {station === "place" ? <PlaceScreen roomCode={roomCode} onBack={() => router.push(`/lobby/${roomCode}/map`)} /> : null}
          {station === "lab" ? <ForensicLabScreen roomCode={roomCode} onBack={() => router.push(`/lobby/${roomCode}/map`)} /> : null}
          {station === "interrogate" ? <InterrogationScreen roomCode={roomCode} onBack={() => router.push(`/lobby/${roomCode}/bureau`)} /> : null}
          {station === "evidence" ? <EvidenceScreen roomCode={roomCode} onBack={() => router.push(`/lobby/${roomCode}/bureau`)} /> : null}
          {station === "case" ? <CaseFileScreen roomCode={roomCode} onBack={() => router.push(`/lobby/${roomCode}/bureau`)} /> : null}
          {showAwayNotice ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#050712]/95 p-4 text-cyan-50">
              <div className="w-full max-w-lg border border-cyan-300/50 bg-[#07111b] p-6 text-center shadow-[0_0_30px_rgba(34,211,238,0.18)]">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/55">Current location</p>
                <h2 className="mt-2 text-2xl uppercase text-yellow-100">{city?.activeTravel ? `On the way to ${city.activeTravel.destinationName}` : currentPlace?.name ?? "Away from bureau"}</h2>
                <p className="mt-3 text-sm text-cyan-100/70">Bureau terminals are available when you return. You can still review your case and clueboard.</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <button className="min-h-11 border border-yellow-200/70 px-3 text-sm uppercase text-yellow-100" onClick={() => openStation("map")} type="button">City map</button>
                  {!city?.activeTravel && currentPlace?.hasInterior ? <button className="min-h-11 border border-yellow-200/70 px-3 text-sm uppercase text-yellow-100" onClick={() => openStation("place")} type="button">Explore this place</button> : null}
                  {!city?.activeTravel && currentPlace?.kind === "lab" ? <button className="min-h-11 border border-yellow-200/70 px-3 text-sm uppercase text-yellow-100" onClick={() => openStation("lab")} type="button">Forensic lab</button> : null}
                  <button className="min-h-11 border border-cyan-300/50 px-3 text-sm uppercase" onClick={() => openStation("clueboard")} type="button">Clueboard</button>
                  <button className="min-h-11 border border-cyan-300/50 px-3 text-sm uppercase" onClick={() => openStation("case")} type="button">Case file</button>
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
      className={`group absolute hidden border border-transparent transition hover:border-cyan-200/80 hover:bg-cyan-300/10 focus-visible:border-yellow-200 focus-visible:bg-yellow-200/10 sm:block ${className}`}
      onClick={onClick}
      type="button"
    >
      <span className="absolute left-1/2 top-2 -translate-x-1/2 -translate-y-full whitespace-nowrap border border-cyan-300/70 bg-[#06142d]/90 px-2 py-1 text-xs uppercase text-cyan-100 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
        {label}
      </span>
    </button>
  );
}
