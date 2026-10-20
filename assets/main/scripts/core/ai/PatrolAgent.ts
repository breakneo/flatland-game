import {
  Point2D,
  IsoscelesTriangle,
  checkSquareTriangleCollision,
  getNearMissDistance,
} from '../geometry/IsoscelesCollider';

export class PatrolAgent {
  private waypoints: Point2D[];
  private currentWaypointIndex: number = 0;
  private moveSpeed: number;
  private pos: Point2D;
  private heading: number = 0;
  private triangle: IsoscelesTriangle;

  constructor(waypoints: Point2D[], moveSpeed: number = 2.0) {
    if (waypoints.length === 0) {
      throw new Error('PatrolAgent requires at least one waypoint');
    }
    this.waypoints = [...waypoints];
    this.moveSpeed = moveSpeed;
    this.pos = { x: waypoints[0].x, y: waypoints[0].y };
    this.currentWaypointIndex = waypoints.length > 1 ? 1 : 0;

    if (waypoints.length > 1) {
      const dx = waypoints[1].x - waypoints[0].x;
      const dy = waypoints[1].y - waypoints[0].y;
      this.heading = Math.atan2(dy, dx);
    } else {
      this.heading = 0;
    }

    this.triangle = this.calculateTriangle();
  }

  public reset(): void {
    this.pos = { x: this.waypoints[0].x, y: this.waypoints[0].y };
    this.currentWaypointIndex = this.waypoints.length > 1 ? 1 : 0;
    if (this.waypoints.length > 1) {
      const dx = this.waypoints[1].x - this.waypoints[0].x;
      const dy = this.waypoints[1].y - this.waypoints[0].y;
      this.heading = Math.atan2(dy, dx);
    } else {
      this.heading = 0;
    }
    this.triangle = this.calculateTriangle();
  }

  public get currentTriangle(): IsoscelesTriangle {
    return this.triangle;
  }

  public getIsoscelesTriangle(): IsoscelesTriangle {
    return this.triangle;
  }

  public get position(): Point2D {
    return { ...this.pos };
  }

  private calculateTriangle(): IsoscelesTriangle {
    const cos = Math.cos(this.heading);
    const sin = Math.sin(this.heading);
    const perpX = -sin;
    const perpY = cos;

    // 原著精准身材：底边极窄（全宽 0.38），身躯狭长如长矛毒刺（长 2.4），顶角小于 10 度
    const apexLength = 1.8;
    const baseDistance = 0.6;
    const baseHalfWidth = 0.19;

    const apex: Point2D = {
      x: this.pos.x + cos * apexLength,
      y: this.pos.y + sin * apexLength,
    };

    const baseCenterX = this.pos.x - cos * baseDistance;
    const baseCenterY = this.pos.y - sin * baseDistance;

    const baseLeft: Point2D = {
      x: baseCenterX + perpX * baseHalfWidth,
      y: baseCenterY + perpY * baseHalfWidth,
    };

    const baseRight: Point2D = {
      x: baseCenterX - perpX * baseHalfWidth,
      y: baseCenterY - perpY * baseHalfWidth,
    };

    return {
      apex,
      baseLeft,
      baseRight,
      headingAngle: this.heading,
    };
  }

  public update(
    dt: number,
    targetPos: Point2D,
    isTargetAscended: boolean,
    targetAngle: number = 0
  ): { isColliding: boolean; isNearMiss: boolean } {
    const targetWp = this.waypoints[this.currentWaypointIndex];
    const dx = targetWp.x - this.pos.x;
    const dy = targetWp.y - this.pos.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 1e-4) {
      this.heading = Math.atan2(dy, dx);
      const step = Math.min(dist, this.moveSpeed * dt);
      this.pos.x += (dx / dist) * step;
      this.pos.y += (dy / dist) * step;

      if (dist - step <= 0.05) {
        this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
      }
    }

    this.triangle = this.calculateTriangle();

    if (isTargetAscended) {
      return { isColliding: false, isNearMiss: false };
    }

    const isColliding = checkSquareTriangleCollision(targetPos, 1.0, this.triangle, targetAngle);
    const nearMissDist = getNearMissDistance(targetPos, this.triangle);
    const isNearMiss = !isColliding && nearMissDist <= 1.5;

    return { isColliding, isNearMiss };
  }
}
