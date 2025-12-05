import { useAnimationLoop } from '../../utils/hooks/useAnimationLoop';
import { clamp } from '../../utils/mathUtils';
import { Vector2 } from '../../utils/vec';
import {
  type DynamicBody,
  addDynamicBox,
  createDocumentBoundaryWalls,
  removeBody,
  stepGameWorld,
} from './game';
import { useEffect, useRef, useState } from 'react';

// Top-down ship controls
const TURN_SPEED = 2 * Math.PI; // radians per second
const TURN_SPEED_SLOW = Math.PI; // rad/s * speed less turning
// const ACCEL = 800; // acceleration while thrusting (px/s^2)
// const REV_ACCEL = 400; // reverse acceleration (px/s^2)
const BRAKE_ACCEL = 800; // braking deceleration (px/s^2)
const TRACTION = 3000; // how quickly velocity aligns with facing direction (px/s^2)
const DRAG = 300; // linear drag (px/s^2), slows ship when not thrusting
const MAX_SPEED = 7000; // px/s

type Gear = {
  ratio: number;
  speed: number;
};

const BACK_GEAR: Gear = { ratio: -0.5, speed: 800 };

const GEARS: Gear[] = [
  { ratio: 0.8, speed: 1000 },
  { ratio: 0.4, speed: 800 },
  { ratio: 0.25, speed: 600 },
  { ratio: 0.1, speed: 400 },
];

const MAX_RPM = 8000;
const RPM_UP = 5500;
const RPM_DOWN = 2000;

const PLAYER_SIZE = new Vector2(50, 50);

type Controls = {
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
  ArrowDown: 'reverse',
  KeyS: 'reverse',
  ShiftLeft: 'reverse',
};

export function Player() {
  const [position, setPosition] = useState<Vector2>(new Vector2(500, 0));
  const [angle, setAngle] = useState<number>(0);
  const controlsRef = useRef<Controls>({
    left: false,
    right: false,
    forward: false,
    reverse: false,
  });
  const angleRef = useRef<number>(0);
  const bodyRef = useRef<DynamicBody | null>(null);
  const gearRef = useRef<number>(0);
  const [gear, setGear] = useState<number>(0);
  const [rpm, setRpm] = useState<number>(0);
  const [drifting, setDrifting] = useState<boolean>(false);

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

    bodyRef.current = addDynamicBox(
      position.x + PLAYER_SIZE.x / 2,
      position.y + PLAYER_SIZE.y / 2,
      PLAYER_SIZE.x,
      PLAYER_SIZE.y,
    );

    createDocumentBoundaryWalls();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      removeBody(bodyRef.current!);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAnimationLoop(dt => {
    if (!bodyRef.current) return;

    const controls = controlsRef.current;
    const body = bodyRef.current;
    let velocity = body.velocity;

    let turnSpeed = TURN_SPEED;

    if (!controls.reverse) {
      turnSpeed -= TURN_SPEED_SLOW * clamp(velocity.length() / MAX_SPEED, 0, 1);
    }

    // Rotation
    if (controls.left) {
      angleRef.current -= turnSpeed * (dt / 1000);
    }
    if (controls.right) {
      angleRef.current += turnSpeed * (dt / 1000);
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

    // Upshift
    if (rpm > RPM_UP && gearRef.current < GEARS.length - 1) {
      gearRef.current += 1;
    }
    // Downshift
    else if (rpm < RPM_DOWN && gearRef.current > 0) {
      gearRef.current -= 1;
    }
    setGear(gearRef.current);

    // Thrust
    if (forward || reverse) {
      const thrustMag = getAccel(currentGear) * (accelDirection || forward);
      const thrust = Vector2.fromAngle(
        angleRef.current,
        thrustMag * (dt / 1000),
      );
      velocity = velocity.add(thrust);
    } else {
      // Apply linear drag when not thrusting
      const speed = velocity.length();
      if (speed > 0) {
        const decel = DRAG * (dt / 1000);
        const newSpeed = Math.max(0, speed - decel);
        if (newSpeed === 0) {
          velocity = new Vector2(0, 0);
        } else {
          velocity = velocity.setLength(newSpeed);
        }
      }
    }

    if (reverse && fwdSpeed > 0) {
      // Apply braking deceleration
      const brakeDecel = BRAKE_ACCEL * (dt / 1000);
      const newFwdSpeed = Math.max(0, fwdSpeed - brakeDecel);
      const speedDiff = newFwdSpeed - fwdSpeed;
      velocity = velocity.add(direction.mult(speedDiff));

      if (velocity.lenSq() < 100) {
        velocity = new Vector2(0, 0);
      }
    }

    // Apply traction to align velocity with facing direction
    let desiredVelocity = direction.mult(velocity.length());
    if (reverse && fwdSpeed <= 0) {
      desiredVelocity = desiredVelocity.mult(-1);
    }
    const tractionForce = desiredVelocity.sub(velocity);
    const tractionAccel = tractionForce.clampLen(0, TRACTION * (dt / 1000));
    velocity = velocity.add(tractionAccel);

    const newLatSpeed = velocity.dot(latDirection);

    // Determine drifting state based on lateral speed
    const driftingThreshold = 100; // px/s
    const drifting = Math.abs(newLatSpeed) > driftingThreshold;
    setDrifting(drifting);

    // Clamp max speed
    if (velocity.length() > MAX_SPEED) {
      velocity = velocity.setLength(MAX_SPEED);
    }

    if (drifting) {
      velocity = velocity.setLength(velocity.length() * 0.99);
    }

    body.velocity = velocity;

    stepGameWorld(dt);

    const bodyPosition = body.position;
    setPosition(
      new Vector2(
        bodyPosition.x - PLAYER_SIZE.x / 2,
        bodyPosition.y - PLAYER_SIZE.y / 2,
      ),
    );

    // Center the viewport on the player
    window.scrollTo({
      left: bodyPosition.x + PLAYER_SIZE.x / 2 - window.innerWidth / 2,
      top: bodyPosition.y + PLAYER_SIZE.y / 2 - window.innerHeight / 2,
      behavior: 'auto',
    });

    function getAccel(gear: Gear): number {
      const rpmFactor = 1 - clamp(rpm / MAX_RPM, 0, 1);
      return rpmFactor * gear.speed;
    }
  });

  return (
    <div
      className={`absolute rounded-full bg-blue-500 ${drifting ? 'opacity-70' : ''}`}
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
        {rpm}
      </div>
    </div>
  );
}
