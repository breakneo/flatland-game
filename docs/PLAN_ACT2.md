# 原子计划：第二幕·议会大清洗实施路线 (PLAN_ACT2)

## 微任务清单 (2~5分钟微任务链)

- [ ] **任务 1：纯逻辑控制器与红绿灯单测**
  - 测试文件：`tests/core/purge-controller.test.ts`
  - 核心实现：`assets/sub_gameplay/scripts/controllers/PurgeGameController.ts`
  - 核心逻辑：多边形街道走廊、针形刺客快速横向巡弋、圆形祭司光环阻挡、三维引渡法阵判定。

- [ ] **任务 2：扩展 LevelCoordinator 关卡流转**
  - 关联文件：`assets/sub_gameplay/scripts/controllers/LevelCoordinator.ts`
  - 核心逻辑：新增 `SPACELAND_PURGE = 2`，写入第二幕开场背景手稿与通关叙事，串联 Act 0 -> Act 1 -> Act 2。

- [ ] **任务 3：第二幕专属双视窗渲染与针形/圆形图形学**
  - 关联文件：`src/main.ts`
  - 上屏：议会街区多边形铜版画地砖、圆形大祭司金色同心光圈、针形刺客银红锐线、高维传送紫金法阵；
  - 下屏：第一人称雾中捕捉针形微粒闪烁与圆形大圆弧光感。

- [ ] **任务 4：全流程门禁与多关卡无头 CDP 深度验证**
  - 运行 `pnpm run typecheck && pnpm test && pnpm run build`
  - 执行 Headless Chrome 自动化体检，覆盖全三幕切换与实机落图。
