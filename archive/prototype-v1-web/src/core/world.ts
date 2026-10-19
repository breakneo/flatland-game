import { Vector3, PlayerState, Dimension } from './dimension';

export interface Point1D {
  x: number;
  colorHex: string;
}

export interface WallSegment2D {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

export interface Polygon2D {
  points: Array<{ x: number; y: number }>;
  strokeColor: string;
  fillColor?: string;
}

export interface Box3D {
  min: Vector3;
  max: Vector3;
  strokeColor: string;
}

export interface WorldState {
  dimension: Dimension;
  player: PlayerState;
  points1D: Point1D[];
  walls2D: WallSegment2D[];
  polygons2D: Polygon2D[];
  boxes3D: Box3D[];
}

export function createDefaultPlayerState(dimension: Dimension = Dimension.D1): PlayerState {
  return {
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    dimension,
  };
}
