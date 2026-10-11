import { useAuth } from "@clerk/nextjs";
import { FirstTimeTip, resetTips } from "../first-time-tip";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import Image from "next/image";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { go, replaceTo } from "../../../lib/game-nav";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { currentGameMinute, formatGameMinute, formatDuration, partOfDay } from "../../../lib/game-time";
import { getVolume, isMuted, play, setMuted, setVolume } from "../../../lib/sound";
import { GameIcon } from "../game-icon";
import { ControlIcon } from "../control-icon";
import { NotebookOverlay } from "../notebook-overlay";

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

/** Fetch every station's code in the background so the first visit to each one doesn't wait on a download. */
export function preloadStations() {
  void import("./clue-board-screen");
  void import("./cctv-screen");
  void import("./map-screen");
  void import("./place-screen");
  void import("./forensic-lab-screen");
  void import("./interrogation-screen");
  void import("./evidence-screen");
  void import("./case-file-screen");
}

type Station = "interrogate" | "cctv" | "clueboard" | "evidence" | "map" | "place" | "lab" | "case";
type Toast = { id: string; text: string };

const stations: Record<Station, string> = {
  interrogate: "Interview room",
  cctv: "Security desk",
  clueboard: "Clueboard",
  evidence: "Records room",
  map: "City map",
  place: "Explore",
  lab: "Forensic lab",
  case: "Case file",
};

const hotspots: { station: Station; label: string; icon: Parameters<typeof GameIcon>[0]["name"]; className: string }[] = [
  { station: "interrogate", label: "Interview room", icon: "interview", className: "left-[2%] top-[23%] h-[43%] w-[15%]" },
  { station: "cctv", label: "Security desk", icon: "cctv", className: "left-[19%] top-[34%] h-[33%] w-[18%]" },
  { station: "clueboard", label: "Clueboard", icon: "clueboard", className: "left-[38%] top-[23%] h-[34%] w-[23%]" },
  { station: "evidence", label: "Records", icon: "records", className: "left-[63%] top-[34%] h-[33%] w-[16%]" },
  { station: "map", label: "City map", icon: "map", className: "left-[80%] top-[23%] h-[34%] w-[19%]" },
  { station: "case", label: "Case file", icon: "case", className: "left-[39%] top-[76%] h-[22%] w-[23%]" },
];

