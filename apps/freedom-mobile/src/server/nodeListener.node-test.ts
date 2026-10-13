// SPDX-License-Identifier: GPL-3.0-or-later
//
// Listener `node:http` **só para testes** (M3-I5, spec §1 «Listener de teste»):
// dá ao `LocalAssetServer` sockets reais de `127.0.0.1` para provar loopback,
// pedidos hostis, concorrência e paragem. Vive num `*.node-test.ts` porque o
// gate «fronteira offline do app» (`fixtureGate`) proíbe `node:http|net` em todo
// o código não-teste; nunca entra no bundle. Sem testes próprios.
import http from 'node:http'
import type { AddressInfo, Socket } from 'node:net'

import type {
  HeaderValue,
  HttpListenerPort,
  ListenAddress,
  RequestHandler
} from './types.ts'

export interface NodeListenerOptions {
  /** Por omissão `127.0.0.1`; `0.0.0.0` serve para provar o fail-closed. */
  bindHost?: string
  headersTimeoutMs?: number
  requestTimeoutMs?: number
  keepAliveTimeoutMs?: number
  /** O Node só verifica os timeouts a cada 30 s por omissão. */
  checkIntervalMs?: number
  maxHeaderSize?: number
}

export interface NodeListener extends HttpListenerPort {
  /** Ligações TCP abertas neste instante. */
  openConnections(): number
  /** Pedidos que o handler já respondeu. */
  readonly served: number
  /**
   * Fecha o socket **por baixo**, sem avisar o núcleo (o SO a suspender a app):
   * dispara `onClosed`, ao contrário de `close()`.
   */
  crash(): Promise<void>
}

export function createNodeListener(
  options: NodeListenerOptions = {}
): NodeListener {
  let server: http.Server | null = null
  const sockets = new Set<Socket>()
  let closing = false
  let served = 0

  const listener: NodeListener = {
    get served() {
      return served
    },
    openConnections: () => sockets.size,

    async listen(
      handler: RequestHandler,
      onClosed: () => void
    ): Promise<ListenAddress> {
      closing = false
      const s = http.createServer(
        {
          maxHeaderSize: options.maxHeaderSize ?? 8 * 1024,
          headersTimeout: options.headersTimeoutMs ?? 5_000,
          requestTimeout: options.requestTimeoutMs ?? 10_000,
          keepAliveTimeout: options.keepAliveTimeoutMs ?? 1_000,
          connectionsCheckingInterval: options.checkIntervalMs ?? 50
        },
        (req, res) => {
          const headers: Record<string, HeaderValue> = {}
          for (const key of Object.keys(req.headers)) {
            headers[key] = req.headers[key]
          }
          handler({
            method: req.method ?? '',
            target: req.url ?? '',
            headers
          }).then(
            out => {
              served++
              res.writeHead(out.status, out.headers)
              res.end(out.body ? Buffer.from(out.body) : undefined)
            },
            () => {
              res.writeHead(500, { 'Content-Length': '0' })
              res.end()
            }
          )
        }
      )
      s.on('connection', socket => {
        sockets.add(socket)
        socket.on('close', () => sockets.delete(socket))
        socket.on('error', () => undefined)
      })
      s.on('clientError', (_error, socket) => {
        socket.destroy()
      })
      s.on('close', () => {
        if (!closing) onClosed()
      })
      server = s
      await new Promise<void>((resolve, reject) => {
        s.once('error', reject)
        s.listen({ host: options.bindHost ?? '127.0.0.1', port: 0 }, resolve)
      })
      const a = s.address() as AddressInfo
      return { host: a.address, port: a.port }
    },

    async crash(): Promise<void> {
      const s = server
      if (!s) return
      server = null
      await new Promise<void>(resolve => {
        s.close(() => resolve())
        s.closeAllConnections()
      })
    },

    async close(): Promise<void> {
      const s = server
      if (!s) return
      closing = true
      server = null
      await new Promise<void>(resolve => {
        s.close(() => resolve())
        s.closeAllConnections()
      })
    }
  }
  return listener
}

/** Desfecho de um pedido cru: estado + corpo, ou o erro de transporte. */
export type RawOutcome =
  | { kind: 'response'; status: number; head: string; body: string }
  | { kind: 'closed'; received: string }
  | { kind: 'error'; code: string }
