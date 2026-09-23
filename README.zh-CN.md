# Paseo Usage Sidebar 📊

<p align="center">
  <strong>一个轻量优雅的 Paseo 侧边栏用量面板插件。</strong>
</p>

<p align="center">
  <a href="./README.md">English</a> | <a href="./README.zh-CN.md">简体中文</a>
</p>

---

## 💡 简介

**Paseo Usage Sidebar** 是一个为 [Paseo](https://paseo.sh) 设计的用量监控插件。它把各家 AI 服务商的套餐额度与消耗情况直接嵌进侧边栏，既有常驻的迷你进度条，也有可展开的详细面板，让用量始终一眼可见。

**无需任何配置**——数据直接取自 Paseo 自己的 `provider.usage.list`，因此永远和 **设置 → Usage** 一致。不需要 API Key，不依赖厂商 CLI，也不另起一条轮询链路。

<p align="center">
  <img src="images/sidebar-meter-dark.png" alt="侧边栏常驻迷你仪表" />
</p>

---

## ✨ 功能特性

- 📊 **常驻迷你仪表**：紧凑的进度条直接嵌在侧边栏条目下方，不用切页面就能盯住额度。*（仅桌面端与 Web 端；面板在所有平台都可用。）*
- 🔍 **可展开的详细面板**：一键打开完整看板，展示各服务商的额度、重置时间、余额与状态。
- ⚡ **零配置 · 实时同步**：每 60 秒自动刷新，也可点 **Refresh** 立即刷新，无需手填 API Key 或做任何配置。
- 🎛️ **固定 / 隐藏 / 排序**：自由决定哪些额度窗口常驻侧边栏，并拖拽成你想要的顺序。
- 🎨 **原生观感**：自动适配全部七款内置主题，换主题即时生效，无需重载。
- 🌐 **多语言**：已本地化为 Paseo 支持的全部九种语言——简体中文、英语、阿拉伯语、西班牙语、法语、日语、韩语、葡萄牙语（巴西）、俄语。

---

## 📸 效果预览

|          |             侧边栏常驻迷你仪表             |            展开式详细面板            |
| :------: | :--------------------------------------: | :---------------------------------: |
| **Light** |  ![Light 主题下的迷你仪表](images/sidebar-meter.png)  |  ![用量面板](images/usage-panel.png)   |
| **Dark**  | ![Dark 主题下的迷你仪表](images/sidebar-meter-dark.png) | ![Dark 主题下的面板](images/usage-panel-dark.png) |

---

## 🚀 快速上手

> 需要 **Paseo 0.8.0 或更高版本**。Paseo 0.7 及更早版本无法加载本插件。

### 安装

**方式 A —— 在应用里安装**

1. 打开 **Paseo**，进入 **设置 → Plugins**。
2. 打开 **Enable plugins** 开关。
3. 把仓库地址粘贴进 **Plugin source**：
   ```
   https://github.com/RUIIIOVO/paseo-usage-sidebar.git
   ```
4. 点击 **Install plugin**。

![在设置 → Plugins 里安装](images/install.png)

安装成功提示如下：

![安装完成后的插件行](images/installed.png)

**方式 B —— 命令行安装**

```bash
paseo plugin add RUIIIOVO/paseo-usage-sidebar
```

### 使用说明

- **快速查看**：每个已固定的额度窗口都会在 **Plan usage** 条目下方渲染一条迷你仪表。
- **查看详情**：在侧边栏点 **Plan usage**，或在命令中心（`Cmd`/`Ctrl` + `K`）执行 **Open plan usage**。
- **排序与自定义**：面板中每个窗口行都有 **+ / −** 按钮，用来把它固定到侧边栏或从侧边栏移除；在 **Sidebar order** 区块里拖拽即可调整仪表的绘制顺序。

---

## 🔄 更新

更新命令如下：

```bash
paseo plugin update usage-sidebar
```

---

## 🤝 贡献与反馈

欢迎提交 Issue 和 Pull Request——提交前请看 [CONTRIBUTING.zh-CN.md](./CONTRIBUTING.zh-CN.md)，里面写了要跑什么以及提交信息怎么写。如果你觉得这个插件对你有帮助，请给一个 ⭐️ 支持一下。

---

## 📄 开源协议

本项目采用 [MIT License](./LICENSE) 开源协议。
