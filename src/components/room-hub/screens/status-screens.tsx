export function LoadingScreen() {
  return (
    <div className="mx-auto flex min-h-[55vh] w-full max-w-xl flex-col items-center justify-center gap-8 text-center">
      <h1 className="text-4xl uppercase tracking-[0.18em] text-cyan-50 sm:text-5xl">
        Preparing case...
      </h1>
      <div className="space-y-3 text-left text-2xl text-cyan-200">
        <p>Generating city...</p>
        <p>Preparing records...</p>
        <p>Building case...</p>
      </div>
    </div>
  );
}

export function CaseBriefScreen({ caseId }: { caseId?: string }) {
  return (
    <div className="mx-auto w-full max-w-3xl border border-cyan-300 bg-[#06142d]/90 p-8 text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.22)]">
      <h1 className="text-4xl uppercase text-cyan-50">Case Brief</h1>
      {caseId ? <p className="mt-4 text-xl uppercase">Case {caseId}</p> : null}
    </div>
  );
}
