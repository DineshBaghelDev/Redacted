type InvestigationIconName = "room" | "search" | "evidence" | "device" | "lab" | "file";

export function InvestigationIcon({ name, className = "" }: { name: InvestigationIconName; className?: string }) {
  return <span aria-hidden="true" className={`investigation-icon investigation-icon--${name} ${className}`} />;
}
