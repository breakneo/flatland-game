export enum Dimension {
  D0 = 0,
  D1 = 1,
  D2 = 2,
  D3 = 3,
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerState {
  position: Vector3;
  rotation: number;
  dimension: Dimension;
}

export interface DegreesOfFreedom {
  canMoveX: boolean;
  canMoveY: boolean;
  canMoveZ: boolean;
}

export function getDegreesOfFreedom(dim: Dimension): DegreesOfFreedom {
  switch (dim) {
    case Dimension.D0:
      return { canMoveX: false, canMoveY: false, canMoveZ: false };
    case Dimension.D1:
      return { canMoveX: true, canMoveY: false, canMoveZ: false };
    case Dimension.D2:
      return { canMoveX: true, canMoveY: true, canMoveZ: false };
    case Dimension.D3:
      return { canMoveX: true, canMoveY: true, canMoveZ: true };
    default:
      return { canMoveX: false, canMoveY: false, canMoveZ: false };
  }
}

export function canMoveInDirection(dim: Dimension, delta: Vector3): boolean {
  if (dim === Dimension.D0) {
    return false;
  }
  const dof = getDegreesOfFreedom(dim);
  if (!dof.canMoveX && delta.x !== 0) return false;
  if (!dof.canMoveY && delta.y !== 0) return false;
  if (!dof.canMoveZ && delta.z !== 0) return false;
  return true;
}
