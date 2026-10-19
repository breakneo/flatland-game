export interface HorizonRayColumn {
  angleOffset: number;
  distance: number;
  brightness: number;
  wallColor: string;
}

export interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

export function cast2DHorizonRays(
  player: { x: number; y: number; angle: number },
  walls: WallSegment[],
  fovDegrees: number = 60,
  rayCount: number = 100,
  maxDistance: number = 25
): HorizonRayColumn[] {
  const fovRad = (fovDegrees * Math.PI) / 180;
  const results: HorizonRayColumn[] = [];

  for (let i = 0; i < rayCount; i++) {
    const angleOffset = rayCount > 1
      ? -fovRad / 2 + (fovRad * i) / (rayCount - 1)
      : 0;
    const rayAngle = player.angle + angleOffset;
    const dx = Math.cos(rayAngle);
    const dy = Math.sin(rayAngle);

    let closestT = Infinity;
    let hitColor = '#000000';

    for (const wall of walls) {
      const vx = wall.x2 - wall.x1;
      const vy = wall.y2 - wall.y1;
      const denom = dx * vy - dy * vx;

      if (Math.abs(denom) < 1e-9) continue;

      const wx = wall.x1 - player.x;
      const wy = wall.y1 - player.y;

      const t = (wx * vy - wy * vx) / denom;
      const u = (wx * dy - wy * dx) / denom;

      if (t > 1e-5 && u >= 0 && u <= 1 && t < closestT) {
        closestT = t;
        hitColor = wall.color;
      }
    }

    if (closestT < Infinity && closestT <= maxDistance) {
      const brightness = Math.max(0, Math.min(1, 1 - closestT / maxDistance));
      results.push({
        angleOffset,
        distance: closestT,
        brightness,
        wallColor: hitColor,
      });
    } else {
      results.push({
        angleOffset,
        distance: Infinity,
        brightness: 0,
        wallColor: '#000000',
      });
    }
  }

  return results;
}
