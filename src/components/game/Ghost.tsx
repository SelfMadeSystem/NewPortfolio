import { PLAYER_SIZE } from './PlayerEngine';
import { useEffect, useRef } from 'react';

export type GhostPlayerState = {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  angle: number;
  gear: number;
  lastGearShiftTick: number;
  drifting: boolean;
};

export function Ghost({
  running,
  states,
  onTickRef,
}: {
  running: boolean;
  states: GhostPlayerState[];
  onTickRef: React.RefObject<() => void>;
}) {
  const tickRef = useRef<number>(0);
  const bodyDivRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    onTickRef.current = () => {
      if (!running) {
        tickRef.current = 0;
        return;
      }
      tickRef.current++;
      if (tickRef.current >= states.length) {
        tickRef.current = states.length - 1;
      }
      const state = states[tickRef.current];
      const bodyDiv = bodyDivRef.current;
      if (!bodyDiv) return;

      bodyDiv.style.left = `${state.position.x}px`;
      bodyDiv.style.top = `${state.position.y}px`;

      bodyDiv.style.rotate = `${Math.round(state.angle * (180 / Math.PI))}deg`;
    };
  }, [onTickRef, running, states]);

  return (
    <div
      ref={bodyDivRef}
      className={`absolute origin-center -translate-1/2 rounded-full bg-purple-400/50`}
      style={{
        width: `${PLAYER_SIZE.x}px`,
        height: `${PLAYER_SIZE.y}px`,
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z" />
      </svg>
    </div>
  );
}
