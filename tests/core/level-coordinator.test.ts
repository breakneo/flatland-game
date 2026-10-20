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
    coordinator.lineland.player.x = 8.5;
    coordinator.update(0.016);

    expect(coordinator.isLevelCompleted).toBe(true);
    expect(coordinator.completionManuscript.title).toContain('直线国梦呓');

    // 确认进入下一关
    coordinator.advanceToNextLevel();
    expect(coordinator.currentLevelId).toBe(GameLevelId.FLATLAND_ESCAPE);
    expect(coordinator.currentLevelConfig.title).toContain('第一幕');
    expect(coordinator.isLevelCompleted).toBe(false);
  });

  it('支持全三幕完整流转：序幕 -> 第一幕 -> 第二幕', () => {
    // 1. 序幕通关 -> 第一幕
    coordinator.advanceToNextLevel();
    expect(coordinator.currentLevelId).toBe(GameLevelId.FLATLAND_ESCAPE);

    // 2. 第一幕通关 -> 第二幕
    coordinator.isLevelCompleted = true;
    coordinator.advanceToNextLevel();
    expect(coordinator.currentLevelId).toBe(GameLevelId.SPACELAND_PURGE);
    expect(coordinator.currentLevelConfig.title).toContain('第二幕');
    expect(coordinator.introManuscript.title).toContain('第二幕');
    expect(coordinator.introManuscript.body).toContain('议会');
  });
});
