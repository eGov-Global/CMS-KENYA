// Decorative artwork for the landing page, all inline SVG: no requests, crisp
// at any DPI, and every fill reads the page tokens so a tenant retint carries
// through. Everything here is aria-hidden — the copy beside it does the talking.

import * as React from "react";
import { cn } from "@egovernments/digit-ui-components-v2";

const P = "hsl(var(--pgrl-primary))";
const D = "hsl(var(--pgrl-deep))";
const A = "hsl(var(--pgrl-accent))";
const T = "hsl(var(--pgrl-tint))";
const TG = "hsl(var(--pgrl-tint-gold))";
const LEAF = "hsl(var(--pgrl-type-petition))";
const W = "hsl(var(--pgrl-on-primary))";

/** Curved bottom edge of the hero: page-coloured sweep with a gold line that
 *  draws itself in on load (CSS `pgrl-draw`, off under reduced motion). */
export function HeroWave({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 1440 96" preserveAspectRatio="none" className={cn("block", className)}>
      <path d="M0 96 V60 C300 104 820 -14 1440 44 V96 Z" fill="hsl(var(--pgrl-page))" />
      <path
        d="M0 56 C300 100 820 -18 1440 40"
        fill="none"
        stroke={A}
        strokeWidth="3"
        strokeLinecap="round"
        pathLength="1000"
        className="pgrl-draw"
      />
    </svg>
  );
}

export interface SkylineProps {
  className?: string;
  /** "blob" = full-colour towers on a soft green shape (section decor);
   *  "silhouette" = one-tone, for faint backgrounds. */
  variant?: "blob" | "silhouette";
}

/** Stylised Bomet highlands — tea-country ridges, a farmhouse and a stand
 *  of trees — for the county's green, rural feel. Keeps the framework's
 *  "skyline" slot name so the sections that mount it are unchanged. */
export function SkylineIllustration({ className, variant = "blob" }: SkylineProps) {
  const solid = variant === "silhouette";
  const f = (alpha: number) => (solid ? P : `hsl(var(--pgrl-primary) / ${alpha})`);
  return (
    <svg aria-hidden viewBox="0 0 360 220" className={cn("block", className)}>
      {!solid && <ellipse cx="196" cy="150" rx="164" ry="68" fill={T} />}
      {/* far ridge */}
      <path d="M20 150 C 70 96, 120 92, 170 118 C 210 138, 250 100, 300 110 C 322 114, 338 126, 350 136 L350 192 L20 192 Z" fill={f(0.28)} />
      {/* middle ridge */}
      <path d="M20 168 C 60 134, 110 124, 160 142 C 196 155, 232 126, 272 134 C 306 141, 330 156, 350 166 L350 192 L20 192 Z" fill={f(0.52)} />
      {/* near slope with tea rows */}
      <path d="M20 192 C 70 162, 130 158, 190 170 C 240 180, 290 168, 350 182 L350 192 Z" fill={f(0.9)} />
      <g stroke={W} strokeOpacity={solid ? 0 : 0.22} strokeWidth="2" fill="none">
        <path d="M60 184 C 110 168, 160 166, 210 176" />
        <path d="M100 190 C 150 176, 200 174, 250 184" />
        <path d="M200 190 C 250 180, 300 178, 340 186" />
      </g>
      {/* farmhouse */}
      <rect x="236" y="138" width="30" height="18" rx="1" fill={f(0.9)} />
      <path d="M232 139 L251 126 L270 139 Z" fill={solid ? P : D} />
      <rect x="249" y="146" width="6" height="10" fill={W} opacity={solid ? 0 : 0.7} />
      {/* ground */}
      <rect x="30" y="190" width="310" height="6" rx="3" fill={f(0.5)} />
      {/* trees */}
      {!solid && (
        <g>
          <rect x="84" y="152" width="4" height="22" fill={f(0.6)} />
          <circle cx="86" cy="146" r="13" fill={LEAF} />
          <rect x="112" y="156" width="4" height="18" fill={f(0.6)} />
          <circle cx="114" cy="152" r="10" fill={LEAF} />
          <rect x="300" y="160" width="4" height="18" fill={f(0.6)} />
          <circle cx="302" cy="156" r="11" fill={LEAF} />
        </g>
      )}
    </svg>
  );
}

