import type { Doc } from "../../../../convex/_generated/dataModel";

/** One AI call: model, how the JSON was enforced, time, tokens, and the full prompt and reply. */
export function AiLog({ log }: { log: Doc<"generationLogs"> }) {
  return (
    <div className="mt-2 border border-cyan-300/30 p-2 text-xs">
      <div className="flex flex-wrap gap-3">
        <span className="text-yellow-200">AI call{log.attempt ? ` · repair ${log.attempt}` : ""}</span>
        <span>{log.model}</span>
        <span title="strict = the AI service enforced the shape; json = shape only described in the prompt">
          {log.mode === "strict" ? "shape enforced" : "shape in prompt only"}
        </span>
        <span>{(log.ms / 1000).toFixed(1)} s</span>
        <span>
          {log.inputTokens ?? "?"} in / {log.outputTokens ?? "?"} out tokens
        </span>
        <span className="opacity-60">{new Date(log.createdAt).toLocaleTimeString()}</span>
      </div>
      {log.error && <div className="text-red-400">Failed: {log.error}</div>}
      {log.problems.length > 0 && <div className="text-red-400">{log.problems.length} problems in this try</div>}
      <details>
        <summary className="cursor-pointer opacity-80">Prompt</summary>
        <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap bg-[#020817] p-2">
          {log.system}
          {"\n\n"}
          {log.prompt}
        </pre>
      </details>
      <details>
        <summary className="cursor-pointer opacity-80">Reply</summary>
        <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap bg-[#020817] p-2">{log.rawText || "(empty)"}</pre>
      </details>
    </div>
  );
}
