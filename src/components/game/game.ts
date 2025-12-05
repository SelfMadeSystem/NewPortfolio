import { Vector2 } from '../../utils/vec';

export interface AABB {
  position: Vector2;
  size: Vector2;
}

export interface StaticBody extends AABB {
  type: 'static';
}

export interface DynamicBody extends AABB {
  type: 'dynamic';
  velocity: Vector2;
  grounded: boolean;
}

export type Body = StaticBody | DynamicBody;

interface GameWorld {
  gravity: Vector2;
  bodies: Body[];
  staticBodies: StaticBody[];
  dynamicBodies: DynamicBody[];
}

const gameWorld: GameWorld = {
  gravity: new Vector2(0, 0),
  bodies: [],
  staticBodies: [],
  dynamicBodies: [],
};

export function getGameWorld() {
  return gameWorld;
}

export function addStaticBox(
  x: number,
  y: number,
  width: number,
  height: number,
): StaticBody {
  const body: StaticBody = {
    type: 'static',
    position: new Vector2(x, y),
    size: new Vector2(width, height),
  };
  gameWorld.bodies.push(body);
  gameWorld.staticBodies.push(body);
  return body;
}

export function removeBody(body: Body) {
  const index = gameWorld.bodies.indexOf(body);
  if (index !== -1) {
    gameWorld.bodies.splice(index, 1);
  }

  if (body.type === 'static') {
    const staticIndex = gameWorld.staticBodies.indexOf(body);
    if (staticIndex !== -1) {
      gameWorld.staticBodies.splice(staticIndex, 1);
    }
  } else {
    const dynamicIndex = gameWorld.dynamicBodies.indexOf(body);
    if (dynamicIndex !== -1) {
      gameWorld.dynamicBodies.splice(dynamicIndex, 1);
    }
  }
}

export function addDynamicBox(
  x: number,
  y: number,
  width: number,
  height: number,
): DynamicBody {
  const body: DynamicBody = {
    type: 'dynamic',
    position: new Vector2(x, y),
    size: new Vector2(width, height),
    velocity: new Vector2(0, 0),
    grounded: false,
  };
  gameWorld.bodies.push(body);
  gameWorld.dynamicBodies.push(body);
  return body;
}

export function createDocumentBoundaryWalls() {
  const thickness = 100;
  const scrollable = document.getElementById('scrollable')!;
  const width = scrollable.scrollWidth;
  const height = scrollable.scrollHeight;

  // Top wall
  addStaticBox(width / 2, -thickness / 2, Infinity, thickness);
  // Bottom wall
  const bottom = addStaticBox(
    width / 2,
    height + thickness / 2,
    Infinity,
    thickness,
  );
  // Left wall
  addStaticBox(-thickness / 2, height / 2, thickness, Infinity);
  // Right wall
  const right = addStaticBox(
    width + thickness / 2,
    height / 2,
    thickness,
    Infinity,
  );

  window.addEventListener('resize', () => {
    const newWidth = scrollable.scrollWidth;
    const newHeight = scrollable.scrollHeight;

    // Update bottom wall
    bottom.position = new Vector2(newWidth / 2, newHeight + thickness / 2);
    bottom.size = new Vector2(Infinity, thickness);

    // Update right wall
    right.position = new Vector2(newWidth + thickness / 2, newHeight / 2);
    right.size = new Vector2(thickness, Infinity);
  });
}

function checkAABBCollision(a: AABB, b: AABB): boolean {
  const aLeft = a.position.x - a.size.x / 2;
  const aRight = a.position.x + a.size.x / 2;
  const aTop = a.position.y - a.size.y / 2;
  const aBottom = a.position.y + a.size.y / 2;

  const bLeft = b.position.x - b.size.x / 2;
  const bRight = b.position.x + b.size.x / 2;
  const bTop = b.position.y - b.size.y / 2;
  const bBottom = b.position.y + b.size.y / 2;

  return !(
    aRight <= bLeft ||
    aLeft >= bRight ||
    aBottom <= bTop ||
    aTop >= bBottom
  );
}

function resolveAABBCollision(dynamic: DynamicBody, static_: AABB) {
  const dLeft = dynamic.position.x - dynamic.size.x / 2;
  const dRight = dynamic.position.x + dynamic.size.x / 2;
  const dTop = dynamic.position.y - dynamic.size.y / 2;
  const dBottom = dynamic.position.y + dynamic.size.y / 2;

  const sLeft = static_.position.x - static_.size.x / 2;
  const sRight = static_.position.x + static_.size.x / 2;
  const sTop = static_.position.y - static_.size.y / 2;
  const sBottom = static_.position.y + static_.size.y / 2;

  // Calculate overlap on each axis
  const overlapLeft = dRight - sLeft;
  const overlapRight = sRight - dLeft;
  const overlapTop = dBottom - sTop;
  const overlapBottom = sBottom - dTop;

  // Find minimum overlap
  const minOverlap = Math.min(
    overlapLeft,
    overlapRight,
    overlapTop,
    overlapBottom,
  );

  // Resolve collision by pushing out on the axis with minimum overlap
  if (minOverlap === overlapLeft) {
    dynamic.position = dynamic.position.sub(Vector2.X(overlapLeft));
    dynamic.velocity = new Vector2(
      Math.min(0, dynamic.velocity.x),
      dynamic.velocity.y,
    );
  } else if (minOverlap === overlapRight) {
    dynamic.position = dynamic.position.add(Vector2.X(overlapRight));
    dynamic.velocity = new Vector2(
      Math.max(0, dynamic.velocity.x),
      dynamic.velocity.y,
    );
  } else if (minOverlap === overlapTop) {
    dynamic.position = dynamic.position.sub(Vector2.Y(overlapTop));
    dynamic.velocity = new Vector2(
      dynamic.velocity.x,
      Math.min(0, dynamic.velocity.y),
    );
    dynamic.grounded = true;
  } else {
    dynamic.position = dynamic.position.add(Vector2.Y(overlapBottom));
    dynamic.velocity = new Vector2(
      dynamic.velocity.x,
      Math.max(0, dynamic.velocity.y),
    );
  }
}

export function stepGameWorld(timeStep: number) {
  timeStep = Math.min(timeStep, 50); // Cap time step to avoid large jumps
  const dt = timeStep / 1000; // Convert to seconds

  // Apply gravity and update velocities
  for (const body of gameWorld.dynamicBodies) {
    body.velocity = body.velocity.add(gameWorld.gravity.mult(dt));
  }

  // Update positions
  for (const body of gameWorld.dynamicBodies) {
    body.position = body.position.add(body.velocity.mult(dt));
  }

  // Collision detection and resolution
  for (const dynamic of gameWorld.dynamicBodies) {
    dynamic.grounded = false;
    // Check against static bodies
    for (const static_ of gameWorld.staticBodies) {
      if (checkAABBCollision(dynamic, static_)) {
        resolveAABBCollision(dynamic, static_);
      }
    }

    // Check against other dynamic bodies
    for (const other of gameWorld.dynamicBodies) {
      if (dynamic !== other && checkAABBCollision(dynamic, other)) {
        resolveAABBCollision(dynamic, other);
      }
    }
  }
}
