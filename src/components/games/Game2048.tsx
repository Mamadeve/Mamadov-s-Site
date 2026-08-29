/**
 * 2048.EXE — sliding tile merge puzzle. Keyboard + touch swipe.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { recordGameScore } from "@/data/games";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type Grid = number[][]; // 4x4

const empty = (): Grid => Array.from({ length: 4 }, () => [0, 0, 0, 0]);

function addRandom(g: Grid) {
  const free: [number, number][] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!g[r]![c]) free.push([r, c]);
  if (!free.length) return;
  const [r, c] = free[Math.floor(Math.random() * free.length)]!;
  g[r]![c] = Math.random() < 0.9 ? 2 : 4;
}

function rotate(g: Grid): Grid {
  return g[0]!.map((_, i) => g.map((row) => row[i]!).reverse());
}

/** slide+merge one row to the left; returns [row, gained] */
function slide(row: number[]): [number[], number] {
  const t = row.filter((v) => v);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === t[i + 1]) {
      out.push(t[i]! * 2);
      gained += t[i]! * 2;
      i++;
    } else out.push(t[i]!);
  }
  while (out.length < 4) out.push(0);
  return [out, gained];
}

function move(g: Grid, dir: "left" | "right" | "up" | "down"): { grid: Grid; gained: number; moved: boolean } {
  let work = g.map((r) => [...r]);
  const turns = { left: 0, up: 1, right: 2, down: 3 }[dir];
  for (let i = 0; i < turns; i++) work = rotate(work);
  let gained = 0;
  work = work.map((row) => {
    const [nr, n] = slide(row);
    gained += n;
    return nr;
  });
  for (let i = 0; i < (4 - turns) % 4; i++) work = rotate(work);
  const moved = JSON.stringify(work) !== JSON.stringify(g);
  return { grid: work, gained, moved };
}

function hasMoves(g: Grid): boolean {
  return (["left", "right", "up", "down"] as const).some((d) => move(g, d).moved);
}

const TILE_STYLE: Record<number, string> = {
  2: "opacity-70",
  4: "opacity-80",
  8: "opacity-90",
  16: "opacity-95",
  32: "bg-[var(--txt)] text-[var(--bg)] opacity-80",
  64: "bg-[var(--txt)] text-[var(--bg)] opacity-90",
  128: "bg-[var(--txt)] text-[var(--bg)]",
  256: "bg-[var(--txt)] text-[var(--bg)] scale-[1.03]",
  512: "bg-[var(--txt)] text-[var(--bg)] scale-[1.05]",
  1024: "bg-[var(--color-positive)] text-black",
  2048: "bg-[var(--color-positive)] text-black scale-[1.06]",
};

export function Game2048({ onScore }: { onScore?: (score: number) => void }) {
  const [grid, setGrid] = useState<Grid>(() => {
    const g = empty();
    addRandom(g);
    addRandom(g);
    return g;
  });
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const reset = useCallback(() => {
    const g = empty();
    addRandom(g);
    addRandom(g);
    setGrid(g);
    setScore(0);
    setOver(false);
  }, []);

  const doMove = useCallback(
    (dir: "left" | "right" | "up" | "down") => {
      setGrid((prev) => {
        if (over) return prev;
        const { grid: ng, gained, moved } = move(prev, dir);
        if (!moved) return prev;
        addRandom(ng);
        if (gained) {
          setScore((s) => {
            const ns = s + gained;
            recordGameScore("2048", ns);
            onScore?.(ns);
            return ns;
          });
        }
        if (!hasMoves(ng)) setOver(true);
        return ng;
      });
    },
    [over, onScore],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, "left" | "right" | "up" | "down"> = {
        ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
        a: "left", d: "right", w: "up", s: "down",
      };
      const dir = map[e.key] ?? map[e.key.toLowerCase()];
      if (dir) {
        e.preventDefault();
        doMove(dir);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doMove]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between px-1">
        <span className="meta">SCORE {score}</span>
        <Button size="sm" variant="outline" onClick={reset}>
          New game
        </Button>
      </div>
      <div
        className="relative grid w-full max-w-80 grid-cols-4 gap-2 rounded-xl border border-line bg-[var(--panel)] p-2"
        onTouchStart={(e) => {
          const t = e.touches[0]!;
          touch.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          const s = touch.current;
          if (!s) return;
          const t = e.changedTouches[0]!;
          const dx = t.clientX - s.x;
          const dy = t.clientY - s.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
          doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
          touch.current = null;
        }}
      >
        {grid.flatMap((row, r) =>
          row.map((v, c) => (
            <div
              key={`${r}-${c}`}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg border border-line/60 font-mono text-sm font-semibold transition-all duration-150",
                v ? cn("bg-[var(--panel2)] text-[var(--txt)]", TILE_STYLE[v] ?? "bg-[var(--txt)] text-[var(--bg)]") : "",
              )}
            >
              {v || ""}
            </div>
          )),
        )}
        {over ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border border-line bg-[var(--bg)]/80 backdrop-blur-[2px]">
            <p className="display text-lg tracking-[0.3em] text-[var(--txt)]">NO MOVES LEFT</p>
            <p className="meta">SCORE {score}</p>
            <Button size="sm" variant="primary" onClick={reset}>
              Play again
            </Button>
          </div>
        ) : null}
      </div>
      <p className="meta">ARROWS / WASD / SWIPE</p>
    </div>
  );
}

