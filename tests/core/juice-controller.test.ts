import { describe, it, expect } from 'vitest';
import { JuiceController } from '../../assets/main/scripts/core/juice/JuiceController';

describe('Game Juice & Screen Shake Controller', () => {
  it('should generate high-frequency decaying shake offset when trauma is added', () => {
    const juice = new JuiceController();
    juice.addTrauma(0.8);
    const frame1 = juice.update(0.016);
    expect(frame1.offsetX !== 0 || frame1.offsetY !== 0).toBe(true);

    // Decays over time
    for (let i = 0; i < 60; i++) juice.update(0.016);
    const frameDecayed = juice.update(0.016);
    expect(Math.abs(frameDecayed.offsetX)).toBeLessThan(0.05);
  });

  it('should freeze physics updates during hit stop duration', () => {
    const juice = new JuiceController();
    juice.triggerHitStop(80); // 80ms hit stop
    const frame = juice.update(0.02);
    expect(frame.isFrozen).toBe(true);

    juice.update(0.07);
    const frameAfter = juice.update(0.01);
    expect(frameAfter.isFrozen).toBe(false);
  });
});
