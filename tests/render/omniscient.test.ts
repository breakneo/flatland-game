import { describe, it, expect } from 'vitest';
import { project3DtoIso } from '../../src/render/omniscient';

describe('Omniscient 3D View Projection', () => {
  it('should project 3D coordinates into 2D isometric screen space', () => {
    const origin = project3DtoIso({ x: 0, y: 0, z: 0 }, 20);
    expect(origin.screenX).toBe(0);
    expect(origin.screenY).toBe(0);

    const elevated = project3DtoIso({ x: 0, y: 0, z: 10 }, 20);
    expect(elevated.screenY).toBeLessThan(0); // In screen coords, elevation points up (-Y)
  });
});
