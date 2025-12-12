import { useEffect, useRef } from 'react';

export type Controls = {
  left: boolean; // rotate left
  right: boolean; // rotate right
  forward: boolean; // main thrust
  reverse: boolean; // reverse thrust / brake
};

const controlsKeyMap: { [key: string]: keyof Controls } = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'forward',
  KeyW: 'forward',
  KeyZ: 'forward',
  ArrowDown: 'reverse',
  KeyS: 'reverse',
  ShiftLeft: 'reverse',
};

export function usePlayerControls() {
  const controlsRef = useRef<Controls>({
    left: false,
    right: false,
    forward: false,
    reverse: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const control = controlsKeyMap[e.code];
      if (control) {
        controlsRef.current[control] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const control = controlsKeyMap[e.code];
      if (control) {
        controlsRef.current[control] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return controlsRef;
}
