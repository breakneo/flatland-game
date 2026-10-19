# Antigravity 游戏工程闭环法典 (flatland-game)

本项目是由 **Game-Studio 母库**派生的独立游戏工程，严格遵循 Cocos Creator 3.x 工业级最佳实践与 Antigravity 四阶段闭环 Harness 纪律。

## 母库关联与权威参考
- **Game-Studio 母库路径**：`/Users/neo/Anti/Game-Studio`
- **Cocos 官方最佳实践**：查看母库 `docs/cocos-creator-3.x/` 目录
- **反哺母库经验**：运行 `python3 /Users/neo/Anti/Game-Studio/.agents/scripts/sync_back_to_studio.py`

---

## 游戏专项工程红线 (Cocos Creator 3.x)

1. **纯逻辑解耦**：`assets/main/scripts/core/` 目录严禁导入 Cocos API (`import { Node, Component } from 'cc'`)；
2. **生命周期安全**：禁止在组件生命周期之外持有已销毁节点；异步回调前必须自检 `this.isValid`；
3. **事件与定时器闭环**：`onEnable` 绑定的事件/定时器必须在 `onDisable` 成对注销；
4. **DrawCall 门禁**：UI 界面 DrawCall <= 25，核心战斗 DrawCall <= 50；必须启用 Auto Atlas 合批；
5. **GC 与对象池**：发射物、飘字、特效必须 100% 使用 `NodePoolManager` 复用，严禁在 `update` 中频繁 `instantiate`；
6. **分包与包体**：严格隔离主包与玩法分包，主包控制在 3.5MB 以内。

---

## 四阶段闭环工程纪律

1. **阶段一：需求与核心循环对齐 (GAME_SPEC.md)**：
   - 必须先锁定明天就能交付的最狭窄可玩闭环 (Narrowest Playable Slice)；
   - 明确显式非目标与性能红线指标。
2. **阶段二：原子计划拆解**：
   - 优先复用已有基础库 (`EventBus`, `NodePoolManager`, `BaseFSM`)；
   - 切分为 2~5 分钟微任务。
3. **阶段三：闭环编码与红绿灯 TDD**：
   - 先写核心算法与状态机的单测或最小验证；
   - 严禁在未查明根因前盲目修补业务代码。
4. **阶段四：闭环验证与直觉沉淀**：
   - 验证浏览器/模拟器运行无报错、DrawCall 达标；
   - 踩坑经验记录至 `.agents/INSTINCTS.md` 并反哺母库。
