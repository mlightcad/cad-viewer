// SPDX-License-Identifier: GPL-3.0-or-later
//
// Contrato local app ↔ viewer, v1 (docs/OBJ-0104-architecture.md §5.1–§5.5).
// Só tipos e funções puras: sem React Native, sem parser, sem @mlightcad/*.
// A app nunca interpreta DWG/DXF; apenas troca mensagens JSON com a superfície
// do viewer (packages/cad-mobile-viewer, B2).
//
// Fail-closed (M1-B2): toda a mensagem recebida ou a enviar é validada campo a
// campo; um payload inválido nunca é "corrigido" nem ignorado em silêncio —
// devolve-se um erro explícito que o chamador tem de tratar.

export const PROTOCOL_VERSION = 1 as const

/** Formatos suportados em v1 (D-3). O viewer converte DWG via LibreDWG (D-2). */
export type DocumentFormat = 'dwg' | 'dxf'

/** Capacidades anunciadas pelo viewer em `ready`. */
export type Capability = 'find' | 'dwg' | 'dxf'

/** `unavailable` = worker/wasm DWG não carregou; DXF continua (§6.4). */
export type DwgStatus = 'ok' | 'unavailable'

/** app → viewer (§5.2). FIND é first-class (D-4): payloads explícitos abaixo. */
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

export interface Envelope<T extends string = string, P = unknown> {
  v: typeof PROTOCOL_VERSION
  id: string
  type: T
  replyTo?: string
  payload: P
}

// ---------------------------------------------------------------------------
// Limites [H] (§4, §5.3): recalibrados em S2.
// ---------------------------------------------------------------------------

/** Tamanho máximo por formato, em bytes ([H] 20 MB DXF / 10 MB DWG, §4). */
export const MAX_DOCUMENT_BYTES: Record<DocumentFormat, number> = {
  dxf: 20 * 1024 * 1024,
  dwg: 10 * 1024 * 1024
}
/** Acima disto a entrega `base64` é recusada; só `url` ([H] 8 MB, §5.3). */
export const MAX_BASE64_BYTES = 8 * 1024 * 1024
/** Limite de hits por pesquisa (`ACAP_FIND_MAX_RESULTS`, findText.ts:35). */
export const FIND_MAX_RESULTS = 500
/** Intervalo aceite para `zoom.factor` ([H]); fora disto é rejeitado. */
export const ZOOM_FACTOR_MIN = 0.1
export const ZOOM_FACTOR_MAX = 10

// ---------------------------------------------------------------------------
// Payloads viewer → app
// ---------------------------------------------------------------------------

export interface ReadyPayload {
  viewerVersion: string
  protocol: typeof PROTOCOL_VERSION
  caps: Capability[]
  dwg: DwgStatus
}

export interface LayoutInfo {
  name: string
  btrId: string
  tabOrder: number
}

export interface OpenedPayload {
  name: string
  format: DocumentFormat
  layouts: LayoutInfo[]
  activeLayoutId: string
}

export const OPEN_FAILED_CODES = [
  'unsupported-ext',
  'too-large',
  'read-failed',
  'parse',
  'dwg-unavailable',
  'oom',
  'timeout'
] as const
export type OpenFailedCode = (typeof OPEN_FAILED_CODES)[number]

export interface OpenFailedPayload {
  code: OpenFailedCode
  message: string
}

/** Tipo de entidade que produziu o hit (`AcApFindHitKind`, findText.ts:38-47). */
export const FIND_HIT_KINDS = [
  'text',
  'mtext',
  'attribute',
  'block',
  'dimension',
  'leader',
  'table'
] as const
export type FindHitKind = (typeof FIND_HIT_KINDS)[number]

/** Projecção de `AcApFindLayoutHit` sem `entityId`/`extents`/`position` (§5.2). */
export interface FindHit {
  index: number
  text: string
  excerpt: string
  layoutName: string
  layoutId: string
  layer: string
  kind: FindHitKind
  tag?: string
  blockName?: string
}

/** Invariante do contrato: `hits[i].index === i` e `hits.length === total`. */
export interface FindResultPayload {
  findId: number
  total: number
  truncated: boolean
  layoutCount: number
  hits: FindHit[]
}

/** `AcApFindNavigateResult` (AcApFindNavigator.ts:123-129). */
export const FIND_OUTCOMES = [
  'navigated',
  'layout-mismatch',
  'layout-missing',
  'layout-switch-failed',
  'no-document',
  'stale'
] as const
export type FindOutcome = (typeof FIND_OUTCOMES)[number]

