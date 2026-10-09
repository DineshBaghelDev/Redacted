type GameIconName = "badge" | "cctv" | "clueboard" | "records" | "map" | "case" | "lab" | "interview";

export function GameIcon({ name, className = "" }: { name: GameIconName; className?: string }) {
  return <span aria-hidden="true" className={`game-icon game-icon--${name} ${className}`} />;
}
