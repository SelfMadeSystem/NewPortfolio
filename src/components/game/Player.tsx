import { useAnimationLoop } from '../../utils/hooks/useAnimationLoop';
import { Vector2 } from '../../utils/vec';
import {
  type CheckpointInfo,
  CheckpointInfoOverlay,
} from './CheckpointInfoOverlay';
import { MobileControls } from './MobileControls';
import { DT, PlayerEngine, TICK_RATE } from './PlayerEngine';
import { type SkidMark, SkidMarks } from './SkidMarks';
import {
  type DynamicBody,
  addDynamicBox,
  addSolids,
  createDocumentBoundaryWalls,
  removeBody,
} from './game';
import { usePlayerControls } from './usePlayerControls';
import { useCallback, useEffect, useRef, useState } from 'react';

const PLAYER_SIZE = new Vector2(50, 50);

export function Player() {
  const [position, setPosition] = useState<Vector2>(new Vector2(1500, 500));
  const [angle, setAngle] = useState<number>(0);
  const bodyDivRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = usePlayerControls();
  const bodyRef = useRef<DynamicBody | null>(null);
  const engineRef = useRef<PlayerEngine | null>(null);
  const [gear, setGear] = useState<number>(0);
  const [rpm, setRpm] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(0);
  const [drifting, setDrifting] = useState<boolean>(false);
  const [skidMarks, setSkidMarks] = useState<SkidMark[]>([]);
  const [onTrack, setOnTrack] = useState<boolean>(true);
  const [passedCheckpointInfo, setPassedCheckpointInfo] =
    useState<CheckpointInfo | null>(null);

  useEffect(() => {
    bodyRef.current = addDynamicBox(
      position.x + PLAYER_SIZE.x / 2,
      position.y + PLAYER_SIZE.y / 2,
      PLAYER_SIZE.x,
      PLAYER_SIZE.y,
    );

    createDocumentBoundaryWalls();
    addSolids();

    // Initialize the game engine instance once
    engineRef.current = new PlayerEngine({
      body: bodyRef.current!,
      controlsRef,
      callbacks: {
        setAngle,
        setGear,
        setRpm,
        setSpeed,
        setDrifting,
        setSkidMarks,
        setOnTrack,
        setPosition,
        setPassedCheckpointInfo,
      },
      initialAngle: angle,
    });

    return () => {
      removeBody(bodyRef.current!);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastT = useRef<number>(0);

  useAnimationLoop(
    useCallback((_, t) => {
      const engine = engineRef.current;
      const body = bodyRef.current;
      if (!engine || !body) return;

      const deltaT = t - lastT.current;
      if (deltaT / 1000 < DT) return;
      lastT.current = t;

      // Accumulate time and do fixed timestep ticks
      let acc = deltaT / 1000;
      let i = 0;

      while (acc > DT) {
        engine.step();
        acc -= DT;
        if (++i > 10) break; // prevent spiral of death
      }

      // Center the viewport on the player
      const scrollable = document.getElementById('scrollable')!;
      const viewportWidth = scrollable.clientWidth;
      const viewportHeight = scrollable.clientHeight;

      // this appears to be the most performant way to do zooming that I've found
      // but it's still laggy so I'm probably never going to use it
      // scrollable.style.zoom = `${Math.sin(Date.now() / 2000) * 0.5 + 1}`;

      const targetScrollX = body.position.x - viewportWidth / 2;
      const targetScrollY = body.position.y - viewportHeight / 2;

      scrollable.scrollTo({
        left: targetScrollX,
        top: targetScrollY,
        behavior: 'auto',
      });

      const bodyDiv = bodyDivRef.current;
      if (!bodyDiv) return;

      bodyDiv.style.left = `${body.position.x - body.size.x / 2}px`;
      bodyDiv.style.top = `${body.position.y - body.size.y / 2}px`;
    }, []),
  );

  return (
    <>
      <MobileControls controlsRef={controlsRef} />
      <SkidMarks skidMarks={skidMarks} />
      {passedCheckpointInfo && (
        <CheckpointInfoOverlay
          info={passedCheckpointInfo}
          tickRate={TICK_RATE}
        />
      )}
      <div
        ref={bodyDivRef}
        className={`absolute rounded-full ${onTrack ? 'bg-blue-500' : 'bg-red-500'} ${drifting ? 'opacity-70' : ''}`}
        style={{
          top: `${Math.round(position.y)}px`,
          left: `${Math.round(position.x)}px`,
          width: `${PLAYER_SIZE.x}px`,
          height: `${PLAYER_SIZE.y}px`,
          transform: `rotate(${(angle * 180) / Math.PI}deg)`,
          transformOrigin: 'center',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z" />
        </svg>
        <div className="absolute inset-0 flex items-start justify-center text-white">
          {gear}
        </div>
        <div className="absolute inset-0 flex items-end justify-center text-white">
          {Math.floor(speed)}
        </div>
      </div>
    </>
  );
}
