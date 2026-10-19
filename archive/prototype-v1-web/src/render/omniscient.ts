export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface OmniscientSceneObject {
  id: string;
  type: 'line' | 'polygon' | 'cube';
  points: Vector3[];
  strokeColor: string;
}

/**
 * Projects a 3D coordinate point into 2D isometric screen space.
 * In screen coordinates:
 * - X axis goes right/down diagonally
 * - Y axis goes left/down diagonally
 * - Z axis represents elevation (higher Z points upward, i.e. negative screen Y)
 */
export function project3DtoIso(
  point: Vector3,
  scale: number = 20
): { screenX: number; screenY: number } {
  const cos30 = Math.cos(Math.PI / 6); // approx 0.866025
  const sin30 = Math.sin(Math.PI / 6); // 0.5

  const screenX = (point.x - point.y) * cos30 * scale;
  const screenY = ((point.x + point.y) * sin30 - point.z) * scale;

  return { screenX, screenY };
}
