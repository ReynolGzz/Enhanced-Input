// Copyright-safe controller silhouette. Generic shell + neutral buttons (no
// trademarks), drawn with theme variables so it recolors with the active theme.
// PlayStation pads get a touchpad rectangle to distinguish them from Xbox.

function isPlaystation(kind: string): boolean {
  const k = kind.toLowerCase();
  return k.includes("dualshock") || k.includes("dualsense") || k.includes("ds4");
}

export function ControllerSilhouette({
  kind,
  className,
}: {
  kind: string;
  className?: string;
}) {
  const ps = isPlaystation(kind);
  return (
    <svg
      className={className}
      viewBox="0 0 120 80"
      fill="none"
      role="img"
      aria-label="Mando"
    >
      {/* shell */}
      <path
        d="M60 26c-10 0-13 4-17 5-6-2-12-4-18-2C14 32 9 46 13 57c3 8 12 11 18 5 4-4 7-9 12-11h34c5 2 8 7 12 11 6 6 15 3 18-5 4-11-1-25-12-28-6-2-12 0-18 2-4-1-7-5-17-5Z"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* touchpad (PlayStation only) */}
      {ps && (
        <rect
          x="51"
          y="25"
          width="18"
          height="10"
          rx="2"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.6"
        />
      )}
      {/* sticks */}
      <circle cx="44" cy="47" r="6.5" fill="none" stroke="var(--accent)" strokeWidth="2.2" />
      <circle cx="76" cy="47" r="6.5" fill="none" stroke="var(--accent)" strokeWidth="2.2" />
      {/* d-pad */}
      <path d="M30 39v9M25.5 43.5h9" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" />
      {/* face buttons */}
      <circle cx="90" cy="38" r="2.6" fill="var(--accent)" />
      <circle cx="97" cy="44" r="2.6" fill="var(--accent)" />
      <circle cx="90" cy="50" r="2.6" fill="var(--accent)" />
      <circle cx="83" cy="44" r="2.6" fill="var(--accent)" />
    </svg>
  );
}
