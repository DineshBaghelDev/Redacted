import { z } from "zod";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { textsSchema } from "../generation/core/schemas";

const statementSchema = z.object({
  id: z.string(),
  type: z.literal("witness"),
  title: z.string(),
  summary: z.string(),
  access: z.object({ tool: z.literal("interrogation"), witnessId: z.string() }),
  data: z.object({ witnessId: z.string(), eventId: z.string() }),
});

export async function ensureCaseStatements(ctx: MutationCtx, caseId: Id<"cases">, jobId: Id<"generationJobs">) {
  if (await ctx.db.query("witnessStatements").withIndex("by_caseId_and_evidenceId", q => q.eq("caseId", caseId)).first()) return;
  const [evidenceDraft, textDraft] = await Promise.all(["evidence", "text"].map(stage =>
    ctx.db.query("generationDrafts").withIndex("by_job_stage", q => q.eq("jobId", jobId).eq("stage", stage)).unique()));
  const evidence = z.object({ evidence: z.array(z.unknown()) }).safeParse(evidenceDraft?.output);
  const texts = textsSchema.safeParse(textDraft?.output);
  if (!evidence.success) throw new Error("This case has no valid witness evidence.");
  const rewritten = new Map(texts.success ? texts.data.texts.map(value => [value.id, value.text]) : []);
  for (const value of evidence.data.evidence) {
    if (!value || typeof value !== "object" || !("type" in value) || value.type !== "witness") continue;
    const statement = statementSchema.parse(value);
    if (statement.access.witnessId !== statement.data.witnessId) throw new Error(`Statement ${statement.id} has a mismatched witness.`);
    const witness = await ctx.db.query("npcs").withIndex("by_caseId_and_sourceId", q => q.eq("caseId", caseId).eq("sourceId", statement.data.witnessId)).unique();
    if (!witness || witness.role === "victim") throw new Error(`Statement ${statement.id} names an unavailable witness.`);
    await ctx.db.insert("witnessStatements", {
      caseId, witnessNpcId: witness._id, evidenceId: statement.id, eventId: statement.data.eventId,
      title: statement.title, text: rewritten.get(statement.id) ?? statement.summary,
    });
  }
}
