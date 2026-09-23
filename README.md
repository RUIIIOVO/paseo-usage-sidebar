# Paseo Usage Sidebar 📊

<p align="center">
  <strong>A sleek and lightweight usage dashboard plugin for Paseo's sidebar.</strong>
</p>

<p align="center">
  <a href="./README.md">English</a> | <a href="./README.zh-CN.md">简体中文</a>
</p>

---

## 💡 Overview

**Paseo Usage Sidebar** is an elegant usage monitoring plugin designed for [Paseo](https://paseo.sh). It seamlessly integrates AI provider quotas and consumption tracking directly into your sidebar, featuring pinned mini progress bars and an expandable detailed panel to keep your usage visible at a glance.

**Zero configuration required**—it reads Paseo's own `provider.usage.list`, so the numbers always agree with **Settings → Usage**. No API keys, no vendor CLI, no second polling path.

![The pinned mini meter in the sidebar](images/sidebar-meter-dark.png)

---

## ✨ Features

- 📊 **Pinned Mini Meters**: Compact progress bars embedded right below the sidebar item for effortless quota monitoring without page switching. *(Desktop and web only; the panel works everywhere.)*
- 🔍 **Expandable Detail Panel**: One-click access to a dashboard showing provider quotas, reset schedules, balances, and status.
- ⚡ **Zero Setup & Live Sync**: Refreshes every 60 seconds, and on demand from **Refresh**—no manual API key entry or configuration.
- 🎛️ **Pin, Hide & Reorder**: Choose exactly which quota windows live in the sidebar, and drag them into the order you want.
- 🎨 **Native Look & Feel**: Follows all seven built-in themes, picking up a theme switch without a reload.
- 🌐 **i18n Ready**: Localized into all nine languages Paseo ships—English, Simplified Chinese, Arabic, Spanish, French, Japanese, Korean, Portuguese (Brazil), and Russian.

---

## 📸 Preview

|           |                  Pinned Mini Meter                  |             Expandable Detail Panel             |
| :-------: | :-------------------------------------------------: | :---------------------------------------------: |
| **Light** |   ![Mini meter, Light theme](images/sidebar-meter.png)    |    ![The usage panel](images/usage-panel.png)     |
| **Dark**  | ![Mini meter, Dark theme](images/sidebar-meter-dark.png) | ![The panel on the Dark theme](images/usage-panel-dark.png) |

---

## 🚀 Quick Start

> Requires **Paseo 0.8.0 or later**. Paseo 0.7 and earlier cannot load this plugin.

### Installation

**Option A — From the app**

1. Open **Paseo** and go to **Settings → Plugins**.
2. Turn on **Enable plugins**.
3. Paste the repository URL into **Plugin source**:
   ```
   https://github.com/RUIIIOVO/paseo-usage-sidebar.git
   ```
4. Press **Install plugin**.

![Installing from Settings → Plugins](images/install.png)

A successful install looks like this:

![The installed plugin row](images/installed.png)

**Option B — From the command line**

```bash
paseo plugin add RUIIIOVO/paseo-usage-sidebar
```

### Usage

- **Quick Glance**: The sidebar shows a mini meter for every pinned quota window, directly under the **Plan usage** entry.
- **Detailed View**: Pick **Plan usage** in the sidebar, or run **Open plan usage** from the Command Center (`Cmd`/`Ctrl` + `K`).
- **Reorder & Customize**: Every window in the panel carries a **+ / −** button that pins it to, or hides it from, the sidebar. Drag rows in the **Sidebar order** block to change the order the meter paints.

---

## 🔄 Updating

Update with:

```bash
paseo plugin update usage-sidebar
```

---

## 🤝 Contributing

Issues and Pull Requests are welcome—see [CONTRIBUTING.md](./CONTRIBUTING.md) for what to run and how commits are written. If you find this plugin helpful, please consider giving it a ⭐️.

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
