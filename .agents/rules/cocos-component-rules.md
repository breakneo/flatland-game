# Cocos Creator 组件化编码规则与防御门禁

所有涉及 Cocos 游戏项目的代码编写必须严格遵守以下规则：

1. **强类型与装饰器规范**：
   - 严禁滥用 `any`，复杂配置与网络包体必须声明 `interface` 或 `type`；
   - 需序列化的编辑器属性显式添加 `@property(...)`，内部状态必须显式使用 `private` / `protected` 修饰。
2. **节点寻址禁令**：
   - 严禁在代码中出现长路径 `find('...')` 寻址；高频访问节点必须在编辑器中序列化引用，或由上层管理类注入。
3. **事件成对注销铁律**：
   - 凡在 `onLoad` 或 `onEnable` 中通过 `eventCenter.on(...)` 或 `node.on(...)` 注册的监听，**必须在 `onDestroy` 或 `onDisable` 中显式反注册**。
4. **异步生命周期安全检查**：
   - 所有网络回调、资源加载与 Tween 结束回调，进入业务代码的第一行必须校验 `if (!this.isValid || !this.node?.isValid) return;`。
5. **对象复用与 GC 防御**：
   - 子弹、掉落物、怪物、飘字等高频生成元素，严禁在运行时频繁 `instantiate` / `destroy`，必须统一走 `NodePool`。
