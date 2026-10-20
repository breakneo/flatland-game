import { describe, it, expect, beforeEach } from 'vitest';
import { LevelCoordinator, GameLevelId } from '../../assets/sub_gameplay/scripts/controllers/LevelCoordinator';

describe('LevelCoordinator (全局关卡流转与手稿状态机)', () => {
  let coordinator: LevelCoordinator;

  beforeEach(() => {
    coordinator = new LevelCoordinator();
  });

  it('初始默认为序幕·直线国之梦', () => {
    expect(coordinator.currentLevelId).toBe(GameLevelId.LINELAND_PROLOGUE);
    expect(coordinator.currentLevelConfig.title).toContain('序幕');
    expect(coordinator.lineland).toBeDefined();
    expect(coordinator.escape).toBeDefined();
  });

  it('序幕通关后进入手稿结算，确认后无缝载入第一幕·石牢脱逃', () => {
    // 强制序幕胜利
    coordinator.lineland.forceDeadlock();
    coordinator.lineland.stepSideways();
    coordinator.lineland.player.x = 5.0;
    coordinator.update(0.016);

    expect(coordinator.isLevelCompleted).toBe(true);
    expect(coordinator.completionManuscript.title).toContain('直线国梦呓');

    // 确认进入下一关
    coordinator.advanceToNextLevel();
    expect(coordinator.currentLevelId).toBe(GameLevelId.FLATLAND_ESCAPE);
    expect(coordinator.currentLevelConfig.title).toContain('第一幕');
    expect(coordinator.isLevelCompleted).toBe(false);
  });

  it('支持自由切换关卡与重置', () => {
    coordinator.switchLevel(GameLevelId.FLATLAND_ESCAPE);
    expect(coordinator.currentLevelId).toBe(GameLevelId.FLATLAND_ESCAPE);

    coordinator.resetCurrentLevel();
    expect(coordinator.escape.gameState).toBe('PLAYING');
  });
});
