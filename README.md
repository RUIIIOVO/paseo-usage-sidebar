# paseo-usage-sidebar

**English** · [简体中文](./README.zh-CN.md)

Provider plan usage in the [Paseo](https://paseo.sh) sidebar — as a panel you can open, and as an
always-visible meter under the sidebar entry.

Paseo already tracks how much of your plan is left; it just keeps that behind a settings screen and
a hover tooltip on the composer's context meter. This plugin puts the same numbers where you see
them without going to look. It adds no credentials, no vendor CLI, and no second polling path: the
data is Paseo's own `provider.usage.list`, so it always agrees with **Settings → Usage**.

![The sidebar meter and the usage panel](images/overview.png)

## Install

Requires **Paseo 0.8.0 or later**.

```bash
paseo plugin add RUIIIOVO/paseo-usage-sidebar
```

Turn plugins on under **Settings → Plugins → Enable plugins**, then pick **Plan usage** in the
sidebar or run **Open plan usage** from the Command Center (`Cmd`/`Ctrl` + `K`). Update later with
`paseo plugin update usage-sidebar`.

> The manifest declares `requirements.paseo: ">=0.8.0"`. Paseo 0.7 and earlier cannot load this
> plugin — it uses the 0.8 runtime-entry layout.

## The usage panel

Same layout as **Settings → Usage**: one bordered card, one row per provider.

| Row | Shows |
| --- | --- |
| **Quota window** | `57% · resets in 2h 15m`, or `57% · resets at Nov 12, 10:00` once the reset is more than a day out. |
| **Balance** | Money, credits, requests, or tokens — against a ceiling when the provider reports one. |
| **Detail** | Provider-supplied key/value lines such as `Extra usage: Disabled`. |
| **Status** | Providers you are not signed into stay listed with an `Unavailable` dot instead of vanishing. |

It refreshes every 60 seconds, and on demand from **Refresh**.

Two things differ from the settings screen. Rows lead with the provider's name rather than its logo,
because brand icons live in a host-internal registry plugins cannot import. And the bars use this
plugin's own [colour ramp](#colour) rather than the host's status tokens.

Window names are rebuilt from the daemon's ids instead of passed through, so they follow your
language and say what period they cover: the daemon calls the 5-hour window `Session`, and spells
the model-scoped one `Weekly · Fable` in English only.

![The usage panel](images/usage-panel.png)

## The sidebar meter

*Desktop and web only.*

One row per pinned window, directly under the sidebar entry: label, percentage, a thin bar, and the
reset. Same 60-second cycle, no click needed.

<p align="center">
  <img src="images/sidebar-meter.png" alt="The sidebar meter on the Light theme" width="320">
  <img src="images/sidebar-meter-dark.png" alt="The sidebar meter on the Dark theme" width="320">
</p>

**The reset is the point of the row.** A percentage on its own cannot be acted on — 90% used is fine
when it resets in an hour and a problem when it resets in three days. When the daemon projects a
window will be exhausted before it resets, the row reads `runs out in 40m` in red instead.

Which form leads follows Claude Code's `/usage`. Under a day, "how long do I have" is the actionable
number; past that, a bare `1d` is too coarse to plan around and a date is not. Either way the other
form is one hover away.

| Reset is | Row shows | Hover shows |
| --- | --- | --- |
| under a day out | `resets in 3h 25m` | `resets at 1:35 PM` |
| a day or more out | `resets at Nov 12, 10:00` | `resets in 1d 2h` |

<details>
<summary><strong>The meter is an unsupported escape hatch</strong> — read before relying on it</summary>

Paseo has no sidebar-widget extension point. A sidebar item is `{ id, title, icon, surface }` and
the host renders the row, so the meter is a plain DOM node inserted next to it — which works only
because desktop and web clients evaluate plugin client bundles in the same renderer. Consequences:

- **Desktop and web only.** iOS and Android have no DOM; the meter never mounts.
- **Anchored on a host testID** (`plugin-sidebar-usage-sidebar-usage`, derived from this plugin's
  own id). If a future Paseo release renames it, the meter stops appearing. Nothing else breaks.
- **Fail-soft throughout.** Anchor lookup, colour probing, and RPC each degrade to rendering
  nothing rather than throwing.
- **Colours are measured, not guessed.** Theme colours reach plugins only as surface props, and
  this node lives outside React, so it reads the theme off what is actually painted: the sidebar
  background is matched against the seven built-in themes, each of which paints a distinct one, and
  that theme's track and muted-foreground tokens paint the meter's chrome. Re-probed every two
  seconds, so a theme switch lands without a reload. Row-sized painted ancestors are skipped —
  Paseo tints its own sidebar row while the panel is open, and reading that tint identified the
  Light theme and turned the meter dark-on-dark.
- **Never steals a click.** The node is `pointer-events:none`.

To disable it, remove the `startSidebarMeter(client)` call from `index.client.tsx`. There is no
settings toggle yet.

</details>

## Colour

| Fill | When | Means |
| --- | --- | --- |
| **Blue** | under 70% used | Nothing to act on. |
| **Orange** | 70–90% | Worth knowing before you plan the next hour. |
| **Red** | over 90%, or projected to run out before it resets | Act now, or wait for the reset. |
| **Grey** | no percentage reported | Not a low reading — a missing one. |

Green is deliberately absent. It reads as "good", which spends the eye's only strong signal on the
state that needs no attention. Blue is the neutral "nothing to do here", so warm hues mean exactly
one thing and orange→red is the block's only colour change.

A bar takes the **more severe** of the provider's reported tone and the one its percentage implies.
Trusting the provider alone lets its thresholds decide where this ramp steps, and paints grey for a
provider that reports no tone; deriving locally alone discards what a percentage cannot express — a
window projected to run out early is red at 40%.

Both surfaces read one table, `shared/usage/palette.ts`. Host `theme.colors.status*` tokens are not
used for fills: they are tuned for text, so on the Light theme `statusWarning` is a dark amber that
reads as brown at 4px.

## Pinning and ordering

Every quota window in the panel carries a **+ / −** button that pins it to, or hides it from, the
meter. Pinned rows appear in a **Sidebar order** block at the top of the panel, where a drag — or
the arrow buttons — sets the exact order the meter paints them in.

- Until you pin anything, the meter shows every window of the first provider that reports usage.
- Rows are identified by `providerId:windowId`, not by index, so a provider that reorders or
  temporarily drops a window never silently repoints your selection.
- A pin takes effect immediately rather than on the next poll — the panel and the meter share one
  in-renderer store.
- The pin set is written atomically to `$XDG_STATE_HOME/paseo-usage-sidebar/selection.json`
  (default `~/.local/state/…`). It holds provider and window **ids only**: no tokens, no usage
  numbers, nothing account-identifying.

## Localization

The panel is localized into every language Paseo ships: Arabic (right-to-left), English, Spanish,
French, Japanese, Korean, Brazilian Portuguese, Russian, and Simplified Chinese. Durations are
two-unit (`2d 3h`, `3h 25m`, `40m`), and clock times come from `Intl.DateTimeFormat`, so they follow
the locale's 12/24-hour convention.

Paseo does not pass its language to plugins, so the plugin reproduces Paseo's own
`resolveSupportedLocale` against the same `navigator.languages` the app reads. That matches Paseo
exactly while its language is **System** (the default); set it to anything else and the panel
follows your system locale instead.

Only strings the plugin owns are localized — window names, resets, durations, and its own copy.
Provider strings (`Extra usage`, plan labels, and the model name inside a scoped window) are shown
verbatim, because they are the provider's own wording. Paseo's usage copy is itself hardcoded
English, so on a non-English install this panel is localized where **Settings → Usage** is not.

## Where the numbers come from

`server/usage/read.ts` calls `paseo.providers.listUsage()` from the plugin SDK and validates the
response against the plugin's own Zod mirror of `provider.usage.list`, so a provider reporting a
window shape this plugin does not model degrades to a missing field rather than crashing the
surface. Each provider row's footer shows that provider's own source label and how long ago the
numbers were fetched.

Percentages, and their refresh cadence, are the daemon's. The plugin re-derives and estimates
nothing, so a provider that rate-limits its own usage endpoint stays stale until Paseo refreshes it.

## Security

Paseo plugins are unsandboxed by design, so this is worth reading before you trust one.

- **Server code** runs in a daemon subprocess and calls exactly one SDK method,
  `paseo.providers.listUsage()`. No other daemon operation, no sockets of its own.
- **No credentials** are read, stored, or transmitted. The plugin never touches `~/.claude`,
  `~/.codex`, the macOS Keychain, or any provider token.
- **No outbound network access.** Nothing leaves the machine; the plugin opens no sockets at all.
- **One write, and it is yours** — the pin set described above. No config is touched, no daemon
  state is mutated.
- **Client code** renders the response and stores nothing.

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
        ├── palette.ts              # The blue/orange/red bar ramp, shared by both surfaces
        ├── format.ts               # Percentage, reset, age, tone, and balance formatting
        └── window-label.ts         # Daemon window ids → /usage-style window names
```

**Directories are load-bearing.** Paseo 0.8 builds one bundle per entry and enforces the boundary by
directory; the pre-0.8 `*.client.ts` / `*.server.ts` filename suffixes no longer mean anything, and
a code module left at the repo root is a compile error.

| Directory | Bundle | Rules |
| --- | --- | --- |
| `server/` | daemon subprocess | May use `node:*`. Importing it from client code is a build error. |
| `client/` | renderer | May use React, React Native, DOM. Importing it from server code is a build error. |
| `shared/` | both | Contracts and pure helpers only — no platform APIs, no runtime-specific SDK entries. |

SDK imports follow the same split: `@getpaseo/plugin` for runtime-neutral helpers (`defineRpc`,
`PluginTheme`), `@getpaseo/plugin/client` and `@getpaseo/plugin/client/react-native` for client
code, `@getpaseo/plugin/server` for server code.

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

It also points `core.hooksPath` at `.githooks/`, whose `commit-msg` hook checks the message against
[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): a type from `feat`, `fix`,
`docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`, an optional `(scope)`,
an optional `!`, then a lower-case subject with no trailing period. A `!` must come with a
`BREAKING CHANGE:` footer and vice versa. It is a POSIX shell script with no dependencies — run
`git config core.hooksPath .githooks` to install it without `npm install`, and
`git commit --no-verify` to skip it.

Issues and pull requests are welcome. Please run `npm run typecheck` before opening one, and keep
new modules inside the `client/` / `server/` / `shared/` layout above.

## License

[MIT](./LICENSE)
