import { describe, it, expect } from 'vitest';
import { compute1DSight } from '../../src/render/subjective-1d';

describe('1D Subjective Sight Engine', () => {
  it('should detect forward and backward obstacle points and calculate distance attenuation', () => {
    const obstacles = [
      { x: 5, colorHex: '#ff0000' },
      { x: -3, colorHex: '#00ff00' }
    ];
    const sight = compute1DSight(0, obstacles, 10);
    expect(sight.forward.isBlocked).toBe(true);
    expect(sight.forward.distance).toBe(5);
    expect(sight.forward.brightness).toBeCloseTo(0.5, 1);
    expect(sight.forward.colorHex).toBe('#ff0000');

    expect(sight.backward.isBlocked).toBe(true);
    expect(sight.backward.distance).toBe(3);
    expect(sight.backward.colorHex).toBe('#00ff00');
  });

  it('should clamp brightness when obstacle is at zero distance without dividing by zero', () => {
    const obstacles = [{ x: 2, colorHex: '#ffffff' }];
    const sight = compute1DSight(2, obstacles, 10);
    expect(sight.forward.distance).toBe(0);
    expect(sight.forward.brightness).toBe(1.0);
  });
});
