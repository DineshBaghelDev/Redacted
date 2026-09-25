import { query } from "./_generated/server";
import { requireUserId } from "./lib/auth";

type Brief = {
  title?: unknown;
  summary?: unknown;
  initialFacts?: unknown;
};

export const latestBrief = query({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    const jobs = await ctx.db.query("generationJobs").order("desc").take(50);

    for (const job of jobs) {
      if (job.status !== "passed") continue;
      const draft = await ctx.db
        .query("generationDrafts")
        .withIndex("by_job_stage", (q) => q.eq("jobId", job._id).eq("stage", "brief"))
        .unique();
      const brief = draft?.output as Brief | undefined;
      if (!brief || typeof brief.title !== "string" || typeof brief.summary !== "string" || !Array.isArray(brief.initialFacts)) {
        continue;
      }

      const initialFacts = brief.initialFacts.filter((fact): fact is string => typeof fact === "string");
      return { title: brief.title, summary: brief.summary, initialFacts };
    }

    return null;
  },
});
