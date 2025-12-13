import { useTickRate } from '../../utils/hooks/useTickRate';
import {
  type CheckpointInfo,
  CheckpointInfoOverlay,
} from './CheckpointInfoOverlay';
import { Ghost } from './Ghost';
import { MobileControls } from './MobileControls';
import { DT, PLAYER_SIZE, PlayerEngine, TICK_RATE } from './PlayerEngine';
import { type SkidMark, SkidMarks } from './SkidMarks';
import {
  type DynamicBody,
  addDynamicBox,
  addSolids,
  createDocumentBoundaryWalls,
  removeBody,
} from './game';
import { GHOST_DATA } from './ghostData';
import { usePlayerControls } from './usePlayerControls';
import { useCallback, useEffect, useRef, useState } from 'react';

export function Player() {
  const bodyDivRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = usePlayerControls();
  const bodyRef = useRef<DynamicBody | null>(null);
  const engineRef = useRef<PlayerEngine | null>(null);
  const ghostTickRef = useRef<() => void>(() => {});
  const [startTicking, setStartTicking] = useState<boolean>(false);
  const [gear, setGear] = useState<number>(0);
  const [rpm, setRpm] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(0);
  const [drifting, setDrifting] = useState<boolean>(false);
  const [skidMarks, setSkidMarks] = useState<SkidMark[]>([]);
  const [onTrack, setOnTrack] = useState<boolean>(true);
  const [passedCheckpointInfo, setPassedCheckpointInfo] =
    useState<CheckpointInfo | null>(null);

  useEffect(() => {
    bodyRef.current = addDynamicBox(0, 0, PLAYER_SIZE.x, PLAYER_SIZE.y);

    createDocumentBoundaryWalls();
    addSolids();

    // Initialize the game engine instance once
    engineRef.current = new PlayerEngine({
      body: bodyRef.current!,
      controlsRef,
      callbacks: {
        setStartTicking,
        setGear,
        setRpm,
        setSpeed,
        setDrifting,
        setSkidMarks,
        setOnTrack,
        setPassedCheckpointInfo,
      },
      initialAngle: 0,
    });

    return () => {
      removeBody(bodyRef.current!);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useTickRate(
    DT,
    useCallback(() => {
      const engine = engineRef.current;
      if (!engine) return;

      engine.step();
      ghostTickRef.current();
    }, []),
    useCallback((_: number, t: number) => {
      const engine = engineRef.current;
      const body = bodyRef.current;
      if (!engine || !body) return;

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

      bodyDiv.style.left = `${body.position.x}px`;
      bodyDiv.style.top = `${body.position.y}px`;

      bodyDiv.style.rotate = `${Math.round(engine.getAngle() * (180 / Math.PI))}deg`;
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
        className={`absolute origin-center rounded-full ${onTrack ? 'bg-blue-500' : 'bg-red-500'} ${drifting ? 'opacity-70' : ''} -translate-1/2`}
        style={{
          width: `${PLAYER_SIZE.x}px`,
          height: `${PLAYER_SIZE.y}px`,
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
      {startTicking && (
        <Ghost running={true} states={GHOST_DATA} onTickRef={ghostTickRef} />
      )}
    </>
  );
}
