import { clamp } from '../../utils/mathUtils';
import { Vector2 } from '../../utils/vec';
import type { CheckpointInfo } from './CheckpointInfoOverlay';
import type { SkidMark } from './SkidMarks';
import type { DynamicBody } from './game';
import { stepGameWorld } from './game';
import type { Controls } from './usePlayerControls';

// Control constants and drivetrain
const TURN_SPEED = 2 * Math.PI; // radians per second
const BRAKE_ACCEL = 800; // braking deceleration (px/s^2)
const TRACTION = 2000; // how quickly velocity aligns with facing direction (px/s^2)
const DRIFT_TRACTION = 0.05; // traction when drifting (fraction of velocity per second)
const DRAG = 80; // linear drag (px/s^2)
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

export const TICK_RATE = 60; // ticks per second
export const DT = 1 / TICK_RATE; // s per tick

export type PlayerState = {
  position: Vector2;
  velocity: Vector2;
  angle: number;
  gear: number;
  lastGearShiftTick: number;
  drifting: boolean;
  remainingCheckpoints: Set<SVGGeometryElement>;
};

export type PlayerEngineCallbacks = {
  setGear: (g: number) => void;
  setRpm: (rpm: number) => void;
  setSpeed: (speed: number) => void;
  setDrifting: (d: boolean) => void;
  setSkidMarks: (updater: (prev: SkidMark[]) => SkidMark[]) => void;
  setOnTrack: (on: boolean) => void;
  setPassedCheckpointInfo: (
    updater:
      | ((prev: CheckpointInfo | null) => CheckpointInfo | null)
      | CheckpointInfo
      | null,
  ) => void;
};

export class PlayerEngine {
  private body: DynamicBody;
  private controlsRef: { current: Controls };
  private cbs: PlayerEngineCallbacks;

  private angle = 0;
  private gear = 0;
  private lastGearShiftTick = -1000;
  private drifting = false;
  private startTicking = false;
  private tick = 0;
  // Used for the norespawn timer.
  private respawnTicks = 0;
  private thisRespawnTicks = 0;

  private allCheckpoints: Set<SVGGeometryElement> = new Set();
  private remainingCheckpoints: Set<SVGGeometryElement> = new Set();
  private startCheckpoint: SVGGeometryElement | null = null;
  private prevCpInfos: CheckpointInfo[][] = [
    [
      {
        type: 'lap',
        tick: 0,
        lapTick: 0,
        respawnTicks: 0,
        remaining: 0,
        speed: 0,
        timeoutId: 0,
      },
    ],
  ];
  private playerStates: PlayerState[] = [];

  constructor(opts: {
    body: DynamicBody;
    controlsRef: { current: Controls };
    callbacks: PlayerEngineCallbacks;
    initialAngle?: number;
  }) {
    const playerStart = document.getElementById('player-start');
    if (playerStart) {
      const x = parseFloat(playerStart.getAttribute('cx') || '0');
      const y = parseFloat(playerStart.getAttribute('cy') || '0');
      this.body = opts.body;
      this.body.position = new Vector2(x, y);
    }

    this.body = opts.body;
    this.controlsRef = opts.controlsRef;
    this.cbs = opts.callbacks;
    if (opts.initialAngle != null) this.angle = opts.initialAngle;

    this.initCheckpoints();
    this.addPlayerState();
  }

  public getTick(): number {
    return this.tick;
  }

  public getAngle(): number {
    return this.angle;
  }

  public initCheckpoints(): void {
    const cpGroup = document.getElementById('checkpoints');
    if (cpGroup) {
      const cps = Array.from(cpGroup.children) as SVGGeometryElement[];
      cps.forEach(cp => this.allCheckpoints.add(cp));
      this.remainingCheckpoints = new Set(this.allCheckpoints);
    }

    const startCp = document.getElementById('start');
    if (startCp) {
      this.startCheckpoint = startCp as unknown as SVGGeometryElement;
      this.allCheckpoints.delete(this.startCheckpoint);
      this.remainingCheckpoints.delete(this.startCheckpoint);
    }
  }

