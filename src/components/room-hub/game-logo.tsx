import Image from "next/image";

export function GameLogo({ className = "" }: { className?: string }) {
  return <h1 className={`game-title flex items-center gap-2 text-4xl leading-none min-[390px]:text-5xl sm:gap-3 sm:text-6xl ${className}`}>
    <Image alt="" className="size-14 shrink-0 object-contain min-[390px]:size-[4.5rem] sm:size-20" height={80} priority src="/assets/redacted-emblem.png" width={80} />
    <span>REDACTED</span>
  </h1>;
}
