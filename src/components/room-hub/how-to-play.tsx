/** The rules of the game in plain steps. Controls and rules only; it never says anything about a case. */
export function HowToPlay() {
  return (
    <ol className="space-y-4 text-sm leading-relaxed text-[#c8d8d2]">
      <Step title="You are the detective">
        A death has been reported. Nobody tells you who did it, and the game never draws conclusions for you. Play alone or with a partner; partners share everything they find.
      </Step>
      <Step title="Go and look">
        You start at the scene. Hold furniture to search it. Use the city map to travel; homes and workplaces are worth a visit. Found objects can be bagged for the lab.
      </Step>
      <Step title="Everything you find is written down">
        The notebook (N) keeps every object, message, record, camera sighting and lab report. Pin what matters to the clueboard and tie strings between cards to build your theory.
      </Step>
      <Step title="People lie">
        Bring people in for questioning at the bureau. Ask where they were or what they saw to take a formal statement, and ask for their phone if you want to go through it. Repeating a question never breaks a lie: show them evidence that proves them wrong.
      </Step>
      <Step title="Time matters">
        Every action costs case minutes, and the clock only runs while someone is busy. Splitting up saves time. Closing the case by the deadline earns a higher detective rank.
      </Step>
      <Step title="Close the case">
        Open the case file and say who did it, with what, why, and how, and cite the evidence that proves it. Each of the five is worth a star. Then you see what really happened.
      </Step>
    </ol>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="border-l-2 border-[#e8ac51]/60 pl-3">
      <p className="text-xs uppercase tracking-[0.18em] text-[#e8ac51]">{title}</p>
      <p className="mt-1">{children}</p>
    </li>
  );
}
