export interface SightPoint1D {
  distance: number;
  brightness: number;
  colorHex: string;
  isBlocked: boolean;
}

export interface Obstacle1D {
  x: number;
  colorHex: string;
}

export function compute1DSight(
  playerX: number,
  obstacles: Obstacle1D[],
  maxViewDistance: number = 10
): { forward: SightPoint1D; backward: SightPoint1D } {
  const safeMaxDistance = maxViewDistance > 0 ? maxViewDistance : 1e-6;

  let closestForward: { distance: number; colorHex: string } | null = null;
  let closestBackward: { distance: number; colorHex: string } | null = null;

  for (const obs of obstacles) {
    if (obs.x >= playerX) {
      const dist = obs.x - playerX;
      if (dist <= safeMaxDistance && (!closestForward || dist < closestForward.distance)) {
        closestForward = { distance: dist, colorHex: obs.colorHex };
      }
    }
    if (obs.x <= playerX) {
      const dist = playerX - obs.x;
      if (dist <= safeMaxDistance && (!closestBackward || dist < closestBackward.distance)) {
        closestBackward = { distance: dist, colorHex: obs.colorHex };
      }
    }
  }

  const forward: SightPoint1D = closestForward
    ? {
        distance: closestForward.distance,
        brightness: Math.max(0, Math.min(1, 1 - closestForward.distance / safeMaxDistance)),
        colorHex: closestForward.colorHex,
        isBlocked: true,
      }
    : {
        distance: Infinity,
        brightness: 0,
        colorHex: '#000000',
        isBlocked: false,
      };

  const backward: SightPoint1D = closestBackward
    ? {
        distance: closestBackward.distance,
        brightness: Math.max(0, Math.min(1, 1 - closestBackward.distance / safeMaxDistance)),
        colorHex: closestBackward.colorHex,
        isBlocked: true,
      }
    : {
        distance: Infinity,
        brightness: 0,
        colorHex: '#000000',
        isBlocked: false,
      };

  return { forward, backward };
}
