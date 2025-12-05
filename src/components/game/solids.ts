import { Vector2 } from '../../utils/vec';
import { type StaticBody, addStaticBox, removeBody } from './game';
import { type Dispatch, useCallback, useEffect, useRef } from 'react';

const solids: Map<HTMLElement, StaticBody> = new Map();

export function useSolid(): Dispatch<HTMLElement | null> {
  const prevElementRef = useRef<HTMLElement | null>(null);
  const prevBodyRef = useRef<StaticBody | null>(null);

  const setSolid = useCallback((element: HTMLElement | null) => {
    if (prevElementRef.current && prevElementRef.current !== element) {
      solids.delete(prevElementRef.current);
      if (prevBodyRef.current) {
        removeBody(prevBodyRef.current);
        prevBodyRef.current = null;
      }
    }
    prevElementRef.current = element;

    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const body = addStaticBox(
      rect.left + rect.width / 2 + window.scrollX,
      rect.top + rect.height / 2 + window.scrollY,
      rect.width,
      rect.height,
    );
    solids.set(element, body);
    prevBodyRef.current = body;
  }, []);

  useEffect(() => {
    const handleResize = () => {
      solids.forEach((body, element) => {
        const rect = element.getBoundingClientRect();
        body.position = new Vector2(
          rect.left + rect.width / 2 + window.scrollX,
          rect.top + rect.height / 2 + window.scrollY,
        );
        body.size = new Vector2(rect.width, rect.height);
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return setSolid;
}
