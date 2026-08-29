/**
 * Circle Loaders — animated SVG loaders (after circleloaders.dominikakissi.com).
 *
 * Standalone, JS-free animated SVGs, each scoped by a unique instance id
 * (no animation-name collisions), honoring `prefers-reduced-motion`:
 *
 *   • Latitude  — global page load / dashboard init / data sync
 *   • Waveform  — music loading / audio ops / music search
 *   • Aperture  — focus mode / deep loading / system transitions
 *   • Halftone  — auth / database indexing / background loading
 */
import { useId } from "react";
import { cn } from "@/lib/utils";

interface LoaderProps {
  size?: number;
  className?: string;
  label?: string;
}

function LoaderFrame({ size = 48, className, label, children }: LoaderProps & { children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)} role="status" aria-label={label ?? "Loading"}>
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
        {children}
      </svg>
      {label ? <span className="meta animate-blink">{label}</span> : null}
    </div>
  );
}

/* ── Latitude — two counter-rotating orbit arcs ──────────────────────── */
export function LatitudeLoader(props: LoaderProps) {
  const uid = useId().replace(/[:]/g, "");
  return (
    <LoaderFrame {...props}>
      <style>{`
        .lat-${uid}-a { transform-origin: 32px 32px; animation: lat-${uid}-spin 1.5s cubic-bezier(.45,.05,.55,.95) infinite; }
        .lat-${uid}-b { transform-origin: 32px 32px; animation: lat-${uid}-spin 2.2s cubic-bezier(.45,.05,.55,.95) reverse infinite; }
        .lat-${uid}-core { transform-origin: 32px 32px; animation: lat-${uid}-pulse 1.5s ease-in-out infinite; }
        @keyframes lat-${uid}-spin { to { transform: rotate(360deg); } }
        @keyframes lat-${uid}-pulse { 0%,100% { transform: scale(.72); opacity: .85; } 50% { transform: scale(1); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .lat-${uid}-a, .lat-${uid}-b, .lat-${uid}-core { animation: none; }
        }
      `}</style>
      <g className={`lat-${uid}-a`}>
        <circle cx="32" cy="32" r="24" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2" />
        <path d="M 32 8 A 24 24 0 0 1 56 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g className={`lat-${uid}-b`}>
        <circle cx="32" cy="32" r="15" stroke="currentColor" strokeOpacity="0.12" strokeWidth="2" />
        <path d="M 32 17 A 15 15 0 0 0 17 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
      <circle className={`lat-${uid}-core`} cx="32" cy="32" r="5" fill="currentColor" />
    </LoaderFrame>
  );
}

/* ── Waveform — premium circular EQ halo (audio) ──────────────────────────
 * Upgraded after circleloaders.dominikakissi.com: two counter-rotating
 * dashed orbit arcs, a rippling outer ring and a breathing spectrum core —
 * reads as a tiny vinyl turntable spinning up. */
export function WaveformLoader(props: LoaderProps) {
  const uid = useId().replace(/[:]/g, "");
  const lens = [10, 16, 22, 27, 30, 27, 22, 16];
  return (
    <LoaderFrame {...props}>
      <style>{`
        .wf-${uid}-arc { transform-origin: 32px 32px; animation: wf-${uid}-spin 2.4s cubic-bezier(.45,.05,.55,.95) infinite; }
        .wf-${uid}-arc2 { transform-origin: 32px 32px; animation: wf-${uid}-spin 3.4s cubic-bezier(.45,.05,.55,.95) reverse infinite; }
        @keyframes wf-${uid}-spin { to { transform: rotate(360deg); } }
        .wf-${uid} line { transform-origin: 32px 32px; animation: wf-${uid}-eq 1.15s ease-in-out infinite; }
        @keyframes wf-${uid}-eq {
          0%, 100% { transform: scale(1); opacity: .55; }
          35%      { transform: scale(1.22); opacity: 1; }
        }
        .wf-${uid}-ripple { transform-origin: 32px 32px; animation: wf-${uid}-pulse 2.2s ease-out infinite; }
        @keyframes wf-${uid}-pulse {
          0%   { transform: scale(.55); opacity: .55; }
          70%  { transform: scale(1); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .wf-${uid}-arc, .wf-${uid}-arc2, .wf-${uid}-ripple { animation: none; opacity: .6; }
          .wf-${uid} line { animation: none; opacity: .8; }
        }
      `}</style>
      {/* rippling halo */}
      <circle className={`wf-${uid}-ripple`} cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1" fill="none" />
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeOpacity="0.14" strokeWidth="1" />
      {/* counter-rotating dashed arcs */}
      <g className={`wf-${uid}-arc`}>
        <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="2" strokeDasharray="18 9" strokeLinecap="round" fill="none" />
      </g>
      <g className={`wf-${uid}-arc2`}>
        <circle cx="32" cy="32" r="18" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="6 6" strokeLinecap="round" fill="none" />
      </g>
      {/* spectrum core */}
      <g className={`wf-${uid}`} stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        {lens.map((len, i) => {
          const rad = ((i / lens.length) * 360 - 90) * (Math.PI / 180);
          const r1 = 12 - len * 0.12;
          const r2 = 14 - len * 0.12 + len * 0.16;
          return (
            <line
              key={i}
              x1={32 + Math.cos(rad) * r1} y1={32 + Math.sin(rad) * r1}
              x2={32 + Math.cos(rad) * r2} y2={32 + Math.sin(rad) * r2}
              style={{ animationDelay: `${i * 0.09}s` }}
            />
          );
        })}
      </g>
      <circle cx="32" cy="32" r="2" fill="currentColor" />
    </LoaderFrame>
  );
}

