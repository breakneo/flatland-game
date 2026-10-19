import { describe, it, expect } from 'vitest';
import { checkSquareTriangleCollision, getNearMissDistance, IsoscelesTriangle } from '../../assets/main/scripts/core/geometry/IsoscelesCollider';

describe('Isosceles Triangle Lethal Collision Model', () => {
  const triangle: IsoscelesTriangle = {
    apex: { x: 5, y: 0 },
    baseLeft: { x: 3, y: -1 },
    baseRight: { x: 3, y: 1 },
    headingAngle: 0,
  };

  it('should detect lethal penetration when square touches the sharp apex', () => {
    // Square touching apex (5, 0)
    const isHit = checkSquareTriangleCollision({ x: 5.2, y: 0 }, 1.0, triangle);
    expect(isHit).toBe(true);
  });

  it('should not collide when square is safely outside lethal bounding', () => {
    const isHit = checkSquareTriangleCollision({ x: 10, y: 0 }, 1.0, triangle);
    expect(isHit).toBe(false);
  });

  it('should calculate near-miss distance when passing dangerously close', () => {
    const distance = getNearMissDistance({ x: 5.8, y: 0 }, triangle);
    expect(distance).toBeCloseTo(0.8, 1);
  });
});
