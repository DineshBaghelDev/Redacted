// Notebook entries, people, and evidence cards can be dragged onto other screens (board, portrait, bench, report).

export type DragKind = "person" | "item" | "forensic" | "cctv" | "public_record" | "device_file" | "call" | "message" | "statement" | "place";
export type DragCard = { kind: DragKind; referenceId: string; label: string };

const MIME = "application/x-redacted-card";

export function startCardDrag(event: React.DragEvent, card: DragCard) {
  event.dataTransfer.setData(MIME, JSON.stringify(card));
  event.dataTransfer.setData("text/plain", card.label);
  event.dataTransfer.effectAllowed = "copy";
}

export function readCardDrop(event: React.DragEvent): DragCard | null {
  try {
    const raw = event.dataTransfer.getData(MIME);
    return raw ? (JSON.parse(raw) as DragCard) : null;
  } catch {
    return null;
  }
}

/** Props that make an element accept dropped cards; `accepts` filters by kind. */
export function cardDropTarget(onCard: (card: DragCard) => void, accepts?: (card: DragKind) => boolean) {
  return {
    onDragOver: (event: React.DragEvent) => {
      if (event.dataTransfer.types.includes(MIME)) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }
    },
    onDrop: (event: React.DragEvent) => {
      const card = readCardDrop(event);
      if (!card || (accepts && !accepts(card.kind))) return;
      event.preventDefault();
      onCard(card);
    },
  };
}
