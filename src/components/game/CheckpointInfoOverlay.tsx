import React from 'react';
import { createPortal } from 'react-dom';

export type CheckpointInfo = {
  type: 'checkpoint' | 'lap';
  tick: number;
  lapTick: number;
  lapTickDiff?: number;
  remaining: number;
  speed: number;
  speedDiff?: number;
  timeoutId: number;
};

interface CheckpointInfoOverlayProps {
  info: CheckpointInfo;
  tickRate: number;
}

export function CheckpointInfoOverlay({
  info,
  tickRate,
}: CheckpointInfoOverlayProps) {
  return createPortal(
    <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-black/50 px-4 py-2 text-white">
      <div>{info.type === 'lap' ? 'Lap Complete!' : 'Checkpoint Passed!'}</div>
      <div>
        Time: {(info.tick / tickRate).toFixed(2)}s{' '}
        {info.lapTickDiff !== undefined &&
          `(${info.lapTickDiff >= 0 ? '+' : ''}${(info.lapTickDiff / tickRate).toFixed(2)}s)`}
      </div>
      <div>Lap Time: {(info.lapTick / tickRate).toFixed(2)}s</div>
      <div>Remaining: {info.remaining}</div>
      <div>
        Speed: {Math.floor(info.speed)}{' '}
        {info.speedDiff !== undefined &&
          `(${info.speedDiff >= 0 ? '+' : ''}${Math.floor(info.speedDiff)})`}
      </div>
    </div>,
    document.body,
  );
}
