import { describe, it, expect } from 'vitest';
import { LevelManager } from '../../src/game/level-manager';
import { compute1DSight } from '../../src/render/subjective-1d';
import { cast2DHorizonRays } from '../../src/render/subjective-2d';
import { project3DtoIso } from '../../src/render/omniscient';

describe('Full Game Smoke Integration', () => {
  it('should verify all modules communicate synchronously without runtime errors', () => {
    const manager = new LevelManager();
    const sight1D = compute1DSight(0, [{ x: 5, colorHex: '#000' }]);
    const rays2D = cast2DHorizonRays({ x: 0, y: 0, angle: 0 }, [{ x1: 5, y1: -5, x2: 5, y2: 5, color: '#000' }]);
    const isoPoint = project3DtoIso({ x: 1, y: 2, z: 3 });

    expect(sight1D).toBeDefined();
    expect(rays2D).toBeDefined();
    expect(isoPoint).toBeDefined();
    expect(manager.activeDimension).toBeDefined();
  });
});
