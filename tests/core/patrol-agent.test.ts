import { describe, it, expect } from 'vitest';
import { PatrolAgent } from '../../assets/main/scripts/core/ai/PatrolAgent';

describe('Isosceles Patrol Agent Behavior', () => {
  it('should navigate between waypoints and detect near-miss heartbeat distance', () => {
    const waypoints = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
    const agent = new PatrolAgent(waypoints, 2);

    agent.update(1.0, { x: 20, y: 20 }, false);
    expect(agent.currentTriangle.apex.x).toBeGreaterThan(0);

    // Player positioned in near-miss zone (dangerous passing)
    const result = agent.update(0.1, { x: agent.currentTriangle.apex.x + 1.2, y: agent.currentTriangle.apex.y }, false);
    expect(result.isNearMiss).toBe(true);
    expect(result.isColliding).toBe(false);
  });

  it('should bypass collision when player has ascended into 3D', () => {
    const waypoints = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
    const agent = new PatrolAgent(waypoints, 2);
    // Touching coordinates but ascended
    const result = agent.update(0.1, { x: agent.currentTriangle.apex.x, y: agent.currentTriangle.apex.y }, true);
    expect(result.isColliding).toBe(false);
  });
});
