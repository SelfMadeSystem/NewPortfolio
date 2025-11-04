import { useCanvas } from '../utils/hooks/useCanvas';
import { randSubsetOfChars, textButRandom } from '../utils/textUtils';
import { type TextOnScreen, TextOnScreenElement } from './TextOnScreen';
import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';

const options = {
  randChars: 3,
};

const textButRandomCache = new Map<string, string>();

function textButRandomCached(text: string, chars: string) {
  const cacheKey = `${text}|${chars}`;
  if (textButRandomCache.has(cacheKey)) {
    return textButRandomCache.get(cacheKey)!;
  } else {
    const randomized = textButRandom(text, chars);
    textButRandomCache.set(cacheKey, randomized);
    return randomized;
  }
}

function drawTextOnCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  text: TextOnScreen,
  chars?: string,
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';
  ctx.textBaseline = 'alphabetic';

  const {
    lines,
    pos,
    size,
    fontSize,
    fontFamily,
    fontWeight,
    lineHeight,
    textAlign,
    metrics,
  } = text;

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = textAlign;
  const startY =
    -metrics.fontBoundingBoxDescent / 2 +
    pos.y +
    (fontSize - lineHeight) / 2 +
    lineHeight;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const y = i * lineHeight + startY;
    let x = pos.x;
    if (textAlign === 'center') {
      x += size.x / 2;
    } else if (textAlign === 'right' || textAlign === 'end') {
      x += size.x;
    }
    if (chars) {
      ctx.fillText(textButRandomCached(line, chars), x, y);
    } else {
      ctx.fillText(line, x, y);
    }
  }
}

export function ScreenText({
  children,
  tCanvasRef,
  rCanvasRef,
  text,
  setText,
}: PropsWithChildren<{
  tCanvasRef: (canvas: HTMLCanvasElement) => void;
  rCanvasRef: (canvas: HTMLCanvasElement) => void;
  text: TextOnScreen | null;
  setText: (text: TextOnScreen) => void;
}>) {
  const [redrawTrigger, setRedrawTrigger] = useState(0);
  const [tCtx, tCanvas, setTCanvas] = useCanvas<'2d'>({
    contextId: '2d',
    autoResize: true,
    resize: (context, canvas) => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      setRedrawTrigger(r => r + 1);
    },
    setup(context, canvas) {
      tCanvasRef(canvas);
    },
  });
  const [rCtx, rCanvas, setRCanvas] = useCanvas<'2d'>({
    contextId: '2d',
    autoResize: true,
    resize: (context, canvas) => {
      context.clearRect(0, 0, canvas.width, canvas.height);
    },
    setup(context, canvas) {
      rCanvasRef(canvas);
    },
  });
  const [chars, setChars] = useState(() =>
    randSubsetOfChars(options.randChars),
  );

  useEffect(() => {
    if (!text || !rCtx || !rCanvas) return;
    const interval = setInterval(() => {
      setChars(randSubsetOfChars(options.randChars));
    }, 500);
    return () => clearInterval(interval);
  }, [text, rCtx, rCanvas]);

  useEffect(() => {
    if (!tCtx || !tCanvas || !text) return;
    drawTextOnCanvas(tCtx, tCanvas, text);
  }, [tCtx, tCanvas, text, redrawTrigger]);

  useEffect(() => {
    if (!rCtx || !rCanvas || !text) return;
    drawTextOnCanvas(rCtx, rCanvas, text, chars);
  }, [rCtx, rCanvas, text, chars]);

  return (
    <div className="relative">
      <TextOnScreenElement setOnScreenText={setText}>
        {children}
      </TextOnScreenElement>
      <canvas
        ref={setTCanvas}
        className="pointer-events-none invisible absolute inset-0 z-100 h-full w-full"
      />
      <canvas
        ref={setRCanvas}
        className="pointer-events-none invisible absolute inset-0 z-100 h-full w-full"
      />
    </div>
  );
}
