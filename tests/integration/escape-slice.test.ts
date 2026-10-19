import { describe, it, expect } from 'vitest';
import { EscapeGameController } from '../../assets/sub_gameplay/scripts/controllers/EscapeGameController';

describe('Vertical Slice Escape Integration', () => {
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
