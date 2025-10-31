/* eslint-disable react-hooks/immutability */
import { useAnimationLoop } from '../utils/hooks/useAnimationLoop';
import { useCanvas } from '../utils/hooks/useCanvas';
import { useTextStore } from '../utils/textStore';

export function ScreenText() {
  const texts = useTextStore();
  const [tCtx, tCanvas, setTCanvas] = useCanvas<'2d'>({
    contextId: '2d',
    autoResize: true,
    resize: (context, canvas) => {
      context.clearRect(0, 0, canvas.width, canvas.height);
    },
  });
  const [rCtx, rCanvas, setRCanvas] = useCanvas<'2d'>({
    contextId: '2d',
    autoResize: true,
    resize: (context, canvas) => {
      context.clearRect(0, 0, canvas.width, canvas.height);
    },
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
      rCtx.font = tCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      rCtx.textAlign = tCtx.textAlign = textAlign;
      const startY =
        -metrics.actualBoundingBoxDescent / 2 +
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
      }
    }
  });

  return (
    <>
      <canvas
        ref={setTCanvas}
        class="pointer-events-none fixed inset-0 z-100 h-full w-full"
      />
      <canvas
        ref={setRCanvas}
        class="pointer-events-none fixed inset-0 z-100 h-full w-full"
      />
    </>
  );
}
