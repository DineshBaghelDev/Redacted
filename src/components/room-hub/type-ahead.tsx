"use client";

/** The word being typed at the end of the text, if it is at least two letters. */
function fragment(value: string) {
  const match = value.match(/([A-Za-z][A-Za-z'’-]+)$/);
  return match && match[1].length >= 2 ? match[1] : null;
}

/**
 * Finishes a name you have started typing, like a phone's contact suggestions. It never lists options up
 * front: nothing shows until you type the start of a name you already know.
 */
export function TypeAhead({ value, names, onPick }: { value: string; names: string[]; onPick: (next: string) => void }) {
  const typed = fragment(value);
  if (!typed) return null;
  const lower = typed.toLowerCase();
  const matches = [...new Set(names)]
    .filter((name) => name.toLowerCase() !== lower && name.toLowerCase().split(/\s+/).some((word) => word.startsWith(lower)))
    .slice(0, 3);
  if (!matches.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1" aria-label="Finish the name">
      {matches.map((name) => (
        <button className="border border-[#45635d] bg-[#0b1a1c] px-2 py-1 text-xs text-[#c8d8d2] hover:border-[#e8ac51] hover:text-[#f1c987]" key={name} onClick={() => onPick(`${value.slice(0, value.length - typed.length)}${name}`)} type="button">
          {name}
        </button>
      ))}
    </div>
  );
}
