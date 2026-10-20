export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export function project3DtoIso(
  point: Point3D,
  scale: number = 14
): { screenX: number; screenY: number } {
  // 视角重构：前进方向（+X 向东通向脱逃口）投影为自屏幕下方朝屏幕深处上方挺进，与第一人称 W 前进绝对契合
  // +Y 横向走廊映射为屏幕左右扩展，+Z 高维升空映射为垂直拔高
  const screenX = (point.y * 0.95 + point.x * 0.32) * scale;
  const screenY = (point.y * 0.22 - point.x * 0.88 - point.z * 1.15) * scale;

  return { screenX, screenY };
}
