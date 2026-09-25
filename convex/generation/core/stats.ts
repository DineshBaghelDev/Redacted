// Generation stats for test runs and time predictions, from the jobs' AI call logs and saved drafts.

export type StatsJob = { id: string; difficulty: string; status?: string; failedStage?: string; startedAt?: number; finishedAt?: number };
export type StatsDraft = { jobId: string; stage: string; checkErrors: string[] };
export type StatsLog = { jobId: string; stage: string; attempt?: number; ms: number; inputTokens?: number; outputTokens?: number; problems: string[]; error?: string };

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

/** Most common problems, with ids and numbers blanked so the same kind of problem counts together. */
function topProblems(logs: StatsLog[], limit = 5) {
  const counts = new Map<string, number>();
  for (const log of logs) {
    for (const p of new Set(log.problems.map((p) => p.replace(/\d+/g, "#")))) counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([problem, count]) => ({ problem, count }));
}

/**
 * Per AI stage: how many jobs reached it, passed on the first try, passed in the end, repairs, time and
 * tokens per job, failed calls and the most common problems.
 */
export function stageStats(stageNames: string[], drafts: StatsDraft[], logs: StatsLog[]) {
  return stageNames
    .map((stage) => {
      const stageLogs = logs.filter((l) => l.stage === stage);
      const byJob = new Map<string, StatsLog[]>();
      for (const l of stageLogs) byJob.set(l.jobId, [...(byJob.get(l.jobId) ?? []), l]);
      const jobs = [...byJob.values()];
      const answered = (ls: StatsLog[]) => ls.filter((l) => !l.error);
      return {
        stage,
        jobs: jobs.length,
        firstTryOk: jobs.filter((ls) => answered(ls).some((l) => (l.attempt ?? 0) === 0 && l.problems.length === 0)).length,
        endedOk: drafts.filter((d) => d.stage === stage && byJob.has(d.jobId) && d.checkErrors.length === 0).length,
        avgRepairs: jobs.length ? Math.round((10 * jobs.reduce((n, ls) => n + Math.max(0, ...answered(ls).map((l) => l.attempt ?? 0)), 0)) / jobs.length) / 10 : 0,
        avgMs: avg(jobs.map((ls) => ls.reduce((n, l) => n + l.ms, 0))),
        avgInputTokens: avg(jobs.map((ls) => ls.reduce((n, l) => n + (l.inputTokens ?? 0), 0))),
        avgOutputTokens: avg(jobs.map((ls) => ls.reduce((n, l) => n + (l.outputTokens ?? 0), 0))),
        failedCalls: stageLogs.filter((l) => l.error).length,
        topProblems: topProblems(answered(stageLogs)),
      };
    })
    .filter((s) => s.jobs > 0);
}

/** Per job: result, where it stopped, wall-clock minutes and total tokens. */
export function jobSummaries<J extends StatsJob>(jobs: J[], logs: StatsLog[]) {
  return jobs.map((job) => {
    const own = logs.filter((l) => l.jobId === job.id);
    return {
      ...job,
      minutes: job.startedAt !== undefined && job.finishedAt !== undefined ?Math.round((job.finishedAt - job.startedAt) / 60000) : undefined,
      aiCalls: own.length,
      inputTokens: own.reduce((n, l) => n + (l.inputTokens ?? 0), 0),
      outputTokens: own.reduce((n, l) => n + (l.outputTokens ?? 0), 0),
    };
  });
}

/**
 * Predicts the AI time left for a job from past jobs' average time per stage.
 *
 * @returns Minutes left, or undefined when there's no history for a stage still to run.
 */
export function predictMinutesLeft(stagesLeft: string[], history: ReturnType<typeof stageStats>) {
  const byStage = new Map(history.map((s) => [s.stage, s.avgMs]));
  if (stagesLeft.some((s) => !byStage.has(s))) return undefined;
  return Math.ceil(stagesLeft.reduce((n, s) => n + byStage.get(s)!, 0) / 60000);
}