  public step(): void {
    const controls = this.controlsRef.current;

    if (!this.startTicking) {
      if (
        controls.forward ||
        controls.reverse ||
        controls.left ||
        controls.right
      ) {
        this.startTicking = true;
      } else {
        return;
      }
    }

    if (controls.respawn) {
      const lastCpInfo = this.prevCpInfos.at(-1)?.at(-1);
      if (lastCpInfo) {
        const cpTick = lastCpInfo.tick;
        const state = this.playerStates[cpTick];
        if (state) {
          this.restoreState(state);
          this.thisRespawnTicks = this.tick - cpTick;
        }
      }
    }

    this.tick += 1;

    const body = this.body;
    let velocity = body.velocity;

    // 1) Rotation and turn speed
    const turnSpeed = this.computeTurnSpeed(velocity, controls);
    this.updateRotation(controls, turnSpeed);

    // 2) Drivetrain and RPM/gearbox
    const direction = Vector2.fromAngle(this.angle);
    const latDirection = direction.cw90();
    const fwdSpeed = velocity.dot(direction);
    const currentGear = this.updateTransmission(fwdSpeed, controls);

    // 3) Thrust/drag
    velocity = this.applyThrustAndDrag(
      velocity,
      direction,
      controls,
      fwdSpeed,
      currentGear,
    );

    // 4) On/off track friction
    const onTrack = this.isOnTrack(body.position);
    this.cbs.setOnTrack(onTrack);
    if (!onTrack) {
      velocity = this.applyOffTrackFriction(velocity);
    }

    // 5) Braking
    if (controls.reverse && fwdSpeed > 0) {
      velocity = this.applyBraking(velocity, direction, fwdSpeed);
    }

    // 6) Traction alignment
    velocity = this.applyTraction(
      velocity,
      direction,
      fwdSpeed,
      controls.reverse,
    );

    // 7) Drift detection + skidmarks
    velocity = this.updateDriftAndSkids(velocity, latDirection);

    // 8) Clamp max speed
    if (velocity.length() > MAX_SPEED) velocity = velocity.setLength(MAX_SPEED);

    body.velocity = velocity;

    // 9) Physics step
    stepGameWorld(DT * 1000);
    if (body.hitWall) body.velocity = body.velocity.mult(0.99);

    // 10) Position + minimap
    this.updatePositionAndMinimap();

    // 11) Speed state (forward component)
    const newFwdSpeed = body.velocity.dot(direction);
    this.cbs.setSpeed(newFwdSpeed);

    // 12) Checkpoints and overlay
    this.handleCheckpoints(newFwdSpeed);

    // 13) Save player state for replay
    this.addPlayerState();
  }

  public restoreState(state: PlayerState): void {
    this.body.position = state.position;
    this.body.velocity = state.velocity;
    this.angle = state.angle;
    this.gear = state.gear;
    this.lastGearShiftTick = state.lastGearShiftTick;
    this.drifting = state.drifting;
    this.remainingCheckpoints = new Set(state.remainingCheckpoints);

    this.cbs.setGear(this.gear);
    this.cbs.setDrifting(this.drifting);
  }

  private computeTurnSpeed(velocity: Vector2, controls: Controls): number {
    let turnSpeed = TURN_SPEED;
    if (!controls.reverse && !this.drifting) {
      const maxTurnRate = TRACTION / Math.max(velocity.length(), 1);
      turnSpeed = Math.min(turnSpeed, maxTurnRate);
    }
    return turnSpeed;
  }

  private updateRotation(controls: Controls, turnSpeed: number): void {
    if (controls.left) this.angle -= turnSpeed * DT;
    if (controls.right) this.angle += turnSpeed * DT;
  }

