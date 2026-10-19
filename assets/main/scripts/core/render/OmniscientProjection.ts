export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export function project3DtoIso(
  point: Point3D,
  scale: number = 14
): { screenX: number; screenY: number } {
  const cos30 = Math.cos(Math.PI / 6);
  const sin30 = Math.sin(Math.PI / 6);

  const screenX = (point.x - point.y) * cos30 * scale;
  const screenY = ((point.x + point.y) * sin30 - point.z) * scale;

  return { screenX, screenY };
}
