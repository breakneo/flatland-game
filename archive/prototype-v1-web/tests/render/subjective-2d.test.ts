import { describe, it, expect } from 'vitest';
import { cast2DHorizonRays } from '../../src/render/subjective-2d';

describe('2D Subjective Fog Horizon Engine (Flatland Fog-Recognition)', () => {
  it('should cast rays across the 2D field of view and return distance and fog brightness', () => {
    const walls = [
      { x1: 5, y1: -5, x2: 5, y2: 5, color: '#000000' } // Wall 5 units in front
    ];
    const rays = cast2DHorizonRays({ x: 0, y: 0, angle: 0 }, walls, 60, 5);
    expect(rays).toHaveLength(5);
    // Center ray should hit at approx distance 5
    const centerRay = rays[2];
    expect(centerRay.distance).toBeCloseTo(5, 1);
    expect(centerRay.brightness).toBeGreaterThan(0);
    expect(centerRay.brightness).toBeLessThanOrEqual(1);
  });
});
