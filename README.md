# paseo-usage-sidebar

**English** · [简体中文](./README.zh-CN.md)

A [Paseo](https://paseo.sh) plugin that puts provider plan usage in the sidebar — as a panel you
can open, and as an always-visible meter under the sidebar entry.

Paseo already knows how much of your plan is left. It just keeps that behind a settings screen and
a hover tooltip on the composer's context meter. This plugin surfaces the same data where you can
actually see it.

No new credentials, no vendor CLI, no second polling path: the numbers come from Paseo's own
`provider.usage.list` data, so they always match what **Settings → Usage** shows.

---

## Contents

- [Install](#install)
- [Features](#features)
  - [The usage panel](#the-usage-panel)
  - [The sidebar meter](#the-sidebar-meter)
  - [Pinning and ordering](#pinning-and-ordering)
  - [Localization](#localization)
- [Configuration](#configuration)
- [How it reads usage](#how-it-reads-usage)
- [Security](#security)
- [Limitations](#limitations)
- [Project structure](#project-structure)
- [Development](#development)
- [License](#license)

---

## Install

Requires **Paseo 0.8.0 or later**.

```bash
paseo plugin add RUIIIOVO/paseo-usage-sidebar
```

Enable plugins first under **Settings → Plugins → Enable plugins** if you have not already. Then
pick **Usage** in the sidebar, or run **Open plan usage** from the Command Center
(`Ctrl`/`Cmd` + `K`).

Update later with:

```bash
paseo plugin update usage-sidebar
```

> The floor is declared as `requirements.paseo: ">=0.8.0"` in `paseo-plugin.json`. Paseo 0.7 and
> earlier cannot load this plugin: it uses the 0.8 runtime-entry layout.

---

## Features

### The usage panel

The surface reproduces the layout of **Settings → Usage**: one bordered card, one row per provider,
hairline dividers between them.

| Row type | What it shows |
| --- | --- |
| **Quota windows** | Session, weekly, and model-scoped windows as `57% · resets in 2h 15m` (or `57% · resets at Nov 12, 10:00` once the reset is more than a day out), with a zero-baseline bar. |
| **Balances** | Money, credits, requests, or tokens, against a ceiling where one exists. |
| **Details** | Provider-supplied key/value lines such as `Extra usage: Disabled`. |
| **Status** | Providers that are not signed in stay listed with an `Unavailable` dot rather than disappearing, so the list matches what Settings shows. |

Window names follow Claude Code's `/usage` wording (`5-hour session`, `This week`,
`This week (Fable)`) rather than the daemon's bare `Session` / `Weekly`, which say nothing about the
period they cover.

Spacing, type scale, tone thresholds, and the reset/`runs out` wording are taken from Paseo's own
provider-usage components, so the panel reads identically to the settings screen. The one
difference is provider brand logos: those come from a host-internal icon registry that plugins
cannot import, so rows lead with the provider name.

The surface refreshes every 60 seconds and on demand from **Refresh**.

### The sidebar meter

*Desktop and web only.*

Under the sidebar entry, the plugin renders a compact always-visible meter: one row per pinned quota
window — label, percentage, a thin bar, and the countdown to that window's reset. It refreshes on
the same 60-second cycle and needs no click.

The reset is the point of the row. A percentage on its own cannot be acted on — 90% used is fine
with a reset an hour out and a problem with three days to go — so each row carries it underneath,
or `runs out in 40m` in the danger tone when the daemon projects the window will be exhausted
before it resets.

Which form the row leads with follows Claude Code's `/usage`, which prints `Resets 3pm` on the
session bar and `Resets Nov 12, 3pm` on the weekly ones:

| Reset is | Row shows | Hover shows |
| --- | --- | --- |
| under a day out | `resets in 3h 25m` | `resets at 1:35 PM` |
| a day or more out | `resets at Nov 12, 10:00` | `resets in 1d 2h` |

Under a day, "how long do I have" is the actionable number. Past that, a bare `1d` is too coarse to
plan around and a date is not — and either way the other form is one hover away.

<details>
<summary><strong>Why this is an unsupported escape hatch</strong> (read before relying on it)</summary>

Paseo has no sidebar-widget contribution. A sidebar item is `{ id, title, icon, surface }` and the
row is rendered by the host, so the meter is a plain DOM node inserted next to that row — which
works only because desktop and web clients evaluate plugin client bundles inside the same renderer.
Consequences:

- **Desktop and web only.** On iOS and Android there is no DOM and the meter simply never mounts.
- **Anchored on a host testID** (`plugin-sidebar-usage-sidebar-usage`, derived from this plugin's
  own id). If a future Paseo release renames it, the meter stops appearing. Nothing else breaks.
- **Fail-soft by construction.** Every step — anchor lookup, colour probing, RPC — degrades to
  rendering nothing rather than throwing.
- **Colours are measured, not guessed.** Theme colors reach plugins only as props inside a surface,
  and this meter is a DOM node outside React, so it identifies the active theme from what is
  actually painted: the sidebar background is matched against Paseo's seven built-in themes (Light,
  Dark, Zinc, Midnight, Claude, Ghostty, Pure black), each of which paints a distinct one, and the
  meter then uses that theme's own track and muted-foreground tokens. An unrecognized theme — a
  plugin-contributed one — falls back to the row's rendered text colour with a light or dark status
  palette chosen by luminance. Colours are re-probed every two seconds, so switching themes updates
  the meter without a reload. Row-sized painted ancestors are skipped during the probe: while the
  usage panel is open Paseo paints a selection tint on its own sidebar row, and reading that tint
  instead of the sidebar identified the Light theme and turned the meter dark-on-dark.
- **Never steals a click.** The node is `pointer-events:none`.

To disable the meter, remove the `startSidebarMeter(client)` call from `index.client.tsx`.
There is no settings toggle yet.

</details>

### Pinning and ordering

Every quota window in the panel carries a **+ / −** button that pins it to — or hides it from — the
sidebar meter. Pinned rows appear in a **Sidebar order** block at the top of the panel, where they
can be dragged (or moved with the arrow buttons) into the exact order the meter paints them.

- Until you pin anything, the meter shows every window of the first provider that reports usage.
- A row is identified by `providerId:windowId`, not by index, so a provider that reorders its
  windows — or temporarily drops one — never silently repoints your selection.
- Toggling a pin updates the meter immediately rather than on its next poll: the panel and the
  meter share one in-renderer store.
- The pin set is persisted to `$XDG_STATE_HOME/paseo-usage-sidebar/selection.json` (default
  `~/.local/state/…`) and written atomically. It holds provider and window **ids only** — no
  tokens, no usage numbers, nothing account-identifying.

### Localization

The panel is localized into every language Paseo ships: Arabic, English, Spanish, French, Japanese,
Korean, Brazilian Portuguese, Russian, and Simplified Chinese. Arabic renders right-to-left.

Paseo does not pass its language to plugins — `PluginHostProps` carries theme, host, and layout
only, and the language preference lives in client-side app settings rather than daemon config. The
plugin therefore reproduces Paseo's own `resolveSupportedLocale` algorithm against the same
`navigator.languages` the app reads, which matches Paseo exactly while its language is set to
**System** (the default). If you override Paseo's language to something other than your system
locale, the panel follows the system locale instead.

Two notes:

- Paseo's own usage copy is hardcoded English (`"Plan usage"`, `"Refresh"`, …), so on a non-English
  install this panel is localized where **Settings → Usage** is not.
- Window names are re-derived from the daemon's window ids (`five_hour`, `weekly`,
  `weekly_model_fable`) and localized; only the model name inside a scoped window is kept verbatim,
  because it is the provider's own name for it. Other provider-supplied strings (`Extra usage`,
  plan labels) are still shown verbatim.

Durations are two-unit (`2d 3h`, `3h 25m`, `40m`) and clock times come from `Intl.DateTimeFormat`,
so they follow the locale's 12/24-hour convention rather than a hardcoded one.

---

## Configuration

| Variable | Default | Effect |
| --- | --- | --- |
| `XDG_STATE_HOME` | `~/.local/state` | Where the pin set is stored. |

---

## How it reads usage

The plugin reads provider usage through `paseo.providers.listUsage()` from the plugin SDK, in
`server/usage/read.ts`. The daemon's payload is validated against the plugin's own Zod mirror of
`provider.usage.list`, so a provider reporting a window shape this plugin does not model degrades to
a missing field rather than crashing the surface.

Up to 0.7 this file also carried a fallback that opened its own WebSocket to the daemon and replayed
the `provider.usage.list` handshake by hand, because that SDK release exposed no usage API. The
`>=0.8.0` requirement makes it unreachable, so it is gone along with the `PASEO_USAGE_SIDEBAR_HOST`
override.

Each provider row's footer shows the provider's own source label and how long ago the numbers were
fetched.

## Security

Read this before trusting the plugin — Paseo plugins are unsandboxed by design.

- **Server code** runs in a daemon subprocess. It calls one SDK method, `paseo.providers.listUsage()`,
  and performs no other daemon operation. It opens no sockets of its own.
- **No credentials are read, stored, or transmitted.** The plugin never touches `~/.claude`,
  `~/.codex`, the macOS Keychain, or any provider token.
- **No outbound network access.** Nothing leaves the machine; the plugin opens no sockets at all.
- **One write, and it is yours.** The only file the plugin writes is the pin set described in
  [Pinning and ordering](#pinning-and-ordering) — provider and window ids, nothing else. No config
  is touched, no daemon state is mutated.
- **Client code** renders the response and stores nothing.

## Limitations

- **Sidebar placement is host-owned.** The plugin API offers no sidebar widget, badge, or footer
  slot — only `{ id, title, icon, surface }`. The always-visible meter is an unsupported DOM escape
  hatch (see [above](#the-sidebar-meter)) and exists on desktop and web only.
- **Only providers that report usage get rows.** Providers without a signed-in session are counted
  in the footer, not rendered.
- **Percentages are the daemon's**, including their refresh cadence. The plugin does not re-derive
  or estimate anything, so a provider that rate-limits its own usage endpoint stays stale until
  Paseo refreshes it.

---

## Project structure

```
.
├── index.client.tsx                # Client entry — surface, sidebar item, command item, meter
├── index.server.ts                 # Server entry — the three RPC handlers
├── paseo-plugin.json               # Manifest (plugin id + requirements.paseo)
├── package.json                    # Typecheck-time dependencies only
├── tsconfig.json
├── client/
│   ├── i18n/locale.ts              # Mirrors Paseo's own resolveSupportedLocale
│   ├── selection/store.ts          # In-renderer store keeping panel and meter in sync
│   └── ui/
│       ├── usage-surface.tsx       # The usage panel
│       ├── sidebar-meter.ts        # The always-visible DOM meter
│       └── sidebar-title.ts        # Localized sidebar / Command Center label
├── server/
│   ├── selection/state.ts          # Atomic pin-set persistence under XDG state
│   └── usage/read.ts               # paseo.providers.listUsage(), validated
└── shared/
    ├── i18n/messages.ts            # Message catalog for the nine locales Paseo ships
    ├── selection/contract.ts       # Pin-set schema, RPCs, and snapshot resolution
    └── usage/
        ├── contract.ts             # Zod mirror of the daemon's provider.usage.list payload
        ├── format.ts               # Percentage, reset, age, and balance formatting
        └── window-label.ts         # Daemon window ids → /usage-style window names
```

**Directories are load-bearing.** Paseo 0.8 builds one bundle per entry and enforces the boundary
between them by directory — the pre-0.8 `*.client.ts` / `*.server.ts` filename suffixes no longer
mean anything, and a code module left at the repo root is a compile error:

| Directory | Bundle | Rules |
| --- | --- | --- |
| `server/` | daemon subprocess | May use `node:*`. Importing it from client code is a build error. |
| `client/` | renderer | May use React, React Native, DOM. Importing it from server code is a build error. |
| `shared/` | both | Contracts and pure helpers only — no platform APIs, no runtime-specific SDK entries. |

SDK imports follow the same split: `@getpaseo/plugin` for runtime-neutral helpers (`defineRpc`,
`PluginTheme`), `@getpaseo/plugin/client` and `@getpaseo/plugin/client/react-native` for client code,
`@getpaseo/plugin/server` for server code.

## Development

```bash
npm install
npm run typecheck

paseo plugin install "$PWD"
paseo plugin reload usage-sidebar   # after editing source
paseo plugin ls                     # expect: running, no error
paseo plugin logs usage-sidebar
```

`npm install` only installs typecheck-time dependencies. Paseo supplies every runtime module
(`@getpaseo/plugin`, `react`, `react-native`, `@tanstack/react-query`, `zod`), so installing the
plugin never runs a package manager.

Issues and pull requests are welcome. Please run `npm run typecheck` before opening one, and keep
new modules inside the `client/` / `server/` / `shared/` layout above.

## License

[MIT](./LICENSE)
