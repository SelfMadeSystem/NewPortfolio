import { useAnimationLoop } from '../../utils/hooks/useAnimationLoop';
import { clamp } from '../../utils/mathUtils';
import { Vector2 } from '../../utils/vec';
import {
  type CheckpointInfo,
  CheckpointInfoOverlay,
} from './CheckpointInfoOverlay';
import { MobileControls } from './MobileControls';
import { type SkidMark, SkidMarks } from './SkidMarks';
import {
  type DynamicBody,
  addDynamicBox,
  addSolids,
  createDocumentBoundaryWalls,
  removeBody,
  stepGameWorld,
} from './game';
import { usePlayerControls } from './usePlayerControls';
import { useCallback, useEffect, useRef, useState } from 'react';

// Top-down ship controls
const TURN_SPEED = 2 * Math.PI; // radians per second
// const ACCEL = 800; // acceleration while thrusting (px/s^2)
// const REV_ACCEL = 400; // reverse acceleration (px/s^2)
const BRAKE_ACCEL = 800; // braking deceleration (px/s^2)
const TRACTION = 2000; // how quickly velocity aligns with facing direction (px/s^2)
const DRIFT_TRACTION = 0.05; // traction when drifting (fraction of velocity per second)
const DRAG = 80; // linear drag (px/s^2), slows ship when not thrusting
const OFFTRACK_FRICTION = 1; // additional friction when off track (fraction of velocity per second)
const MAX_SPEED = 7000; // px/s
const DRIFT_START_THRESHOLD = 150; // px/s lateral speed to start drifting
const DRIFT_STOP_THRESHOLD = 5; // px/s lateral speed to stop drifting

type Gear = {
  ratio: number;
  speed: number;
};

const BACK_GEAR: Gear = { ratio: -0.5, speed: 800 };

const GEARS: Gear[] = [
  { ratio: 0.8, speed: 1000 },
  { ratio: 0.4, speed: 800 },
  { ratio: 0.25, speed: 600 },
  { ratio: 0.2, speed: 450 },
  { ratio: 0.075, speed: 350 },
  { ratio: 0.05, speed: 300 },
];

const MAX_RPM = 8000;
const RPM_UP = 5500;
const RPM_DOWN = 2000;
const GEAR_SHIFT_DELAY = 200; // ms

const TICK_RATE = 60; // ticks per second
const DT = 1 / TICK_RATE; // s per tick

const PLAYER_SIZE = new Vector2(50, 50);

