type ControlIconName = "back" | "notebook" | "pause" | "speaker" | "play" | "search" | "pin" | "close";

export function ControlIcon({ name, className = "" }: { name: ControlIconName; className?: string }) {
  return <span aria-hidden="true" className={`control-icon control-icon--${name} ${className}`} />;
}
