import { Point2D, IsoscelesTriangle } from './IsoscelesCollider';

export interface FogRayHit {
  angleOffset: number;
  distance: number;
  brightness: number;
  hitType: 'wall' | 'isosceles' | 'exit';
  color: string;
}

export interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
}

function raySegmentIntersect(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number | null {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const denom = dx * vy - dy * vx;

  if (Math.abs(denom) < 1e-9) return null;

  const wx = x1 - ox;
  const wy = y1 - oy;

  const t = (wx * vy - wy * vx) / denom;
  const u = (wx * dy - wy * dx) / denom;

  if (t > 1e-5 && u >= 0 && u <= 1) {
    return t;
  }
  return null;
}

/**
 * Computes 2D fog-angle vision rays for Victorian Flatland subjective perspective.
 */
export function computeFogVisionRays(
  origin: Point2D,
  angle: number,
  walls: WallSegment[],
  triangles: IsoscelesTriangle[],
  fovDegrees: number = 60,
  rayCount: number = 60,
  maxDist: number = 20
): FogRayHit[] {
  const fovRad = (fovDegrees * Math.PI) / 180;
  const results: FogRayHit[] = [];

  for (let i = 0; i < rayCount; i++) {
    const angleOffset = rayCount > 1
      ? -fovRad / 2 + (fovRad * i) / (rayCount - 1)
      : 0;
    const rayAngle = angle + angleOffset;
    const dx = Math.cos(rayAngle);
    const dy = Math.sin(rayAngle);

    let closestT = Infinity;
    let closestType: 'wall' | 'isosceles' | 'exit' = 'wall';
    let closestColor = '#1a1611';

    // 1. Raycast against walls
    for (const wall of walls) {
      const t = raySegmentIntersect(origin.x, origin.y, dx, dy, wall.x1, wall.y1, wall.x2, wall.y2);
      if (t !== null && t < closestT) {
        closestT = t;
        closestType = 'wall';
        closestColor = wall.color || '#1a1611';
      }
    }

    // 2. Raycast against isosceles triangle perimeters
    for (const tri of triangles) {
      const edges = [
        { p1: tri.apex, p2: tri.baseLeft },
        { p1: tri.baseLeft, p2: tri.baseRight },
        { p1: tri.baseRight, p2: tri.apex },
      ];
      for (const edge of edges) {
        const t = raySegmentIntersect(origin.x, origin.y, dx, dy, edge.p1.x, edge.p1.y, edge.p2.x, edge.p2.y);
        if (t !== null && t < closestT) {
          closestT = t;
          closestType = 'isosceles';
          closestColor = '#8b1e1e'; // Blood crimson for isosceles soldiers
        }
      }
    }

    if (closestT < Infinity && closestT <= maxDist) {
      const brightness = Math.max(0, Math.min(1, 1 - closestT / maxDist));
      results.push({
        angleOffset,
        distance: closestT,
        brightness,
        hitType: closestType,
        color: closestColor,
      });
    } else {
      results.push({
        angleOffset,
        distance: Infinity,
        brightness: 0,
        hitType: 'wall',
        color: '#1a1611',
      });
    }
  }

  return results;
}
