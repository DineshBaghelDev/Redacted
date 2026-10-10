const skinColors = ["#d6a175", "#a96f51", "#70513f", "#e5bd94", "#8f6651"];
const hairColors = ["#1d2829", "#513a2c", "#a06e3d", "#a6aba1", "#683b36"];
const coatColors = ["#294047", "#403b38", "#41534a", "#39495a"];

export function portraitTraits(id: string) {
  let seed = 2166136261;
  for (const character of id) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  seed >>>= 0;
  return {
    skin: seed % skinColors.length,
    hair: (seed >>> 4) % hairColors.length,
    coat: (seed >>> 9) % coatColors.length,
    hairstyle: (seed >>> 13) % 6,
    glasses: ((seed >>> 18) & 3) === 0,
    outfit: (seed >>> 20) % 4,
    face: (seed >>> 25) % 3,
  };
}

export function CharacterPortrait({ id, className = "" }: { id: string; className?: string }) {
  const traits = portraitTraits(id);
  const skin = skinColors[traits.skin];
  const hair = hairColors[traits.hair];
  const coat = coatColors[traits.coat];

  return (
    <svg aria-hidden="true" className={`character-portrait ${className}`} shapeRendering="crispEdges" viewBox="0 0 64 80">
      <rect fill="#0d2227" height="80" width="64" />
      <path d="M0 0h64v4H0zM0 76h64v4H0zM0 0h4v80H0zM60 0h4v80h-4z" fill="#59716d" />
      <path d="M5 5h54v3H5zM5 72h54v3H5z" fill="#172f33" />
      <path d="M7 58h10v-5h30v5h10v14H7z" fill="#10191b" />
      <path d="M10 63h6v-6h9v-4h14v4h9v6h6v9H10z" fill={coat} />
      {traits.outfit === 0 ? <>
        <path d="M26 54h12v17H26z" fill="#bdc7b3" />
        <path d="M26 54l6 10-7 7-7-15zM38 54l-6 10 7 7 7-15z" fill={coat} />
        <path d="M29 62h6l-3 9z" fill="#9a573e" />
      </> : null}
      {traits.outfit === 1 ? <>
        <path d="M24 55h16v17H24z" fill="#24353a" />
        <path d="M31 56h2v16h-2zM15 65h10v2H15zM39 65h10v2H39z" fill="#d0a567" />
        <path d="M18 56h8v7h-8zM38 56h8v7h-8z" fill={coat} />
      </> : null}
      {traits.outfit === 2 ? <>
        <path d="M24 54h16v18H24z" fill="#344e52" />
        <path d="M19 55h8v10h-5v-4h-3zM45 55h-8v10h5v-4h3z" fill="#1b2e33" />
        <path d="M29 60h2v10h-2zM34 60h2v10h-2z" fill="#d0a567" />
      </> : null}
      {traits.outfit === 3 ? <>
        <path d="M23 54h18v18H23z" fill="#20363a" />
        <path d="M16 57h11v10h-5v-4h-6zM48 57H37v10h5v-4h6z" fill={coat} />
        <path d="M24 55h16v5H24zM30 60h4v12h-4z" fill="#a87b58" />
      </> : null}
      <path d="M27 49h10v10H27z" fill={skin} />
      <path d="M18 29h5v17h-5zM41 29h5v17h-5z" fill={skin} />
      <path d={traits.face === 0 ? "M22 20h20v4h4v22h-4v6H22v-6h-4V24h4z" : traits.face === 1 ? "M23 20h18v4h4v20h-3v6h-4v3H26v-3h-4v-6h-3V24h4z" : "M21 20h22v4h4v21h-3v5h-4v3H24v-3h-4v-5h-3V24h4z"} fill={skin} />
      <path d="M20 43h4v5h4v3h-6v-4h-2zM44 43h-4v5h-4v3h6v-4h2z" fill="#42302a" opacity=".28" />
      {traits.hairstyle === 0 ? <path d="M18 25h4v-7h20v3h4v10h-4v-6H22v5h-4z" fill={hair} /> : null}
      {traits.hairstyle === 1 ? <path d="M17 20h23v-4h5v4h2v17h-5V26H29l-7 6h-5z" fill={hair} /> : null}
      {traits.hairstyle === 2 ? <path d="M17 20h30v29h-5V29H22v20h-5zM22 16h20v5H22z" fill={hair} /> : null}
      {traits.hairstyle === 3 ? <path d="M18 20h5v-6h5v3h5v-5h5v4h6v4h4v13h-5v-8H21v8h-4V20z" fill={hair} /> : null}
      {traits.hairstyle === 4 ? <path d="M20 21h24v7h-3v-3H23v3h-3zM18 25h4v9h-4zM42 25h4v9h-4z" fill={hair} /> : null}
      {traits.hairstyle === 5 ? <path d="M17 18h5v-4h20v4h5v38h-6V28H23v28h-6zM14 50h6v13h-6zM44 50h6v13h-6z" fill={hair} /> : null}
      <path d="M24 34h6v2h-6zM36 34h6v2h-6z" fill={hair} />
      <path d="M26 38h3v3h-3zM37 38h3v3h-3z" fill="#172329" />
      <path d="M31 40h2v4h-2z" fill="#704635" />
      <path d="M28 47h8v2h-8z" fill="#5c392f" />
      {traits.glasses ? <path d="M23 36h9v8h-9zM34 36h9v8h-9zM31 38h4v2h-4z" fill="none" stroke="#27343a" strokeWidth="2" /> : null}
      <path d="M8 71h48v2H8z" fill="#d0a567" />
    </svg>
  );
}
