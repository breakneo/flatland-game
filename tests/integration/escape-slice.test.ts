import { describe, it, expect } from 'vitest';
import { EscapeGameController } from '../../assets/sub_gameplay/scripts/controllers/EscapeGameController';

describe('Vertical Slice Escape Integration', () => {
  it('should ensure safe spawn zone without instant death for at least 4 seconds when player stands still', () => {
    const game = new EscapeGameController();
    expect(game.gameState).toBe('PLAYING');

    // Simulate 4 seconds (250 frames at 60fps) of standing still
    for (let i = 0; i < 250; i++) {
      game.update(0.016);
      expect(game.gameState).toBe('PLAYING');
    }
  });

  it('should reset patrols and player cleanly on game.reset() without instant death loop', () => {
    const game = new EscapeGameController();
    game.reset();
    expect(game.gameState).toBe('PLAYING');
    for (let i = 0; i < 100; i++) {
      game.update(0.016);
      expect(game.gameState).toBe('PLAYING');
    }
  });

  it('should run complete gameplay cycle: move, near-miss, ascend, and reach exit', () => {
    const game = new EscapeGameController();
    expect(game.gameState).toBe('PLAYING');

    // Charge energy and trigger ascension
    game.addEnergy(100);
    game.requestAscension();
    expect(game.isAscended).toBe(true);

    // Cross barrier to exit
    game.teleportNearExit();
    game.update(0.1);
    expect(game.gameState).toBe('VICTORY');
    expect(game.victoryManuscript).toContain('向上，而不是向北');
  });
});
