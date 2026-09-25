"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

const cell = "border border-cyan-300/30 px-2 py-1 text-left align-top";
const minutes = (ms: number) => `${(ms / 60000).toFixed(1)} min`;
const thousands = (n: number) => `${(n / 1000).toFixed(1)}k`;

/** One test run: each case's result, then each AI stage across the cases. */
export function StatsView({ batch }: { batch: string }) {
  const stats = useQuery(api.dev.tester.batchStats, { batch });
  if (!stats) return <p>Loading…</p>;

  const done = stats.jobs.filter((j) => j.minutes !== undefined);
  const passed = stats.jobs.filter((j) => j.status === "passed").length;
  const times = done.map((j) => j.minutes!);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-yellow-200">{batch}</h2>
      <p>
        Passed <span className="text-green-400">{passed}</span> of {stats.jobs.length}
        {times.length > 0 && ` · average ${Math.round(times.reduce((a, b) => a + b, 0) / times.length)} min per case, slowest ${Math.max(...times)} min`}
      </p>

      <table className="border-collapse">
        <thead>
          <tr>
            {["Difficulty", "Seed", "Result", "Time", "AI calls", "Tokens in / out"].map((h) => (
              <th key={h} className={cell}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.jobs.map((j) => (
            <tr key={j.id}>
              <td className={cell}>{j.difficulty}</td>
              <td className={cell}>{j.seed}</td>
              <td className={`${cell} ${j.status === "passed" ? "text-green-400" : j.status === "failed" ? "text-red-400" : ""}`}>
                {j.status === "queued" ? "waiting its turn" : j.status}
                {j.failedStage && ` at ${j.failedStage}`}
                {j.error && <div className="text-xs">{j.error}</div>}
              </td>
              <td className={cell}>{j.minutes !== undefined ? `${j.minutes} min` : "–"}</td>
              <td className={cell}>{j.aiCalls}</td>
              <td className={cell}>
                {thousands(j.inputTokens)} / {thousands(j.outputTokens)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="border-collapse">
        <thead>
          <tr>
            {["AI stage", "Cases", "OK first try", "OK in the end", "Repairs (avg)", "Time (avg)", "Tokens in / out (avg)", "Failed calls", "Most common problems"].map((h) => (
              <th key={h} className={cell}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.stages.map((s) => (
            <tr key={s.stage}>
              <td className={`${cell} text-yellow-200`}>{s.stage}</td>
              <td className={cell}>{s.jobs}</td>
              <td className={cell}>{s.firstTryOk}</td>
              <td className={cell}>{s.endedOk}</td>
              <td className={cell}>{s.avgRepairs}</td>
              <td className={cell}>{minutes(s.avgMs)}</td>
              <td className={cell}>
                {thousands(s.avgInputTokens)} / {thousands(s.avgOutputTokens)}
              </td>
              <td className={`${cell} ${s.failedCalls ? "text-red-400" : ""}`}>{s.failedCalls}</td>
              <td className={`${cell} text-xs`}>
                {s.topProblems.map((p) => (
                  <div key={p.problem}>
                    {p.count}× {p.problem}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