/** Shield with a padlock and check badge, on a soft base with leaves. */
export function ShieldIllustration({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 220 230" className={cn("block", className)}>
      <ellipse cx="110" cy="176" rx="96" ry="42" fill={T} />
      {/* leaves */}
      <path d="M28 168 C6 138 16 102 50 92 C56 126 46 152 28 168 Z" fill={LEAF} opacity="0.75" />
      <path d="M192 172 C214 142 204 106 170 96 C164 130 174 156 192 172 Z" fill={LEAF} opacity="0.75" />
      {/* shield */}
      <path d="M110 18 L178 42 V106 C178 152 148 186 110 204 C72 186 42 152 42 106 V42 Z" fill={P} />
      <path d="M110 36 L162 54 V106 C162 142 140 168 110 184 C80 168 58 142 58 106 V54 Z" fill={W} opacity="0.08" />
      {/* padlock */}
      <path d="M92 104 V90 a18 18 0 0 1 36 0 V104" fill="none" stroke={A} strokeWidth="7" strokeLinecap="round" />
      <rect x="82" y="102" width="56" height="44" rx="9" fill={A} />
      <circle cx="110" cy="121" r="5" fill={D} />
      <rect x="108" y="121" width="4" height="12" rx="2" fill={D} />
      {/* check badge */}
      <circle cx="170" cy="58" r="18" fill={A} />
      <path d="M161 58 l6 6 l12 -13" fill="none" stroke={D} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export interface PhotoOrbProps {
  src?: string;
  /** Speech-bubble text; decorative (the surrounding copy carries meaning). */
  tagline?: string;
  tone?: "green" | "gold";
  className?: string;
}

/** Circular photograph on a soft blob with a floating speech bubble. */
export function PhotoOrb({ src, tagline, tone = "green", className }: PhotoOrbProps) {
  if (!src) return null;
  return (
    <div aria-hidden className={cn("relative", className)}>
      <svg viewBox="0 0 200 200" className="absolute -inset-[14%] h-[128%] w-[128%]">
        <path
          d="M52 22 C96 -8 166 10 186 60 C204 106 176 168 126 188 C78 206 22 176 10 128 C0 88 14 48 52 22 Z"
          fill={tone === "gold" ? TG : T}
        />
      </svg>
      <div className="relative aspect-square overflow-hidden rounded-full border-[6px] border-solid border-[hsl(var(--pgrl-surface))] shadow-[0_24px_50px_-24px_rgba(11,45,30,0.5)]">
        <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      </div>
      {tagline && (
        <div className="pgrl-float absolute -left-4 top-[8%] max-w-[46%] rounded-2xl bg-[hsl(var(--pgrl-primary))] px-4 py-3 text-center text-base font-bold leading-tight text-[hsl(var(--pgrl-on-primary))] shadow-lg">
          {tagline}
          <span className="absolute -bottom-2 left-7 h-4 w-4 rotate-45 bg-[hsl(var(--pgrl-primary))]" />
        </div>
      )}
    </div>
  );
}

/** Thin gold arc used behind the closing band and the footer. Inside a
 *  reveal section the arcs draw themselves in (CSS `pgrl-trace`). */
export function Swoosh({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 600 200" preserveAspectRatio="none" className={cn("block", className)}>
      <path d="M-20 170 C160 60 380 220 620 40" fill="none" stroke={A} strokeWidth="2" strokeOpacity="0.55" pathLength="1000" className="pgrl-trace" />
      <path d="M-20 196 C200 90 400 250 620 70" fill="none" stroke={A} strokeWidth="1.5" strokeOpacity="0.3" pathLength="1000" className="pgrl-trace" />
    </svg>
  );
}