export function BureauScreen({ error, onLeave }: { error: string; onLeave: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [muted, setMutedState] = useState(() => typeof window !== "undefined" && isMuted());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const menuRef = useRef<HTMLDialogElement>(null);
  const panoramaRef = useRef<HTMLDivElement>(null);
  const seenEntries = useRef<Set<string> | null>(null);
  const seenPings = useRef<Set<string> | null>(null);
  const [clockError, setClockError] = useState(false);
  const [now, setNow] = useState(0);
  const pathParts = pathname.split("/");
  const roomCode = pathParts[2] ?? "";
  const ready = roomCode && isLoaded && isSignedIn;
  const city = useQuery(api.world.getMap, ready ? { roomCode } : "skip");
  const coop = useQuery(api.coop.get, ready ? { roomCode } : "skip");
  const notebook = useQuery(api.notebook.get, ready ? { roomCode } : "skip");
  const labReady = useQuery(api.forensics.readyCount, ready ? { roomCode } : "skip");
  const seenLabReady = useRef<number | null>(null);
  const settleClock = useMutation(api.world.finishTravel);
  const station = (pathParts[3] === "bureau" ? pathParts[4] : pathParts[3]) as Station | undefined;
  const activeStation = station ? stations[station] : null;
  const bureau = city?.places.find((place) => place.kind === "bureau");
  const currentPlace = city?.places.find((place) => place.id === city.currentPlaceId);
  const away = Boolean(city && (city.activeTravel || city.currentPlaceId !== bureau?.id));
  const bureauOnly = station === "cctv" || station === "evidence";
  const showAwayNotice = away && (bureauOnly || (!station && (Boolean(city?.activeTravel) || !currentPlace?.hasInterior) && currentPlace?.kind !== "lab"));
  const showBureauHub = !activeStation && !away;
  const clock = city?.clock;
  const gameTime = clock ? currentGameMinute(clock, now) : null;

  function openStation(nextStation: Station) {
    play("door");
    const path = nextStation === "map" || nextStation === "place" || nextStation === "lab" || nextStation === "case"
      ? `/lobby/${roomCode}/${nextStation}`
      : `/lobby/${roomCode}/bureau/${nextStation}`;
    go(path);
  }

  function toast(text: string) {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current.slice(-3), { id, text }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 5000);
  }

  // The bureau's own rooms are its stations; exploring it as a building would only duplicate them.
  useEffect(() => {
    if (station === "place" && city && !city.activeTravel && currentPlace?.kind === "bureau") replaceTo(`/lobby/${roomCode}/bureau`);
  }, [city, currentPlace, roomCode, station]);

  // Away from the bureau with no station open: go straight into the place instead of a "you are away" card.
  useEffect(() => {
    if (activeStation || !city || city.activeTravel || !away) return;
    if (currentPlace?.kind === "lab") replaceTo(`/lobby/${roomCode}/lab`);
    else if (currentPlace?.hasInterior) replaceTo(`/lobby/${roomCode}/place`);
  }, [activeStation, away, city, currentPlace, roomCode]);

  useEffect(() => {
    if (!clock || clock.clockStartedAt === null) return;
    const update = () => setNow(Date.now());
    update();
    const interval = window.setInterval(update, 200);
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

  // New notebook entries and partner pings surface as brief notices.
  useEffect(() => {
    if (!notebook) return;
    const keys = new Set(notebook.map((entry) => `${entry.type}:${entry.referenceId}`));
    if (seenEntries.current) {
      const fresh = notebook.filter((entry) => !seenEntries.current!.has(`${entry.type}:${entry.referenceId}`));
      if (fresh.length) {
        play("reveal");
        toast(fresh.length === 1 ? `Added to notebook: ${fresh[0].title}` : `${fresh.length} new entries in the notebook`);
      }
    }
    seenEntries.current = keys;
  }, [notebook]);

  useEffect(() => {
    if (labReady === undefined) return;
    if (seenLabReady.current !== null && labReady > seenLabReady.current) {
      play("ping");
      toast("The lab called: a result is ready to read at the forensic lab.");
    }
    seenLabReady.current = labReady;
  }, [labReady]);

  useEffect(() => {
    if (!coop) return;
    const ids = new Set(coop.pings.map((ping) => ping.id));
    if (seenPings.current) {
      for (const ping of coop.pings) if (!seenPings.current.has(ping.id)) { play("ping"); toast(`${ping.from}: ${ping.text}`); }
    }
    seenPings.current = ids;
  }, [coop]);

  useEffect(() => {
    const idle = window.setTimeout(preloadStations, 300);
    return () => window.clearTimeout(idle);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;
      const key = event.key.toLowerCase();
      if (key === "escape") {
        if (notebookOpen) setNotebookOpen(false);
        else setMenuOpen((open) => !open);
      } else if (key === "n") setNotebookOpen((open) => !open);
      else if (key === "m") openStation("map");
      else if (key === "b") openStation("clueboard");
      else if (key === "c") openStation("case");
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    const dialog = menuRef.current;
    if (menuOpen && dialog && !dialog.open) dialog.showModal();
    if (!menuOpen && dialog?.open) dialog.close();
  }, [menuOpen]);

  useEffect(() => {
    const panorama = panoramaRef.current;
    if (panorama && showBureauHub) panorama.scrollLeft = (panorama.scrollWidth - panorama.clientWidth) / 2;
  }, [showBureauHub]);

  const partner = coop?.partners[0];
  const left = gameTime !== null && city?.deadline != null ? city.deadline - gameTime : null;

  return (
    <section className="relative h-screen w-full overflow-hidden bg-[#071014]">
      <header className="absolute inset-x-0 top-0 z-30 flex h-10 items-center gap-2 border-b border-[#45635d] bg-[#071014]/95 px-2 text-xs uppercase tracking-[0.08em] text-[#e8ac51] sm:gap-4 sm:px-4">
        <span className="flex shrink-0 items-center gap-2" title="Case time">
          <span aria-hidden="true" className="hud-watch" />
          <span className="whitespace-nowrap">{gameTime === null ? "Syncing..." : formatGameMinute(gameTime)}</span>
          {gameTime !== null ? <span className="hidden text-[#b8ccc1] md:inline">· {partOfDay(gameTime)}</span> : null}
        </span>
        {left !== null ? <span className={`whitespace-nowrap ${left <= 0 ? "text-[#e5a18e]" : left < 120 ? "text-[#f1c987]" : "text-[#b8ccc1]"}`}>{left <= 0 ? "Overdue" : <>{formatDuration(left)}<span className="hidden sm:inline"> left</span></>}</span> : null}
        {partner ? <span className="ml-auto hidden min-w-0 truncate normal-case tracking-normal text-[#c8d8d2] sm:inline" title="Your partner">{partner.name} · {partner.place} · {partner.activity}</span> : <span className="ml-auto" />}
        <button aria-label="Notebook" className="game-control-button game-icon-mobile flex min-h-9 shrink-0 items-center gap-2 px-3" onClick={() => { play("open"); setNotebookOpen(true); }} title="Notebook · N" type="button"><ControlIcon name="notebook" /><span className="hidden sm:inline">Notebook</span></button>
        <button aria-label="Pause menu" className="game-control-button game-icon-mobile flex min-h-9 shrink-0 items-center gap-2 px-3" onClick={() => { play("open"); setMenuOpen(true); }} title="Pause · Esc" type="button"><ControlIcon name="pause" /><span className="hidden sm:inline">Menu</span></button>
      </header>
      {clockError ? <p className="absolute inset-x-3 top-11 z-50 mx-auto w-fit border border-red-300/60 bg-red-950/95 px-3 py-2 text-sm text-red-100" role="status">Clock sync delayed. Retrying...</p> : null}

      <div className={`game-panorama relative h-full w-full overflow-x-auto overflow-y-hidden bg-black transition-[filter] duration-1000 lg:overflow-hidden ${gameTime !== null && partOfDay(gameTime) === "Night" ? "brightness-[.7] saturate-[.8]" : ""}`} ref={panoramaRef}>
        <div className="relative h-full w-[260vh] min-w-full lg:w-full">
          <Image alt="The investigation bureau" className="object-cover" fill priority sizes="260vh" src="/assets/bureau-noir.png" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#071014]/15 via-transparent to-[#071014]/20" />
          {showBureauHub ? hotspots.map((spot) => <Hotspot key={spot.station} {...spot} onClick={() => openStation(spot.station)} />) : null}
        </div>
      </div>
      {showBureauHub && !menuOpen ? <FirstTimeTip id="bureau" title="The bureau">Tap a station to open it. N opens the notebook; Esc pauses.</FirstTimeTip> : null}
      {showBureauHub ? <p className="pointer-events-none absolute inset-x-0 bottom-3 z-20 text-center text-xs uppercase tracking-[0.2em] text-[#c8d8d2]/70 lg:hidden">Swipe to look around the bureau</p> : null}

      {activeStation || showAwayNotice ? (
        <div className="absolute inset-x-0 bottom-0 top-10 z-20 animate-in fade-in duration-300" key={station ?? "away"}>
          {station === "clueboard" ? <ClueBoardScreen roomCode={roomCode} onBack={() => go(`/lobby/${roomCode}/bureau`)} /> : null}
          {station === "cctv" && !showAwayNotice ? <CctvScreen roomCode={roomCode} onBack={() => go(`/lobby/${roomCode}/bureau`)} /> : null}
          {station === "map" ? <MapScreen roomCode={roomCode} onBack={() => go(`/lobby/${roomCode}/bureau`)} /> : null}
          {station === "place" ? <PlaceScreen roomCode={roomCode} onBack={() => go(`/lobby/${roomCode}/map`)} /> : null}
          {station === "lab" ? <ForensicLabScreen roomCode={roomCode} onBack={() => go(`/lobby/${roomCode}/map`)} /> : null}
          {station === "interrogate" ? <InterrogationScreen roomCode={roomCode} onBack={() => go(`/lobby/${roomCode}/bureau`)} /> : null}
          {station === "evidence" && !showAwayNotice ? <EvidenceScreen roomCode={roomCode} onBack={() => go(`/lobby/${roomCode}/bureau`)} /> : null}
          {station === "case" ? <CaseFileScreen roomCode={roomCode} onBack={() => go(`/lobby/${roomCode}/bureau`)} /> : null}
          {showAwayNotice ? (
            <div className="game-place-scene absolute inset-0 z-20 flex items-center justify-center p-4 text-[#e4e6d8]">
              <div className="game-panel w-full max-w-lg p-6 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-[#c8d8d2]/55">{city?.activeTravel ? "On the road" : "You are not at the bureau"}</p>
                <h2 className="mt-2 text-2xl uppercase text-[#f1c987]">{city?.activeTravel ? `Heading to ${city.activeTravel.destinationName}` : currentPlace?.name ?? "Out in the city"}</h2>
                <p className="mt-3 text-sm text-[#c8d8d2]/70">{bureauOnly ? "This terminal is at the bureau. Travel back to use it." : "Your notebook and the clueboard go everywhere with you."}</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <button className="min-h-11 border border-[#e8ac51]/70 px-3 text-sm uppercase text-[#f1c987]" onClick={() => openStation("map")} type="button">Open the city map</button>
                  {!city?.activeTravel && currentPlace?.hasInterior ? <button className="min-h-11 border border-[#e8ac51]/70 px-3 text-sm uppercase text-[#f1c987]" onClick={() => openStation("place")} type="button">Back inside</button> : null}
                  <button className="min-h-11 border border-[#6f9f98]/50 px-3 text-sm uppercase" onClick={() => setNotebookOpen(true)} type="button">Notebook</button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div aria-live="polite" className="pointer-events-none absolute bottom-4 right-4 z-[70] flex w-[min(22rem,calc(100%-2rem))] flex-col gap-2">
        {toasts.map((item) => <p className="game-toast animate-in slide-in-from-right fade-in" key={item.id}>{item.text}</p>)}
      </div>

      {notebookOpen ? <NotebookOverlay roomCode={roomCode} onClose={() => setNotebookOpen(false)} /> : null}

      <dialog aria-labelledby="pause-title" className="m-auto w-[min(26rem,calc(100%-2rem))] bg-transparent p-0 backdrop:bg-black/75" onCancel={(event) => { event.preventDefault(); setMenuOpen(false); setConfirmLeave(false); }} ref={menuRef}>
        <div className="game-panel px-10 py-10 text-[#e4e6d8]">
          <h2 className="game-title text-2xl uppercase" id="pause-title">Paused</h2>
          <p className="mt-1 text-xs text-[#c8d8d2]/70">The case clock only runs while someone is busy.</p>
          {confirmLeave ? (
            <div className="mt-4 border border-red-400/70 p-3">
              <p className="text-sm uppercase text-red-100">Leave this investigation?</p>
              <p className="mt-2 text-xs text-red-100/75">You cannot rejoin after leaving a started room.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button autoFocus className="min-h-10 border border-[#6f9f98]/60 text-xs uppercase" onClick={() => setConfirmLeave(false)} type="button">Stay</button>
                <button className="min-h-10 border border-red-400 bg-red-950 text-xs uppercase text-red-50" onClick={onLeave} type="button">Leave</button>
              </div>
              {error ? <p className="mt-3 text-sm text-red-200" role="alert">{error}</p> : null}
            </div>
          ) : (
            <div className="mt-4 grid gap-2">
              <button autoFocus className="game-control-button flex min-h-11 items-center justify-center gap-2 text-sm uppercase text-[#f1c987]" onClick={() => { play("close"); setMenuOpen(false); }} type="button"><ControlIcon name="play" />Resume</button>
              <button className="game-control-button flex min-h-11 items-center justify-center gap-2 text-sm uppercase" onClick={() => { const next = !muted; setMuted(next); setMutedState(next); if (!next) play("ping"); }} type="button"><ControlIcon name="speaker" />Music &amp; effects · {muted ? "Off" : "On"}</button>
              {!muted ? <label className="flex items-center gap-3 text-xs uppercase text-[#c8d8d2]">Volume<input aria-label="Volume" className="flex-1 accent-[#e8ac51]" defaultValue={Math.round(getVolume() * 100)} max={100} min={0} onChange={(event) => setVolume(Number(event.target.value) / 100)} onPointerUp={() => play("ping")} type="range" /></label> : null}
              <button className="min-h-11 border border-[#6f9f98]/60 text-sm uppercase" onClick={() => { resetTips(); setMenuOpen(false); }} type="button">Show tips again</button>
              <button className="min-h-11 border border-red-400/70 text-sm uppercase text-red-100" onClick={() => setConfirmLeave(true)} type="button">Leave case</button>
            </div>
          )}
          <details className="mt-4 text-xs text-[#c8d8d2]/75"><summary className="cursor-pointer uppercase text-[#e8ac51]">Controls</summary><dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="font-mono text-[#e8ac51]">N</dt><dd>Notebook</dd>
            <dt className="font-mono text-[#e8ac51]">M</dt><dd>City map</dd>
            <dt className="font-mono text-[#e8ac51]">B</dt><dd>Clueboard</dd>
            <dt className="font-mono text-[#e8ac51]">C</dt><dd>Case file</dd>
            <dt className="font-mono text-[#e8ac51]">Esc</dt><dd>Pause / close</dd>
          </dl></details>
        </div>
      </dialog>
    </section>
  );
}

function Hotspot({
  label,
  icon,
  className,
  onClick,
}: {
  label: string;
  icon: Parameters<typeof GameIcon>[0]["name"];
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`group absolute border border-transparent transition hover:bg-[#e8ac51]/5 focus-visible:bg-[#e8ac51]/10 ${className}`}
      onClick={onClick}
      type="button"
    >
      <span aria-hidden="true" className="absolute bottom-2 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-center text-sm uppercase leading-tight text-[#f5d18f] opacity-80 drop-shadow-[0_2px_2px_#000] transition group-hover:-translate-y-1 group-hover:opacity-100 group-focus-visible:-translate-y-1 group-focus-visible:opacity-100 lg:opacity-50">
        <GameIcon name={icon} className="size-12 drop-shadow-[0_2px_3px_#000]" />
        <span>{label}</span>
      </span>
    </button>
  );
}
