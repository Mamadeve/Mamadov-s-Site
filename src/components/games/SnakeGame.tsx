/**
 * SNAKE.SYS — classic snake on canvas. Keyboard (arrows/WASD) + touch D-pad.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { recordGameScore } from "@/data/games";
import { Button } from "@/components/ui/primitives";

const CELL = 18;
const COLS = 18;
const ROWS = 18;
const TICK_MS = 110;

type Pt = { x: number; y: number };

export function SnakeGame({ onScore }: { onScore?: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [started, setStarted] = useState(false);

  const snake = useRef<Pt[]>([{ x: 8, y: 9 }]);
  const dir = useRef<Pt>({ x: 1, y: 0 });
  const nextDir = useRef<Pt>({ x: 1, y: 0 });
  const food = useRef<Pt>({ x: 12, y: 9 });
  const alive = useRef(true);

  const spawnFood = useCallback(() => {
    let p: Pt;
    do {
      p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    } while (snake.current.some((s) => s.x === p.x && s.y === p.y));
    food.current = p;
  }, []);

  const reset = useCallback(() => {
    snake.current = [{ x: 8, y: 9 }];
    dir.current = { x: 1, y: 0 };
    nextDir.current = { x: 1, y: 0 };
    alive.current = true;
    setScore(0);
    setOver(false);
    setStarted(true);
    spawnFood();
  }, [spawnFood]);

  /* input */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, [number, number]> = {
        ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
        w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
      };
      const m = map[e.key] ?? map[e.key.toLowerCase()];
      if (m) {
        e.preventDefault();
        const d = dir.current;
        if (d.x === -m[0] && d.y === -m[1]) return; // no 180°
        nextDir.current = { x: m[0], y: m[1] };
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* game loop */
  useEffect(() => {
    if (!started || over) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const css = getComputedStyle(document.documentElement);
      const txt = css.getPropertyValue("--txt").trim() || "#f5f5f7";
      const line = css.getPropertyValue("--line").trim() || "#232328";
      ctx.clearRect(0, 0, COLS * CELL, ROWS * CELL);
      ctx.fillStyle = line;
      for (let x = 0; x < COLS; x++)
        for (let y = 0; y < ROWS; y++)
          ctx.fillRect(x * CELL + CELL / 2 - 0.75, y * CELL + CELL / 2 - 0.75, 1.5, 1.5);
      ctx.fillStyle = txt;
      ctx.beginPath();
      ctx.arc(food.current.x * CELL + CELL / 2, food.current.y * CELL + CELL / 2, CELL * 0.28, 0, Math.PI * 2);
      ctx.fill();
      snake.current.forEach((s, i) => {
        ctx.globalAlpha = i === 0 ? 1 : Math.max(0.35, 1 - i / (snake.current.length + 6));
        ctx.fillRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4);
      });
      ctx.globalAlpha = 1;
    };

    const step = () => {
      if (!alive.current) return;
      dir.current = nextDir.current;
      const head = snake.current[0]!;
      const nh = { x: head.x + dir.current.x, y: head.y + dir.current.y };
      const dead =
        nh.x < 0 || nh.y < 0 || nh.x >= COLS || nh.y >= ROWS ||
        snake.current.some((s) => s.x === nh.x && s.y === nh.y);
      if (dead) {
        alive.current = false;
        setOver(true);
        setScore((sc) => {
          recordGameScore("snake", sc);
          onScore?.(sc);
          return sc;
        });
        return;
      }
      snake.current.unshift(nh);
      if (nh.x === food.current.x && nh.y === food.current.y) {
        setScore((s) => s + 10);
        spawnFood();
      } else {
        snake.current.pop();
      }
      draw();
    };

    draw();
    const id = setInterval(step, TICK_MS);
    return () => clearInterval(id);
  }, [started, over, spawnFood, onScore]);

  const dpad = (x: number, y: number, label: string) => (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        const d = dir.current;
        if (d.x === -x && d.y === -y) return;
        nextDir.current = { x, y };
      }}
      aria-label={label}
      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-[10px] border border-line text-xs text-[var(--txt-dim)] transition-colors hover:text-[var(--txt)] active:bg-[var(--panel2)]"
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between px-1">
        <span className="meta">SCORE {score.toString().padStart(4, "0")}</span>
        <Button size="sm" variant="outline" onClick={reset}>
          {over ? "Restart" : started ? "Reset" : "Start"}
        </Button>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={COLS * CELL}
          height={ROWS * CELL}
          className="max-w-full rounded-xl border border-line"
          style={{ width: "min(100%, 324px)", height: "auto" }}
        />
        {!started || over ? (
          <div className="dot-grid absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border border-line bg-[var(--bg)]/70 backdrop-blur-[2px]">
            <p className="display text-lg tracking-[0.3em] text-[var(--txt)]">{over ? "GAME OVER" : "SNAKE.SYS"}</p>
            {over ? <p className="meta">FINAL SCORE {score}</p> : <p className="meta">ARROWS / WASD / D-PAD</p>}
            <Button size="sm" variant="primary" onClick={reset}>
              {over ? "Play again" : "Insert coin"}
            </Button>
          </div>
        ) : null}
      </div>
      {/* touch D-pad */}
      <div className="grid grid-cols-3 gap-1.5 md:hidden">
        <span />
        {dpad(0, -1, "↑")}
        <span />
        {dpad(-1, 0, "←")}
        {dpad(0, 1, "↓")}
        {dpad(1, 0, "→")}
      </div>
    </div>
  );
}
