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

  it('提供忠实于原著的关卡开场背景手稿与通关叙事结算', () => {
    // 序幕背景交代：正方形绅士在梦中降维为截面线段
    const prologueIntro = coordinator.introManuscript;
    expect(prologueIntro.title).toContain('序幕');
    expect(prologueIntro.body).toContain('正方形');
    expect(prologueIntro.body).toContain('截面');
    expect(prologueIntro.btnText).toContain('入梦');

    // 切换至第一幕，提供石牢身陷囹圄的背景交代
    coordinator.switchLevel(GameLevelId.FLATLAND_ESCAPE);
    const flatlandIntro = coordinator.introManuscript;
    expect(flatlandIntro.title).toContain('第一幕');
    expect(flatlandIntro.body).toContain('四等边');
    expect(flatlandIntro.body).toContain('等腰三角形');
    expect(flatlandIntro.btnText).toContain('脱逃');
  });
});
