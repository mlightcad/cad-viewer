// SPDX-License-Identifier: GPL-3.0-or-later
//
// Portas e tipos do servidor loopback (docs/OBJ-0104-m3-i5-local-asset-server-spec.md §4.1).
// O núcleo (`localAssetServer.ts`) é puro: sockets, ficheiros e aleatoriedade
// entram só por estas interfaces.

export type HeaderValue = string | readonly string[] | undefined

/** Pedido já analisado pelo listener. Só `GET`/`HEAD` sem corpo são servidos. */
export interface ServerRequest {
  method: string
  /** request-target tal como chegou (caminho + query), sem normalização. */
  target: string
  /** Nomes preferencialmente em minúsculas; o núcleo normaliza na mesma. */
  headers: Readonly<Record<string, HeaderValue>>
}

export interface ServerResponse {
  status: number
  headers: Record<string, string>
  /** `null` = sem corpo (`HEAD`). */
  body: Uint8Array | null
}

/** Nunca rejeita: qualquer defeito vira uma resposta 5xx fixa. */
export type RequestHandler = (req: ServerRequest) => Promise<ServerResponse>

export interface ListenAddress {
  host: string
  port: number
}

/**
 * Listener HTTP/1.1 de loopback. O núcleo pede `127.0.0.1` e porta efémera e
 * **valida** o endereço devolvido; o adaptador nativo (S2) tem de escutar só aí.
 */
export interface HttpListenerPort {
  /** Resolve quando está a escutar; `onClosed` dispara se o SO o fechar sozinho. */
  listen(handler: RequestHandler, onClosed: () => void): Promise<ListenAddress>
  /** Pára de aceitar e fecha as ligações; idempotente. */
  close(): Promise<void>
}

export interface BundleEntry {
  /** Tamanho declarado (manifesto); a leitura tem de o confirmar. */
  size: number
  read(): Promise<Uint8Array>
}

/** Lista permitida dos ficheiros do viewer (caminhos relativos já validados). */
export interface BundleSourcePort {
  lookup(path: string): BundleEntry | null
}

/** Bytes dos assets copiados (pasta controlada do app). */
export interface AssetBytesPort {
  /** `null` = o asset já não existe. */
  sizeOf(assetId: string): Promise<number | null>
  read(assetId: string): Promise<Uint8Array>
}

export type ServerState =
  | 'stopped'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'disposed'

/**
 * Eventos de diagnóstico. **Nunca** contêm URL, token, assetId nem caminhos
 * (spec §3 A4): só estado, classe de rota, estado HTTP e contagens.
 */
export type ServerEvent =
  | { kind: 'state'; state: ServerState }
  | {
      kind: 'request'
      route: 'bundle' | 'asset' | 'rejected'
      status: number
      ms: number
    }
  | { kind: 'grant'; active: number }
  | { kind: 'revoke'; active: number }
  | { kind: 'drain-timeout'; pending: number }
  | { kind: 'listener-lost' }
  | { kind: 'close-failed' }

export interface ServerInfo {
  /** `http://127.0.0.1:<porta>` */
  origin: string
  /** Página do viewer (contém o token): só em memória, nunca registar. */
  viewerUrl: string
}
