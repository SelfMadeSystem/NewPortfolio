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

const MOVE_ACCEL_AIR = 8;
const MOVE_ACCEL_GROUND = 100;
const MOVE_DECEL_AIR = 1;
const MOVE_DECEL_GROUND = 50;
const MOVE_SPEED = 300;
const JUMP_STRENGTH = 500;

const PLAYER_SIZE = new Vector2(50, 50);

type Controls = {
  left: boolean;
  right: boolean;
  jump: boolean;
};

const controlsKeyMap: { [key: string]: keyof Controls } = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
};

export function Player() {
  const [position, setPosition] = useState<Vector2>(new Vector2(500, 0));
  const controlsRef = useRef<Controls>({
    left: false,
    right: false,
    jump: false,
  });
  const bodyRef = useRef<DynamicBody | null>(null);

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
    const velocity = body.velocity;

    let fx = 0;
    let jump = 0;

    const accel = body.grounded ? MOVE_ACCEL_GROUND : MOVE_ACCEL_AIR;

    if (controls.left) {
      fx -= accel;
    }
    if (controls.right) {
      fx += accel;
    }
    if (controls.jump) {
      controls.jump = false;
      jump = 1;
    }

    let vx = velocity.x;
    let vy = velocity.y;

    if (fx !== 0) {
      if (
        Math.sign(fx) !== Math.sign(velocity.x) ||
        Math.abs(velocity.x) < MOVE_SPEED
      ) {
        vx = clamp(velocity.x + fx, -MOVE_SPEED, MOVE_SPEED);
      }
    } else {
      const decel = body.grounded ? MOVE_DECEL_GROUND : MOVE_DECEL_AIR;
      if (velocity.x > 0) {
        vx = Math.max(0, velocity.x - decel);
      } else if (velocity.x < 0) {
        vx = Math.min(0, velocity.x + decel);
      }
    }

    if (jump) {
      vy = -JUMP_STRENGTH;
    }

    body.velocity = new Vector2(vx, vy);

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
  });

  return (
    <div
      className="absolute bg-blue-500"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${PLAYER_SIZE.x}px`,
        height: `${PLAYER_SIZE.y}px`,
      }}
    ></div>
  );
}
