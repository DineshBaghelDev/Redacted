import { useState } from "react";
import Image from "next/image";

type Station = "interrogate" | "cctv" | "clueboard" | "evidence";

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
};

export function BureauScreen() {
  const [station, setStation] = useState<Station | null>(null);
  const activeStation = station ? stations[station] : null;

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

        <Hotspot label="Interrogate" className="left-[4%] top-[26%] h-[40%] w-[18%]" onClick={() => setStation("interrogate")} />
        <Hotspot label="CCTV" className="left-[24%] top-[27%] h-[39%] w-[17%]" onClick={() => setStation("cctv")} />
        <Hotspot label="Clueboard" className="left-[41%] top-[27%] h-[29%] w-[21%]" onClick={() => setStation("clueboard")} />
        <Hotspot label="Evidence" className="left-[62%] top-[26%] h-[40%] w-[19%]" onClick={() => setStation("evidence")} />

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
                onClick={() => setStation(null)}
                type="button"
              >
                Back
              </button>
            </div>
            <p className="mt-6 text-lg leading-relaxed text-cyan-100/85">{activeStation.description}</p>
            <p className="mt-5 border-t border-cyan-300/30 pt-4 text-sm uppercase text-cyan-100/60">
              This station is the next investigation surface.
            </p>
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
