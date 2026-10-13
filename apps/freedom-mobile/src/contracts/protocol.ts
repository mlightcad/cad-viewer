// SPDX-License-Identifier: GPL-3.0-or-later
//
// Contrato local app ↔ viewer, v1 (docs/OBJ-0104-architecture.md §5.1–§5.2).
// Só tipos e funções puras: sem React Native, sem parser, sem @mlightcad/*.
// A app nunca interpreta DWG/DXF; apenas troca mensagens JSON com a superfície
// do viewer (packages/cad-mobile-viewer, B2).

export const PROTOCOL_VERSION = 1 as const

/** Formatos suportados em v1 (D-3). O viewer converte DWG via LibreDWG (D-2). */
export type DocumentFormat = 'dwg' | 'dxf'

/** Capacidades anunciadas pelo viewer em `ready`. */
export type Capability = 'find' | 'dwg' | 'dxf'

/** `unavailable` = worker/wasm DWG não carregou; DXF continua (§6.4). */
export type DwgStatus = 'ok' | 'unavailable'

/**
 * app → viewer. FIND/zoom/realce ficam apenas **reservados** (D-4): o nome
 * existe no contrato, o comportamento chega em cards posteriores.
 */
export const APP_TO_VIEWER_TYPES = [
  'open',
  'find',
  'goto',
  'findNext',
  'findPrev',
  'zoom',
  'clearHighlight',
  'setInsets'
] as const
export type AppToViewerType = (typeof APP_TO_VIEWER_TYPES)[number]

/** viewer → app. */
export const VIEWER_TO_APP_TYPES = [
  'ready',
  'opened',
  'openFailed',
  'findResult',
  'findActive',
  'error',
  'log'
] as const
export type ViewerToAppType = (typeof VIEWER_TO_APP_TYPES)[number]

export interface Envelope<T extends string = string, P = Record<string, unknown>> {
  v: typeof PROTOCOL_VERSION
  id: string
  type: T
  replyTo?: string
  payload: P
}

export interface ReadyPayload {
  viewerVersion: string
  protocol: typeof PROTOCOL_VERSION
  caps: Capability[]
  dwg: DwgStatus
}

export type OpenSource =
  | { kind: 'url'; url: string }
  | { kind: 'base64'; data: string }

export interface OpenPayload {
  name: string
  size: number
  source: OpenSource
}

export interface OpenedPayload {
  name: string
  format: DocumentFormat
  layouts: { name: string; btrId: string; tabOrder: number }[]
  activeLayoutId: string
}

export type OpenFailedCode =
  | 'unsupported-ext'
  | 'too-large'
  | 'read-failed'
  | 'parse'
  | 'dwg-unavailable'
  | 'oom'
  | 'timeout'

export interface OpenFailedPayload {
  code: OpenFailedCode
  message: string
}

export interface ErrorPayload {
  code: string
  message: string
  replyTo?: string
}

export interface LogPayload {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
}

export type ProtocolErrorCode =
  | 'invalid-json'
  | 'invalid-envelope'
  | 'unsupported-version'
  | 'unknown-type'

export interface ProtocolError {
  code: ProtocolErrorCode
  message: string
}

export type ParseResult =
  | { ok: true; message: Envelope<ViewerToAppType> }
  | { ok: false; error: ProtocolError }

const fail = (code: ProtocolErrorCode, message: string): ParseResult => ({
  ok: false,
  error: { code, message }
})

const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x)

/**
 * Valida uma mensagem vinda do viewer (`onMessage`, string JSON). Nunca lança.
 * Só aceita tipos viewer → app: um tipo app → viewer vindo da web é `unknown-type`.
 */
export function parseViewerMessage(raw: unknown): ParseResult {
  if (typeof raw !== 'string') {
    return fail('invalid-json', 'a mensagem do viewer não é uma string')
  }
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return fail('invalid-json', 'JSON inválido')
  }
  if (
    !isRecord(data) ||
    typeof data.id !== 'string' ||
    typeof data.type !== 'string' ||
    typeof data.v !== 'number' ||
    !isRecord(data.payload) ||
    (data.replyTo !== undefined && typeof data.replyTo !== 'string')
  ) {
    return fail('invalid-envelope', 'envelope inválido')
  }
  if (data.v !== PROTOCOL_VERSION) {
    return fail('unsupported-version', `versão ${data.v} não suportada`)
  }
  if (!(VIEWER_TO_APP_TYPES as readonly string[]).includes(data.type)) {
    return fail('unknown-type', `tipo desconhecido: ${data.type}`)
  }
  return {
    ok: true,
    message: {
      v: PROTOCOL_VERSION,
      id: data.id,
      type: data.type as ViewerToAppType,
      ...(data.replyTo !== undefined ? { replyTo: data.replyTo } : {}),
      payload: data.payload
    }
  }
}

/**
 * Script para `webview.injectJavaScript` (§5.1): duplo `JSON.stringify` dá um
 * literal JS seguro. `<`, U+2028 e U+2029 são escapados para o script nunca
 * conter `</script>` nem terminadores de linha crus.
 */
export function encodeInjection(msg: Envelope<AppToViewerType>): string {
  const literal = JSON.stringify(JSON.stringify(msg))
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
  return `window.__cadBridge.receive(${literal});true;`
}

/** Ids monotónicos por lado, com prefixo (`a-1`, `a-2`, …). */
export function createIdGenerator(prefix: string): () => string {
  let n = 0
  return () => `${prefix}-${++n}`
}

/**
 * Extensão → formato. O viewer trata qualquer extensão ≠ `dwg` como DXF
 * (AcApDocument.ts:154), por isso a app valida antes de enviar `open` (§5.2).
 */
export function detectDocumentFormat(name: string): DocumentFormat | null {
  const m = /\.(dwg|dxf)$/i.exec(name)
  if (!m || m.index === 0) return null
  return m[1].toLowerCase() as DocumentFormat
}
