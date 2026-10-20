export type LinelandState = 'PLAYING' | 'VICTORY' | 'DEFEATED';

export interface LineResident {
  x: number;
  y: number;
  speed: number;
  name: string;
  phrase: string;
  minX?: number;
  maxX?: number;
}

export class LinelandGameController {
  public gameState: LinelandState = 'PLAYING';

  public player = {
    x: 0,
    y: 0,
    angle: 0,
    size: 0.6,
  };

  // 前方：傲慢的直线国国王
  public king: LineResident = {
    x: 2.5,
    y: 0,
    speed: 0.35,
    name: '线之国王',
    phrase: '“向左即向右，前后即宇宙！休得再提什么虚无的侧面！”',
  };

  // 后方：暴躁的平民邻人
  public neighbor: LineResident = {
    x: -2.5,
    y: 0,
    speed: 0.45,
    name: '暴躁平民',
    phrase: '“让开！往前挤！谁敢停下就刺穿谁！”',
  };

  public isDeadlocked: boolean = false;
  public canStepSideways: boolean = false;
  public isSidestepping: boolean = false;
  public sidestepY: number = 0;

  // 终点梦境裂隙
  public exitX: number = 4.5;

  public soliloquy: string = '“你在梦中降落在一维线之国。前后皆被封死，何处容身？”';

  public move(dirX: number, _dirY: number, dt: number): void {
    if (this.gameState !== 'PLAYING') return;

    const speed = 2.2;
    const targetX = this.player.x + dirX * speed * dt;

    if (!this.isSidestepping) {
      // 在直线上，受到国王与邻人的实体碰撞限制（相隔 0.8 距离不可逾越）
      const minBound = this.neighbor.x + 0.7;
      const maxBound = this.king.x - 0.7;

      if (targetX < minBound) {
        this.player.x = minBound;
      } else if (targetX > maxBound) {
        this.player.x = maxBound;
      } else {
        this.player.x = targetX;
      }
    } else {
      // 侧移后脱离一维直线（Y > 0），自由穿透
      this.player.x = Math.max(-5.0, Math.min(6.0, targetX));
    }
  }

  public update(dt: number): void {
    if (this.gameState !== 'PLAYING') return;

    if (!this.isSidestepping) {
      // 逼近逻辑：邻人从左向右挤压，国王缓慢向左逼近
      if (this.neighbor.x < -0.9) {
        this.neighbor.x += this.neighbor.speed * dt;
      }
      if (this.king.x > 0.9) {
        this.king.x -= this.king.speed * dt;
      }

      // 检测死锁判定：当国王与邻人之间的缝隙被压缩至极限
      const corridorWidth = this.king.x - this.neighbor.x;
      if (corridorWidth <= 2.2) {
        this.isDeadlocked = true;
        this.canStepSideways = true;
        this.soliloquy = '“两端死锁！前后无路！快跳脱此线——向侧面挪动一步！”';
      }

      // 夹伤/被刺死检测
      if (this.player.x <= this.neighbor.x + 0.1 || this.player.x >= this.king.x - 0.1) {
        // 如果未侧移且被压碎
        if (corridorWidth < 1.0) {
          this.gameState = 'DEFEATED';
          this.soliloquy = '“你在前后两端的极锐尖端间被挤压解体……”';
        }
      }
    } else {
      // 侧移状态：Y 坐标稳定在侧向维度
      this.soliloquy = '“不可思议！你从直线上消失了！国王惊骇地四处张望！”';
      // 检查通关裂隙
      if (this.player.x >= this.exitX) {
        this.gameState = 'VICTORY';
        this.soliloquy = '“你跨越了一维梦境，高维的召唤在你耳边回响……”';
      }
    }
  }

  public stepSideways(): boolean {
    if (!this.canStepSideways && !this.isDeadlocked) return false;
    this.isSidestepping = true;
    this.sidestepY = 1.35;
    this.player.y = this.sidestepY;
    return true;
  }

  public forceDeadlock(): void {
    this.neighbor.x = -0.9;
    this.king.x = 0.9;
    this.isDeadlocked = true;
    this.canStepSideways = true;
    this.soliloquy = '“两端死锁！前后无路！快跳脱此线——向侧面挪动一步！”';
  }

  public reset(): void {
    this.gameState = 'PLAYING';
    this.player = { x: 0, y: 0, angle: 0, size: 0.6 };
    this.king.x = 2.5;
    this.neighbor.x = -2.5;
    this.isDeadlocked = false;
    this.canStepSideways = false;
    this.isSidestepping = false;
    this.sidestepY = 0;
    this.soliloquy = '“你在梦中降落在一维线之国。前后皆被封死，何处容身？”';
  }
}
