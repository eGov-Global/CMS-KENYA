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

/** Stylised Nairobi skyline — the KICC cylinder and helipad, Times Tower,
 *  UAP Old Mutual — with trees, for the "green city" feel. */
export function SkylineIllustration({ className, variant = "blob" }: SkylineProps) {
  const solid = variant === "silhouette";
  const f = (alpha: number) => (solid ? P : `hsl(var(--pgrl-primary) / ${alpha})`);
  return (
    <svg aria-hidden viewBox="0 0 360 220" className={cn("block", className)}>
      {!solid && <ellipse cx="196" cy="150" rx="164" ry="68" fill={T} />}
      {/* back row */}
      <rect x="52" y="112" width="26" height="76" rx="2" fill={f(0.3)} />
      <rect x="84" y="96" width="30" height="92" rx="2" fill={f(0.42)} />
      <rect x="292" y="104" width="28" height="84" rx="2" fill={f(0.32)} />
      <rect x="324" y="126" width="18" height="62" rx="2" fill={f(0.26)} />
      {/* Times Tower */}
      <rect x="118" y="74" width="30" height="114" rx="2" fill={f(0.62)} />
      <rect x="126" y="58" width="14" height="18" rx="1" fill={f(0.62)} />
      {/* KICC */}
      <rect x="156" y="46" width="34" height="142" rx="7" fill={f(0.92)} />
      <ellipse cx="173" cy="46" rx="31" ry="9" fill={solid ? P : D} />
      <rect x="166" y="26" width="14" height="20" rx="2" fill={f(0.92)} />
      <g stroke={W} strokeOpacity={solid ? 0 : 0.22} strokeWidth="2">
        <line x1="165" y1="62" x2="165" y2="182" />
        <line x1="173" y1="62" x2="173" y2="182" />
        <line x1="181" y1="62" x2="181" y2="182" />
      </g>
      {/* UAP tower + neighbours */}
      <rect x="200" y="66" width="40" height="122" rx="3" fill={f(0.74)} />
      <path d="M200 66 L220 52 L240 66 Z" fill={f(0.74)} />
      <rect x="248" y="98" width="30" height="90" rx="2" fill={f(0.52)} />
      <g stroke={W} strokeOpacity={solid ? 0 : 0.18} strokeWidth="2">
        <line x1="210" y1="80" x2="210" y2="182" />
        <line x1="220" y1="80" x2="220" y2="182" />
        <line x1="230" y1="80" x2="230" y2="182" />
      </g>
      {/* ground */}
      <rect x="30" y="186" width="310" height="6" rx="3" fill={f(0.5)} />
      {/* trees */}
      {!solid && (
        <g>
          <rect x="66" y="176" width="4" height="14" fill={f(0.6)} />
          <circle cx="68" cy="172" r="12" fill={LEAF} />
          <rect x="300" y="174" width="4" height="16" fill={f(0.6)} />
          <circle cx="302" cy="170" r="14" fill={LEAF} />
          <rect x="334" y="180" width="3" height="10" fill={f(0.6)} />
          <circle cx="335.5" cy="176" r="9" fill={LEAF} />
          <circle cx="34" cy="180" r="9" fill={LEAF} opacity="0.8" />
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

/** Thin gold arc used behind the closing band and the footer. */
export function Swoosh({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 600 200" preserveAspectRatio="none" className={cn("block", className)}>
      <path d="M-20 170 C160 60 380 220 620 40" fill="none" stroke={A} strokeWidth="2" strokeOpacity="0.55" />
      <path d="M-20 196 C200 90 400 250 620 70" fill="none" stroke={A} strokeWidth="1.5" strokeOpacity="0.3" />
    </svg>
  );
}
