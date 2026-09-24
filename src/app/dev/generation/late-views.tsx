import type { EvidenceSet } from "../../../../convex/generation/core/evidence/types";
import type { Brief, Estimate, Story, Texts } from "../../../../convex/generation/core/schemas";

/** Each rewritten piece next to the plain wording it replaces. */
export function TextsView({ texts, story, set }: { texts: Texts; story?: Story; set?: EvidenceSet }) {
  const before = (id: string) => story?.comms.find((c) => c.id === id)?.gist ?? set?.evidence.find((e) => e.id === id)?.summary ?? "";
  if (texts.texts.length === 0) return <p className="text-xs opacity-60">Nothing rewritten; plain wording is used.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-left">
          <tr>
            <th className="p-1">Piece</th>
            <th className="p-1">Plain wording</th>
            <th className="p-1">Written text</th>
          </tr>
        </thead>
        <tbody>
          {texts.texts.map((t) => (
            <tr key={t.id} className="border-t border-cyan-300/20 align-top">
              <td className="p-1 opacity-60">{t.id}</td>
              <td className="p-1 opacity-70">{before(t.id)}</td>
              <td className="p-1 text-yellow-200">{t.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The case brief as players would read it. */
export function BriefView({ brief }: { brief: Brief }) {
  return (
    <div className="max-w-xl border border-cyan-300/40 p-3">
      <div className="text-xs uppercase opacity-60">Case file</div>
      <div className="text-lg text-yellow-200">{brief.title}</div>
      <p className="mt-2">{brief.summary}</p>
      <ul className="mt-2 list-disc pl-5 text-sm">
        {brief.initialFacts.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    </div>
  );
}

/** Estimated time for a good investigation and the default deadline it gives. */
export function EstimateView({ estimate }: { estimate: Estimate }) {
  const hours = (m: number) => `${Math.floor(m / 60)} h ${m % 60} min`;
  return (
    <div className="flex flex-col gap-1">
      <div>
        Good investigation: <span className="text-yellow-200">{hours(estimate.estimatedOptimalMinutes)}</span>
      </div>
      <div>
        Default deadline (estimate + 1 day): <span className="text-yellow-200">{hours(estimate.estimatedOptimalMinutes + 1440)}</span>
      </div>
      <p className="text-xs opacity-70">{estimate.reasoningSummary}</p>
    </div>
  );
}
