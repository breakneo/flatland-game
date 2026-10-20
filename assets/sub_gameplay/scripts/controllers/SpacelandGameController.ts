import { Point2D } from '../../../../assets/main/scripts/core/geometry/IsoscelesCollider';
import { JuiceController } from '../../../../assets/main/scripts/core/juice/JuiceController';

export type SpacelandPhase = 'CROSS_SECTION' | 'CABINET_PUZZLE' | 'ASCENDED';

export interface SpacelandFogRayHit {
  angleOffset: number;
  distance: number;
  brightness: number;
  hitType: 'wall' | 'cabinet' | 'sphere' | 'void';
  color: string;
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
  if (t > 1e-4 && u >= 0 && u <= 1) {
    return t;
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

export interface SpacelandCitizen {
  id: string;
  type: 'triangle' | 'isosceles' | 'square' | 'pentagon';
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  minPos: number;
  maxPos: number;
  axis: 'x' | 'y';
  organPulsePhase: number;
}

export class SpacelandGameController {
  public gameState: 'PLAYING' | 'VICTORY' | 'DEFEATED' = 'PLAYING';
  public phase: SpacelandPhase = 'CROSS_SECTION';

  public player = {
    x: -2.0,
    y: 0,
    angle: 0, // 面向正东 (+X 方向，朝向前方面闭铁箱)
    size: 1.2,
  };

  public juice: JuiceController;

  // 书房外墙边界
  public studyWalls = {
    minX: -3.8,
    maxX: 3.8,
    minY: -3.0,
    maxY: 3.0,
  };

  // 书房前方的反锁密闭铁箱（四面严密封闭，内部锁着手稿）
  public cabinet = {
    x: 1.8,
    y: 0,
    halfSize: 0.7,
  };

  // 三维球体导师：位于书房西南角 (x = -1.8, y = -1.2)，在 Z 轴上下穿行
  public sphere = {
    x: -1.8,
    y: -1.2,
    z: 0,
    radius3D: 1.6,
    speedZ: 1.8,
    minZ: -2.4,
    maxZ: 2.4,
    dirZ: 1,
  };

  public altitude: number = 0;
  public minAltitude: number = 0.6;
  public maxAltitude: number = 12.0;
  public isAutoAscending: boolean = true;
  public isDetaching: boolean = false;
  public detachProgress: number = 0;

  public citizens: SpacelandCitizen[] = [
    {
      id: 'noble_triangle',
      type: 'triangle',
      name: '等边三角形商贩',
      x: -1.5,
      y: 4.8,
      vx: 1.3,
      vy: 0,
      minPos: -5.5,
      maxPos: 5.5,
      axis: 'x',
      organPulsePhase: 0,
    },
    {
      id: 'noble_triangle_east',
      type: 'triangle',
      name: '东街工匠三角形',
      x: 3.2,
      y: -5.2,
      vx: -1.1,
      vy: 0,
      minPos: -4.5,
      maxPos: 6.0,
      axis: 'x',
      organPulsePhase: 2.4,
    },
    {
      id: 'guard_isosceles',
      type: 'isosceles',
      name: '西巡道等腰宪兵',
      x: -5.6,
      y: -1.5,
      vx: 0,
      vy: 1.5,
      minPos: -4.8,
      maxPos: 4.8,
      axis: 'y',
      organPulsePhase: 1.8,
    },
    {
      id: 'guard_isosceles_east',
      type: 'isosceles',
      name: '东门等腰哨兵',
      x: 6.2,
      y: 2.0,
      vx: 0,
      vy: -1.6,
      minPos: -4.2,
      maxPos: 4.2,
      axis: 'y',
      organPulsePhase: 0.9,
    },
    {
      id: 'scholar_square',
      type: 'square',
      name: '正方形学者同侪',
      x: 5.6,
      y: 1.0,
      vx: 0,
      vy: -1.2,
      minPos: -4.5,
      maxPos: 4.5,
      axis: 'y',
      organPulsePhase: 3.2,
    },
    {
      id: 'patrician_pentagon',
      type: 'pentagon',
      name: '五边形市政法官',
      x: -0.5,
      y: -6.0,
      vx: 0.9,
      vy: 0,
      minPos: -5.0,
      maxPos: 5.0,
      axis: 'x',
      organPulsePhase: 4.1,
    },
  ];

  public hasRetrievedManuscript: boolean = false;
  public soliloquy: string = '“反锁密闭的书房中，为何凭空出现了一个忽大忽小的圆？”';

  public victoryManuscript: string = '【手稿 · 空间国全知】“球体将我从纸面上拔向第三维度！我看到了反锁书房没有屋顶，看到了铁箱内部的文字，甚至看到了我同胞从未示人的内脏与心室！”';
  public defeatManuscript: string = '【手稿 · 坠入虚妄】“认知剧震导致心智失衡，你跌落回封闭的二维深渊。”';

  constructor() {
    this.juice = new JuiceController();
  }

  public get isAscended(): boolean {
    return this.altitude > 0.05 || this.phase === 'ASCENDED';
  }

  public get currentZ(): number {
    return this.altitude;
  }

  public changeAltitude(deltaZ: number): void {
    if (!this.isAscended) return;
    this.isAutoAscending = false;
    this.altitude = Math.max(this.minAltitude, Math.min(this.maxAltitude, this.altitude + deltaZ));
  }

  // 计算球体穿透二维地平面时产生的圆截面半径 r = sqrt(R^2 - z^2)
  public get sphereCrossSectionRadius(): number {
    const r3D = this.sphere.radius3D;
    const absZ = Math.abs(this.sphere.z);
    if (absZ >= r3D) return 0;
    return Math.sqrt(r3D * r3D - absZ * absZ);
  }

  public update(dt: number): void {
    if (this.gameState !== 'PLAYING') return;
    this.juice.update(dt);

    // 1. 球体在 Z 轴上下往复穿行（演示高维截面变化规律）
    if (this.phase === 'CROSS_SECTION' || this.phase === 'CABINET_PUZZLE') {
      this.sphere.z += this.sphere.dirZ * this.sphere.speedZ * dt;
      if (this.sphere.z >= this.sphere.maxZ) {
        this.sphere.z = this.sphere.maxZ;
        this.sphere.dirZ = -1;
      } else if (this.sphere.z <= this.sphere.minZ) {
        this.sphere.z = this.sphere.minZ;
        this.sphere.dirZ = 1;
      }
    }

    // 2. 空间国飞升阶段：Z 轴高度平滑攀升至初始高维，支持玩家随时上下微调
    if (this.phase === 'ASCENDED') {
      if (this.isDetaching) {
        this.detachProgress = Math.min(1.0, this.detachProgress + dt * 1.6);
        if (this.detachProgress >= 1.0) {
          this.isDetaching = false;
        }
      }

      if (this.isAutoAscending && this.altitude < 4.8) {
        this.altitude = Math.min(4.8, this.altitude + 2.5 * dt);
      }
    }

    // 3. 更新室外同胞几何走动与心脏节律
    for (const c of this.citizens) {
      c.organPulsePhase += dt * 4.5;
      if (c.axis === 'x') {
        c.x += c.vx * dt;
        if (c.x > c.maxPos) {
          c.x = c.maxPos;
          c.vx = -Math.abs(c.vx);
        } else if (c.x < c.minPos) {
          c.x = c.minPos;
          c.vx = Math.abs(c.vx);
        }
      } else {
        c.y += c.vy * dt;
        if (c.y > c.maxPos) {
          c.y = c.maxPos;
          c.vy = -Math.abs(c.vy);
        } else if (c.y < c.minPos) {
          c.y = c.minPos;
          c.vy = Math.abs(c.vy);
        }
      }
    }
  }

  public movePlayerOmni(moveX: number, moveY: number, dt: number): void {
    if (this.gameState !== 'PLAYING') return;
    const speed = this.isAscended ? 6.5 : 3.8;
    this.player.x += moveX * speed * dt;
    this.player.y += moveY * speed * dt;
    if (!this.isAscended) {
      this.player.x = Math.max(this.studyWalls.minX + 0.6, Math.min(this.studyWalls.maxX - 0.6, this.player.x));
      this.player.y = Math.max(this.studyWalls.minY + 0.6, Math.min(this.studyWalls.maxY - 0.6, this.player.y));
    }
  }

  public movePlayer(forward: number, turn: number, dt: number): void {
    if (this.gameState !== 'PLAYING') return;

    this.player.angle += turn * 2.5 * dt;
    const speed = this.isAscended ? 5.5 : 3.8;
    const dx = Math.cos(this.player.angle) * forward * speed * dt;
    const dy = Math.sin(this.player.angle) * forward * speed * dt;

    const nextX = this.player.x + dx;
    const nextY = this.player.y + dy;

    if (!this.isAscended) {
      // 1. 书房外墙阻隔
      const clampedX = Math.max(this.studyWalls.minX + 0.6, Math.min(this.studyWalls.maxX - 0.6, nextX));
      const clampedY = Math.max(this.studyWalls.minY + 0.6, Math.min(this.studyWalls.maxY - 0.6, nextY));

      // 2. 二维状态下，被中央密闭铁箱四壁死死挡住，无法进入内部
      const cab = this.cabinet;
      const margin = cab.halfSize + 0.45;
      const inCabinetX = clampedX > cab.x - margin && clampedX < cab.x + margin;
      const inCabinetY = clampedY > cab.y - margin && clampedY < cab.y + margin;

      if (!(inCabinetX && inCabinetY)) {
        this.player.x = clampedX;
        this.player.y = clampedY;
      }
    } else {
      // 三维飞升状态：摆脱地面墙体束缚，自由翱翔俯瞰
      this.player.x = nextX;
      this.player.y = nextY;
    }
  }

  // 交互 1：靠近球体并触碰其展开的截面
  public interactWithSphere(): boolean {
    if (this.phase !== 'CROSS_SECTION') return false;

    const dist = Math.hypot(this.player.x - this.sphere.x, this.player.y - this.sphere.y);
    const r = this.sphereCrossSectionRadius;

    // 当球体穿透地平面且截面显著可见时才能触碰
    if (dist < r + 1.4 && r > 0.5) {
      this.phase = 'CABINET_PUZZLE';
      this.soliloquy = '“【球体之声】我不是忽大忽小的巫师！看书房中央反锁密室中的铁箱——它根本没有顶！”';
      this.juice.addTrauma(0.35);
      return true;
    }
    return false;
  }

  // 交互 2：球体演示高维神迹：破除密室死锁取出绝密手稿，并触碰正方形内脏
  public reachIntoCabinet(): boolean {
    if (this.phase !== 'CABINET_PUZZLE') return false;

    const dist = Math.hypot(this.player.x - this.cabinet.x, this.player.y - this.cabinet.y);
    if (dist < 2.5) {
      this.hasRetrievedManuscript = true;
      this.soliloquy = '“【原著第17章 · 破除死锁与触碰内脏】球体直接从上方探入反锁密室铁箱取出手稿！随后其高维形体直接穿透你的表皮触碰了你的肠胃内脏——无法言说的剧痛与震颤从你体内最深处爆发！”';
      this.juice.addTrauma(0.65);
      return true;
    }
    return false;
  }

  // 交互 3：触发脱离纸面，球体强行抓取正方形垂直拔起进入空间国
  public triggerAscend(): boolean {
    if (!this.hasRetrievedManuscript) return false;
    this.phase = 'ASCENDED';
    this.isDetaching = true;
    this.detachProgress = 0;
    this.isAutoAscending = true;
    this.altitude = 0.4;
    this.soliloquy = '“【原著第18章 · 拔离纸面】球体：‘既然言语无法让你开悟，那么就用唯一的办法——出来吧！离开你的平面！’球体将你像贴纸一般从二维纸面生硬拔起，垂直拉升入浩瀚空间国！”';
    this.juice.addTrauma(0.85);
    return true;
  }

  // 完成三维全知启发
  public completeEnlightenment(): void {
    if (this.phase === 'ASCENDED' && this.altitude >= 3.5) {
      this.gameState = 'VICTORY';
    }
  }

  public reset(): void {
    this.gameState = 'PLAYING';
    this.phase = 'CROSS_SECTION';
    this.player = { x: -2.0, y: 0, angle: 0, size: 1.2 };
    this.sphere.x = -1.8;
    this.sphere.y = -1.2;
    this.sphere.z = 0;
    this.sphere.dirZ = 1;
    this.altitude = 0;
    this.isAutoAscending = true;
    this.isDetaching = false;
    this.detachProgress = 0;
    this.hasRetrievedManuscript = false;
    this.soliloquy = '“反锁密闭的书房中，为何凭空出现了一个忽大忽小的圆？”';
    this.juice = new JuiceController();
  }

  // 第一人称视网膜迷雾射线投射（用于下屏展示截面变化与墙体）
  public castRays(rayCount: number = 60): SpacelandFogRayHit[] {
    const fovRad = (60 * Math.PI) / 180;
    const startAngle = this.player.angle - fovRad / 2;
    const step = rayCount > 1 ? fovRad / (rayCount - 1) : 0;
    const maxDist = 18;

    const walls = [
      { x1: this.studyWalls.minX, y1: this.studyWalls.minY, x2: this.studyWalls.maxX, y2: this.studyWalls.minY },
      { x1: this.studyWalls.maxX, y1: this.studyWalls.minY, x2: this.studyWalls.maxX, y2: this.studyWalls.maxY },
      { x1: this.studyWalls.maxX, y1: this.studyWalls.maxY, x2: this.studyWalls.minX, y2: this.studyWalls.maxY },
      { x1: this.studyWalls.minX, y1: this.studyWalls.maxY, x2: this.studyWalls.minX, y2: this.studyWalls.minY },
    ];

    const cab = this.cabinet;
    const hs = cab.halfSize;
    const cabinetWalls = [
      { x1: cab.x - hs, y1: cab.y - hs, x2: cab.x + hs, y2: cab.y - hs },
      { x1: cab.x + hs, y1: cab.y - hs, x2: cab.x + hs, y2: cab.y + hs },
      { x1: cab.x + hs, y1: cab.y + hs, x2: cab.x - hs, y2: cab.y + hs },
      { x1: cab.x - hs, y1: cab.y + hs, x2: cab.x - hs, y2: cab.y - hs },
    ];

    const hits: SpacelandFogRayHit[] = [];
    const sphereR = this.sphereCrossSectionRadius;

    for (let i = 0; i < rayCount; i++) {
      const rayAngle = startAngle + i * step;
      const angleOffset = rayAngle - this.player.angle;
      const dx = Math.cos(rayAngle);
      const dy = Math.sin(rayAngle);

      let closestDist = maxDist;
      let hitType: SpacelandFogRayHit['hitType'] = 'wall';
      let hitColor = '#2a241c';

      // 1. 书房外墙
      for (const w of walls) {
        const t = raySegmentIntersect(this.player.x, this.player.y, dx, dy, w.x1, w.y1, w.x2, w.y2);
        if (t !== null && t < closestDist) {
          closestDist = t;
          hitType = 'wall';
          hitColor = '#2a241c';
        }
      }

      // 2. 中央反锁铁箱
      for (const cw of cabinetWalls) {
        const t = raySegmentIntersect(this.player.x, this.player.y, dx, dy, cw.x1, cw.y1, cw.x2, cw.y2);
        if (t !== null && t < closestDist) {
          closestDist = t;
          hitType = 'cabinet';
          hitColor = '#475569';
        }
      }

      // 3. 球体穿透截面（仅当球体在平面内产生圆时可检测）
      if (sphereR > 0.05) {
        const tSphere = rayCircleIntersect(
          this.player.x,
          this.player.y,
          dx,
          dy,
          this.sphere.x,
          this.sphere.y,
          sphereR
        );
        if (tSphere !== null && tSphere < closestDist) {
          closestDist = tSphere;
          hitType = 'sphere';
          hitColor = 'rgba(234, 179, 8, 0.95)';
        }
      }

      const brightness = Math.max(0, 1 - closestDist / maxDist);
      hits.push({
        angleOffset,
        distance: closestDist,
        brightness,
        hitType,
        color: hitColor,
      });
    }

    return hits;
  }

  public getFogRays(rayCount: number = 60): SpacelandFogRayHit[] {
    return this.castRays(rayCount);
  }
}
