# Contributing

Issues and pull requests are welcome. This file covers what to run before opening one, where code
belongs, and how commits are written.

## Before you open a pull request

```bash
npm install
npm run typecheck
npm test
```

Both must pass. There is no build step to run — Paseo bundles the plugin at install time.

## Where code belongs

Paseo 0.8 builds one bundle per entry and enforces the client/server boundary by directory. A module
left at the repository root is a compile error, and the pre-0.8 `*.client.ts` / `*.server.ts`
filename suffixes no longer mean anything.

| Directory | Bundle | Rules |
| --- | --- | --- |
| `server/` | daemon subprocess | May use `node:*`. Importing it from client code is a build error. |
| `client/` | renderer | May use React, React Native, DOM. Importing it from server code is a build error. |
| `shared/` | both | Contracts and pure helpers only — no platform APIs, no runtime-specific SDK entries. |

SDK imports follow the same split: `@getpaseo/plugin` for runtime-neutral helpers (`defineRpc`,
`PluginTheme`), `@getpaseo/plugin/client` and `@getpaseo/plugin/client/react-native` for client code,
`@getpaseo/plugin/server` for server code.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), checked by
the `.githooks/commit-msg` hook:

```
<type>[(scope)][!]: <subject>
```

- **type** — one of `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`,
  `chore`, `revert`.
- **scope** — optional, lower-case: `feat(palette): …`.
- **subject** — lower-case opening word, no trailing period. The type already opens the line, so
  proper nouns belong later in it.
- **`!`** — marks a breaking change and must be paired with a `BREAKING CHANGE:` footer. One
  without the other means a reader who only sees subjects, or only sees footers, misses the break.
- The header is capped at 100 characters. When there is a body, line 2 must be blank and body lines
  stay under 100 characters — except for a line carrying an unwrappable token such as a URL, path,
  or stack frame.

Enable the hook once per checkout:

```bash
npm run hooks:install
```

It is opt-in rather than an `npm install` side effect, because it rewrites `core.hooksPath` in your
Git config. Use `git commit --no-verify` to skip it for one commit.

## Tests

`npm test` runs Node's own test runner against the TypeScript sources directly: no test framework
and no extra dependencies. `test/loader.mjs` is a resolver hook that restores the `.ts` extension the
plugin's bundler-style imports omit, so tests can import `../../shared/…` as written.

Add a case under `test/` next to the existing ones. Anything with a decision worth reviewing — the
colour ramp, the window labels, the dropped-session classifier — is worth a table-driven test.

`PASEO_USAGE_SIDEBAR_FAULT=proven|suspected|unrelated` makes `readUsage` fail on demand, which is how
the dropped-session UI is exercised without suspending the machine and waiting for the daemon's lease
to expire.

## Before you submit

- Run `npm run typecheck` and `npm test`.
- Reload the plugin against a live Paseo (`paseo plugin reload usage-sidebar`) and look at the
  surface you changed, on both a light and a dark theme.
- If you changed behavior, update both `README.md` and `README.zh-CN.md`.
- Keep one concern per pull request.