/** `index === -1` = nenhum hit activo (sem hits, ou navegação descartada). */
export interface FindActivePayload {
  findId: number
  index: number
  outcome: FindOutcome
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

// ---------------------------------------------------------------------------
// Payloads app → viewer
// ---------------------------------------------------------------------------

export type OpenSource =
  | { kind: 'url'; url: string }
  | { kind: 'base64'; data: string }

export interface OpenPayload {
  name: string
  size: number
  source: OpenSource
}

export type FindScope = 'drawing' | 'layout'

export interface FindPayload {
  query: string
  matchCase: boolean
  scope: FindScope
  maxResults?: number
}

/** Margens da área visível, em px CSS da WebView (§5.5). */
export interface Insets {
  left: number
  right: number
  top: number
  bottom: number
}

export interface GotoPayload {
  findId: number
  index: number
  insets?: Insets
}

export interface FindStepPayload {
  findId: number
  insets?: Insets
}

export type ZoomOp = 'in' | 'out' | 'extents'

export interface ZoomPayload {
  op: ZoomOp
  factor?: number
}

export type ClearHighlightPayload = Record<string, never>

/** Mapa tipo → payload; fonte única para as uniões abaixo. */
export interface AppPayloads {
  open: OpenPayload
  find: FindPayload
  goto: GotoPayload
  findNext: FindStepPayload
  findPrev: FindStepPayload
  zoom: ZoomPayload
  clearHighlight: ClearHighlightPayload
  setInsets: Insets
}

export interface ViewerPayloads {
  ready: ReadyPayload
  opened: OpenedPayload
  openFailed: OpenFailedPayload
  findResult: FindResultPayload
  findActive: FindActivePayload
  error: ErrorPayload
  log: LogPayload
}

export type AppMessage = {
  [T in AppToViewerType]: Envelope<T, AppPayloads[T]>
}[AppToViewerType]

export type ViewerMessage = {
  [T in ViewerToAppType]: Envelope<T, ViewerPayloads[T]>
}[ViewerToAppType]

// ---------------------------------------------------------------------------
// Erros (explícitos; nunca fallback silencioso)
// ---------------------------------------------------------------------------

/** Erros de mensagens **recebidas** do viewer. */
export type ProtocolErrorCode =
  | 'invalid-json'
  | 'invalid-envelope'
  | 'unsupported-version'
  | 'unknown-type'
  | 'invalid-payload'

export interface ProtocolError {
  code: ProtocolErrorCode
  message: string
  /** Tipo (já conhecido) cujo payload falhou a validação. */
  type?: string
  /** `replyTo` do envelope inválido, quando legível. */
  replyTo?: string
}

/** Erros de mensagens a **enviar**: nada chega ao viewer. */
export type OutgoingErrorCode =
  | 'invalid-payload'
  | 'unsupported-ext'
  | 'too-large'

export interface OutgoingError {
  code: OutgoingErrorCode
  message: string
}

export type ParseResult =
  | { ok: true; message: ViewerMessage }
  | { ok: false; error: ProtocolError }

export type BuildResult =
  | { ok: true; message: AppMessage }
  | { ok: false; error: OutgoingError }

// ---------------------------------------------------------------------------
// Guardas primitivas
// ---------------------------------------------------------------------------

const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x)

const isString = (x: unknown): x is string => typeof x === 'string'
const isNonEmptyString = (x: unknown): x is string =>
  typeof x === 'string' && x.length > 0
const isInt = (x: unknown): x is number =>
  typeof x === 'number' && Number.isInteger(x)
const isNonNegInt = (x: unknown): x is number => isInt(x) && x >= 0
const isOneOf = <T extends string>(list: readonly T[], x: unknown): x is T =>
  typeof x === 'string' && (list as readonly string[]).includes(x)

const CAPS: readonly Capability[] = ['find', 'dwg', 'dxf']
const FORMATS: readonly DocumentFormat[] = ['dwg', 'dxf']
const LOG_LEVELS: readonly LogPayload['level'][] = [
  'debug',
  'info',
  'warn',
  'error'
]

/** Guarda do payload de `ready`: o viewer é código externo à app, nada se assume. */
export function isReadyPayload(p: unknown): p is ReadyPayload {
  return (
    isRecord(p) &&
    isString(p.viewerVersion) &&
    p.protocol === PROTOCOL_VERSION &&
    Array.isArray(p.caps) &&
    p.caps.every(c => isOneOf(CAPS, c)) &&
    (p.dwg === 'ok' || p.dwg === 'unavailable')
  )
}

function isOpenedPayload(p: unknown): p is OpenedPayload {
  return (
    isRecord(p) &&
    isNonEmptyString(p.name) &&
    isOneOf(FORMATS, p.format) &&
    isString(p.activeLayoutId) &&
    Array.isArray(p.layouts) &&
    p.layouts.every(
      l =>
        isRecord(l) &&
        isString(l.name) &&
        isString(l.btrId) &&
        isNonNegInt(l.tabOrder)
    )
  )
}

