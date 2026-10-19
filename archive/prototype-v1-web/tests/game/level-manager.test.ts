import { describe, it, expect } from 'vitest';
import { LevelManager } from '../../src/game/level-manager';
import { Dimension } from '../../src/core/dimension';

describe('Level Manager & Ascension Progression', () => {
  it('should initialize at Level 1 (1D Line world)', () => {
    const manager = new LevelManager();
    expect(manager.currentLevel.initialDimension).toBe(Dimension.D1);
    expect(manager.isAscended).toBe(false);
  });

  it('should trigger ascension to D2 in Level 1 when deadlocked', () => {
    const manager = new LevelManager();
    manager.triggerAscension();
    expect(manager.activeDimension).toBe(Dimension.D2);
  });

  it('should unlock 0D Easter Egg after completing Level 3', () => {
    const manager = new LevelManager();
    manager.completeCurrentLevel(); // L1 -> L2
    manager.completeCurrentLevel(); // L2 -> L3
    manager.completeCurrentLevel(); // L3 -> 0D Egg
    expect(manager.activeDimension).toBe(Dimension.D0);
    expect(manager.isEasterEggActive).toBe(true);
    expect(manager.getPointKingSoliloquy(0)).toContain('My own thought');
  });
});
