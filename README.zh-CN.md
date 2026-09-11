# paseo-usage-sidebar

[English](./README.md) · **简体中文**

一个把服务商套餐用量搬进侧边栏的 [Paseo](https://paseo.sh) 插件——既是一个可以打开的面板，也是侧边栏
条目下方一个常驻的迷你仪表。

Paseo 本来就知道你的套餐还剩多少，只是把它藏在设置页里，以及输入框上下文仪表的悬停提示里。这个插件把
同一份数据放到你真正看得见的地方。

不需要新增凭据，不依赖厂商 CLI，也不会另起一条轮询链路：数字来自 Paseo 自己的 `provider.usage.list`
数据，因此永远和 **设置 → Usage** 显示的一致。

---

## 目录

- [安装](#安装)
- [功能](#功能)
  - [用量面板](#用量面板)
  - [侧边栏迷你仪表](#侧边栏迷你仪表)
  - [固定与排序](#固定与排序)
  - [多语言](#多语言)
- [配置项](#配置项)
- [用量数据从哪来](#用量数据从哪来)
- [安全性](#安全性)
- [已知限制](#已知限制)
- [目录结构](#目录结构)
- [开发](#开发)
- [许可证](#许可证)

---

## 安装

需要 **Paseo 0.8.0 或更高版本**。

```bash
paseo plugin add RUIIIOVO/paseo-usage-sidebar
```

如果还没启用过插件，先在 **Settings → Plugins → Enable plugins** 里打开。然后在侧边栏选择 **Usage**，
或在命令中心（`Ctrl`/`Cmd` + `K`）运行 **Open plan usage**。

后续更新：

```bash
paseo plugin update usage-sidebar
```

> 版本下限以 `requirements.paseo: ">=0.8.0"` 声明在
> `paseo-plugin.json` 中。

---

## 功能

### 用量面板

界面复刻了 **设置 → Usage** 的排版：一张带边框的卡片，每个服务商一行，行间用细分隔线隔开。

| 行类型 | 显示内容 |
| --- | --- |
| **配额窗口** | 会话、周、以及按模型划分的窗口，形如 `57% · resets in 2h 15m`；当重置时间在一天以上时显示为 `57% · resets at Nov 12, 10:00`，并配一条从零起算的进度条。 |
| **余额** | 金额、积分、请求数或 token，若存在上限则一并显示。 |
| **详情** | 服务商提供的键值行，例如 `Extra usage: Disabled`。 |
| **状态** | 未登录的服务商不会消失，而是保留在列表里并标记 `Unavailable`，与设置页保持一致。 |

窗口名称采用 Claude Code `/usage` 的措辞（`5-hour session`、`This week`、`This week (Fable)`），而不是
守护进程那种只写 `Session` / `Weekly`、完全看不出覆盖周期的写法。

间距、字号层级、色调阈值，以及 reset / `runs out` 的文案，都取自 Paseo 自己的用量组件，因此面板读起来
与设置页别无二致。唯一的差别是服务商品牌图标：它们来自宿主内部的图标注册表，插件无法引用，所以每行以
服务商名称开头。

面板每 60 秒自动刷新一次，也可以点 **Refresh** 手动刷新。

### 侧边栏迷你仪表

*仅限桌面端与 Web 端。*

在侧边栏条目下方，插件会渲染一个常驻的紧凑仪表：每个被固定的配额窗口占一行——名称、百分比、一条细进度条，
以及该窗口距离重置的倒计时。它与面板同为 60 秒刷新周期，且无需任何点击。

**重置时间才是这一行的重点。** 单独一个百分比没法据以行动——用掉 90%，如果一小时后就重置那没事，如果还有
三天才重置那就是问题——所以每行下方都带着它；当守护进程预测该窗口会在重置前耗尽时，这里会用警示色显示
`runs out in 40m`。

行内优先显示哪种形式，同样参照 Claude Code 的 `/usage`：会话进度条上写 `Resets 3pm`，周进度条上写
`Resets Nov 12, 3pm`。

| 重置时间 | 行内显示 | 悬停显示 |
| --- | --- | --- |
| 不足一天 | `resets in 3h 25m` | `resets at 1:35 PM` |
| 一天及以上 | `resets at Nov 12, 10:00` | `resets in 1d 2h` |

一天以内，"我还有多少时间"才是可行动的数字；超过一天，光写一个 `1d` 太粗、无法据此安排，而一个具体日期可以。
何况无论哪种情况，另一种形式都只差一次悬停。

<details>
<summary><strong>为什么说这是一条非官方的绕行方案</strong>（依赖它之前请先读）</summary>

Paseo 没有"侧边栏挂件"这种扩展点。一个侧边栏条目就是 `{ id, title, icon, surface }`，行本身由宿主渲染，
所以仪表是插在那一行旁边的一个普通 DOM 节点——这之所以可行，仅仅是因为桌面端和 Web 端会在同一个渲染进程里
执行插件的客户端 bundle。由此带来的后果：

- **仅限桌面端与 Web 端。** iOS 和 Android 上没有 DOM，仪表根本不会挂载。
- **锚定在宿主的 testID 上**（`plugin-sidebar-usage-sidebar-usage`，由插件自身 id 推导）。如果未来某个
  Paseo 版本改了这个名字，仪表就不再出现。除此之外不会有别的影响。
- **按"失败即静默"设计。** 每一步——查找锚点、探测颜色、RPC——失败时都退化为不渲染，而不是抛错。
- **颜色是量出来的，不是猜的。** 主题色只能通过 surface 的 props 传给插件，而这个仪表是 React 之外的 DOM
  节点，所以它通过"实际画出来的颜色"来判断当前主题：把侧边栏背景色与 Paseo 的七个内置主题（Light、Dark、
  Zinc、Midnight、Claude、Ghostty、Pure black）比对——每个主题画出的背景色都不同——然后使用该主题自己的
  轨道色与次要前景色 token。遇到无法识别的主题（比如插件贡献的主题）则回退到该行实际渲染的文字颜色，并按
  亮度在明/暗两套状态配色中选一套。颜色每两秒重新探测一次，所以切换主题无需重载即可生效。探测时会跳过与行
  等高的已上色祖先节点：用量面板打开时，Paseo 会给自己的侧边栏行画一层选中态底色，误读这层底色会把 Light
  主题识别成暗色，导致仪表变成暗底暗字。
- **绝不抢走点击。** 该节点设置了 `pointer-events:none`。

要关闭仪表，删掉 `index.client.tsx` 里的 `startSidebarMeter(client)` 一行。目前还没有做成设置开关。

</details>

### 固定与排序

面板中每个配额窗口都带一个 **+ / −** 按钮，用于把它固定到侧边栏仪表，或从中移除。已固定的行会出现在面板
顶部的 **Sidebar order** 区块里，可以拖拽（也可以用箭头按钮）调整成仪表实际绘制的顺序。

- 在你固定任何一行之前，仪表默认显示第一个上报用量的服务商的全部窗口。
- 每行由 `providerId:windowId` 标识，而不是下标，所以某个服务商调整了窗口顺序——或临时少报了一个——都不会
  悄悄把你的选择指到别的行上。
- 切换固定状态会立即反映到仪表，而不是等它下一次轮询：面板与仪表共用同一个渲染进程内的 store。
- 固定集合持久化在 `$XDG_STATE_HOME/paseo-usage-sidebar/selection.json`（默认 `~/.local/state/…`），
  采用原子写入。文件里**只有** 服务商 id 和窗口 id——没有 token，没有用量数值，也没有任何可识别账号的信息。

### 多语言

面板已本地化为 Paseo 支持的全部语言：阿拉伯语、英语、西班牙语、法语、日语、韩语、巴西葡萄牙语、俄语、
简体中文。阿拉伯语按从右至左渲染。

Paseo 不会把界面语言传给插件——`PluginHostProps` 只携带主题、宿主和布局信息，语言偏好存在客户端应用设置里
而非守护进程配置里。因此本插件复刻了 Paseo 自己的 `resolveSupportedLocale` 算法，并针对应用读取的同一份
`navigator.languages` 运行。只要 Paseo 的语言设置保持在 **System**（默认值），结果就与 Paseo 完全一致；
如果你把 Paseo 的语言改成了系统语言以外的值，面板仍会跟随系统语言。

两点说明：

- Paseo 自身的用量文案是硬编码英文（`"Plan usage"`、`"Refresh"` 等），所以在非英文环境下，本面板是本地化的，
  而 **设置 → Usage** 不是。
- 窗口名称是从守护进程的窗口 id（`five_hour`、`weekly`、`weekly_model_fable`）重新推导并本地化的；只有按
  模型划分的窗口里的模型名会原样保留，因为那是服务商自己的叫法。其他由服务商提供的字符串（`Extra usage`、
  套餐名等）同样原样显示。

时长一律用两个单位（`2d 3h`、`3h 25m`、`40m`），时钟时间来自 `Intl.DateTimeFormat`，因此会遵循当地语言的
12/24 小时制习惯，而不是写死一种。

---

## 配置项

| 环境变量 | 默认值 | 作用 |
| --- | --- | --- |
| `XDG_STATE_HOME` | `~/.local/state` | 固定集合存放的位置。 |

---

## 用量数据从哪来

插件在 `server/usage/read.ts` 里通过插件 SDK 的 `paseo.providers.listUsage()` 读取服务商用量。守护进程返回的
数据会先按插件自带的 `provider.usage.list` Zod 镜像校验一遍，所以某个服务商上报了插件没有建模的窗口结构时，
表现是某个字段缺失，而不是整个面板崩掉。

0.7 及更早版本时，这个文件还带着一条回退路径：自己开一条 WebSocket 到守护进程，手工重放 `provider.usage.list`
握手，因为那时的 SDK 根本没向插件暴露用量接口。`>=0.8.0` 的版本要求让这条路径不再可达，所以它连同
`PASEO_USAGE_SIDEBAR_HOST` 这个环境变量一起被删掉了。

每个服务商行的底部会显示该服务商自己的来源标签，以及这批数字是多久之前取到的。

## 安全性

在信任这个插件之前请先读这一节——Paseo 插件在设计上就是不做沙箱隔离的。

- **服务端代码**运行在守护进程的子进程里。它只调用一个 SDK 方法 `paseo.providers.listUsage()`，
  除此之外不执行任何守护进程操作，也不自己开任何连接。
- **不读取、不存储、不传输任何凭据。** 插件从不触碰 `~/.claude`、`~/.codex`、macOS 钥匙串，或任何服务商 token。
- **无对外网络访问。** 没有任何数据离开本机；插件不开任何连接。
- **只写一个文件，而且是你自己的。** 插件唯一写入的就是[固定与排序](#固定与排序)里说的那个固定集合——只有
  服务商 id 和窗口 id，别无其他。不改配置，不改守护进程状态。
- **客户端代码**只负责渲染响应，不做任何存储。

## 已知限制

- **侧边栏的位置由宿主决定。** 插件 API 没有提供侧边栏挂件、角标或底部插槽——只有
  `{ id, title, icon, surface }`。常驻仪表是一条非官方的 DOM 绕行方案（见[上文](#侧边栏迷你仪表)），
  且仅存在于桌面端与 Web 端。
- **只有上报用量的服务商才有行。** 没有登录会话的服务商只计入底部统计，不会渲染出来。
- **百分比是守护进程给的**，刷新节奏也是。插件不做任何二次推导或估算，所以某个服务商如果对自己的用量接口做了
  限流，数据就会一直停留在旧值，直到 Paseo 刷新为止。

---

## 目录结构

```
.
├── index.client.tsx                # 客户端入口——面板、侧边栏项、命令中心项、迷你仪表
├── index.server.ts                 # 服务端入口——三个 RPC handler
├── paseo-plugin.json               # 清单（插件 id + requirements.paseo）
├── package.json                    # 仅类型检查期依赖
├── tsconfig.json
├── client/
│   ├── i18n/locale.ts              # 复刻 Paseo 自己的 resolveSupportedLocale
│   ├── selection/store.ts          # 渲染进程内的 store，保持面板与仪表同步
│   └── ui/
│       ├── usage-surface.tsx       # 用量面板
│       ├── sidebar-meter.ts        # 常驻的 DOM 迷你仪表
│       └── sidebar-title.ts        # 本地化的侧边栏 / 命令中心标题
├── server/
│   ├── selection/state.ts          # 固定集合在 XDG state 下的原子持久化
│   └── usage/read.ts               # paseo.providers.listUsage()，带校验
└── shared/
    ├── i18n/messages.ts            # Paseo 支持的九种语言的文案表
    ├── selection/contract.ts       # 固定集合的 schema、RPC 与快照对齐逻辑
    └── usage/
        ├── contract.ts             # 守护进程 provider.usage.list 返回结构的 Zod 镜像
        ├── format.ts               # 百分比、重置时间、时效、余额的格式化
        └── window-label.ts         # 守护进程窗口 id → /usage 风格的窗口名
```

**目录是有约束力的。** Paseo 0.8 会从两个入口各构建一个 bundle，并按目录强制两者之间的边界——
0.8 之前的 `*.client.ts` / `*.server.ts` 文件名后缀已经没有任何含义，而把代码模块留在仓库根目录是编译错误：

| 目录 | 所属 bundle | 规则 |
| --- | --- | --- |
| `server/` | 守护进程子进程 | 可以使用 `node:*`。被客户端代码引用会是编译错误。 |
| `client/` | 渲染进程 | 可以使用 React、React Native、DOM。被服务端代码引用会是编译错误。 |
| `shared/` | 两者都有 | 只放契约和纯函数——不得使用平台 API，也不得引用区分运行时的 SDK 子路径。 |

SDK 的引入路径遵循同一套划分：运行时无关的工具（`defineRpc`、`PluginTheme`）用 `@getpaseo/plugin`，
客户端用 `@getpaseo/plugin/client` 与 `@getpaseo/plugin/client/react-native`，服务端用
`@getpaseo/plugin/server`。

## 开发

```bash
npm install
npm run typecheck

paseo plugin install "$PWD"
paseo plugin reload usage-sidebar   # 改完源码后执行
paseo plugin ls                     # 预期：running，无错误
paseo plugin logs usage-sidebar
```

`npm install` 只装类型检查期需要的依赖。所有运行时模块（`@getpaseo/plugin`、`react`、`react-native`、
`@tanstack/react-query`、`zod`）都由 Paseo 提供，因此安装这个插件不会触发任何包管理器。

欢迎提 issue 和 PR。提交前请先跑 `npm run typecheck`，并让新增模块遵循上面的 `client/` / `server/` / `shared/` 布局。

## 许可证

[MIT](./LICENSE)
