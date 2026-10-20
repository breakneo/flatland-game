import { describe, it, expect, beforeEach } from 'vitest';
import { PurgeGameController } from '../../assets/sub_gameplay/scripts/controllers/PurgeGameController';

describe('PurgeGameController (第二幕·议会大清洗纯逻辑)', () => {
  let controller: PurgeGameController;

  beforeEach(() => {
    controller = new PurgeGameController();
  });

  it('初始状态处于议会街区，配置针形刺客与圆形大祭司', () => {
    expect(controller.player.x).toBeLessThan(-3.0);
    expect(controller.needleAssassins.length).toBeGreaterThanOrEqual(2);
    expect(controller.circlePriest).toBeDefined();
    expect(controller.gameState).toBe('PLAYING');
    expect(controller.isAscended).toBe(false);
  });

  it('被针形刺客高速刺中直接判定失败解体', () => {
    // 强制将玩家瞬移到针形刺客位置
    const assassin = controller.needleAssassins[0];
    controller.player.x = assassin.x;
    controller.player.y = assassin.y;
    controller.update(0.016);

    expect(controller.gameState).toBe('DEFEATED');
    expect(controller.defeatManuscript).toContain('针形');
  });

  it('收集球体接引符印后充能升维，越过街区阻隔抵达法阵通关', () => {
    // 收集所有符印
    for (const token of controller.tokens) {
      token.collected = true;
    }
    controller.energy = 100;

    // 触发升维
    const success = controller.requestAscension();
    expect(success).toBe(true);
    expect(controller.isAscended).toBe(true);

    // 飞越至高维引渡法阵
    controller.player.x = controller.voidPortal.x;
    controller.player.y = controller.voidPortal.y;
    controller.update(0.016);

    expect(controller.gameState).toBe('VICTORY');
    expect(controller.victoryManuscript).toContain('虚空');
  });

  it('支持第一人称迷雾光线投射 (castRays/getFogRays)，可检测到祭司圣光与刺客细针', () => {
    // 玩家朝向 (0, 0) 处的圆形祭司
    controller.player.x = -3.0;
    controller.player.y = 0.0;
    controller.player.angle = 0; // 正东正对祭司

    const rays = controller.castRays(60);
    expect(rays.length).toBe(60);

    // 中心光线应该打在圆形祭司上
    const centerRay = rays[30];
    expect(centerRay.hitType).toBe('priest');
    expect(centerRay.distance).toBeCloseTo(3.0 - controller.circlePriest.radius, 1);

    // 检查别名
    const aliasRays = controller.getFogRays(30);
    expect(aliasRays.length).toBe(30);
  });
});
