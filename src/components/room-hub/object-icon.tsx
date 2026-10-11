import type { CSSProperties } from "react";

const primary = [
  /\b(phone|mobile|handset)\b/i,
  /\b(laptop|computer)\b/i,
  /\b(letter|note|memo|paper|scrap)\b/i,
  /\b(sticky|post-it)\b/i,
  /\b(receipt|ticket|invoice)\b/i,
  /\b(id|identity|license|badge|card)\b/i,
  /\b(key|keyring)\b/i,
  /\b(photo|picture|portrait|polaroid)\b/i,
  /\b(bottle|flask)\b/i,
  /\b(vial|pill|medicine|tablet)\b/i,
  /\b(cup|mug)\b/i,
  /\b(glass|tumbler)\b/i,
  /\b(knife|blade)\b/i,
  /\b(wrench|hammer|bat|blunt)\b/i,
  /\b(rope|cord|cable|wire)\b/i,
  /\b(gun|pistol|revolver|firearm)\b/i,
];

const secondary = [
  /\b(coat|jacket|shirt|clothing|fabric|cloth)\b/i,
  /\b(shoe|boot|sneaker)\b/i,
  /\b(bag|wallet|purse)\b/i,
  /\b(tool|screwdriver)\b/i,
  /\b(folder|file|document|report)\b/i,
  /\b(cash|money|banknote)\b/i,
  /\b(jewel|ring|necklace|bracelet|watch)\b/i,
  /\b(birthday|greeting)\b/i,
];

export function objectArtwork(name: string) {
  if (secondary[7].test(name)) return { sheet: "secondary", index: 7, columns: 3 } as const;
  const first = primary.findIndex((pattern) => pattern.test(name));
  if (first >= 0) return { sheet: "primary", index: first, columns: 4 } as const;
  const second = secondary.findIndex((pattern) => pattern.test(name));
  return { sheet: "secondary", index: second < 0 ? 8 : second, columns: 3 } as const;
}

export function ObjectIcon({ name, className = "" }: { name: string; className?: string }) {
  const { sheet, index, columns } = objectArtwork(name);
  const style = {
    backgroundImage: `url('/assets/evidence-objects-${sheet}.png')`,
    backgroundSize: `${columns * 100}% ${columns * 100}%`,
    backgroundPosition: `${index % columns * 100 / (columns - 1)}% ${Math.floor(index / columns) * 100 / (columns - 1)}%`,
  } satisfies CSSProperties;
  return <span aria-hidden="true" className={`object-icon ${className}`} style={style} />;
}
