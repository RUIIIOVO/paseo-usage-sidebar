# 参与贡献

欢迎提 issue 和 PR。下面说清提交前要跑什么、代码该放在哪里、提交信息怎么写。

## 提 PR 之前

```bash
npm install
npm run typecheck
npm test
```

这两项都要通过。没有构建步骤需要跑——插件由 Paseo 在安装时打包。

## 代码放在哪里

Paseo 0.8 为每个入口各构建一个 bundle，并按目录强制客户端与服务端的边界。放在仓库根目录的代码模块会直接
编译报错，0.8 之前的 `*.client.ts` / `*.server.ts` 文件名后缀也不再有任何含义。

| 目录 | Bundle | 规则 |
| --- | --- | --- |
| `server/` | 守护进程子进程 | 可用 `node:*`。从客户端代码引用它是编译错误。 |
| `client/` | 渲染进程 | 可用 React、React Native、DOM。从服务端代码引用它是编译错误。 |
| `shared/` | 两者 | 只放契约与纯函数——不得使用平台 API 或特定运行时的 SDK 入口。 |

SDK 的引入路径遵循同样的划分：`@getpaseo/plugin` 提供运行时无关的工具（`defineRpc`、`PluginTheme`），
客户端用 `@getpaseo/plugin/client` 与 `@getpaseo/plugin/client/react-native`，服务端用
`@getpaseo/plugin/server`。

## 提交信息

提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/)，由
`.githooks/commit-msg` 钩子检查：

```
<type>[(scope)][!]: <subject>
```

- **type** —— `feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`build`、`ci`、`chore`、
  `revert` 之一。
- **scope** —— 可选，小写，例如 `feat(palette): …`。
- **subject** —— 首字母小写，结尾不加句号。类型已经开了头，专有名词放到行内靠后的位置。
- **`!`** —— 标记破坏性变更，并且必须配一个 `BREAKING CHANGE:` 脚注。只写一个，等于让只看 subject
  或只看 footer 的人漏掉这次破坏。
- header 最长 100 个字符。有正文时，第 2 行必须留空，正文每行不超过 100 个字符——但带无法折行的长
  token（URL、路径、堆栈帧）的行除外。

每个签出装一次钩子：

```bash
npm run hooks:install
```

它需要手动启用，而不是作为 `npm install` 的副作用，因为它改的是你 Git 配置里的 `core.hooksPath`。
`git commit --no-verify` 可以跳过单个提交的检查。

## 测试

`npm test` 直接用 Node 自带的测试运行器跑 TypeScript 源码：不用测试框架，也不加额外依赖。
`test/loader.mjs` 是一个解析钩子，负责补回插件按 bundler 习惯省略的 `.ts` 扩展名，所以测试里可以按
`../../shared/…` 原样引入。

新用例放在 `test/`，和现有用例放一起。凡是值得把关的判断——色阶、窗口名称、会话断开判别——都值得写一个
表驱动测试。

`PASEO_USAGE_SIDEBAR_FAULT=proven|suspected|unrelated` 可以让 `readUsage` 按需失败，不用真的让机器休眠、
等守护进程的 lease 过期，就能看到会话断开时的界面。

## 提交前

- 跑一遍 `npm run typecheck` 和 `npm test`。
- 对着一个真实的 Paseo 重新加载插件（`paseo plugin reload usage-sidebar`），在亮色和暗色主题下都看一眼
  你改动的界面。
- 改了行为，就同时更新 `README.md` 和 `README.zh-CN.md`。
- 一个 PR 只做一件事。
