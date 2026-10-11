/** The detective rank a filed report earns: the five stars, plus one step for closing it by the deadline. */
export function detectiveRank(stars: number, onTime: boolean) {
  const score = stars + (onTime ? 1 : 0);
  return score >= 6 ? "Chief Inspector" : score === 5 ? "Inspector" : score >= 3 ? "Detective" : "Rookie";
}
