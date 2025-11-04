import { Seaweed } from '../utils/seaweed';
import { getComputedColor } from '../utils/styleUtils';
import { Vector2 } from '../utils/vec';
import { useEffect, useRef } from 'react';

function isNeon() {
  return false;
}

interface SeaWeedProps {
  color?: string;
}

/**
 * React version of the original SeaWeed LitElement.
 * Keeps the same canvas-based procedural animation and cleanup behavior.
 */
export default function SeaWeed({ color = 'blue' }: SeaWeedProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    // Respect user preference to disable animations
    if (localStorage.getItem('disable-animations') === 'true') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // locally narrow to non-null variables so inner functions don't need to
    // worry about `canvas`/`ctx` possibly being null.
    const canvasEl = canvas as HTMLCanvasElement;
    const ctx2 = ctx as CanvasRenderingContext2D;

    // initialize size
    canvasEl.width = canvasEl.clientWidth;
    canvasEl.height = canvasEl.clientHeight;

    let mousePos = new Vector2(0, 0);
    let mouseMove = new Vector2(0, 0);

    function setMousePos(x: number, y: number) {
      const rect = canvasEl.getBoundingClientRect();
      x -= rect.left;
      y -= rect.top;
      const dx = x - mousePos.x;
      const dy = y - mousePos.y;
      mouseMove = mouseMove.add(new Vector2(dx, dy));
      mousePos = new Vector2(x, y);
    }

    function handleMouseMove(e: MouseEvent) {
      setMousePos(e.clientX, e.clientY);
    }
    function handlePointerMove(e: PointerEvent) {
      setMousePos(e.clientX, e.clientY);
    }
    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length > 0) {
        setMousePos(e.touches[0].clientX, e.touches[0].clientY);
      }
    }

    let prevScroll = 0;
    function handleScroll() {
      const scroll = window.scrollY;
      mousePos = mousePos.add(new Vector2(0, scroll - prevScroll));
      prevScroll = scroll;
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    const gap = 30;
    let t = Math.max(1, Math.floor(canvasEl.width / gap));
    const animals: Seaweed[] = new Array(t)
      .fill(0)
      .map(
        (_, i) =>
          new Seaweed(
            new Vector2(
              canvasEl.width * ((i / t) * 0.9 + 0.05),
              canvasEl.height,
            ),
            0.1,
          ),
      );

    function handleResize() {
      canvasEl.width = canvasEl.clientWidth;
      canvasEl.height = canvasEl.clientHeight;
      const newT = Math.max(1, Math.floor(canvasEl.width / gap));
      if (newT > t) {
        for (let i = t; i < newT; i++) {
          animals.push(
            new Seaweed(
              new Vector2(
                canvasEl.width * ((i / newT) * 0.9 + 0.05),
                canvasEl.height,
              ),
              0.1,
            ),
          );
        }
      } else if (newT < t) {
        animals.splice(newT, t - newT);
      }
      t = newT;
      for (let i = 0; i < t; i++) {
        animals[i].anchor = new Vector2(
          canvasEl.width * ((i / t) * 0.9 + 0.05),
          canvasEl.height,
        );
      }
    }
    window.addEventListener('resize', handleResize);

    const prevDeltas: number[] = [];
    let prevTime = performance.now();
    function averageDelta() {
      return (
        prevDeltas.reduce((acc, curr) => acc + curr, 0) / prevDeltas.length
      );
    }

    function getFps() {
      const currentTime = performance.now();
      const dt = currentTime - prevTime;
      prevDeltas.push(dt);
      if (prevDeltas.length > 10) prevDeltas.shift();
      prevTime = currentTime;
      return [1000 / averageDelta(), dt] as const;
    }

    function isOnScreen() {
      const rect = canvasEl.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    }

    function update() {
      ctx2.clearRect(0, 0, canvasEl.width, canvasEl.height);

      const [_fps, sdt] = getFps();
      const dt = sdt / 1000;

      const neon = isNeon();
      const resolvedColor = getComputedColor(color, canvasRef.current!);
      const visible = isOnScreen();

      if (mouseMove.length() > 100) {
        mouseMove = new Vector2(0, 0);
      }

      for (const animal of animals) {
        animal.resolve(mousePos, mouseMove, dt);
        if (visible)
          animal.display(
            ctx2,
            neon ? resolvedColor : undefined,
            neon ? '#242424' : resolvedColor,
          );
      }

      mouseMove = new Vector2(0, 0);

      animationRef.current = requestAnimationFrame(update);
    }

    animationRef.current = requestAnimationFrame(update);

    return () => {
      if (animationRef.current != null)
        cancelAnimationFrame(animationRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove as EventListener);
      window.removeEventListener('scroll', handleScroll as EventListener);
      window.removeEventListener('resize', handleResize);
    };
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', width: '100%', height: '100%', top: 0 }}
    ></canvas>
  );
}