  private updateTransmission(fwdSpeed: number, controls: Controls): Gear {
    const accelDirection =
      (controls.forward ? 1 : 0) - (controls.reverse ? 1 : 0);

    const wheelRPM = (fwdSpeed / (2 * Math.PI * 0.3)) * 60; // assuming wheel radius of 0.3m
    const currentGear = accelDirection >= 0 ? GEARS[this.gear] : BACK_GEAR;
    const rpm = Math.abs(wheelRPM * currentGear.ratio);
    this.cbs.setRpm(Math.round(rpm));

    if (currentGear !== BACK_GEAR && fwdSpeed >= 0) {
      if (rpm > RPM_UP && this.gear < GEARS.length - 1) {
        this.gear += 1;
        this.lastGearShiftTick = this.tick;
      } else if (rpm < RPM_DOWN && this.gear > 0) {
        this.gear -= 1;
        this.lastGearShiftTick = this.tick;
      }
    } else {
      this.gear = 0;
      this.lastGearShiftTick = 0;
    }

    this.cbs.setGear(this.gear);
    return accelDirection >= 0 ? GEARS[this.gear] : BACK_GEAR;
  }

  private getAccel(gear: Gear, fwdSpeed: number, rpm: number): number {
    if ((this.tick - this.lastGearShiftTick) * TICK_RATE < GEAR_SHIFT_DELAY) {
      return 0; // keep original timing behavior
    }
    if (fwdSpeed > 0 || gear === BACK_GEAR) {
      const rpmFactor = 1 - clamp(rpm / MAX_RPM, 0, 1);
      return rpmFactor * gear.speed;
    } else {
      return gear.speed;
    }
  }

  private applyThrustAndDrag(
    velocity: Vector2,
    direction: Vector2,
    controls: Controls,
    fwdSpeed: number,
    currentGear: Gear,
  ): Vector2 {
    const forward = controls.forward ? 1 : 0;
    const reverse = controls.reverse ? 1 : 0;
    const accelDirection = forward - reverse;

    if (forward || reverse) {
      const wheelRPM = (fwdSpeed / (2 * Math.PI * 0.3)) * 60;
      const rpm = Math.abs(wheelRPM * currentGear.ratio);
      const thrustMag =
        this.getAccel(currentGear, fwdSpeed, rpm) * (accelDirection || forward);
      const thrust = direction.mult(thrustMag * DT);
      return velocity.add(thrust);
    }

    const speed = velocity.length();
    if (speed > 0) {
      const decel = DRAG * DT;
      const newSpeed = Math.max(0, speed - decel);
      return newSpeed === 0 ? new Vector2(0, 0) : velocity.setLength(newSpeed);
    }
    return velocity;
  }

  private isOnTrack(pos: Vector2): boolean {
    const trackElement = document.getElementById(
      'track-path',
    ) as unknown as SVGPathElement;
    if (!trackElement) return false;
    return trackElement.isPointInFill(new DOMPoint(pos.x, pos.y));
  }

  private applyOffTrackFriction(velocity: Vector2): Vector2 {
    const speed = velocity.length();
    if (speed <= 0) return velocity;
    const offTrackDecel = OFFTRACK_FRICTION * speed * DT;
    const newSpeed = Math.max(0, speed - offTrackDecel);
    return newSpeed === 0 ? new Vector2(0, 0) : velocity.setLength(newSpeed);
  }

  private applyBraking(
    velocity: Vector2,
    direction: Vector2,
    fwdSpeed: number,
  ): Vector2 {
    const brakeDecel = BRAKE_ACCEL * DT;
    const newFwdSpeed = Math.max(0, fwdSpeed - brakeDecel);
    const speedDiff = newFwdSpeed - fwdSpeed;
    const v = velocity.add(direction.mult(speedDiff));
    if (v.lenSq() < 100) return new Vector2(0, 0);
    return v;
  }

  private applyTraction(
    velocity: Vector2,
    direction: Vector2,
    fwdSpeed: number,
    reversing: boolean,
  ): Vector2 {
    let desiredVelocity = direction.mult(velocity.length());
    if (fwdSpeed < 0 || (reversing && fwdSpeed <= 0))
      desiredVelocity = desiredVelocity.mult(-1);
    const tractionForce = desiredVelocity.sub(velocity);
    const tractionAccel = tractionForce.clampLen(
      0,
      Math.min(
        velocity.length(),
        this.drifting ? DRIFT_TRACTION * velocity.length() : TRACTION * DT,
      ),
    );
    return velocity.add(tractionAccel);
  }

