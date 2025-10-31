import type { Vector2 } from './vec';
import { useEffect, useState } from 'preact/hooks';

export type TextOnScreen = {
  lines: string[];
  pos: Vector2;
  size: Vector2;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  lineHeight: number;
  textAlign: CanvasTextAlign; // horizontal alignment
  metrics: TextMetrics;
};

const textStore: Map<string, TextOnScreen> = new Map();

// simple subscriber list
const listeners = new Set<() => void>();

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach(l => l());
}

export function getTextStore() {
  return Array.from(textStore.values());
}

export function addTextToStore(
  textItem: TextOnScreen,
): [(newItem: TextOnScreen) => void, () => void] {
  const id = crypto.randomUUID();
  textStore.set(id, textItem);
  notify();
  return [
    (newItem: TextOnScreen) => {
      textStore.set(id, newItem);
      notify();
    },
    () => {
      textStore.delete(id);
      notify();
    },
  ];
}

export function useTextStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribe(() => setTick(t => t + 1));
    return unsubscribe;
  }, []);

  return getTextStore();
}
