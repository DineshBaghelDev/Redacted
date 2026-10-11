"use client";

import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { play } from "../../lib/sound";

type BoardNode = NonNullable<FunctionReturnType<typeof api.clueBoard.getNodes>>[number];
type ReferenceType = Exclude<BoardNode["type"], "note">;

export function PinButton({ roomCode, type, referenceId, nodes, disabled = false, onError, onChange, className = "" }: {
  roomCode: string;
  type: ReferenceType;
  referenceId: string;
  nodes: BoardNode[] | null | undefined;
  disabled?: boolean;
  onError?: (error: unknown) => void;
  onChange?: (pinned: boolean) => void;
  className?: string;
}) {
  const createReference = useMutation(api.clueBoard.createReferenceNode);
  const deleteNode = useMutation(api.clueBoard.deleteNode);
  const [intent, setIntent] = useState<boolean | null>(null);
  const [working, setWorking] = useState(false);
  const [createdId, setCreatedId] = useState<Id<"clueBoardNodes"> | null>(null);
  const node = nodes?.find((item) => item.type === type && item.referenceId === referenceId);
  const pinned = Boolean(node);
  const shownPinned = intent ?? pinned;

  useEffect(() => {
    // The live board has caught up with the immediate pin state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (intent === pinned) setIntent(null);
  }, [intent, pinned]);

  async function toggle() {
    if (working || disabled) return;
    const next = !shownPinned;
    setIntent(next);
    setWorking(true);
    play("click");
    try {
      if (next) {
        const count = nodes?.length ?? 0;
        const id = await createReference({ roomCode, type, referenceId, x: 80 + (count % 4) * 220, y: 90 + Math.floor(count / 4) * 180 });
        setCreatedId(id);
      } else {
        const nodeId = node?._id ?? createdId;
        if (!nodeId) throw new Error("The pin is still syncing. Try again.");
        await deleteNode({ nodeId });
        setCreatedId(null);
      }
      onChange?.(next);
    } catch (error) {
      setIntent(null);
      onError?.(error);
    } finally {
      setWorking(false);
    }
  }

  const label = working ? shownPinned ? "Pinning to clueboard" : "Removing from clueboard" : shownPinned ? "Pinned to clueboard. Remove pin" : "Pin to clueboard";
  return (
    <button
      aria-label={label}
      aria-pressed={shownPinned}
      className={`game-icon-button ${className}`}
      disabled={working || disabled}
      onClick={() => void toggle()}
      title={label}
      type="button"
    >
      <span aria-hidden="true" className="game-pin-art" />
    </button>
  );
}
