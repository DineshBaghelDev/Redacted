"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { JobView } from "./job-view";
import { StatsView } from "./stats-view";

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
  const runTestBatch = useMutation(api.dev.tester.runTestBatch);
  const batches = useQuery(api.dev.tester.listBatches);
  const [batch, setBatch] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<"easy" | "normal" | "hard">("easy");
  const [seed, setSeed] = useState("");
  const [selected, setSelected] = useState<Id<"generationJobs"> | null>(null);

  async function create() {
    const id = await createJob({ difficulty, seed: seed ? Number(seed) : undefined });
    setSelected(id);
    setBatch(null);
  }

  async function startTestRun() {
    setBatch(await runTestBatch());
    setSelected(null);
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
        <button className={button} onClick={startTestRun}>
          Run 3 test cases (easy, normal, hard)
        </button>
        {batches && batches.length > 0 && <p className="mt-2 opacity-60">Test runs</p>}
        {batches?.map((b) => (
          <button
            key={b}
            className={`text-left ${batch === b ? "text-yellow-200" : ""}`}
            onClick={() => {
              setBatch(b);
              setSelected(null);
            }}
          >
            {b}
          </button>
        ))}
        <p className="mt-2 opacity-60">Jobs</p>
        {jobs?.map((job) => (
          <button
            key={job._id}
            className={`text-left ${selected === job._id ? "text-yellow-200" : ""}`}
            onClick={() => {
              setSelected(job._id);
              setBatch(null);
            }}
          >
            {new Date(job.createdAt).toLocaleString()} · {job.difficulty} · seed {job.seed}
            {job.status && ` · ${job.status === "queued" ? "waiting" : job.status}`}
          </button>
        ))}
      </aside>
      <section className={box}>
        {selected ? <JobView jobId={selected} /> : batch ? <StatsView batch={batch} /> : <p>Pick or create a job.</p>}
      </section>
    </div>
  );
}
