# paseo-usage-sidebar

A [Paseo](https://paseo.sh) plugin that puts provider plan usage in the sidebar.

Paseo already knows how much of your plan is left — it just keeps that behind a settings screen and
a hover tooltip on the composer's context meter. This plugin renders the same data as a persistent
sidebar surface, reachable in one click or from the Command Center.

No new credentials, no vendor CLI, no second polling path: the numbers come from Paseo's own
`provider.usage.list` data, so they always match what Settings → Usage shows.

## What it shows

The surface reproduces the layout of Settings → Usage: one bordered card, one row per provider,
hairline dividers between them.

- **Quota windows** — session, weekly, and model-scoped windows as `57% · resets 2h` with a
  zero-baseline bar.
- **Balances** — money, credits, requests, or tokens, against a ceiling where one exists.
- **Details** — provider-supplied key/value lines such as `Extra usage: Disabled`.
- **Status** — providers that are not signed in stay listed with an `Unavailable` dot rather than
  disappearing, so the list matches what Settings shows.

Spacing, type scale, tone thresholds, and the reset/`runs out` wording are taken from Paseo's own
provider-usage components, so the panel reads identically to the settings screen. The one
difference is provider brand logos: those come from a host-internal icon registry that plugins
cannot import, so rows lead with the provider name.

The surface refreshes every 60 seconds and on demand from **Refresh**.

## Install

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

## What it reads

The plugin reads provider usage through whichever path the host supports. It never reads provider
credentials, never calls a vendor API directly, and never writes anything.

| Paseo | Path |
| --- | --- |
| 0.8 and newer | `paseo.providers.listUsage()` from the plugin SDK. |
| 0.7.x | A short-lived WebSocket to the local daemon, which answers `provider.usage.list`. |

The 0.7 fallback exists because that SDK release does not expose usage to plugins at all. The
surface footer always states which path answered (`via Paseo SDK` or `via local daemon`), so a
misbehaving fallback is visible rather than silent.

### Security implications

Read this before trusting the plugin — Paseo plugins are unsandboxed by design.

- **Server code** runs in a daemon subprocess. On Paseo 0.7 it opens a loopback WebSocket to your
  own daemon (`ws://127.0.0.1:6767/ws` by default), sends the standard `hello` handshake plus one
  `provider.usage.list` request, reads the response, and closes the socket. It performs no other
  daemon operation.
- **No credentials are read, stored, or transmitted.** The plugin never touches
  `~/.claude`, `~/.codex`, the macOS Keychain, or any provider token.
- **No outbound network access.** Nothing leaves the machine; the only socket is loopback to your
  own daemon.
- **No writes.** No config, no cache file, no daemon mutation.
- **Client code** renders the response. It stores nothing.

The daemon endpoint is resolved from `daemon.listen` in `~/.paseo/config.json`, falling back to
`127.0.0.1:6767`. Set `PASEO_USAGE_SIDEBAR_HOST` to override it.

## Known limitations

- **Sidebar placement is host-owned.** Paseo renders plugin sidebar items in its own group, below
  the built-in entries. A plugin cannot place an item in the sidebar footer.
- **The 0.7 fallback is local-only.** It assumes a loopback daemon with no password. A remote host,
  a password-protected daemon, or a runtime without a global `WebSocket` surfaces an error in the
  panel instead of numbers. Paseo 0.8 has none of these constraints because it uses the SDK.
- **Only providers that report usage appear.** Providers without a signed-in session are counted in
  the footer, not rendered.
- **Percentages are the daemon's**, including their refresh cadence. The plugin does not re-derive
  or estimate anything, so a provider that rate-limits its own usage endpoint stays stale until
  Paseo refreshes it.

## Requirements

Paseo 0.7.0 or later. Paseo 0.7's manifest schema rejects a `requirements` field, so the version
floor is documented here rather than declared in `paseo-plugin.json`.

## Development

```bash
npm install
npm run typecheck
paseo plugin install "$PWD"
paseo plugin reload usage-sidebar   # after editing source
paseo plugin logs usage-sidebar
```

`npm install` only installs typecheck-time dependencies. Paseo supplies every runtime module
(`@getpaseo/plugin`, `react`, `react-native`, `@tanstack/react-query`, `zod`), so installing the
plugin never runs a package manager.

| File | Role |
| --- | --- |
| `index.ts` | Registers the RPC handler, surface, sidebar item, and Command Center item. |
| `usage.shared.ts` | Zod contract mirroring the daemon's usage payload. |
| `usage-format.shared.ts` | Percentage, reset, age, and balance formatting matching Paseo's helpers. |
| `usage.server.ts` | SDK-first read with the 0.7 daemon WebSocket fallback. |
| `usage-surface.client.tsx` | The sidebar surface. |

## License

MIT