function isOpenFailedPayload(p: unknown): p is OpenFailedPayload {
  return (
    isRecord(p) && isOneOf(OPEN_FAILED_CODES, p.code) && isString(p.message)
  )
}

function isFindHit(h: unknown, i: number): h is FindHit {
  return (
    isRecord(h) &&
    h.index === i &&
    isString(h.text) &&
    isString(h.excerpt) &&
    isString(h.layoutName) &&
    isString(h.layoutId) &&
    isString(h.layer) &&
    isOneOf(FIND_HIT_KINDS, h.kind) &&
    (h.tag === undefined || isString(h.tag)) &&
    (h.blockName === undefined || isString(h.blockName))
  )
}

function isFindResultPayload(p: unknown): p is FindResultPayload {
  return (
    isRecord(p) &&
    isNonNegInt(p.findId) &&
    isNonNegInt(p.total) &&
    typeof p.truncated === 'boolean' &&
    isNonNegInt(p.layoutCount) &&
    Array.isArray(p.hits) &&
    p.hits.length === p.total &&
    p.hits.every((h, i) => isFindHit(h, i))
  )
}

function isFindActivePayload(p: unknown): p is FindActivePayload {
  return (
    isRecord(p) &&
    isNonNegInt(p.findId) &&
    isInt(p.index) &&
    p.index >= -1 &&
    isOneOf(FIND_OUTCOMES, p.outcome)
  )
}

function isErrorPayload(p: unknown): p is ErrorPayload {
  return (
    isRecord(p) &&
    isNonEmptyString(p.code) &&
    isString(p.message) &&
    (p.replyTo === undefined || isString(p.replyTo))
  )
}

function isLogPayload(p: unknown): p is LogPayload {
  return isRecord(p) && isOneOf(LOG_LEVELS, p.level) && isString(p.message)
}

const VIEWER_PAYLOAD_GUARDS: {
  [T in ViewerToAppType]: (p: unknown) => p is ViewerPayloads[T]
} = {
  ready: isReadyPayload,
  opened: isOpenedPayload,
  openFailed: isOpenFailedPayload,
  findResult: isFindResultPayload,
  findActive: isFindActivePayload,
  error: isErrorPayload,
  log: isLogPayload
}

const failParse = (
  code: ProtocolErrorCode,
  message: string,
  extra: Pick<ProtocolError, 'type' | 'replyTo'> = {}
): ParseResult => ({ ok: false, error: { code, message, ...extra } })

/**
 * Valida uma mensagem vinda do viewer (`onMessage`, string JSON). Nunca lança.
 * Só aceita tipos viewer → app (um tipo app → viewer vindo da web é
 * `unknown-type`) e **valida o payload do tipo**: payload malformado é
 * `invalid-payload`, nunca aceite nem descartado em silêncio.
 */
export function parseViewerMessage(raw: unknown): ParseResult {
  if (typeof raw !== 'string') {
    return failParse('invalid-json', 'a mensagem do viewer não é uma string')
  }
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return failParse('invalid-json', 'JSON inválido')
  }
  if (
    !isRecord(data) ||
    typeof data.id !== 'string' ||
    typeof data.type !== 'string' ||
    typeof data.v !== 'number' ||
    !isRecord(data.payload) ||
    (data.replyTo !== undefined && typeof data.replyTo !== 'string')
  ) {
    return failParse('invalid-envelope', 'envelope inválido')
  }
  if (data.v !== PROTOCOL_VERSION) {
    return failParse('unsupported-version', `versão ${data.v} não suportada`)
  }
  if (!isOneOf(VIEWER_TO_APP_TYPES, data.type)) {
    return failParse('unknown-type', `tipo desconhecido: ${data.type}`)
  }
  const type = data.type
  const replyTo = data.replyTo
  if (!(VIEWER_PAYLOAD_GUARDS[type] as (p: unknown) => boolean)(data.payload)) {
    return failParse('invalid-payload', `payload inválido para ${type}`, {
      type,
      ...(replyTo !== undefined ? { replyTo } : {})
    })
  }
  return {
    ok: true,
    message: {
      v: PROTOCOL_VERSION,
      id: data.id,
      type,
      ...(replyTo !== undefined ? { replyTo } : {}),
      payload: data.payload
    } as unknown as ViewerMessage
  }
}

// ---------------------------------------------------------------------------
// app → viewer: validação e construção
// ---------------------------------------------------------------------------

const bad = (code: OutgoingErrorCode, message: string): OutgoingError => ({
  code,
  message
})

function validInsets(i: unknown): i is Insets {
  return (
    isRecord(i) &&
    ['left', 'right', 'top', 'bottom'].every(
      k => typeof i[k] === 'number' && Number.isFinite(i[k]) && i[k] >= 0
    )
  )
}

const FIND_SCOPES: readonly FindScope[] = ['drawing', 'layout']
const ZOOM_OPS: readonly ZoomOp[] = ['in', 'out', 'extents']

