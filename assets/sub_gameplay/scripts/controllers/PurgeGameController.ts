import { Point2D } from '../../../../assets/main/scripts/core/geometry/IsoscelesCollider';
import { AscensionFSM, AscensionState } from '../../../../assets/main/scripts/core/fsm/AscensionFSM';
import { JuiceController } from '../../../../assets/main/scripts/core/juice/JuiceController';

export interface NeedleAssassin {
  x: number;
  y: number;
  startY: number;
  endY: number;
  speed: number;
  dir: number;
  length: number;
}

export interface CirclePriest {
  x: number;
  y: number;
  radius: number;
  auraRadius: number;
}

export interface VoidToken {
  x: number;
  y: number;
  collected: boolean;
}

export interface PurgeFogRayHit {
  angleOffset: number;
  distance: number;
  brightness: number;
  hitType: 'wall' | 'needle' | 'priest' | 'portal';
  color: string;
  tipFactor?: number;
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
): { t: number; u: number } | null {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const denom = dx * vy - dy * vx;
  if (Math.abs(denom) < 1e-9) return null;
  const wx = x1 - ox;
  const wy = y1 - oy;
  const t = (wx * vy - wy * vx) / denom;
  const u = (wx * dy - wy * dx) / denom;
  if (t > 1e-4 && u >= 0 && u <= 1) {
    return { t, u };
  }
  return null;
}

function rayCircleIntersect(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  cx: number,
  cy: number,
  r: number
): number | null {
  const vx = ox - cx;
  const vy = oy - cy;
  const b = dx * vx + dy * vy;
  const c = vx * vx + vy * vy - r * r;
  const disc = b * b - c;
  if (disc < 0) return null;
  const sqrtDisc = Math.sqrt(disc);
  const t1 = -b - sqrtDisc;
  if (t1 > 1e-4) return t1;
  const t2 = -b + sqrtDisc;
  if (t2 > 1e-4) return t2;
  return null;
}

export class PurgeGameController {
  public gameState: 'PLAYING' | 'VICTORY' | 'DEFEATED' = 'PLAYING';

  public player = {
    x: -5.0,
    y: 0,
    angle: 0,
    size: 1.2,
  };

  public ascensionFSM: AscensionFSM;
  public juice: JuiceController;
  public energy: number = 0;

  // 针形刺客（原著女性公民）：在街道中高速纵向往复游弋，无声穿刺
  public needleAssassins: NeedleAssassin[] = [
    { x: -2.0, y: -2.8, startY: -2.8, endY: 2.8, speed: 2.4, dir: 1, length: 1.5 },
    { x: 1.8, y: 2.8, startY: -2.8, endY: 2.8, speed: 2.8, dir: -1, length: 1.5 },
  ];

  // 圆形大祭司：最高统治者，镇守中庭核心
  public circlePriest: CirclePriest = {
    x: 0,
    y: 0,
    radius: 1.1,
    auraRadius: 2.5,
  };

  // 高维引渡法阵（终点）
  public voidPortal: Point2D = {
    x: 5.6,
    y: 0,
  };

  // 球体接引符印
  public tokens: VoidToken[] = [
    { x: -3.6, y: 2.2, collected: false },
    { x: -0.2, y: -2.4, collected: false },
    { x: 3.4, y: 2.2, collected: false },
  ];

  public defeatManuscript: string = '【手稿 · 针刺之殇】“针形女性那近乎无形的身躯在迷雾中无声穿过。没有丝毫撞击的轰鸣，只有身躯被一分为二的冰冷碎灭……”';
  public victoryManuscript: string = '【手稿 · 飞升虚空】“球体导师将你从二维纸面彻底拔出！你俯瞰着整座议会大厦的屋顶与五边形街道，那曾经禁锢你一生的平面国，在此刻沦为无边虚空中的一粒微尘！”';

  constructor() {
    this.ascensionFSM = new AscensionFSM();
    this.juice = new JuiceController();
  }

  public get isAscended(): boolean {
    return this.ascensionFSM.currentState === AscensionState.ASCENDING_3D;
  }

  public get currentZ(): number {
    return this.ascensionFSM.currentZ;
  }

  public requestAscension(): boolean {
    if (this.energy < 100) return false;
    this.ascensionFSM.chargeEnergy(100);
    const ok = this.ascensionFSM.triggerAscend(4.5);
    if (ok) {
      this.energy = 0;
      this.juice.addTrauma(0.35);
      this.juice.triggerHitStop(80);
    }
    return ok;
  }

  public movePlayer(forward: number, turn: number, dt: number): void {
    if (this.gameState !== 'PLAYING') return;

    this.player.angle += turn * 2.5 * dt;
    const speed = this.isAscended ? 6.2 : 4.0;
    const dx = Math.cos(this.player.angle) * forward * speed * dt;
    const dy = Math.sin(this.player.angle) * forward * speed * dt;

    const nextX = this.player.x + dx;
    const nextY = this.player.y + dy;

    if (!this.isAscended) {
      // 街道边界阻隔 [-5.8, 5.8] 与 [-3.5, 3.5]
      if (Math.abs(nextX) < 5.6) this.player.x = nextX;
      if (Math.abs(nextY) < 3.2) this.player.y = nextY;
    } else {
      this.player.x = nextX;
      this.player.y = nextY;
    }
  }

