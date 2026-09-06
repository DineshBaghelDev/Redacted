type PreviousGame = {
  caseId: string;
  name: string;
  players: string;
  progress: string;
};

type PreviousGamesScreenProps = {
  onContinue: () => void;
  onFreshStart: (caseId: string) => void;
};

const previousGames: PreviousGame[] = [
  {
    caseId: "#0182",
    name: "The Ashwood Murder",
    players: "Dinesh, Anshuman",
    progress: "Day 2 - 23:17",
  },
  {
    caseId: "#0176",
    name: "The Cerulean Facility",
    players: "Kavya, Rohit",
    progress: "Day 4 - 11:05",
  },
  {
    caseId: "#0169",
    name: "The Arcadia Letters",
    players: "Meera, Sid",
    progress: "Day 3 - 07:48",
  },
];

export function PreviousGamesScreen({ onContinue, onFreshStart }: PreviousGamesScreenProps) {
  return (
    <div className="grid w-full gap-4 md:grid-cols-3">
      {previousGames.map((game) => (
        <article
          className="border-4 border-[#8b5b38] bg-[#d3b08b] p-5 text-[#160d13] shadow-[8px_8px_0_rgba(0,0,0,0.45)]"
          key={game.caseId}
        >
          <p className="text-lg uppercase">Case {game.caseId}</p>
          <h2 className="min-h-16 border-b-2 border-[#160d13] pb-2 text-3xl uppercase leading-none">
            {game.name}
          </h2>
          <p className="mt-4 text-lg uppercase">Players:</p>
          <p className="text-lg uppercase">{game.players}</p>
          <p className="mt-4 text-lg uppercase">Progress:</p>
          <p className="text-lg uppercase">{game.progress}</p>
          <button
            className="mt-5 h-11 w-full border-2 border-cyan-300 bg-[#06142d] text-lg uppercase text-yellow-200"
            onClick={onContinue}
            type="button"
          >
            Continue
          </button>
          <button
            className="mt-2 h-11 w-full border-2 border-cyan-100 bg-[#1f2541] text-lg uppercase text-cyan-100"
            onClick={() => onFreshStart(game.caseId)}
            type="button"
          >
            Fresh start
          </button>
        </article>
      ))}
    </div>
  );
}