/**
 * Lets `node --test` load the plugin's TypeScript sources directly.
 *
 * Node 24 strips the types itself, so the only gap is specifiers: the plugin is
 * written for Paseo's bundler and imports without an extension
 * (`../../shared/usage/contract`), which the ESM resolver rejects. This adds the
 * `.ts` back when — and only when — the extensionless path names a real file, so
 * a genuine typo still fails as a missing module rather than being silently
 * rewritten into a different one.
 *
 * A resolver hook is deliberately preferred over pulling in a TypeScript-aware
 * runner: this keeps the plugin's dependency list at zero for its own tests.
 */
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

/** Matches a specifier that already carries an extension, query string and all. */
const HAS_EXTENSION = /\.[a-z0-9]+(\?|$)/i;

registerHooks({
  resolve(specifier, context, nextResolve) {
    const relative = specifier.startsWith("./") || specifier.startsWith("../");
    if (relative && !HAS_EXTENSION.test(specifier) && context.parentURL) {
      const candidate = `${fileURLToPath(new URL(specifier, context.parentURL))}.ts`;
      if (existsSync(candidate)) {
        return nextResolve(`${specifier}.ts`, context);
      }
    }
    return nextResolve(specifier, context);
  },
});
