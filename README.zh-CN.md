# paseo-usage-sidebar

[English](./README.md) · **简体中文**

把服务商的套餐用量搬进 [Paseo](https://paseo.sh) 侧边栏——既是一个可以打开的面板，也是侧边栏条目下方
一个常驻的迷你仪表。

Paseo 本来就知道你的套餐还剩多少，只是把它藏在设置页里，以及输入框上下文仪表的悬停提示里。这个插件把同
一份数字放到你不用特意去找就能看见的地方。它不新增凭据、不依赖厂商 CLI、也不另起一条轮询链路：数据就是
Paseo 自己的 `provider.usage.list`，因此永远和 **设置 → Usage** 一致。

![侧边栏仪表与用量面板](images/overview.png)

## 安装

需要 **Paseo 0.8.0 或更高版本**。

```bash
paseo plugin add RUIIIOVO/paseo-usage-sidebar
```

先在 **设置 → Plugins → Enable plugins** 里打开插件功能，然后在侧边栏点 **Plan usage**，或在命令中心
（`Cmd`/`Ctrl` + `K`）执行 **Open plan usage**。后续更新用 `paseo plugin update usage-sidebar`。

> 清单里声明的是 `requirements.paseo: ">=0.8.0"`。Paseo 0.7 及更早版本无法加载本插件——它用的是 0.8
> 的运行时入口布局。

## 用量面板

排版与 **设置 → Usage** 一致：一张带边框的卡片，每个服务商一行。

| 行类型 | 显示内容 |
| --- | --- |
| **配额窗口** | `57% · resets in 2h 15m`；重置时间超过一天时显示为 `57% · resets at Nov 12, 10:00`。 |
| **余额** | 金额、积分、请求数或 token——服务商报了上限就一并显示。 |
| **详情** | 服务商提供的键值行，例如 `Extra usage: Disabled`。 |
| **状态** | 未登录的服务商不会消失，而是保留在列表里并标记 `Unavailable`。 |

面板每 60 秒自动刷新，也可以点 **Refresh** 手动刷新。

与设置页有两处不同。每行以服务商名称而非图标开头，因为品牌图标存放在宿主内部的注册表里，插件引用不到；
进度条则使用插件自己的[色阶](#配色)，而不是宿主的 status token。

窗口名称不是直接透传，而是从守护进程的 id 重建的，因此既跟随你的语言，也说得清覆盖的周期：守护进程把
5 小时窗口叫 `Session`，模型维度的窗口则写成 `Weekly · Fable` 且只有英文。

![用量面板](images/usage-panel.png)

## 侧边栏迷你仪表

*仅限桌面端与 Web 端。*

侧边栏条目正下方，每个被固定的窗口占一行：名称、百分比、一条细进度条，以及重置信息。与面板同为 60 秒
刷新周期，无需任何点击。

<p align="center">
  <img src="images/sidebar-meter.png" alt="Light 主题下的侧边栏仪表" width="320">
  <img src="images/sidebar-meter-dark.png" alt="Dark 主题下的侧边栏仪表" width="320">
</p>

**重置时间才是这一行的重点。** 单独一个百分比没法据以行动——用掉 90%，一小时后就重置那没事，还有三天
才重置那就是问题。当守护进程预测某个窗口会在重置前耗尽时，这一行改为用红色显示 `runs out in 40m`。

优先显示哪种形式参照 Claude Code 的 `/usage`：一天以内，「我还有多少时间」才是可行动的数字；超过一天，
光写一个 `1d` 太粗、无法据此安排，而一个具体日期可以。何况另一种形式都只差一次悬停。

| 重置时间 | 行内显示 | 悬停显示 |
| --- | --- | --- |
| 不足一天 | `resets in 3h 25m` | `resets at 1:35 PM` |
| 一天及以上 | `resets at Nov 12, 10:00` | `resets in 1d 2h` |

<details>
<summary><strong>这个仪表是一条非官方的绕行方案</strong>——依赖它之前请先读</summary>

Paseo 没有「侧边栏挂件」这种扩展点。一个侧边栏条目就是 `{ id, title, icon, surface }`，行本身由宿主
渲染，所以仪表是插在那一行旁边的一个普通 DOM 节点——这之所以可行，仅仅是因为桌面端和 Web 端会在同一个
渲染进程里执行插件的客户端 bundle。由此带来的后果：

- **仅限桌面端与 Web 端。** iOS 和 Android 上没有 DOM，仪表根本不会挂载。
- **锚定在宿主的 testID 上**（`plugin-sidebar-usage-sidebar-usage`，由插件自身 id 推导）。未来某个
  Paseo 版本若改了这个名字，仪表就不再出现；除此之外不会有别的影响。
- **全程「失败即静默」。** 查找锚点、探测颜色、RPC——每一步失败时都退化为不渲染，而不是抛错。
- **颜色是量出来的，不是猜的。** 主题色只能通过 surface 的 props 传给插件，而这个节点在 React 之外，
  所以它通过「实际画出来的颜色」判断当前主题：把侧边栏背景色与七个内置主题比对——每个主题画出的背景色
  都不同——再用该主题自己的轨道色与次要前景色 token 画仪表的外围。颜色每两秒重新探测一次，所以切换
  主题无需重载即可生效。探测时会跳过与行等高的已上色祖先节点——面板打开时 Paseo 会给自己的侧边栏行
  画一层选中态底色，误读它会把 Light 主题识别成暗色，导致仪表变成暗底暗字。
- **绝不抢走点击。** 该节点设置了 `pointer-events:none`。

要关闭它，删掉 `index.client.tsx` 里的 `startSidebarMeter(client)` 一行。目前还没有做成设置开关。

</details>

## 配色

| 填充色 | 触发条件 | 含义 |
| --- | --- | --- |
| **蓝** | 已用不足 70% | 不需要做任何事。 |
| **橙** | 70–90% | 安排接下来一小时之前值得看一眼。 |
| **红** | 超过 90%，或被预测会在重置前耗尽 | 要么现在处理，要么等重置。 |
| **灰** | 没有可用的百分比 | 不是「用得少」，是「读不到」。 |

绿色是刻意不用的。绿色读作「良好」，等于把眼睛唯一的强信号花在了根本不需要注意的状态上。蓝色才是中性的
「这里没你的事」，这样暖色就只表达一件事，橙→红也就成了整块区域里唯一一次颜色跳变。

每条进度条最终的色调，取 **服务商上报的色调** 与 **百分比推导出的色调** 中更严重的那个。只听服务商的，
等于让它的阈值决定本插件的色阶在哪里跳变，不上报色调的服务商还会一路画成灰色；只做本地推导，又会丢掉
百分比表达不了的信息——一个被预测提前耗尽的窗口，在 40% 就该是红的。

两个界面共用同一张表 `shared/usage/palette.ts`。填充色不使用宿主的 `theme.colors.status*`：那些 token
是为文字调的，所以 Light 主题下 `statusWarning` 是个深琥珀，当 4px 色块用时读起来是棕色。

## 固定与排序

面板里每个配额窗口都带一个 **+ / −** 按钮，用来把它固定到仪表、或从仪表里移除。被固定的行会出现在面板
顶部的 **Sidebar order** 区块里，在那里拖动（或用箭头按钮）即可决定仪表绘制它们的确切顺序。

- 在你固定任何东西之前，仪表显示第一个上报用量的服务商的全部窗口。
- 每行由 `providerId:windowId` 标识，而不是下标，所以服务商重排窗口顺序、或临时少报一个窗口时，都不会
  悄悄把你的选择指到别处。
- 固定操作立即生效，而不是等下一次轮询——面板和仪表共用同一个渲染进程内的 store。
- 固定集合以原子写入的方式保存在 `$XDG_STATE_HOME/paseo-usage-sidebar/selection.json`（默认
  `~/.local/state/…`）。里面**只有**服务商 id 和窗口 id：没有 token，没有用量数字，没有任何可识别账号
  的内容。

## 多语言

面板已本地化到 Paseo 支持的全部语言：阿拉伯语（从右到左）、英语、西班牙语、法语、日语、韩语、巴西葡萄
牙语、俄语、简体中文。时长采用两级单位（`2d 3h`、`3h 25m`、`40m`），时刻由 `Intl.DateTimeFormat` 生成，
因此遵循所在语言的 12/24 小时习惯。

Paseo 不会把语言设置传给插件，所以插件复刻了 Paseo 自己的 `resolveSupportedLocale`，读取同一份
`navigator.languages`。当 Paseo 的语言设为 **System**（默认值）时两者完全一致；改成别的值，面板则跟随
系统语言。

只有插件自己拥有的字符串会被本地化——窗口名称、重置信息、时长，以及它自己的文案。服务商的字符串
（`Extra usage`、套餐标签，以及模型维度窗口里的模型名）照原样显示，因为那是服务商自己的叫法。Paseo
自己的用量文案是硬编码英文，所以在非英文环境下，这个面板反而比 **设置 → Usage** 更本地化。

## 数字从哪里来

`server/usage/read.ts` 调用插件 SDK 的 `paseo.providers.listUsage()`，并用插件自己的
`provider.usage.list` Zod 镜像校验返回值，因此某个服务商上报了本插件未建模的窗口结构时，退化为缺一个
字段，而不是整个界面崩掉。每个服务商行的页脚会显示该服务商自己的来源标签，以及数字是多久之前取的。

百分比及其刷新节奏都是守护进程的。插件不做任何二次推导或估算，所以如果某个服务商对自己的用量接口限流，
数字会一直是旧的，直到 Paseo 刷新它。

## 安全

Paseo 插件在设计上就没有沙箱，所以在信任任何一个插件之前，这一节值得读。

- **服务端代码** 运行在守护进程的子进程里，只调用一个 SDK 方法 `paseo.providers.listUsage()`。不做任何
  其他守护进程操作，也不自己开 socket。
- **不读取、不存储、不传输任何凭据。** 插件从不碰 `~/.claude`、`~/.codex`、macOS 钥匙串或任何服务商
  token。
- **无出网行为。** 没有任何数据离开本机；插件根本不打开任何 socket。
- **只写一个文件，而且是你自己的**——上面说的固定集合。不改配置，不改守护进程状态。
- **客户端代码** 只负责渲染返回值，不存任何东西。

## 项目结构

```
.
├── index.client.tsx                # 客户端入口——surface、侧边栏条目、命令项、仪表
├── index.server.ts                 # 服务端入口——三个 RPC 处理器
├── paseo-plugin.json               # 清单（插件 id + requirements.paseo）
├── package.json                    # 仅类型检查期依赖
├── tsconfig.json
├── client/
│   ├── i18n/locale.ts              # 复刻 Paseo 自己的 resolveSupportedLocale
│   ├── selection/store.ts          # 渲染进程内的 store，让面板与仪表保持同步
│   └── ui/
│       ├── usage-surface.tsx       # 用量面板
│       ├── sidebar-meter.ts        # 常驻的 DOM 迷你仪表
│       └── sidebar-title.ts        # 已本地化的侧边栏 / 命令中心标题
├── server/
│   ├── selection/state.ts          # XDG state 下固定集合的原子化持久化
│   └── usage/read.ts               # paseo.providers.listUsage()，带校验
└── shared/
    ├── i18n/messages.ts            # Paseo 支持的九种语言的文案表
    ├── selection/contract.ts       # 固定集合的 schema、RPC 与快照对齐逻辑
    └── usage/
        ├── contract.ts             # 守护进程 provider.usage.list 返回结构的 Zod 镜像
        ├── palette.ts              # 蓝/橙/红进度条色阶，两个界面共用
        ├── format.ts               # 百分比、重置时间、时效、色调、余额的格式化
        └── window-label.ts         # 守护进程窗口 id → /usage 风格的窗口名
```

**目录结构是有约束力的。** Paseo 0.8 为每个入口各构建一个 bundle，并按目录强制两者的边界；0.8 之前的
`*.client.ts` / `*.server.ts` 文件名后缀不再有任何含义，而放在仓库根目录的代码模块会直接编译报错。

| 目录 | Bundle | 规则 |
| --- | --- | --- |
| `server/` | 守护进程子进程 | 可用 `node:*`。从客户端代码引用它是编译错误。 |
| `client/` | 渲染进程 | 可用 React、React Native、DOM。从服务端代码引用它是编译错误。 |
| `shared/` | 两者 | 只放契约与纯函数——不得使用平台 API 或特定运行时的 SDK 入口。 |

SDK 的引入路径遵循同样的划分：`@getpaseo/plugin` 提供运行时无关的工具（`defineRpc`、`PluginTheme`），
客户端用 `@getpaseo/plugin/client` 与 `@getpaseo/plugin/client/react-native`，服务端用
`@getpaseo/plugin/server`。

## 开发

```bash
npm install
npm run typecheck

paseo plugin install "$PWD"
paseo plugin reload usage-sidebar   # 改完源码后
paseo plugin ls                     # 期望：running，无 error
paseo plugin logs usage-sidebar
```

`npm install` 只安装类型检查期的依赖。所有运行时模块（`@getpaseo/plugin`、`react`、`react-native`、
`@tanstack/react-query`、`zod`）都由 Paseo 提供，所以安装插件不会触发任何包管理器。

欢迎提 issue 和 PR。提交前请先跑 `npm run typecheck`，并把新模块放在上面的 `client/` / `server/` /
`shared/` 布局之内。

## 许可

[MIT](./LICENSE)
