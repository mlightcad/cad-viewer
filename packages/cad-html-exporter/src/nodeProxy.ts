import { execFileSync } from 'node:child_process'
import http from 'node:http'
import https from 'node:https'
import tls from 'node:tls'

const WINDOWS_PROXY_KEY =
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'

const MAX_REDIRECTS = 5
const FETCH_ATTEMPTS = 3
const FETCH_TIMEOUT_MS = 180_000

/**
 * Turns a proxy env / WinINET `ProxyServer` value into an HTTP proxy URL.
 *
 * Accepts `host:port`, `http://host:port`, and the WinINET map form
 * `http=host:port;https=host:port`. SOCKS-only values are ignored.
 */
export function normalizeProxyServer(raw: string | undefined): string | undefined {
  if (!raw) return
  const value = raw.trim()
  if (!value || /^socks/i.test(value)) return
  if (/^https?:\/\//i.test(value)) return value

  if (value.includes('=')) {
    const map = new Map<string, string>()
    for (const part of value.split(';')) {
      const eq = part.indexOf('=')
      if (eq <= 0) continue
      map.set(part.slice(0, eq).trim().toLowerCase(), part.slice(eq + 1).trim())
    }
    return normalizeProxyServer(map.get('https') ?? map.get('http'))
  }

  return `http://${value}`
}

let cachedProxy: string | undefined | null = null

/**
 * Proxy for outbound CDN fetches.
 *
 * Prefers `HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY`. On Windows, falls back to
 * the current user's Internet Settings proxy (the same one the browser uses)
 * when no env proxy is set.
 */
export function resolveOutboundProxy(): string | undefined {
  if (cachedProxy !== null) return cachedProxy ?? undefined
  const fromEnv = normalizeProxyServer(
    process.env.HTTPS_PROXY ||
      process.env.https_proxy ||
      process.env.HTTP_PROXY ||
      process.env.http_proxy ||
      process.env.ALL_PROXY ||
      process.env.all_proxy
  )
  cachedProxy = fromEnv ?? readWindowsSystemProxy()
  return cachedProxy
}

function readWindowsSystemProxy(): string | undefined {
  if (process.platform !== 'win32') return
  try {
    const enable = execFileSync(
      'reg',
      ['query', WINDOWS_PROXY_KEY, '/v', 'ProxyEnable'],
      { encoding: 'utf8', windowsHide: true }
    )
    if (!/\b0x1\b/.test(enable)) return
    const server = execFileSync(
      'reg',
      ['query', WINDOWS_PROXY_KEY, '/v', 'ProxyServer'],
      { encoding: 'utf8', windowsHide: true }
    )
    const line = server.split(/\r?\n/).find(row => /ProxyServer/i.test(row))
    const value = line?.trim().split(/\s+/).pop()
    return normalizeProxyServer(value)
  } catch {
    return
  }
}

const agents = new Map<string, https.Agent>()

function proxyAgent(proxyUrl: string): https.Agent {
  let agent = agents.get(proxyUrl)
  if (!agent) {
    const proxy = new URL(proxyUrl)
    agent = new https.Agent({ keepAlive: true })
    agent.createConnection = ((
      options: https.RequestOptions,
      callback?: (err: Error | null, stream?: tls.TLSSocket) => void
    ) => {
      const host = options.hostname || options.host || ''
      const port = options.port || 443
      const servername = options.servername || host || undefined
      const req = http.request({
        host: proxy.hostname,
        port: proxy.port,
        method: 'CONNECT',
        path: `${host}:${port}`,
        headers: { Host: `${host}:${port}` }
      })
      req.once('connect', (res, socket) => {
        if (res.statusCode !== 200) {
          socket.destroy()
          callback?.(new Error(`Proxy CONNECT failed: ${res.statusCode}`))
          return
        }
        callback?.(
          null,
          tls.connect({
            socket,
            servername
          })
        )
      })
      req.once('error', error => callback?.(error))
      req.end()
      return undefined
    }) as https.Agent['createConnection']
    agents.set(proxyUrl, agent)
  }
  return agent
}

/**
 * GET binary with optional HTTP proxy and a few retries.
 * Used for the font CDN, which browsers reach through the system proxy while
 * Node `fetch` does not.
 */
export async function nodeFetchBytes(
  url: string
): Promise<{ status: number; bytes: Uint8Array }> {
  const proxy = resolveOutboundProxy()
  let lastError: unknown
  for (let attempt = 0; attempt < FETCH_ATTEMPTS; attempt++) {
    try {
      return proxy
        ? await fetchBytesViaProxy(url, proxy, MAX_REDIRECTS)
        : await fetchBytesDirect(url)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('fetch failed')
}

async function fetchBytesDirect(
  url: string
): Promise<{ status: number; bytes: Uint8Array }> {
  const response = await fetch(url)
  return {
    status: response.status,
    bytes: new Uint8Array(await response.arrayBuffer())
  }
}

function fetchBytesViaProxy(
  url: string,
  proxyUrl: string,
  redirectsLeft: number
): Promise<{ status: number; bytes: Uint8Array }> {
  return new Promise((resolve, reject) => {
    const target = new URL(url)
    const req = https.get(
      url,
      {
        agent: proxyAgent(proxyUrl),
        headers: {
          'accept-encoding': 'identity',
          'user-agent': 'cad-html-exporter'
        }
      },
      res => {
        const status = res.statusCode ?? 0
        if (
          status >= 300 &&
          status < 400 &&
          res.headers.location &&
          redirectsLeft > 0
        ) {
          res.resume()
          const next = new URL(res.headers.location, target).toString()
          fetchBytesViaProxy(next, proxyUrl, redirectsLeft - 1).then(
            resolve,
            reject
          )
          return
        }
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => {
          resolve({ status, bytes: new Uint8Array(Buffer.concat(chunks)) })
        })
        res.on('error', reject)
      }
    )
    req.setTimeout(FETCH_TIMEOUT_MS, () => {
      req.destroy(new Error(`Font download timed out: ${url}`))
    })
    req.on('error', reject)
  })
}
