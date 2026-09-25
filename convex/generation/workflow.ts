import { WorkflowManager, type WorkflowCtx } from "@convex-dev/workflow";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { stages } from "./stages";

// "Run all": every stage in order with the repair loop. Failed checks go to the AI as repairs;
// only failed AI calls (network, rate limit, timeout) are retried as-is.

export const workflow = new WorkflowManager(components.workflow);

const AI_RETRY = { maxAttempts: 3, initialBackoffMs: 30_000, base: 2 };

/** Generates one case. Stops at the first stage that still has problems after its repairs. */
async function runCase(step: WorkflowCtx, jobId: Id<"generationJobs">) {
  await step.runMutation(internal.generation.jobs.setStatus, { jobId, status: "running" });
  let stageName = "";
  try {
    for (const stage of stages) {
      stageName = stage.name;
      let problems: string[];
      if (stage.kind === "code") {
        problems = await step.runAction(internal.generation.jobs.codeStep, { jobId, stage: stage.name }, { name: stage.name });
      } else {
        for (let attempt = 0; ; attempt++) {
          const result = await step.runAction(
            internal.generation.jobs.aiStep,
            { jobId, stage: stage.name, attempt },
            { name: `${stage.name} try ${attempt + 1}`, retry: AI_RETRY },
          );
          problems = result.problems;
          if (!result.retry) break;
        }
      }
      if (problems.length > 0) {
        await step.runMutation(internal.generation.jobs.setStatus, { jobId, status: "failed", failedStage: stage.name });
        return;
      }
    }
    await step.runMutation(internal.generation.jobs.setStatus, { jobId, status: "passed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await step.runMutation(internal.generation.jobs.setStatus, { jobId, status: "failed", failedStage: stageName, error: message });
  }
}

export const generateCase = workflow
  .define({ args: { jobId: v.id("generationJobs") } })
  .handler(async (step, { jobId }): Promise<void> => await runCase(step, jobId));

/** A test run: one case after another, so per-case times aren't slowed by each other. */
export const generateBatch = workflow
  .define({ args: { jobIds: v.array(v.id("generationJobs")) } })
  .handler(async (step, { jobIds }): Promise<void> => {
    for (const jobId of jobIds) await runCase(step, jobId);
  });