  public update(dt: number): void {
    if (this.gameState !== 'PLAYING') return;

    this.ascensionFSM.update(dt);
    this.juice.update(dt);

    // 更新针形刺客纵向穿刺位移
    for (const a of this.needleAssassins) {
      a.y += a.dir * a.speed * dt;
      if (a.y >= a.endY) {
        a.y = a.endY;
        a.dir = -1;
      } else if (a.y <= a.startY) {
        a.y = a.startY;
        a.dir = 1;
      }
    }

    // 碰撞与致命穿透检测（仅在二维平面生效）
    if (!this.isAscended) {
      // 1. 针形刺客致命判定
      for (const a of this.needleAssassins) {
        const halfLen = a.length / 2;
        const dx = Math.abs(this.player.x - a.x);
        const withinY = this.player.y >= a.y - halfLen - 0.4 && this.player.y <= a.y + halfLen + 0.4;
        if (dx < 0.6 && withinY) {
          this.gameState = 'DEFEATED';
          this.juice.addTrauma(0.8);
          this.juice.triggerHitStop(150);
          return;
        }
      }

      // 2. 圆形祭司圣光阻挡（撞击反弹并产生轻微震荡）
      const dPriest = Math.hypot(this.player.x - this.circlePriest.x, this.player.y - this.circlePriest.y);
      if (dPriest < this.circlePriest.radius + 0.4) {
        // 反弹推开
        const angle = Math.atan2(this.player.y - this.circlePriest.y, this.player.x - this.circlePriest.x);
        this.player.x = this.circlePriest.x + Math.cos(angle) * (this.circlePriest.radius + 0.5);
        this.player.y = this.circlePriest.y + Math.sin(angle) * (this.circlePriest.radius + 0.5);
        this.juice.addTrauma(0.1);
      }
    }

    // 收集接引符印
    for (const t of this.tokens) {
      if (!t.collected) {
        const d = Math.hypot(this.player.x - t.x, this.player.y - t.y);
        if (d < 1.3) {
          t.collected = true;
          this.energy = Math.min(100, this.energy + 35);
        }
      }
    }

    // 胜利抵达高维法阵
    const dPortal = Math.hypot(this.player.x - this.voidPortal.x, this.player.y - this.voidPortal.y);
    if (dPortal < 1.4) {
      this.gameState = 'VICTORY';
    }
  }

  public reset(): void {
    this.gameState = 'PLAYING';
    this.player = { x: -5.0, y: 0, angle: 0, size: 1.2 };
    this.energy = 0;
    this.ascensionFSM = new AscensionFSM();
    this.juice = new JuiceController();
    for (const t of this.tokens) t.collected = false;
  }

  public getFogRays(rayCount: number = 70): PurgeFogRayHit[] {
    const fovRad = (60 * Math.PI) / 180;
    const startAngle = this.player.angle - fovRad / 2;
    const step = rayCount > 1 ? fovRad / (rayCount - 1) : 0;
    const maxDist = 18;

    const walls = [
      { x1: -5.8, y1: -3.4, x2: 5.8, y2: -3.4 },
      { x1: 5.8, y1: -3.4, x2: 5.8, y2: 3.4 },
      { x1: 5.8, y1: 3.4, x2: -5.8, y2: 3.4 },
      { x1: -5.8, y1: 3.4, x2: -5.8, y2: -3.4 },
    ];

    const hits: PurgeFogRayHit[] = [];

    for (let i = 0; i < rayCount; i++) {
      const rayAngle = startAngle + i * step;
      const angleOffset = rayAngle - this.player.angle;
      const dx = Math.cos(rayAngle);
      const dy = Math.sin(rayAngle);

      let closestDist = maxDist;
      let hitType: PurgeFogRayHit['hitType'] = 'wall';
      let hitColor = '#2a241c';
      let tipFactor = 0;

      // 1. Check walls
      for (const w of walls) {
        const hit = raySegmentIntersect(this.player.x, this.player.y, dx, dy, w.x1, w.y1, w.x2, w.y2);
        if (hit !== null && hit.t < closestDist) {
          closestDist = hit.t;
          hitType = 'wall';
          hitColor = '#2a241c';
          tipFactor = 0;
        }
      }

      // 2. Check Circle Priest
      const tPriest = rayCircleIntersect(
        this.player.x,
        this.player.y,
        dx,
        dy,
        this.circlePriest.x,
        this.circlePriest.y,
        this.circlePriest.radius
      );
      if (tPriest !== null && tPriest < closestDist) {
        closestDist = tPriest;
        hitType = 'priest';
        hitColor = 'rgba(234, 179, 8, 0.95)';
        tipFactor = 0;
      }

      // 3. Check Needle Assassins
      for (const a of this.needleAssassins) {
        const halfLen = a.length / 2;
        const hitNeedle = raySegmentIntersect(
          this.player.x,
          this.player.y,
          dx,
          dy,
          a.x,
          a.y - halfLen,
          a.x,
          a.y + halfLen
        );
        if (hitNeedle !== null && hitNeedle.t < closestDist) {
          closestDist = hitNeedle.t;
          hitType = 'needle';
          hitColor = 'rgba(244, 63, 94, 0.95)';
          tipFactor = Math.abs(hitNeedle.u - 0.5) * 2;
        }
      }

      // 4. Check Void Portal
      const tPortal = rayCircleIntersect(
        this.player.x,
        this.player.y,
        dx,
        dy,
        this.voidPortal.x,
        this.voidPortal.y,
        0.75
      );
      if (tPortal !== null && tPortal < closestDist) {
        closestDist = tPortal;
        hitType = 'portal';
        hitColor = 'rgba(147, 197, 253, 0.9)';
        tipFactor = 0;
      }

      const brightness = Math.max(0, 1 - closestDist / maxDist);
      hits.push({
        angleOffset,
        distance: closestDist,
        brightness,
        hitType,
        color: hitColor,
        tipFactor,
      });
    }

    return hits;
  }

  public castRays(rayCount: number = 70): PurgeFogRayHit[] {
    return this.getFogRays(rayCount);
  }
}
