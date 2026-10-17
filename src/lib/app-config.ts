/**
 * Runtime app config.
 *
 * Client-visible per-deployment values (the WIP namespace, …) come from the
 * server at runtime — `GET <base>/api/app-config` — NOT from `VITE_*`
 * build-time bakes. A bake and the server's runtime env are two independent
 * sources that drift silently: the server reads `WIP_NAMESPACE` at runtime
 * while a baked client constant keeps whatever the build saw.
 * (`VITE_BASE_PATH` is the deliberate exception: consumed at bundle-emit
 * time, and loud when wrong.)
 *
 * main.tsx awaits this once before first render; the result is cached
 * module-level so every caller shares the same request.
 */

export interface AppConfig {
  /** The deployment's WIP namespace; null when the server has none configured. */
  namespace: string | null
  [key: string]: unknown
}

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')

let cached: Promise<AppConfig> | null = null

export function fetchAppConfig(): Promise<AppConfig> {
  if (!cached) {
    cached = fetch(`${BASE}/api/app-config`).then((res) => {
      if (!res.ok) {
        // Fail loud: a missing config endpoint means the server contract is
        // broken; silently defaulting would reintroduce the drift.
        cached = null
        throw new Error(`app-config fetch failed: HTTP ${res.status}`)
      }
      return res.json() as Promise<AppConfig>
    })
  }
  return cached
}
