import { Body, Box, Quaternion, Vec3, World } from 'cannon-es';

export interface DicePose {
  x: number;
  y: number;
  z: number;
  rotation: Quaternion;
}

export interface DiceThrow {
  frames: DicePose[][];
  corrections: Quaternion[];
  contacts: number;
  diceContacts: number;
}

const NORMALS: Record<number, Vec3> = {
  1: new Vec3(0, 0, 1),
  6: new Vec3(0, 0, -1),
  2: new Vec3(1, 0, 0),
  5: new Vec3(-1, 0, 0),
  3: new Vec3(0, -1, 0),
  4: new Vec3(0, 1, 0),
};
const CAMERA = new Quaternion();
CAMERA.setFromAxisAngle(new Vec3(1, 0, 0), Math.PI / 8);

/** records cube collisions before playback so face orientation preserves the sampled result. */
export async function simulateDiceThrow(
  rolls: number[],
  width: number,
  height: number,
  signal: AbortSignal,
  random: () => number = Math.random,
): Promise<DiceThrow> {
  const world = new World({ gravity: new Vec3(0, 0, -24), allowSleep: true });
  world.defaultContactMaterial.friction = 0.45;
  world.defaultContactMaterial.restitution = 0.32;
  const halfWidth = Math.max(1.65, (width - 112) / 128);
  const halfDepth = Math.max(1.8, (height - 100) / 128);
  const floor = new Body({
    mass: 0,
    shape: new Box(new Vec3(halfWidth, halfDepth, 0.2)),
    position: new Vec3(0, 0, -0.2),
  });
  world.addBody(floor);
  for (const side of [-1, 1]) {
    world.addBody(
      new Body({
        mass: 0,
        shape: new Box(new Vec3(0.2, halfDepth + 0.4, 8)),
        position: new Vec3(side * (halfWidth + 0.2), 0, 4),
      }),
    );
    world.addBody(
      new Body({
        mass: 0,
        shape: new Box(new Vec3(halfWidth + 0.4, 0.2, 8)),
        position: new Vec3(0, side * (halfDepth + 0.2), 4),
      }),
    );
  }
  let contacts = 0;
  let diceContacts = 0;
  const columns = Math.min(
    rolls.length,
    Math.max(1, Math.floor((halfWidth * 2 - 0.3) / 1.8)),
  );
  const rows = Math.min(
    Math.ceil(rolls.length / columns),
    Math.max(1, Math.floor((halfDepth * 2 - 0.3) / 1.8)),
  );
  const bodies = rolls.map((_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns) % rows;
    const layer = Math.floor(index / (columns * rows));
    const body = new Body({
      mass: 1,
      shape: new Box(new Vec3(0.5, 0.5, 0.5)),
      position: new Vec3(
        (column - (columns - 1) / 2) * 1.8,
        (row - (rows - 1) / 2) * 1.8,
        2 + layer * 1.8,
      ),
      velocity: new Vec3(
        (random() - 0.5) * 9,
        (random() - 0.5) * 9,
        1 + random() * 2,
      ),
      angularVelocity: new Vec3(
        (random() - 0.5) * 20,
        (random() - 0.5) * 20,
        (random() - 0.5) * 20,
      ),
      linearDamping: 0.18,
      angularDamping: 0.22,
      sleepSpeedLimit: 0.18,
      sleepTimeLimit: 0.35,
    });
    body.quaternion.setFromEuler(
      random() * Math.PI,
      random() * Math.PI,
      random() * Math.PI,
    );
    body.addEventListener('collide', (event: { body: Body }) => {
      contacts++;
      if (event.body.mass > 0) diceContacts++;
    });
    world.addBody(body);
    return body;
  });
  const frames: DicePose[][] = [];
  for (let step = 0; step < 360; step++) {
    signal.throwIfAborted();
    world.step(1 / 60);
    frames.push(
      bodies.map((body) => ({
        x: body.position.x,
        y: body.position.y,
        z: body.position.z,
        rotation: body.quaternion.clone(),
      })),
    );
    if (step > 90 && bodies.every((body) => body.sleepState === Body.SLEEPING))
      break;
    // yield between batches so large throws cannot monopolize the UI thread
    if (step % 30 === 29)
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  const corrections = bodies.map((body, index) => {
    const top = Object.values(NORMALS).reduce((best, normal) =>
      body.quaternion.vmult(normal).z > body.quaternion.vmult(best).z
        ? normal
        : best,
    );
    return new Quaternion().setFromVectors(NORMALS[rolls[index]], top);
  });
  return { frames, corrections, contacts, diceContacts };
}

/** projects the physical pose into the tray's slightly tilted camera. */
export function diceTransform(pose: DicePose, correction: Quaternion): string {
  const rotation = CAMERA.mult(pose.rotation.mult(correction));
  const [axis, angle] = rotation.toAxisAngle();
  const position = CAMERA.vmult(
    new Vec3(pose.x * 64, pose.y * 64, pose.z * 64),
  );
  return `translate3d(${position.x}px, ${position.y}px, ${position.z}px) rotate3d(${axis.x}, ${axis.y}, ${axis.z}, ${angle}rad)`;
}
