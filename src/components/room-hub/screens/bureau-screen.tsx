import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

type Station = "interrogate" | "cctv" | "clueboard" | "evidence" | "map" | "case";

const stations: Record<Station, { label: string; description: string }> = {
  interrogate: {
    label: "Interrogate",
    description: "Call a person to the bureau or review an interview.",
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
    label: "Evidence",
    description: "Review collected items, lab results, messages, and public records.",
  },
  map: {
    label: "City map",
    description: "Plan where to go next and review the places connected to this case.",
  },
  case: {
    label: "Case file",
    description: "Review the Union Station death briefing and the facts established so far.",
  },
};

export function BureauScreen() {
  const pathname = usePathname();
  const router = useRouter();
  const pathParts = pathname.split("/");
  const roomCode = pathParts[2] ?? "";
  const station = (pathParts[3] === "bureau" ? pathParts[4] : pathParts[3]) as Station | undefined;
  const activeStation = station ? stations[station] : null;
  const { isLoaded, isSignedIn } = useAuth();
  const caseBrief = useQuery(api.cases.latestBrief, isLoaded && isSignedIn ? {} : "skip");

  function openStation(nextStation: Station) {
    const path = nextStation === "map" || nextStation === "case"
      ? `/lobby/${roomCode}/${nextStation}`
      : `/lobby/${roomCode}/bureau/${nextStation}`;
    router.push(path);
  }

  return (
    <section className="relative h-screen w-full overflow-hidden border border-cyan-300/70 bg-[#050712] shadow-[0_0_30px_rgba(34,211,238,0.22)]">
      <div className="relative h-full w-full bg-black">
        <Image
          alt="The investigation bureau"
          className="object-cover"
          fill
          priority
          src="/assets/bureau.jpg"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050712]/35 via-transparent to-[#050712]/45" />

        <Hotspot label="Interrogate" className="left-[4%] top-[26%] h-[40%] w-[18%]" onClick={() => openStation("interrogate")} />
        <Hotspot label="CCTV" className="left-[24%] top-[27%] h-[39%] w-[17%]" onClick={() => openStation("cctv")} />
        <Hotspot label="Clueboard" className="left-[41%] top-[27%] h-[29%] w-[21%]" onClick={() => openStation("clueboard")} />
        <Hotspot label="Evidence" className="left-[62%] top-[26%] h-[40%] w-[19%]" onClick={() => openStation("evidence")} />
        <Hotspot label="Map" className="left-[82%] top-[17%] h-[43%] w-[18%]" onClick={() => openStation("map")} />
        <Hotspot label="Case" className="left-[18%] top-[59%] h-[39%] w-[64%]" onClick={() => openStation("case")} />

      </div>

      {activeStation ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#020817]/75 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg border border-cyan-300 bg-[#06142d] p-6 text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.3)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-yellow-200">Bureau station</p>
                <h2 className="mt-2 text-3xl uppercase text-cyan-50">{activeStation.label}</h2>
              </div>
              <button
                aria-label="Return to bureau"
                className="border border-cyan-300 px-3 py-2 text-sm uppercase text-cyan-100 hover:border-yellow-200 hover:text-yellow-200"
                onClick={() => router.push(`/lobby/${roomCode}/bureau`)}
                type="button"
              >
                Back
              </button>
            </div>
            {station === "case" ? (
              <div className="mt-6 space-y-5 border-2 border-[#b8a77d] bg-[#e9dfc5] p-5 text-[#211d17] shadow-[4px_4px_0_rgba(0,0,0,0.25)]">
                {caseBrief === undefined ? (
                  <p className="text-base uppercase">Loading case file...</p>
                ) : !caseBrief ? (
                  <p className="text-base uppercase text-red-800">No completed case is available.</p>
                ) : (
                  <>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-red-800">Case file · public brief</p>
                      <h3 className="mt-2 text-2xl uppercase">{caseBrief.title}</h3>
                    </div>
                    <p className="text-base leading-relaxed">{caseBrief.summary}</p>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-red-800">Initial facts</p>
                      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed">
                        {caseBrief.initialFacts.map((fact) => <li key={fact}>{fact}</li>)}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <p className="mt-6 text-lg leading-relaxed text-cyan-100/85">{activeStation.description}</p>
                <p className="mt-5 border-t border-cyan-300/30 pt-4 text-sm uppercase text-cyan-100/60">
                  This station is the next investigation surface.
                </p>
              </>
            )}
          </div>
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
      className={`group absolute border border-transparent transition hover:border-cyan-200/80 hover:bg-cyan-300/10 focus-visible:border-yellow-200 focus-visible:bg-yellow-200/10 ${className}`}
      onClick={onClick}
      type="button"
    >
      <span className="absolute left-1/2 top-2 -translate-x-1/2 -translate-y-full whitespace-nowrap border border-cyan-300/70 bg-[#06142d]/90 px-2 py-1 text-xs uppercase text-cyan-100 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
        {label}
      </span>
    </button>
  );
}
