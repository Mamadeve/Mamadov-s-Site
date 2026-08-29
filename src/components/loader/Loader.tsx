/**
 * Loader — the signature MAMADO loading animations.
 *
 * Contextual Circle Loaders (after circleloaders.dominikakissi.com):
 *  • LoaderScreen / route / dashboard init / data sync → **Latitude**
 *  • auth / database / background → **Halftone** (see ui/CircleLoaders)
 */
import { LatitudeLoader } from "@/components/ui/CircleLoaders";

export function Loader({
  size = 96,
  label,
  className = "",
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  return <LatitudeLoader size={size} label={label} className={className} />;
}

/** Full-screen branded loading surface (initial app load / auth) */
export function LoaderScreen({ label = "INITIALIZING" }: { label?: string }) {
  return (
    <div className="dot-grid flex min-h-dvh flex-col items-center justify-center bg-[var(--bg)]">
      <LatitudeLoader size={112} label={label} className="text-[var(--txt)]" />
      <div className="mt-10 flex items-center gap-3">
        <span className="display text-lg tracking-[0.35em] text-[var(--txt)]">MAMADO</span>
      </div>
      <span className="meta mt-2">// designed by Mamadov</span>
    </div>
  );
}