export function Player() {
  const [position, setPosition] = useState<Vector2>(new Vector2(1500, 500));
  const [angle, setAngle] = useState<number>(0);
  const bodyDivRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = usePlayerControls();
  const angleRef = useRef<number>(0);
  const bodyRef = useRef<DynamicBody | null>(null);
  const gearRef = useRef<number>(0);
  const lastGearShiftTimeRef = useRef<number>(0);
  const driftingRef = useRef<boolean>(false);
  const startTickRef = useRef<number>(-1);
  const tickRef = useRef<number>(0);
  const allCheckpointsRef = useRef<Set<SVGGeometryElement>>(new Set());
  const remainingCheckpointsRef = useRef<Set<SVGGeometryElement>>(new Set());
  const startCheckpointRef = useRef<SVGGeometryElement | null>(null);
  const [gear, setGear] = useState<number>(0);
  const [rpm, setRpm] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(0);
  const [drifting, setDrifting] = useState<boolean>(false);
  const [skidMarks, setSkidMarks] = useState<SkidMark[]>([]);
  const [onTrack, setOnTrack] = useState<boolean>(true);
  const [passedCheckpointInfo, setPassedCheckpointInfo] =
    useState<CheckpointInfo | null>(null);
  const prevCpInfosRef = useRef<CheckpointInfo[][]>([
    [
      {
        type: 'lap',
        tick: 0,
        lapTick: 0,
        remaining: 0,
        speed: 0,
        timeoutId: 0,
      },
    ],
  ]);

  useEffect(() => {
    bodyRef.current = addDynamicBox(
      position.x + PLAYER_SIZE.x / 2,
      position.y + PLAYER_SIZE.y / 2,
      PLAYER_SIZE.x,
      PLAYER_SIZE.y,
    );

    createDocumentBoundaryWalls();
    addSolids();

    const cpGroup = document.getElementById('checkpoints');
    if (cpGroup) {
      const cps = Array.from(cpGroup.children) as SVGGeometryElement[];
      cps.forEach(cp => allCheckpointsRef.current.add(cp));
      remainingCheckpointsRef.current = new Set(allCheckpointsRef.current);
    }

    const startCp = document.getElementById('start');
    if (startCp) {
      startCheckpointRef.current = startCp as unknown as SVGGeometryElement;
      allCheckpointsRef.current.delete(startCheckpointRef.current);
      remainingCheckpointsRef.current.delete(startCheckpointRef.current);
    }

    return () => {
      removeBody(bodyRef.current!);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doTick = useCallback(() => {
    if (!bodyRef.current) return;

    const controls = controlsRef.current;

    if (startTickRef.current === -1) {
      if (
        controls.forward ||
        controls.reverse ||
        controls.left ||
        controls.right
      ) {
        startTickRef.current = tickRef.current;
      }
    }

    const body = bodyRef.current;
    let velocity = body.velocity;

    let turnSpeed = TURN_SPEED;

    if (!controls.reverse && !driftingRef.current) {
      const maxTurnRate = TRACTION / Math.max(velocity.length(), 1); // avoid div by zero

      turnSpeed = Math.min(turnSpeed, maxTurnRate);
    }

    // Rotation
    if (controls.left) {
      angleRef.current -= turnSpeed * DT;
    }
    if (controls.right) {
      angleRef.current += turnSpeed * DT;
    }

    // Wrap angle
    // Keep angle simple but bounded via vec.simplify if needed. For now, keep it as-is.
    setAngle(angleRef.current);

    const forward = controls.forward ? 1 : 0;
    const reverse = controls.reverse ? 1 : 0;

    const accelDirection = forward - reverse;

    // Set RPM and handle gear shifting
    const direction = Vector2.fromAngle(angleRef.current);
    const latDirection = direction.cw90();
    const fwdSpeed = velocity.dot(direction);
    const latSpeed = velocity.dot(latDirection);
    const wheelRPM = (fwdSpeed / (2 * Math.PI * 0.3)) * 60; // assuming wheel radius of 0.3m
    const currentGear =
      accelDirection >= 0 ? GEARS[gearRef.current] : BACK_GEAR;
    const rpm = Math.abs(wheelRPM * currentGear.ratio);
    setRpm(Math.round(rpm));

    if (currentGear !== BACK_GEAR && fwdSpeed >= 0) {
      // Upshift
      if (rpm > RPM_UP && gearRef.current < GEARS.length - 1) {
        gearRef.current += 1;
        lastGearShiftTimeRef.current = tickRef.current;
      }
      // Downshift
      else if (rpm < RPM_DOWN && gearRef.current > 0) {
        gearRef.current -= 1;
        lastGearShiftTimeRef.current = tickRef.current;
      }
    } else {
      gearRef.current = 0;
      lastGearShiftTimeRef.current = 0;
    }
    setGear(gearRef.current);

    function isOnTrack(pos: Vector2): boolean {
      const trackElement = document.getElementById(
        'track-path',
      ) as unknown as SVGPathElement;
      if (!trackElement) return false;
      return trackElement.isPointInFill(new DOMPoint(pos.x, pos.y));
    }

    // Thrust
    if (forward || reverse) {
      const thrustMag = getAccel(currentGear) * (accelDirection || forward);
      const thrust = Vector2.fromAngle(angleRef.current, thrustMag * DT);
      velocity = velocity.add(thrust);
    } else {
      // Apply linear drag when not thrusting
      const speed = velocity.length();
      if (speed > 0) {
        const decel = DRAG * DT;
        const newSpeed = Math.max(0, speed - decel);
        if (newSpeed === 0) {
          velocity = new Vector2(0, 0);
        } else {
          velocity = velocity.setLength(newSpeed);
        }
      }
    }

    const onTrack = isOnTrack(body.position);
    setOnTrack(onTrack);

    if (!onTrack) {
      // Apply increased drag when off track
      const speed = velocity.length();
      if (speed > 0) {
        const offTrackDecel = OFFTRACK_FRICTION * speed * DT;
        const newSpeed = Math.max(0, speed - offTrackDecel);
        if (newSpeed === 0) {
          velocity = new Vector2(0, 0);
        } else {
          velocity = velocity.setLength(newSpeed);
        }
      }
    }

    if (reverse && fwdSpeed > 0) {
      // Apply braking deceleration
      const brakeDecel = BRAKE_ACCEL * DT;
      const newFwdSpeed = Math.max(0, fwdSpeed - brakeDecel);
      const speedDiff = newFwdSpeed - fwdSpeed;
      velocity = velocity.add(direction.mult(speedDiff));

      if (velocity.lenSq() < 100) {
        velocity = new Vector2(0, 0);
      }
    }

    // Apply traction to align velocity with facing direction
    let desiredVelocity = direction.mult(velocity.length());
    if (fwdSpeed < 0 || (reverse && fwdSpeed <= 0)) {
      desiredVelocity = desiredVelocity.mult(-1);
    }
    const tractionForce = desiredVelocity.sub(velocity);
    const tractionAccel = tractionForce.clampLen(
      0,
      Math.min(
        velocity.length(),
        driftingRef.current
          ? DRIFT_TRACTION * velocity.length()
          : TRACTION * DT,
      ),
    );
    velocity = velocity.add(tractionAccel);

    const newLatSpeed = velocity.dot(latDirection);

    // Determine drifting state based on lateral speed
    if (!driftingRef.current && Math.abs(newLatSpeed) > DRIFT_START_THRESHOLD) {
      driftingRef.current = true;
      setDrifting(true);
    } else if (
      driftingRef.current &&
      Math.abs(newLatSpeed) < DRIFT_STOP_THRESHOLD
    ) {
      driftingRef.current = false;
      setDrifting(false);
    }

    if (driftingRef.current) {
      const skidMark = {
        id: tickRef.current,
        pos: body.position,
        angle: angleRef.current + Math.PI / 2,
        time: Date.now(),
      };
      setSkidMarks(prev => [...prev, skidMark]);
    }
    // Remove old skid marks
    setSkidMarks(prev => prev.filter(mark => Date.now() - mark.time < 3000));

    // Clamp max speed
    if (velocity.length() > MAX_SPEED) {
      velocity = velocity.setLength(MAX_SPEED);
    }

    body.velocity = velocity;

    stepGameWorld(DT * 1000);

    if (body.hitWall) {
      // Simple response to hitting a wall: reduce speed
      body.velocity = body.velocity.mult(0.99);
    }

    setPosition(
      new Vector2(
        body.position.x - body.size.x / 2,
        body.position.y - body.size.y / 2,
      ),
    );

    const scrollable = document.getElementById('scrollable');
    const playerIndicator = document.getElementById('player-indicator');
    const gameMinimap = document.getElementById('game-minimap');

    if (scrollable && playerIndicator && gameMinimap) {
      const minimapRect = gameMinimap.getBoundingClientRect();
      const scale = minimapRect.width / scrollable.scrollWidth;
      playerIndicator.style.left = `${body.position.x * scale}px`;
      playerIndicator.style.top = `${body.position.y * scale}px`;
    }

    const newFwdSpeed = body.velocity.dot(direction);
    setSpeed(newFwdSpeed);

    // Handle checkpoints
    function setCheckpointInfo(type: 'checkpoint' | 'lap' = 'checkpoint') {
      const prevCps = prevCpInfosRef.current.at(-2);
      const currentCps = prevCpInfosRef.current.at(-1)!;
      const thisLap = currentCps[0];
      const tick = tickRef.current - startTickRef.current;

      const cpInfo: CheckpointInfo = {
        type,
        tick,
        lapTick: tick - thisLap.tick,
        remaining: remainingCheckpointsRef.current.size,
        speed: newFwdSpeed,
        timeoutId: window.setTimeout(() => {
          setPassedCheckpointInfo(null);
        }, 3000),
      };

      if (prevCps) {
        const lastCpInfo =
          type === 'checkpoint' ? prevCps[currentCps.length] : thisLap;
        cpInfo.lapTickDiff = cpInfo.lapTick - lastCpInfo.lapTick;
        cpInfo.speedDiff = cpInfo.speed - lastCpInfo.speed;
      }

      setPassedCheckpointInfo(prev => {
        if (prev && prev.timeoutId) {
          clearTimeout(prev.timeoutId);
        }
        return cpInfo;
      });

      if (type === 'checkpoint') {
        currentCps.push(cpInfo);
      } else {
        prevCpInfosRef.current.push([cpInfo]);
      }
    }

    const domPos = new DOMPoint(body.position.x, body.position.y);
    for (const checkpoint of [...remainingCheckpointsRef.current]) {
      if (checkpoint.isPointInFill(domPos)) {
        remainingCheckpointsRef.current.delete(checkpoint);
        console.log('Checkpoint passed!');
        setCheckpointInfo();
        break;
      }
    }

    if (
      remainingCheckpointsRef.current.size === 0 &&
      startCheckpointRef.current
    ) {
      if (startCheckpointRef.current.isPointInFill(domPos)) {
        // Lap complete
        remainingCheckpointsRef.current = new Set(allCheckpointsRef.current);
        console.log('Lap complete!');
        setCheckpointInfo('lap');
      }
    }

    function getAccel(gear: Gear): number {
      if (
        (tickRef.current - lastGearShiftTimeRef.current) * TICK_RATE <
        GEAR_SHIFT_DELAY
      ) {
        return 0; // No acceleration during gear shift delay
      }
      if (fwdSpeed > 0 || gear === BACK_GEAR) {
        const rpmFactor = 1 - clamp(rpm / MAX_RPM, 0, 1);
        return rpmFactor * gear.speed;
      } else {
        return gear.speed;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastT = useRef<number>(0);

  useAnimationLoop(
    useCallback(
      (_, t) => {
        const deltaT = t - lastT.current;
        if (deltaT / 1000 < DT) return;
        lastT.current = t;

        // Accumulate time and do fixed timestep ticks
        let acc = deltaT / 1000;
        let i = 0;
        while (acc > DT) {
          tickRef.current += 1;
          doTick();
          acc -= DT;
          if (++i > 10) break; // prevent spiral of death
        }

        // Center the viewport on the player
        const scrollable = document.getElementById('scrollable')!;
        const viewportWidth = scrollable.clientWidth;
        const viewportHeight = scrollable.clientHeight;

        const targetScrollX = bodyRef.current!.position.x - viewportWidth / 2;
        const targetScrollY = bodyRef.current!.position.y - viewportHeight / 2;

        scrollable.scrollTo({
          left: targetScrollX,
          top: targetScrollY,
          behavior: 'auto',
        });

        bodyDivRef.current!.style.left = `${bodyRef.current!.position.x - PLAYER_SIZE.x / 2}px`;
        bodyDivRef.current!.style.top = `${bodyRef.current!.position.y - PLAYER_SIZE.y / 2}px`;
      },
      [doTick],
    ),
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
          top: `${position.y}px`,
          left: `${position.x}px`,
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
