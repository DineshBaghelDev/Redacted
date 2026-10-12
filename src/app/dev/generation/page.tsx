import type { Metadata } from "next";
import { Tester } from "./tester";

export const metadata: Metadata = { title: "Case generation tester", robots: { index: false, follow: false } };

/**
 * Owner-only case generation tester, also live in production. Access is enforced by the Convex
 * `DEV_TOOL_USER_IDS` allowlist; everyone else sees only a "not allowed" note.
 */
export default function GenerationTesterPage() {
  return (
    <main className="min-h-screen bg-[#050712] p-4 font-mono text-sm text-cyan-100">
      <h1 className="mb-4 text-xl text-yellow-200">Case generation tester</h1>
      <Tester />
    </main>
  );
}
