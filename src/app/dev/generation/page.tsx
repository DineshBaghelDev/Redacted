import { Tester } from "./tester";

/**
 * Dev-only case generation tester. Access is enforced by the Convex allowlist, not by this page.
 */
export default function GenerationTesterPage() {
  return (
    <main className="min-h-screen bg-[#050712] p-4 font-mono text-sm text-cyan-100">
      <h1 className="mb-4 text-xl text-yellow-200">Case generation tester</h1>
      <Tester />
    </main>
  );
}
