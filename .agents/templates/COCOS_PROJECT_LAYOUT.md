# Cocos Creator 3.x 工业级工程目录规范

本项目遵循纯数据逻辑（Model/Service）与 Cocos 引擎表现层（Component/View）分离架构，并满足微信小游戏 4MB 首包红线与分包加载规范。

## 目录骨架

```text
<GameProjectRoot>/
├── assets/
│   ├── main/                       # 主包（首包加载，严格限制体积，仅放置 Loading、公共字体与核心基础库）
│   │   ├── scenes/
│   │   │   └── Loading.scene       # 极简启动场景
│   │   ├── scripts/
│   │   │   ├── core/               # 纯 TypeScript 核心逻辑（零 Cocos 依赖）
│   │   │   │   ├── event/          # 全局事件总线 EventBus
│   │   │   │   ├── fsm/            # 状态机基类
│   │   │   │   ├── pool/           # 泛型对象池与 IRecyclable
│   │   │   │   └── utils/          # 纯数学与工具算法
│   │   │   ├── platform/           # 跨平台适配抽象层
│   │   │   │   ├── IPlatformAdapter.ts
│   │   │   │   ├── WxAdapter.ts
│   │   │   │   └── WebAdapter.ts
│   │   │   └── ui/                 # 通用基础 UI 组件
│   │   └── textures/common/        # 公共基础图元与通用 Auto Atlas
│   │
│   ├── sub_gameplay/               # 玩法分包 Bundle（Bundle 配置: Is Subpackage = true）
│   │   ├── prefabs/                # 玩法预制体（角色、特效、道具、关卡实体）
│   │   ├── scenes/                 # 游戏主玩法场景
│   │   ├── scripts/                # 玩法逻辑组件
│   │   │   ├── controllers/        # 游戏控制器（连接 Model 与 Component）
│   │   │   ├── components/         # 挂载在 Node 上的渲染/碰撞脚本
│   │   │   └── models/             # 玩法业务数据模型
│   │   └── textures/               # 玩法私有合批图集（Auto Atlas）
│   │
│   ├── sub_meta/                   # 局外养成/商城分包 Bundle
│   │   ├── prefabs/
│   │   ├── scripts/
│   │   └── textures/
│   │
│   └── sub_audio/                  # 音频分包 Bundle（远程分包或本地按需分包）
│       ├── bgm/
│       └── sfx/
│
├── .agents/                        # Antigravity 闭环 Harness 配置与技能
│   ├── skills/                     # 游戏专属技能软链接或本地配置
│   ├── rules/                      # Cocos 研发红线与合批规则
│   └── templates/                  # GDD 与需求契约模板
├── settings/                       # Cocos 项目设置
├── tsconfig.json                   # TypeScript 配置（严格空值检查）
└── README.md                       # 项目说明与交付契约
```

## 关键目录职责与红线约束

1. **`assets/main/` 主包约束**：
   - 严禁放置玩法大图、未压缩音频与全量玩法 Prefab；
   - 微信小游戏平台构建产物中，主包代码与资源体积必须严格控制在 3.5MB 以内（预留 500KB 缓冲空间）。
2. **`assets/sub_*/` 分包隔离**：
   - 分包之间严禁互相循环引用代码与资源；
   - 跨分包通信统一通过 `assets/main/scripts/core/event/` 全局事件中心解耦；
   - 资源加载必须使用 `assetManager.loadBundle('sub_xxx', (err, bundle) => ...)`。
3. **`scripts/core/` 纯逻辑隔离**：
   - 该目录下所有代码禁止 `import { Node, Component, _decorator } from 'cc'`；
   - 方便编写脱离 Cocos 渲染管线的纯 Node.js / Jest 单元测试。
