export type LinelandState = 'PLAYING' | 'VICTORY' | 'DEFEATED';

export class LinelandGameController {
  public gameState: LinelandState = 'PLAYING';

  // 原著设定：主角在直线国是一条长 1.0 的学者线段
  public player = {
    x: 0,
    y: 0,
    length: 1.0,
  };

  // 暴躁邻人：原著中的平民质点（单一位置）
  public neighbor = {
    type: 'POINT' as const,
    x: -5.5,
    y: 0,
    speed: 0.22,
    name: '暴躁邻人',
    phrase: '“让开！谁敢后退就刺穿谁！”',
  };

  // 线之国王：原著中尊贵漫长的皇室长线段
  public king = {
    type: 'LINE_SEGMENT' as const,
    startX: 4.2,
    endX: 6.8,
    length: 2.6,
    y: 0,
    speed: 0.15,
    name: '线之国王',
    phrase: '“向左即向右，前后即宇宙！休得再提什么虚无的侧面！”',
  };

  // 探索状态记录：只有前后都移动过，方能觉醒侧向维度
  public hasMovedForward: boolean = false;
  public hasMovedBackward: boolean = false;
  public canStepSideways: boolean = false;
  public isSidestepping: boolean = false;

  // 终点梦境裂隙
  public exitX: number = 8.0;

  public soliloquy: string = '“你在梦中降落在一维线之国。试探直线的两端吧（W 前进，S 后退）。”';

  public moveAxis(dir: number, dt: number): void {
    if (this.gameState !== 'PLAYING') return;

    if (dir > 0) this.hasMovedForward = true;
    if (dir < 0) this.hasMovedBackward = true;

    // 前后都试探过之后解锁侧移
    if (this.hasMovedForward && this.hasMovedBackward) {
      if (!this.canStepSideways) {
        this.canStepSideways = true;
        this.soliloquy = '“【维度顿悟】你已探明两端绝路！试着按 A 或 D 迈向侧面！”';
      }
    }

    const speed = 2.6;
    const targetX = this.player.x + dir * speed * dt;
    const halfLen = this.player.length / 2;

    if (!this.isSidestepping) {
      // 在直线上，受邻人质点与国王长线段前端的严格阻挡
      const minX = this.neighbor.x + halfLen;
      const maxX = this.king.startX - halfLen;

      if (targetX < minX) {
        this.player.x = minX;
      } else if (targetX > maxX) {
        this.player.x = maxX;
      } else {
        this.player.x = targetX;
      }
    } else {
      // 脱离直线后，无视国王阻挡，自由通向梦境裂隙
      this.player.x = Math.max(-7.0, Math.min(9.5, targetX));
    }
  }

  public moveLateral(dir: number, dt: number): void {
    if (this.gameState !== 'PLAYING') return;
    if (!this.canStepSideways) return;

    const latSpeed = 2.2;
    this.player.y += dir * latSpeed * dt;

    if (Math.abs(this.player.y) > 0.5) {
      this.isSidestepping = true;
      this.soliloquy = '“【不可思议！】你从直线上消失了！国王惊骇地四处呼喊！”';
    } else {
      this.isSidestepping = false;
    }
  }

  // 向后兼容接口
  public move(dirX: number, _dirY: number, dt: number): void {
    this.moveAxis(dirX, dt);
  }

  public stepSideways(): boolean {
    if (!this.canStepSideways) return false;
    this.player.y = 1.35;
    this.isSidestepping = true;
    this.soliloquy = '“【突破一维】你在不可思议的‘侧向’踏出一步，在直线上凭空消失！”';
    return true;
  }

  public forceDeadlock(): void {
    this.hasMovedForward = true;
    this.hasMovedBackward = true;
    this.canStepSideways = true;
    this.soliloquy = '“【两端绝路！】快尝试按 A 或 D 向线段两侧跳脱！”';
  }

  public update(dt: number): void {
    if (this.gameState !== 'PLAYING') return;

    if (!this.isSidestepping) {
      // 邻人质点向内缓慢巡视逼近，国王线段缓缓巡视
      if (this.neighbor.x < -3.2) {
        this.neighbor.x += this.neighbor.speed * dt;
      }
      if (this.king.startX > 3.2) {
        this.king.startX -= this.king.speed * dt;
        this.king.endX = this.king.startX + this.king.length;
      }

      // 实时更新台词提示
      if (!this.canStepSideways) {
        if (!this.hasMovedForward) {
          this.soliloquy = '“按 W 向前进发，看看直线的尽头有什么。”';
        } else if (!this.hasMovedBackward) {
          this.soliloquy = '“前方是不可逾越的国王！按 S 后退探寻生路。”';
        }
      }
    } else {
      // 检查是否越过国王抵达梦境裂隙
      if (this.player.x >= this.exitX) {
        this.gameState = 'VICTORY';
        this.soliloquy = '“你跨越了一维梦境，高维的召唤在你耳边回响……”';
      }
    }
  }

  public reset(): void {
    this.gameState = 'PLAYING';
    this.player = { x: 0, y: 0, length: 1.0 };
    this.neighbor.x = -5.5;
    this.king.startX = 4.2;
    this.king.endX = 4.2 + 2.6;
    this.hasMovedForward = false;
    this.hasMovedBackward = false;
    this.canStepSideways = false;
    this.isSidestepping = false;
    this.soliloquy = '“你在梦中降落在一维线之国。试探直线的两端吧（W 前进，S 后退）。”';
  }
}