  private updateDriftAndSkids(
    velocity: Vector2,
    latDirection: Vector2,
  ): Vector2 {
    const newLatSpeed = velocity.dot(latDirection);

    if (!this.drifting && Math.abs(newLatSpeed) > DRIFT_START_THRESHOLD) {
      this.drifting = true;
      this.cbs.setDrifting(true);
    } else if (this.drifting && Math.abs(newLatSpeed) < DRIFT_STOP_THRESHOLD) {
      this.drifting = false;
      this.cbs.setDrifting(false);
    }

    if (this.drifting) {
      const skidMark: SkidMark = {
        id: this.tick,
        pos: this.body.position,
        angle: this.angle + Math.PI / 2,
        time: Date.now(),
      };
      this.cbs.setSkidMarks(prev =>
        [...prev, skidMark].filter(m => Date.now() - m.time < 3000),
      );
    } else {
      this.cbs.setSkidMarks(prev =>
        prev.filter(m => Date.now() - m.time < 3000),
      );
    }

    return velocity;
  }

  private updatePositionAndMinimap(): void {
    const body = this.body;

    const scrollable = document.getElementById('scrollable');
    const playerIndicator = document.getElementById('player-indicator');
    const gameMinimap = document.getElementById('game-minimap');
    if (scrollable && playerIndicator && gameMinimap) {
      const minimapRect = gameMinimap.getBoundingClientRect();
      const scale = minimapRect.width / scrollable.scrollWidth;
      (playerIndicator as HTMLElement).style.left =
        `${body.position.x * scale}px`;
      (playerIndicator as HTMLElement).style.top =
        `${body.position.y * scale}px`;
    }
  }

  private handleCheckpoints(newFwdSpeed: number): void {
    const setCheckpointInfo = (type: 'checkpoint' | 'lap' = 'checkpoint') => {
      const prevCps = this.prevCpInfos.at(-2);
      const currentCps = this.prevCpInfos.at(-1)!;
      const thisLap = currentCps[0];
      const tick = this.tick;

      this.respawnTicks += this.thisRespawnTicks;
      this.thisRespawnTicks = 0;

      const cpInfo: CheckpointInfo = {
        type,
        tick,
        lapTick: tick - thisLap.tick,
        respawnTicks: this.respawnTicks,
        remaining: this.remainingCheckpoints.size,
        speed: newFwdSpeed,
        timeoutId: window.setTimeout(() => {
          this.cbs.setPassedCheckpointInfo(null);
        }, 3000),
      };

      if (prevCps) {
        const lastCpInfo =
          type === 'checkpoint' ? prevCps[currentCps.length] : thisLap;
        cpInfo.lapTickDiff = cpInfo.lapTick - lastCpInfo.lapTick;
        cpInfo.speedDiff = cpInfo.speed - lastCpInfo.speed;
      }

      this.cbs.setPassedCheckpointInfo(prev => {
        if (prev && prev.timeoutId) clearTimeout(prev.timeoutId);
        return cpInfo;
      });

      if (type === 'checkpoint') {
        currentCps.push(cpInfo);
      } else {
        this.prevCpInfos.push([cpInfo]);
      }
    };

    const domPos = new DOMPoint(this.body.position.x, this.body.position.y);
    for (const checkpoint of [...this.remainingCheckpoints]) {
      if (checkpoint.isPointInFill(domPos)) {
        this.remainingCheckpoints.delete(checkpoint);
        // console.log('Checkpoint passed!');
        setCheckpointInfo('checkpoint');
        break;
      }
    }

    if (this.remainingCheckpoints.size === 0 && this.startCheckpoint) {
      if (this.startCheckpoint.isPointInFill(domPos)) {
        this.remainingCheckpoints = new Set(this.allCheckpoints);
        // console.log('Lap complete!');
        setCheckpointInfo('lap');
      }
    }
  }

  private addPlayerState(): void {
    this.playerStates.push({
      position: this.body.position,
      velocity: this.body.velocity,
      angle: this.angle,
      gear: this.gear,
      lastGearShiftTick: this.lastGearShiftTick,
      drifting: this.drifting,
      remainingCheckpoints: new Set(this.remainingCheckpoints),
    });
  }
}