/** `undefined` = payload válido; caso contrário o erro explícito. */
function validateOpen(p: Record<string, unknown>): OutgoingError | undefined {
  if (!isNonEmptyString(p.name)) {
    return bad('invalid-payload', 'open.name em falta')
  }
  const format = detectDocumentFormat(p.name)
  // O viewer trataria qualquer extensão ≠ dwg como DXF (AcApDocument.ts:154).
  if (!format) {
    return bad('unsupported-ext', 'só são aceites ficheiros .dwg e .dxf')
  }
  if (!isNonNegInt(p.size)) {
    return bad('invalid-payload', 'open.size inválido')
  }
  if (p.size > MAX_DOCUMENT_BYTES[format]) {
    return bad('too-large', `ficheiro ${format} acima do limite`)
  }
  const s = p.source
  if (!isRecord(s)) return bad('invalid-payload', 'open.source em falta')
  if (s.kind === 'url') {
    return isNonEmptyString(s.url)
      ? undefined
      : bad('invalid-payload', 'open.source.url em falta')
  }
  if (s.kind === 'base64') {
    if (!isNonEmptyString(s.data)) {
      return bad('invalid-payload', 'open.source.data em falta')
    }
    return p.size > MAX_BASE64_BYTES
      ? bad('too-large', 'ficheiro acima do limite da entrega base64')
      : undefined
  }
  return bad('invalid-payload', 'open.source.kind desconhecido')
}

function validateFind(p: Record<string, unknown>): OutgoingError | undefined {
  if (!isString(p.query) || p.query.trim().length === 0) {
    return bad('invalid-payload', 'find.query vazio')
  }
  if (typeof p.matchCase !== 'boolean') {
    return bad('invalid-payload', 'find.matchCase inválido')
  }
  if (!isOneOf(FIND_SCOPES, p.scope)) {
    return bad('invalid-payload', 'find.scope inválido')
  }
  if (
    p.maxResults !== undefined &&
    !(
      isInt(p.maxResults) &&
      p.maxResults >= 1 &&
      p.maxResults <= FIND_MAX_RESULTS
    )
  ) {
    return bad('invalid-payload', 'find.maxResults fora de 1..500')
  }
  return undefined
}

function validateStep(
  p: Record<string, unknown>,
  withIndex: boolean
): OutgoingError | undefined {
  if (!isNonNegInt(p.findId)) return bad('invalid-payload', 'findId inválido')
  if (withIndex && !isNonNegInt(p.index)) {
    return bad('invalid-payload', 'goto.index inválido')
  }
  if (p.insets !== undefined && !validInsets(p.insets)) {
    return bad('invalid-payload', 'insets inválidos')
  }
  return undefined
}

function validateZoom(p: Record<string, unknown>): OutgoingError | undefined {
  if (!isOneOf(ZOOM_OPS, p.op))
    return bad('invalid-payload', 'zoom.op inválido')
  if (p.factor === undefined) return undefined
  if (p.op === 'extents') {
    return bad('invalid-payload', 'zoom.factor não se aplica a extents')
  }
  const f = p.factor
  if (
    typeof f !== 'number' ||
    !Number.isFinite(f) ||
    f < ZOOM_FACTOR_MIN ||
    f > ZOOM_FACTOR_MAX
  ) {
    return bad('invalid-payload', 'zoom.factor fora de 0.1..10')
  }
  return undefined
}

const APP_PAYLOAD_VALIDATORS: {
  [T in AppToViewerType]: (
    p: Record<string, unknown>
  ) => OutgoingError | undefined
} = {
  open: validateOpen,
  find: validateFind,
  goto: p => validateStep(p, true),
  findNext: p => validateStep(p, false),
  findPrev: p => validateStep(p, false),
  zoom: validateZoom,
  clearHighlight: p =>
    Object.keys(p).length === 0
      ? undefined
      : bad('invalid-payload', 'clearHighlight não tem campos'),
  setInsets: p =>
    validInsets(p) ? undefined : bad('invalid-payload', 'insets inválidos')
}

/**
 * Constrói uma mensagem app → viewer **só se o payload for válido**. Caso
 * contrário devolve o erro explícito e nada é enviado (sem correcção
 * silenciosa, sem fallback).
 */
export function buildAppMessage<T extends AppToViewerType>(
  id: string,
  type: T,
  payload: AppPayloads[T]
): BuildResult {
  if (!isRecord(payload)) {
    return {
      ok: false,
      error: bad('invalid-payload', `payload de ${type} inválido`)
    }
  }
  const error = APP_PAYLOAD_VALIDATORS[type](payload)
  if (error) return { ok: false, error }
  return {
    ok: true,
    message: { v: PROTOCOL_VERSION, id, type, payload } as AppMessage
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
