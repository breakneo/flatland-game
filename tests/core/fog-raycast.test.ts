import { describe, it, expect } from 'vitest';
import { computeFogVisionRays } from '../../assets/main/scripts/core/geometry/FogRaycast';

describe('Fog-Angle Recognition Raycaster (雾中辨角引擎)', () => {
  it('should cast rays and recognize darker shading for closer obstacles', () => {
    const walls = [{ x1: 5, y1: -5, x2: 5, y2: 5, color: '#1a1611' }];
    const rays = computeFogVisionRays({ x: 0, y: 0 }, 0, walls, [], 60, 5, 20);

    expect(rays).toHaveLength(5);
    const centerRay = rays[2];
    expect(centerRay.distance).toBeCloseTo(5, 1);
    expect(centerRay.brightness).toBeGreaterThan(0.6); // Close wall is dark/distinct
    expect(centerRay.hitType).toBe('wall');
  });

  it('should identify isosceles triangle shadow in the misty field of view', () => {
    const triangle = {
      apex: { x: 4, y: 0 },
      baseLeft: { x: 6, y: -1 },
      baseRight: { x: 6, y: 1 },
      headingAngle: Math.PI,
    };
    const rays = computeFogVisionRays({ x: 0, y: 0 }, 0, [], [triangle], 60, 5, 20);
    const centerRay = rays[2];
    expect(centerRay.hitType).toBe('isosceles');
    expect(centerRay.distance).toBeCloseTo(4, 1);
  });
});
