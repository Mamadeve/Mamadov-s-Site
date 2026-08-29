/**
 * QuoteCard — daily motivational quote. Deterministic per day, shuffleable,
 * favoritable. Extremely minimal; smooth crossfade transitions.
 */
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Quote as QuoteIcon, RefreshCw } from "lucide-react";
import { QUOTES, quoteOfTheDay, loadFavoriteQuotes, saveFavoriteQuotes } from "@/data/quotes";
import { cn } from "@/lib/utils";

export function QuoteCard() {
  const [daily] = useState(() => quoteOfTheDay());
  const [current, setCurrent] = useState(daily);
  const [flashKey, setFlashKey] = useState(0);
  const [favs, setFavs] = useState<number[]>(() => loadFavoriteQuotes());

  const index = QUOTES.findIndex((q) => q.text === current.text);

  const shuffle = () => {
    let next = current;
    while (next === current && QUOTES.length > 1) {
      next = QUOTES[Math.floor(Math.random() * QUOTES.length)]!;
    }
    setCurrent(next);
    setFlashKey((k) => k + 1);
  };

  const isFav = index >= 0 && favs.includes(index);

  const toggleFav = () => {
    if (index < 0) return;
    setFavs((prev) => {
      const next = prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index];
      saveFavoriteQuotes(next);
      return next;
    });
  };

  return (
    <div className="card-surface glow-hover relative overflow-hidden p-5">
      <QuoteIcon size={40} className="pointer-events-none absolute -right-2 -top-2 text-[var(--txt)] opacity-[0.045]" />
      <div className="mb-3 flex items-center justify-between">
        <span className="meta">DAILY TRANSMISSION</span>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleFav}
            aria-label="Save quote"
            className={cn(
              "cursor-pointer rounded-lg p-1.5 transition-colors",
              isFav ? "text-[var(--color-negative)]" : "text-[var(--txt-faint)] hover:text-[var(--txt)]",
            )}
          >
            <Heart size={12} fill={isFav ? "currentColor" : "none"} />
          </button>
          <button
            onClick={shuffle}
            aria-label="Another quote"
            className="cursor-pointer rounded-lg p-1.5 text-[var(--txt-faint)] transition-all hover:rotate-180 hover:text-[var(--txt)]"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={flashKey}
          initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -4, filter: "blur(3px)" }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-[15px] font-medium leading-relaxed tracking-tight text-[var(--txt)]">
            “{current.text}”
          </p>
          {current.author ? <p className="meta mt-2 normal-case tracking-normal">— {current.author}</p> : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
