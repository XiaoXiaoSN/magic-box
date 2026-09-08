import { Vec3 } from 'cannon-es';
import { describe, expect, it } from 'vitest';

import { simulateDiceThrow } from '../dicePhysics';

const normals = [
  new Vec3(0, 0, 1),
  new Vec3(1, 0, 0),
  new Vec3(0, -1, 0),
  new Vec3(0, 1, 0),
  new Vec3(-1, 0, 0),
  new Vec3(0, 0, -1),
];

function seededRandom() {
  let seed = 42;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

describe('dice rigid-body simulation', () => {
  it.each([
    1, 6, 20,
  ])('contains %i cubes and preserves every sampled face after collisions', async (count) => {
    const rolls = Array.from({ length: count }, (_, index) => (index % 6) + 1);
    const result = await simulateDiceThrow(
      rolls,
      640,
      420,
      new AbortController().signal,
      seededRandom(),
    );
    expect(result.contacts).toBeGreaterThan(0);
    if (count > 1) expect(result.diceContacts).toBeGreaterThan(0);
    expect(result.frames.length).toBeLessThanOrEqual(360);
    const final = result.frames[result.frames.length - 1];
    for (const [index, pose] of final.entries()) {
      expect(pose.z).toBeGreaterThan(0.45);
      expect(Math.abs(pose.x)).toBeLessThan(4.9);
      expect(Math.abs(pose.y)).toBeLessThan(3.1);
      const rotation = pose.rotation.mult(result.corrections[index]);
      const up = rotation.vmult(normals[rolls[index] - 1]).z;
      expect(up).toBeGreaterThan(0.7);
      expect(
        normals.every((normal) => rotation.vmult(normal).z <= up + 1e-8),
      ).toBe(true);
    }
  });

  it('stops precomputation when the component is replaced', async () => {
    const controller = new AbortController();
    const computation = simulateDiceThrow(
      [1, 2, 3],
      640,
      300,
      controller.signal,
      seededRandom(),
    );
    controller.abort();
    await expect(computation).rejects.toMatchObject({ name: 'AbortError' });
  });
});
