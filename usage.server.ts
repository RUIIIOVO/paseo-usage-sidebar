import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { PluginHandlerContext } from "@getpaseo/plugin";
import { UsageSnapshotSchema, type UsageSnapshot } from "./usage.shared";

const DEFAULT_ENDPOINT = "127.0.0.1:6767";
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Paseo 0.8 exposes provider usage through the plugin SDK. 0.7 does not, so the
 * fallback below asks the local daemon directly over its own WebSocket.
 */
type MaybeUsageCapableProviders = {
  listUsage?: (options?: { requestId?: string }) => Promise<unknown>;
};

function paseoHome(): string {
  const override = process.env.PASEO_HOME?.trim();
  return override ? override : join(homedir(), ".paseo");
}

function readJsonFile(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    return null;
  }
}

/**
 * `daemon.listen` in ~/.paseo/config.json wins over the default. A wildcard bind
 * address is rewritten to loopback because the plugin always talks to its own host.
 */
export function resolveDaemonEndpoint(): string {
  const override = process.env.PASEO_USAGE_SIDEBAR_HOST?.trim();
  if (override) {
    return normalizeEndpoint(override);
  }
  const config = readJsonFile(join(paseoHome(), "config.json")) as
    | { daemon?: { listen?: unknown } }
    | null;
  const listen = config?.daemon?.listen;
  if (typeof listen === "string" && listen.trim()) {
    return normalizeEndpoint(listen.trim());
  }
  return DEFAULT_ENDPOINT;
}

function normalizeEndpoint(endpoint: string): string {
  const withoutScheme = endpoint.replace(/^(ws|wss|http|https|tcp):\/\//, "");
  const [host, port] = splitHostPort(withoutScheme);
  const reachableHost = host === "0.0.0.0" || host === "::" || host === "[::]" ? "127.0.0.1" : host;
  return port ? `${reachableHost}:${port}` : `${reachableHost}:6767`;
}

function splitHostPort(value: string): [string, string | null] {
  const ipv6 = value.match(/^(\[[^\]]+\]):(\d+)$/);
  if (ipv6) {
    return [ipv6[1] as string, ipv6[2] as string];
  }
  const lastColon = value.lastIndexOf(":");
  if (lastColon === -1) {
    return [value, null];
  }
  return [value.slice(0, lastColon), value.slice(lastColon + 1)];
}

function resolveClientId(): string {
  const stored = (() => {
    try {
      return readFileSync(join(paseoHome(), "cli-client-id"), "utf8").trim();
    } catch {
      return "";
    }
  })();
  const base = stored || randomUUID();
  return `${base}-usage-sidebar`;
}

type DaemonEnvelope = {
  type?: string;
  message?: { type?: string; payload?: unknown };
};

/**
 * One short-lived connection per refresh. The daemon closes idle sockets itself and
 * a persistent client would have to re-implement reconnect, heartbeat, and backoff
 * for no benefit at this refresh cadence.
 */
function fetchUsageFromDaemon(): Promise<unknown> {
  if (typeof WebSocket !== "function") {
    return Promise.reject(
      new Error("This runtime has no global WebSocket. Paseo 0.8 or newer reads usage through the plugin SDK instead."),
    );
  }

  const endpoint = resolveDaemonEndpoint();
  const requestId = randomUUID();

  return new Promise<unknown>((resolve, reject) => {
    const socket = new WebSocket(`ws://${endpoint}/ws`);
    let settled = false;
    let helloAcknowledged = false;

    const timer = setTimeout(() => {
      finish(new Error(`The daemon at ${endpoint} did not answer within ${REQUEST_TIMEOUT_MS} ms`));
    }, REQUEST_TIMEOUT_MS);

    function finish(error: Error | null, payload?: unknown): void {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        // The socket is already gone; nothing to release.
      }
      if (error) {
        reject(error);
      } else {
        resolve(payload);
      }
    }

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "hello",
          clientId: resolveClientId(),
          clientType: "cli",
          protocolVersion: 1,
          capabilities: {},
        }),
      );
    };

    socket.onmessage = (event: MessageEvent) => {
      let envelope: DaemonEnvelope;
      try {
        envelope = JSON.parse(String(event.data)) as DaemonEnvelope;
      } catch {
        return;
      }

      // The daemon's server_info status doubles as the hello acknowledgement.
      if (!helloAcknowledged) {
        helloAcknowledged = true;
        socket.send(
          JSON.stringify({
            type: "session",
            message: { type: "provider.usage.list.request", requestId },
          }),
        );
        return;
      }

      const message = envelope.message;
      if (!message || typeof message.type !== "string") {
        return;
      }
      const payload = message.payload as { requestId?: string; error?: string } | undefined;
      if (payload?.requestId !== requestId) {
        return;
      }
      if (message.type === "provider.usage.list.response") {
        finish(null, payload);
        return;
      }
      if (message.type === "rpc_error") {
        finish(new Error(payload?.error ?? "The daemon rejected the usage request"));
      }
    };

    socket.onerror = () => {
      finish(new Error(`Cannot reach the Paseo daemon at ${endpoint}`));
    };

    socket.onclose = (event: CloseEvent) => {
      const reason = event.reason?.trim();
      finish(
        new Error(
          reason
            ? `The daemon closed the connection (${event.code}): ${reason}`
            : `The daemon closed the connection (${event.code})`,
        ),
      );
    };
  });
}

function normalize(payload: unknown, source: UsageSnapshot["source"]): UsageSnapshot {
  const raw = (payload ?? {}) as { fetchedAt?: unknown; providers?: unknown };
  return UsageSnapshotSchema.parse({
    fetchedAt: typeof raw.fetchedAt === "string" ? raw.fetchedAt : null,
    source,
    providers: Array.isArray(raw.providers) ? raw.providers : [],
  });
}

export async function readUsage(_input: Record<string, never>, context: PluginHandlerContext): Promise<UsageSnapshot> {
  const providers = context.paseo.providers as unknown as MaybeUsageCapableProviders;

  if (typeof providers.listUsage === "function") {
    return normalize(await providers.listUsage(), "sdk");
  }

  return normalize(await fetchUsageFromDaemon(), "daemon");
}
