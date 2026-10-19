import { describe, it, expect } from 'vitest';
import { Dimension, getDegreesOfFreedom, canMoveInDirection } from '../../src/core/dimension';

describe('Dimension System', () => {
  it('should restrict degrees of freedom correctly across dimensions', () => {
    expect(getDegreesOfFreedom(Dimension.D0)).toEqual({ canMoveX: false, canMoveY: false, canMoveZ: false });
    expect(getDegreesOfFreedom(Dimension.D1)).toEqual({ canMoveX: true, canMoveY: false, canMoveZ: false });
    expect(getDegreesOfFreedom(Dimension.D2)).toEqual({ canMoveX: true, canMoveY: true, canMoveZ: false });
    expect(getDegreesOfFreedom(Dimension.D3)).toEqual({ canMoveX: true, canMoveY: true, canMoveZ: true });
  });

  it('should validate allowed movement directions based on active dimension', () => {
    expect(canMoveInDirection(Dimension.D1, { x: 1, y: 0, z: 0 })).toBe(true);
    expect(canMoveInDirection(Dimension.D1, { x: 0, y: 1, z: 0 })).toBe(false);
    expect(canMoveInDirection(Dimension.D2, { x: 1, y: 1, z: 0 })).toBe(true);
    expect(canMoveInDirection(Dimension.D2, { x: 0, y: 0, z: 1 })).toBe(false);
    expect(canMoveInDirection(Dimension.D0, { x: 1, y: 0, z: 0 })).toBe(false);
  });
});