/* ── Aperture — staggered shutter rings (deep loading) ───────────────── */
export function ApertureLoader(props: LoaderProps) {
  const uid = useId().replace(/[:]/g, "");
  return (
    <LoaderFrame {...props}>
      <style>{`
        .ap-${uid}-ring { transform-origin: 32px 32px; animation: ap-${uid}-spin 2.6s cubic-bezier(.6,.05,.4,.95) infinite; }
        .ap-${uid}-rev { animation-direction: reverse; animation-duration: 1.8s; }
        @keyframes ap-${uid}-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .ap-${uid}-ring { animation: none; } }
      `}</style>
      {[0, 1].map((ring) => (
        <g key={ring} className={`ap-${uid}-ring ${ring === 1 ? `ap-${uid}-rev` : ""}`}>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <path
              key={a}
              d={ring === 0 ? "M 32 8 A 24 24 0 0 1 51 17" : "M 32 20 A 12 12 0 0 0 41 27"}
              stroke="currentColor"
              strokeOpacity={ring === 0 ? 0.9 : 0.45}
              strokeWidth="2"
              strokeLinecap="round"
              transform={`rotate(${a + ring * 30} 32 32)`}
            />
          ))}
        </g>
      ))}
      <circle cx="32" cy="32" r="2.4" fill="currentColor" opacity="0.85" />
    </LoaderFrame>
  );
}

/* ── Halftone — dotted disc ripple (auth / db / background) ─────────── */
export function HalftoneLoader(props: LoaderProps) {
  const uid = useId().replace(/[:]/g, "");
  return (
    <LoaderFrame {...props}>
      <style>{`
        .ht-${uid}-wave { animation: ht-${uid}-ripple 2.8s linear infinite; }
        .ht-${uid}-late { animation-delay: -1.4s; }
        @keyframes ht-${uid}-ripple {
          0%   { r: 0px; opacity: 0; }
          14%  { opacity: 1; }
          72%  { opacity: 1; }
          100% { r: 38px; opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ht-${uid}-wave { animation: none; r: 17px; opacity: 1; }
          .ht-${uid}-late { display: none; }
        }
      `}</style>
      <defs>
        <clipPath id={`ht-${uid}-disc`}><circle cx="32" cy="32" r="32" /></clipPath>
        <pattern id={`ht-${uid}-grid`} width="6.4" height="6.4" patternUnits="userSpaceOnUse">
          <circle cx="3.2" cy="3.2" r="1.15" fill="currentColor" />
        </pattern>
        <mask id={`ht-${uid}-a`}>
          <circle className={`ht-${uid}-wave`} cx="32" cy="32" r="0" fill="none" stroke="#fff" strokeWidth="7" />
        </mask>
        <mask id={`ht-${uid}-b`}>
          <circle className={`ht-${uid}-wave ht-${uid}-late`} cx="32" cy="32" r="0" fill="none" stroke="#fff" strokeWidth="7" />
        </mask>
      </defs>
      <g clipPath={`url(#ht-${uid}-disc)`}>
        <rect x="0" y="0" width="64" height="64" fill={`url(#ht-${uid}-grid)`} opacity="0.26" />
        <rect x="0" y="0" width="64" height="64" fill={`url(#ht-${uid}-grid)`} mask={`url(#ht-${uid}-a)`} />
        <rect x="0" y="0" width="64" height="64" fill={`url(#ht-${uid}-grid)`} mask={`url(#ht-${uid}-b)`} />
      </g>
      <circle cx="32" cy="32" r="31.5" stroke="currentColor" strokeOpacity="0.14" strokeWidth="1" />
    </LoaderFrame>
  );
}

/** Contextual map — use the right loader for the job. */
export const CircleLoader = {
  latitude: LatitudeLoader,
  waveform: WaveformLoader,
  aperture: ApertureLoader,
  halftone: HalftoneLoader,
} as const;

export type CircleLoaderKind = keyof typeof CircleLoader;

