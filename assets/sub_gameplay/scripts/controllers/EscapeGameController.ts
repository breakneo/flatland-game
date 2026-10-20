import { Point2D, IsoscelesTriangle } from '../../../../assets/main/scripts/core/geometry/IsoscelesCollider';
import { computeFogVisionRays, FogRayHit, WallSegment } from '../../../../assets/main/scripts/core/geometry/FogRaycast';
import { AscensionFSM, AscensionState } from '../../../../assets/main/scripts/core/fsm/AscensionFSM';
import { PatrolAgent } from '../../../../assets/main/scripts/core/ai/PatrolAgent';
import { JuiceController } from '../../../../assets/main/scripts/core/juice/JuiceController';

export type GameState = 'PLAYING' | 'VICTORY' | 'DEFEATED';

export class EscapeGameController {
  public gameState: GameState = 'PLAYING';
  public player: { x: number; y: number; angle: number; size: number } = {
    x: -3.8,
    y: 0,
    angle: 0,
    size: 1.2,
  };

  public walls: WallSegment[] = [
    { x1: 5.2, y1: -5.2, x2: 5.2, y2: 5.2, color: '#1a1611' },
    { x1: 5.2, y1: 5.2, x2: -5.2, y2: 5.2, color: '#1a1611' },
    { x1: -5.2, y1: 5.2, x2: -5.2, y2: -5.2, color: '#1a1611' },
    { x1: -5.2, y1: -5.2, x2: 5.2, y2: -5.2, color: '#1a1611' },
  ];

  public exit: Point2D = { x: 7.8, y: 0 };
  public patrols: PatrolAgent[] = [];
  public ascensionFSM: AscensionFSM;
  public juice: JuiceController;
  private nearMissCooldown: number = 0;

  public victoryManuscript: string = `
【手稿·第一卷·密室的虚妄】
“在平面国中，所有封闭皆为幻象。
四面石墙将我锁在平面，但我终于听见了球体导师的神谕：
‘向上，而不是向北！’
当我拔地而起俯瞰密室，那些执拗的等腰暴徒，
不过是虚空中微不足道的倒影。”
`;

  public defeatManuscript: string = `
【手稿·残页·断角之痛】
“等腰阶级的尖锐顶角刺穿了我的外壁。
在这个没有高度的深渊里，
一毫米的迟疑，便是终生的碎灭。”
`;

  constructor() {
    this.ascensionFSM = new AscensionFSM();
    this.juice = new JuiceController();

    // 3 Isosceles patrol soldiers within [-5.2, 5.2] closed perimeter away from spawn (-3.8, 0)
    this.patrols = [
      // South corridor guard
      new PatrolAgent([
        { x: -0.8, y: -2.5 },
        { x: 2.6, y: -2.5 },
      ], 1.6),
      // North corridor guard
      new PatrolAgent([
        { x: 2.6, y: 2.5 },
        { x: -0.8, y: 2.5 },
      ], 1.6),
      // East gate sentry
      new PatrolAgent([
        { x: 3.8, y: -1.8 },
        { x: 3.8, y: 1.8 },
      ], 1.4),
    ];
  }

  public get isAscended(): boolean {
    return this.ascensionFSM.currentState === AscensionState.ASCENDING_3D;
  }

  public get currentZ(): number {
    return this.ascensionFSM.currentZ;
  }

  public get energy(): number {
    return this.ascensionFSM.energy;
  }

  public addEnergy(amount: number): void {
    this.ascensionFSM.chargeEnergy(amount);
  }

  public requestAscension(): boolean {
    const success = this.ascensionFSM.triggerAscend(7.0); // 延长至 7.0 秒滞空时间，从容翻墙
    if (success) {
      // 升维轻微顿挫震动
      this.juice.addTrauma(0.35);
      this.juice.triggerHitStop(80);
    }
    return success;
  }

  public teleportNearExit(): void {
    this.player.x = 7.5;
    this.player.y = 0;
  }

  public reset(): void {
    this.gameState = 'PLAYING';
    this.player = { x: -3.8, y: 0, angle: 0, size: 1.2 };
    this.ascensionFSM = new AscensionFSM();
    this.juice = new JuiceController();
    this.nearMissCooldown = 0;
    for (const patrol of this.patrols) {
      patrol.reset();
    }
  }

  public movePlayer(forward: number, turn: number, dt: number): void {
    if (this.gameState !== 'PLAYING') return;

    this.player.angle += turn * 2.5 * dt;

    // 升维后在三维空间中翱翔，移动速度提升至 6.0，二维平面为 4.0
    const moveSpeed = this.isAscended ? 6.0 : 4.0;
    const dx = Math.cos(this.player.angle) * forward * moveSpeed * dt;
    const dy = Math.sin(this.player.angle) * forward * moveSpeed * dt;

    const nextX = this.player.x + dx;
    const nextY = this.player.y + dy;

    // In 2D mode, blocked by outer stone room boundaries [-4.8, 4.8] (完全封闭石墙，绝无漏洞)
    if (!this.isAscended) {
      if (Math.abs(nextX) < 4.8) this.player.x = nextX;
      if (Math.abs(nextY) < 4.8) this.player.y = nextY;
    } else {
      // Ascended: freedom of flight over walls
      this.player.x = nextX;
      this.player.y = nextY;
    }
  }

  public update(dt: number): { isNearMiss: boolean; isFrozen: boolean } {
    const juiceState = this.juice.update(dt);

    if (this.gameState !== 'PLAYING') {
      return { isNearMiss: false, isFrozen: false };
    }

    this.ascensionFSM.update(dt);

    // 自然冥想蓄力：若已落回二维且能量不足，每秒缓慢蓄力 3 点心智，杜绝卡关死局
    if (!this.isAscended && this.ascensionFSM.energy < 100) {
      this.ascensionFSM.chargeEnergy(3.5 * dt);
    }

    let hasNearMiss = false;
    const playerPt: Point2D = { x: this.player.x, y: this.player.y };

    if (!juiceState.isFrozen) {
      // Update patrol agents and test collisions only when not frozen
      for (const patrol of this.patrols) {
        const res = patrol.update(dt, playerPt, this.isAscended, this.player.angle);
        if (res.isColliding) {
          this.gameState = 'DEFEATED';
          this.juice.addTrauma(0.7);
          this.juice.triggerHitStop(150);
          return { isNearMiss: false, isFrozen: false };
        }
        if (res.isNearMiss) {
          hasNearMiss = true;
        }
      }
    }

    if (this.nearMissCooldown > 0) {
      this.nearMissCooldown -= dt;
    }

    // 险避心跳震动防抖：加入 0.5s 冷却，且仅产生轻微脉冲（0.06），拒绝晃动晕眩
    if (hasNearMiss && this.nearMissCooldown <= 0) {
      this.juice.addTrauma(0.06);
      this.nearMissCooldown = 0.5;
    }

    // Check exit reach condition
    const distToExit = Math.hypot(this.player.x - this.exit.x, this.player.y - this.exit.y);
    if (distToExit < 1.4) {
      this.gameState = 'VICTORY';
    }

    return { isNearMiss: hasNearMiss, isFrozen: juiceState.isFrozen };
  }

  public getFogRays(rayCount: number = 70): FogRayHit[] {
    const triangles = this.patrols.map(p => p.currentTriangle);
    return computeFogVisionRays(
      { x: this.player.x, y: this.player.y },
      this.player.angle,
      this.walls,
      triangles,
      60,
      rayCount,
      18
    );
  }
}
