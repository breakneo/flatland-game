import { Point2D, IsoscelesTriangle } from '../../../../assets/main/scripts/core/geometry/IsoscelesCollider';
import { computeFogVisionRays, FogRayHit, WallSegment } from '../../../../assets/main/scripts/core/geometry/FogRaycast';
import { AscensionFSM, AscensionState } from '../../../../assets/main/scripts/core/fsm/AscensionFSM';
import { PatrolAgent } from '../../../../assets/main/scripts/core/ai/PatrolAgent';
import { JuiceController } from '../../../../assets/main/scripts/core/juice/JuiceController';

export type GameState = 'PLAYING' | 'VICTORY' | 'DEFEATED';

export class EscapeGameController {
  public gameState: GameState = 'PLAYING';
  public player: { x: number; y: number; angle: number; size: number } = {
    x: -4.8,
    y: 0,
    angle: 0,
    size: 1.0,
  };

  public walls: WallSegment[] = [
    { x1: 7, y1: -7, x2: 7, y2: 7, color: '#1a1611' },
    { x1: 7, y1: 7, x2: -7, y2: 7, color: '#1a1611' },
    { x1: -7, y1: 7, x2: -7, y2: -7, color: '#1a1611' },
    { x1: -7, y1: -7, x2: 7, y2: -7, color: '#1a1611' },
  ];

  public exit: Point2D = { x: 10, y: 0 };
  public patrols: PatrolAgent[] = [];
  public ascensionFSM: AscensionFSM;
  public juice: JuiceController;

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

    // 3 Isosceles patrol soldiers with clear corridor routines away from spawn zone (-4.8, 0)
    this.patrols = [
      // South corridor guard
      new PatrolAgent([
        { x: -1.5, y: -3.5 },
        { x: 3.5, y: -3.5 },
      ], 1.6),
      // North corridor guard
      new PatrolAgent([
        { x: 3.5, y: 3.5 },
        { x: -1.5, y: 3.5 },
      ], 1.6),
      // East gate sentry
      new PatrolAgent([
        { x: 4.8, y: -2.5 },
        { x: 4.8, y: 2.5 },
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
    const success = this.ascensionFSM.triggerAscend(3.5);
    if (success) {
      // Trigger dramatic screen shake and hit stop
      this.juice.addTrauma(0.9);
      this.juice.triggerHitStop(80);
    }
    return success;
  }

  public teleportNearExit(): void {
    this.player.x = 9.5;
    this.player.y = 0;
  }

  public reset(): void {
    this.gameState = 'PLAYING';
    this.player = { x: -4.8, y: 0, angle: 0, size: 1.0 };
    this.ascensionFSM = new AscensionFSM();
    this.juice = new JuiceController();
    for (const patrol of this.patrols) {
      patrol.reset();
    }
  }

  public movePlayer(forward: number, turn: number, dt: number): void {
    if (this.gameState !== 'PLAYING') return;

    this.player.angle += turn * 2.5 * dt;

    const moveSpeed = 4.0;
    const dx = Math.cos(this.player.angle) * forward * moveSpeed * dt;
    const dy = Math.sin(this.player.angle) * forward * moveSpeed * dt;

    const nextX = this.player.x + dx;
    const nextY = this.player.y + dy;

    // In 2D mode, blocked by outer stone room boundaries [-6.5, 6.5]
    if (!this.isAscended) {
      if (Math.abs(nextX) < 6.4) this.player.x = nextX;
      if (Math.abs(nextY) < 6.4) this.player.y = nextY;
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

    let hasNearMiss = false;
    const playerPt: Point2D = { x: this.player.x, y: this.player.y };

    if (!juiceState.isFrozen) {
      // Update patrol agents and test collisions only when not frozen
      for (const patrol of this.patrols) {
        const res = patrol.update(dt, playerPt, this.isAscended, this.player.angle);
        if (res.isColliding) {
          this.gameState = 'DEFEATED';
          this.juice.addTrauma(1.0);
          this.juice.triggerHitStop(150);
          return { isNearMiss: false, isFrozen: false };
        }
        if (res.isNearMiss) {
          hasNearMiss = true;
        }
      }
    }

    if (hasNearMiss) {
      this.juice.addTrauma(0.15);
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
