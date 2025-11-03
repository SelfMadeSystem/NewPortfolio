import { getCachedMetrics } from '../utils/canvasUtils';
import { Vector2 } from '../utils/vec';
import { getLines } from '../utils/wordWrap';
import type { CSSProperties } from 'preact';
import type { PropsWithChildren } from 'preact/compat';
import { type MutableRef, useEffect, useRef } from 'preact/hooks';

export type TextOnScreen = {
  lines: string[];
  pos: Vector2;
  size: Vector2;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  lineHeight: number;
  textAlign: CanvasTextAlign;
  metrics: TextMetrics;
};

function createTextOnScreen(
  ref: MutableRef<HTMLDivElement | null>,
): TextOnScreen {
  const el = ref.current!;
  const lines = getLines(el as HTMLElement);
  const rect = el.getBoundingClientRect();
  const pos = new Vector2(0, 0);
  const size = new Vector2(rect.width, rect.height);
  const computed = getComputedStyle(el);

  let textAlign: CanvasTextAlign = 'left';
  switch (computed.textAlign) {
    case 'center':
      textAlign = 'center';
      break;
    case 'right':
      textAlign = 'right';
      break;
    case 'left':
      textAlign = 'left';
      break;
    case 'end':
      textAlign = 'end';
      break;
    case 'start':
      textAlign = 'start';
      break;
    case 'justify':
      // fallback to left — keep behavior consistent with original
      console.warn(
        'Justify textAlign is not supported in StoreText. Defaulting to left.',
      );
      textAlign = 'left';
      break;
    default:
      console.warn(
        `Unknown textAlign value "${computed.textAlign}" in StoreText. Defaulting to left.`,
      );
      textAlign = 'left';
      break;
  }

  const font = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
  const metrics = getCachedMetrics(font);

  return {
    lines,
    pos,
    size,
    fontSize: parseFloat(computed.fontSize),
    fontFamily: computed.fontFamily,
    fontWeight: computed.fontWeight,
    lineHeight: parseFloat(computed.lineHeight),
    textAlign,
    metrics,
  };
}

export function TextOnScreenElement({
  setOnScreenText,
  children,
  className,
  style,
}: PropsWithChildren<{
  setOnScreenText: (newItem: TextOnScreen) => void;
  className?: string;
  style?: CSSProperties;
}>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    // initial report
    setOnScreenText(createTextOnScreen(ref));

    const observer = new ResizeObserver(() => {
      if (!ref.current) return;
      setOnScreenText(createTextOnScreen(ref));
    });
    observer.observe(ref.current);
    observerRef.current = observer;

    const onWindowResize = () => {
      if (!ref.current) return;
      setOnScreenText(createTextOnScreen(ref));
    };
    window.addEventListener('resize', onWindowResize);

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
      window.removeEventListener('resize', onWindowResize);
    };
    // only subscribe once; callers may provide a stable callback or useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'top',
        color: 'transparent',
        padding: 0,
        margin: 0,
        ...(style || {}),
      }}
    >
      {children}
    </div>
  );
}
