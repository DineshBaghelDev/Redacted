"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { JobView } from "./job-view";

const box = "border border-cyan-300/60 p-3";
const button = "border border-cyan-300 px-3 py-1 hover:text-yellow-200 disabled:opacity-50";

/** Access gate, job list and job creation. */
export function Tester() {
  const access = useQuery(api.dev.tester.access);

  if (access === undefined) return <p>Loading…</p>;
  if (!access.signedIn) return <p>Sign in first.</p>;
  if (!access.allowed) {
    return (
      <p>
        Not allowed. Run <code>npx convex env set DEV_TOOL_USER_IDS {access.userId}</code>
      </p>
    );
  }
  return <Jobs />;
}

function Jobs() {
  const jobs = useQuery(api.dev.tester.listJobs);
  const createJob = useMutation(api.dev.tester.createJob);
  const [difficulty, setDifficulty] = useState<"easy" | "normal" | "hard">("easy");
  const [seed, setSeed] = useState("");
  const [selected, setSelected] = useState<Id<"generationJobs"> | null>(null);

  async function create() {
    const id = await createJob({ difficulty, seed: seed ? Number(seed) : undefined });
    setSelected(id);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className={`${box} flex flex-col gap-2`}>
        <div className="flex gap-2">
          <select
            className="bg-[#020817]"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
          >
            <option value="easy">easy</option>
            <option value="normal">normal</option>
            <option value="hard">hard</option>
          </select>
          <input
            className="w-24 bg-[#020817] px-1"
            placeholder="seed"
            value={seed}
            onChange={(e) => setSeed(e.target.value.replace(/\D/g, ""))}
          />
          <button className={button} onClick={create}>
            New job
          </button>
        </div>
        {jobs?.map((job) => (
          <button
            key={job._id}
            className={`text-left ${selected === job._id ? "text-yellow-200" : ""}`}
            onClick={() => setSelected(job._id)}
          >
            {new Date(job.createdAt).toLocaleString()} · {job.difficulty} · seed {job.seed}
          </button>
        ))}
      </aside>
      <section className={box}>{selected ? <JobView jobId={selected} /> : <p>Pick or create a job.</p>}</section>
    </div>
  );
}
