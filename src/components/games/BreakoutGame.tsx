/**
 * BRICKFALL — minimal breakout. Mouse / touch / keyboard paddle.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { recordGameScore } from "@/data/games";
import { Button } from "@/components/ui/primitives";

const W = 340;
const H = 420;
const PAD_W = 64;
const PAD_H = 8;
const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_H = 14;
const GAP = 4;
const BRICK_W = (W - GAP * (BRICK_COLS + 1)) / BRICK_COLS;

type Brick = { x: number; y: number; alive: boolean };

export function BreakoutGame({ onScore }: { onScore?: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [state, setState] = useState<"idle" | "run" | "over" | "win">("idle");

  const padX = useRef(W / 2 - PAD_W / 2);
  const ball = useRef({ x: W / 2, y: H - 60, vx: 2.4, vy: -3.2 });
  const bricks = useRef<Brick[]>([]);
  const keys = useRef({ left: false, right: false });

  const buildBricks = useCallback(() => {
    bricks.current = [];
    for (let r = 0; r < BRICK_ROWS; r++)
      for (let c = 0; c < BRICK_COLS; c++)
        bricks.current.push({ x: GAP + c * (BRICK_W + GAP), y: 48 + r * (BRICK_H + GAP), alive: true });
  }, []);

  const reset = useCallback(() => {
    buildBricks();
    ball.current = { x: W / 2, y: H - 60, vx: 2.4 * (Math.random() > 0.5 ? 1 : -1), vy: -3.4 };
    padX.current = W / 2 - PAD_W / 2;
    setScore(0);
    setLives(3);
    setState("run");
  }, [buildBricks]);

  /* pointer control */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const move = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * W;
      padX.current = Math.min(Math.max(0, x - PAD_W / 2), W - PAD_W);
    };
    const pm = (e: PointerEvent) => move(e.clientX);
    canvas.addEventListener("pointermove", pm);
    return () => canvas.removeEventListener("pointermove", pm);
  }, []);

  /* keyboard control */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") keys.current.left = true;
      if (e.key === "ArrowRight") keys.current.right = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") keys.current.left = false;
      if (e.key === "ArrowRight") keys.current.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  /* loop */
  useEffect(() => {
    if (state !== "run") return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const finish = (result: "over" | "win") => {
      setState(result);
      setScore((sc) => {
        recordGameScore("breakout", sc);
        onScore?.(sc);
        return sc;
      });
    };

    const tick = () => {
      if (keys.current.left) padX.current = Math.max(0, padX.current - 6);
      if (keys.current.right) padX.current = Math.min(W - PAD_W, padX.current + 6);

      const b = ball.current;
      b.x += b.vx;
      b.y += b.vy;
      if (b.x < 4 || b.x > W - 4) b.vx *= -1;
      if (b.y < 4) b.vy *= -1;
      const padY = H - 24;
      if (b.y > padY - 4 && b.y < padY + PAD_H && b.x > padX.current - 4 && b.x < padX.current + PAD_W + 4 && b.vy > 0) {
        b.vy = -Math.abs(b.vy);
        b.vx += ((b.x - (padX.current + PAD_W / 2)) / (PAD_W / 2)) * 1.4;
        b.vx = Math.max(-4.4, Math.min(4.4, b.vx));
      }
      if (b.y > H) {
        setLives((l) => {
          const nl = l - 1;
          if (nl <= 0) finish("over");
          else {
            b.x = W / 2;
            b.y = H - 60;
            b.vy = -3.4;
          }
          return nl;
        });
      }
      for (const br of bricks.current) {
        if (!br.alive) continue;
        if (b.x > br.x && b.x < br.x + BRICK_W && b.y > br.y && b.y < br.y + BRICK_H) {
          br.alive = false;
          b.vy *= -1;
          setScore((s) => s + 10);
          break;
        }
      }
      if (bricks.current.every((br) => !br.alive)) finish("win");

      const css = getComputedStyle(document.documentElement);
      const txt = css.getPropertyValue("--txt").trim() || "#f5f5f7";
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = txt;
      ctx.globalAlpha = 0.14;
      for (const br of bricks.current) if (!br.alive) ctx.fillRect(br.x, br.y, BRICK_W, BRICK_H);
      ctx.globalAlpha = 1;
      for (const br of bricks.current) if (br.alive) ctx.fillRect(br.x, br.y, BRICK_W, BRICK_H);
      ctx.fillRect(padX.current, H - 24, PAD_W, PAD_H);
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4.2, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, onScore]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between px-1">
        <span className="meta">SCORE {score.toString().padStart(4, "0")}</span>
        <span className="meta">LIVES {"●".repeat(lives)}{"○".repeat(Math.max(0, 3 - lives))}</span>
        <Button size="sm" variant="outline" onClick={reset}>
          {state === "idle" ? "Start" : "Restart"}
        </Button>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={W} height={H} className="max-w-full rounded-xl border border-line" style={{ width: "min(100%, 340px)", height: "auto" }} />
        {state !== "run" ? (
          <div className="dot-grid absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border border-line bg-[var(--bg)]/70 backdrop-blur-[2px]">
            <p className="display text-lg tracking-[0.3em] text-[var(--txt)]">
              {state === "idle" ? "BRICKFALL" : state === "win" ? "YOU WIN" : "GAME OVER"}
            </p>
            {state !== "idle" ? <p className="meta">SCORE {score}</p> : <p className="meta">MOUSE / TOUCH / ARROWS</p>}
            <Button size="sm" variant="primary" onClick={reset}>
              {state === "idle" ? "Insert coin" : "Play again"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
