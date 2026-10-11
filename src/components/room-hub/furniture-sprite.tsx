import type { CSSProperties } from "react";

const spots: Record<string, number> = {
  "sofa cushions": 0, bookshelf: 1, "side table drawer": 2,
  "kitchen drawer": 3, bin: 4, fridge: 5, wardrobe: 6,
  "bedside drawer": 2, "under the bed": 7, cabinet: 8,
  workbench: 9, "tool shelf": 10, boxes: 11, desk: 12,
  "desk drawer": 12, "filing cabinet": 13, shelves: 14,
  "under the counter": 8, bushes: 15, "flower bed": 15,
};

export function FurnitureSprite({ spot, searched, className = "" }: { spot: string; searched: boolean; className?: string }) {
  const index = spots[spot.toLowerCase()] ?? 11;
  const style = {
    backgroundImage: `url('/assets/room-furniture${searched ? "-searched" : ""}.png')`,
    backgroundPosition: `${index % 4 * 100 / 3}% ${Math.floor(index / 4) * 100 / 3}%`,
  } satisfies CSSProperties;
  return <span aria-hidden="true" className={`furniture-sprite ${className}`} style={style} />;
}
