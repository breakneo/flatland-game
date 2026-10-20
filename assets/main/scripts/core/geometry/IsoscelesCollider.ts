export interface Point2D {
  x: number;
  y: number;
}

export interface IsoscelesTriangle {
  apex: Point2D;
  baseLeft: Point2D;
  baseRight: Point2D;
  headingAngle: number;
}

function projectVertices(vertices: Point2D[], axis: Point2D): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const v of vertices) {
    const proj = v.x * axis.x + v.y * axis.y;
    if (proj < min) min = proj;
    if (proj > max) max = proj;
  }
  return [min, max];
}

function isSeparatedOnAxis(v1: Point2D[], v2: Point2D[], axis: Point2D): boolean {
  const len = Math.hypot(axis.x, axis.y);
  if (len < 1e-9) return false;
  const normAxis = { x: axis.x / len, y: axis.y / len };
  const [min1, max1] = projectVertices(v1, normAxis);
  const [min2, max2] = projectVertices(v2, normAxis);
  return max1 < min2 || max2 < min1;
}

export function getSquareVertices(
  squareCenter: Point2D,
  squareSize: number,
  angle: number = 0
): Point2D[] {
  const half = squareSize / 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const localOffsets = [
    { x: -half, y: -half },
    { x: half, y: -half },
    { x: half, y: half },
    { x: -half, y: half },
  ];

  return localOffsets.map((pt) => ({
    x: squareCenter.x + (pt.x * cos - pt.y * sin),
    y: squareCenter.y + (pt.x * sin + pt.y * cos),
  }));
}

/**
 * Checks lethal collision between a square player and an isosceles triangle using SAT.
 */
export function checkSquareTriangleCollision(
  squareCenter: Point2D,
  squareSize: number,
  triangle: IsoscelesTriangle,
  angle: number = 0
): boolean {
  const squareVertices = getSquareVertices(squareCenter, squareSize, angle);

  const triVertices: Point2D[] = [
    triangle.apex,
    triangle.baseLeft,
    triangle.baseRight,
  ];

  const axes: Point2D[] = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -(triVertices[1].y - triVertices[0].y), y: triVertices[1].x - triVertices[0].x },
    { x: -(triVertices[2].y - triVertices[1].y), y: triVertices[2].x - triVertices[1].x },
    { x: -(triVertices[0].y - triVertices[2].y), y: triVertices[0].x - triVertices[2].x },
  ];

  for (const axis of axes) {
    if (isSeparatedOnAxis(squareVertices, triVertices, axis)) {
      return false;
    }
  }

  return true;
}

function distToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/**
 * Calculates near-miss distance from square center to the closest edge of the isosceles triangle.
 */
export function getNearMissDistance(
  squareCenter: Point2D,
  triangle: IsoscelesTriangle
): number {
  const d1 = distToSegment(squareCenter, triangle.apex, triangle.baseLeft);
  const d2 = distToSegment(squareCenter, triangle.baseLeft, triangle.baseRight);
  const d3 = distToSegment(squareCenter, triangle.baseRight, triangle.apex);
  return Math.min(d1, d2, d3);
}
