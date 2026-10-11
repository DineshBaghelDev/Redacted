import { ControlIcon } from "./control-icon";

export function PinButton({ pinned, busy = false, onClick, className = "" }: {
  pinned: boolean;
  busy?: boolean;
  onClick: () => void;
  className?: string;
}) {
  const label = busy ? "Pinning to clueboard" : pinned ? "Pinned to clueboard" : "Pin to clueboard";
  return (
    <button
      aria-label={label}
      aria-pressed={pinned}
      className={`game-pin-button ${className}`}
      disabled={busy || pinned}
      onClick={onClick}
      title={label}
      type="button"
    >
      <ControlIcon name="pin" />
      {pinned ? <span aria-hidden="true" className="game-pin-check" /> : null}
    </button>
  );
}
