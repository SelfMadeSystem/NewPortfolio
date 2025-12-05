import type { Controls } from './Player';
import { useCallback, useEffect, useRef, useState } from 'react';

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function MobileControls({
  controlsRef,
}: {
  controlsRef: React.RefObject<Controls>;
}) {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const activeTouchesRef = useRef<Map<number, keyof Controls>>(new Map());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobile(isTouchDevice());
  }, []);

  const handleControlPress = useCallback(
    (control: keyof Controls) => {
      if (controlsRef.current) {
        controlsRef.current[control] = true;
      }
    },
    [controlsRef],
  );

  const handleControlRelease = useCallback(
    (control: keyof Controls) => {
      if (controlsRef.current) {
        controlsRef.current[control] = false;
      }
    },
    [controlsRef],
  );

  const getControlFromPoint = useCallback(
    (x: number, y: number): keyof Controls | undefined => {
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      if (!el) return;
      const button = el.closest<HTMLButtonElement>('[data-control]');
      if (!button) return;
      return button.dataset.control as keyof Controls | undefined;
    },
    [],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const control = getControlFromPoint(t.clientX, t.clientY);
        if (!control) continue;
        // map this touch id to the control and press it
        activeTouchesRef.current.set(t.identifier, control);
        handleControlPress(control);
      }
    },
    [getControlFromPoint, handleControlPress],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const prev = activeTouchesRef.current.get(t.identifier);
        const next = getControlFromPoint(t.clientX, t.clientY);

        if (prev === next) continue;

        if (prev) {
          handleControlRelease(prev);
          activeTouchesRef.current.delete(t.identifier);
        }

        if (next) {
          handleControlPress(next);
          activeTouchesRef.current.set(t.identifier, next);
        }
      }
    },
    [getControlFromPoint, handleControlPress, handleControlRelease],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const prev = activeTouchesRef.current.get(t.identifier);
        if (prev) {
          handleControlRelease(prev);
          activeTouchesRef.current.delete(t.identifier);
        }
      }
    },
    [handleControlRelease],
  );

  if (!isMobile) return null;

  return (
    <div
      className="fixed right-0 bottom-0 left-0 z-50 flex w-full touch-none select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div className="flex grow flex-col">
        <button
          data-control="forward"
          className="bg-opacity-50 h-32 w-full border border-white/20 bg-gray-800/50 text-2xl text-white"
        >
          ⬆️
        </button>
        <button
          data-control="reverse"
          className="bg-opacity-50 h-32 w-full border border-white/20 bg-gray-800/50 text-2xl text-white"
        >
          ⬇️
        </button>
      </div>
      <div className="flex grow flex-col">
        <button
          data-control="left"
          className="bg-opacity-50 h-32 w-full border border-white/20 bg-gray-800/50 text-2xl text-white"
        >
          ⬅️
        </button>
        <button
          data-control="right"
          className="bg-opacity-50 h-32 w-full border border-white/20 bg-gray-800/50 text-2xl text-white"
        >
          ➡️
        </button>
      </div>
    </div>
  );
}
