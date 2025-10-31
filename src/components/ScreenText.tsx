/* eslint-disable react-hooks/immutability */
import { useAnimationLoop } from '../utils/hooks/useAnimationLoop';
import { useCanvas } from '../utils/hooks/useCanvas';
import { useTextStore } from '../utils/textStore';
import { randomTextStore, screenTextStore } from './canvasStore';
import { useEffect, useState } from 'preact/hooks';

const options = {
  randChars: 3,
};

const chars =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789[]{}<>?/|\\`~!@#$%^&*()-_=+';

function randSubsetOfChars(length: number) {
  let result = '';
  for (let i = 0; i < length; i++) {
    const randIndex = Math.floor(Math.random() * chars.length);
    result += chars[randIndex];
  }
  return result;
}

function textButRandom(text: string, chars: string) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const t = text[i];
    if (t.trim() === '') {
      result += t;
    } else {
      const randIndex = Math.floor(Math.random() * chars.length);
      result += chars[randIndex];
    }
  }
  return result;
}

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

export function ScreenText() {
  const texts = useTextStore();
  const [tCtx, tCanvas, setTCanvas] = useCanvas<'2d'>({
    contextId: '2d',
    autoResize: true,
    resize: (context, canvas) => {
      context.clearRect(0, 0, canvas.width, canvas.height);
    },
    setup(context, canvas) {
      screenTextStore.set(canvas);
    },
  });
  const [rCtx, rCanvas, setRCanvas] = useCanvas<'2d'>({
    contextId: '2d',
    autoResize: true,
    resize: (context, canvas) => {
      context.clearRect(0, 0, canvas.width, canvas.height);
    },
    setup(context, canvas) {
      randomTextStore.set(canvas);
    },
  });
  const [chars, setChars] = useState(() =>
    randSubsetOfChars(options.randChars),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setChars(randSubsetOfChars(options.randChars));
    }, 500);
    return () => clearInterval(interval);
  });

  useAnimationLoop(dt => {
    if (!tCtx || !tCanvas || !rCtx || !rCanvas) return;

    tCtx.clearRect(0, 0, tCanvas.width, tCanvas.height);
    rCtx.clearRect(0, 0, rCanvas.width, rCanvas.height);
    rCtx.fillStyle = tCtx.fillStyle = 'white';
    rCtx.textBaseline = tCtx.textBaseline = 'alphabetic';

    for (const {
      lines,
      pos,
      size,
      fontSize,
      fontFamily,
      fontWeight,
      lineHeight,
      textAlign,
      metrics,
    } of texts) {
      // only draw if on screen
      if (
        pos.x + size.x < 0 ||
        pos.x > window.innerWidth + window.scrollX ||
        pos.y + size.y < 0 ||
        pos.y > window.innerHeight + window.scrollY
      ) {
        continue;
      }

      rCtx.font = tCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      rCtx.textAlign = tCtx.textAlign = textAlign;
      const startY =
        -metrics.fontBoundingBoxDescent / 2 +
        pos.y -
        window.scrollY +
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
        tCtx.fillText(line, x, y);
        rCtx.fillText(textButRandomCached(line, chars), x, y);
      }
    }
  });

  return (
    <>
      <canvas
        ref={setTCanvas}
        class="pointer-events-none invisible fixed inset-0 z-100 h-full w-full"
      />
      <canvas
        ref={setRCanvas}
        class="pointer-events-none invisible fixed inset-0 z-100 h-full w-full"
      />
    </>
  );
}
