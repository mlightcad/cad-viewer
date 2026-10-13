// SPDX-License-Identifier: GPL-3.0-or-later
//
// Protocolo v1, lado do viewer (docs/OBJ-0104-architecture.md §5.1–§5.2;
// docs/OBJ-0104-m3-i4-hardening-spec.md §2.1). As constantes e as formas são
// IGUAIS às de apps/freedom-mobile/src/contracts/protocol.ts (o pacote não
// depende do app; um teste de deriva compara-as). A validação é fail-closed:
// uma mensagem fora do contrato nunca é «corrigida» — devolve-se um erro
// explícito e nada é executado.

import type {
  OpenedPayloadShape,
  OpenFailedPayloadShape
} from '../import/types'
import type { FindHitShape } from '../model/findIndex'

export const PROTOCOL_VERSION = 1 as const

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

export const FIND_HIT_KINDS = [
  'text',
  'mtext',
  'attribute',
  'block',
  'dimension',
  'leader',
  'table'
] as const

export const FIND_OUTCOMES = [
  'navigated',
  'layout-mismatch',
  'layout-missing',
  'layout-switch-failed',
  'no-document',
  'stale'
] as const
export type FindOutcome = (typeof FIND_OUTCOMES)[number]

/** Limite de hits por pesquisa (`ACAP_FIND_MAX_RESULTS`). */
export const FIND_MAX_RESULTS = 500
export const ZOOM_FACTOR_MIN = 0.1
export const ZOOM_FACTOR_MAX = 10

// Limites próprios do viewer [H até S2] (spec §2.1).
/** Base64 de 8 MB (≈ 11,2 M caracteres) + envelope. */
export const MAX_MESSAGE_CHARS = 12 * 1024 * 1024
export const MAX_ID_LENGTH = 64
export const MAX_NAME_LENGTH = 255
export const MAX_QUERY_LENGTH = 1024
export const MAX_INSET = 100_000

/** Códigos de `error` emitidos pelo viewer (o app aceita qualquer string). */
export const VIEWER_ERROR_CODES = [
  'invalid-json',
  'message-too-large',
  'invalid-envelope',
  'unsupported-version',
  'unknown-type',
  'invalid-payload',
  'busy',
  'no-document',
  'stale-find',
  'index-out-of-range',
  'layout-missing',
  'find-failed',
  'hit-unresolved',
  'hit-not-zoomable',
  'navigate-failed',
  'view-unavailable',
  'view-failed',
  'zoom-limit',
  'internal'
] as const
export type ViewerErrorCode = (typeof VIEWER_ERROR_CODES)[number]

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

export interface Insets {
  left: number
  right: number
  top: number
  bottom: number
}

export type OpenSourcePayload =
  | { kind: 'url'; url: string }
  | { kind: 'base64'; data: string }

export interface OpenPayload {
  name: string
  size: number
  source: OpenSourcePayload
}

export type FindScope = 'drawing' | 'layout'

export interface FindPayload {
  query: string
  matchCase: boolean
  scope: FindScope
  maxResults?: number
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

export interface AppPayloads {
  open: OpenPayload
  find: FindPayload
  goto: GotoPayload
  findNext: FindStepPayload
  findPrev: FindStepPayload
  zoom: ZoomPayload
  clearHighlight: Record<string, never>
  setInsets: Insets
}

export type AppMessage = {
  [T in AppToViewerType]: { id: string; type: T; payload: AppPayloads[T] }
}[AppToViewerType]

export interface ReadyPayload {
  viewerVersion: string
  protocol: typeof PROTOCOL_VERSION
  caps: Array<'find' | 'dwg' | 'dxf'>
  dwg: 'ok' | 'unavailable'
}

export interface FindResultPayload {
  findId: number
  total: number
  truncated: boolean
  layoutCount: number
  hits: FindHitShape[]
}

export interface FindActivePayload {
  findId: number
  index: number
  outcome: FindOutcome
}

export interface ErrorPayload {
  code: ViewerErrorCode
  message: string
  replyTo?: string
}

export interface LogPayload {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
}

export interface ViewerPayloads {
  ready: ReadyPayload
  opened: OpenedPayloadShape
  openFailed: OpenFailedPayloadShape
  findResult: FindResultPayload
  findActive: FindActivePayload
  error: ErrorPayload
  log: LogPayload
}

/** Saída da sessão, antes do envelope (o dispatcher acrescenta `id`/`replyTo`). */
export type ViewerOutput = {
  [T in ViewerToAppType]: { type: T; payload: ViewerPayloads[T] }
}[ViewerToAppType]

// ---------------------------------------------------------------------------
// Guardas
// ---------------------------------------------------------------------------

const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x)
const isString = (x: unknown): x is string => typeof x === 'string'
const isNonNegInt = (x: unknown): x is number =>
  typeof x === 'number' && Number.isSafeInteger(x) && x >= 0
const isOneOf = <T extends string>(list: readonly T[], x: unknown): x is T =>
  typeof x === 'string' && (list as readonly string[]).includes(x)

/** Caracteres de controlo C0/DEL. */
function hasControl(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    if (c <= 0x1f || c === 0x7f) return true
  }
  return false
}

export function isValidInsets(i: unknown): i is Insets {
  return (
    isRecord(i) &&
    (['left', 'right', 'top', 'bottom'] as const).every(k => {
      const v = i[k]
      return (
        typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= MAX_INSET
      )
    })
  )
}

export type PayloadCheck<T> =
  | { ok: true; payload: T }
  | { ok: false; message: string }

const bad = (message: string): { ok: false; message: string } => ({
  ok: false,
  message
})

function pickInsets(i: unknown): Insets {
  const r = i as Insets
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
}

function checkOpen(p: Record<string, unknown>): PayloadCheck<OpenPayload> {
  const { name, size, source } = p
  if (!isString(name) || name.length === 0) return bad('open.name em falta')
  if (name.length > MAX_NAME_LENGTH || hasControl(name)) {
    return bad('open.name inválido')
  }
  if (!isNonNegInt(size)) return bad('open.size inválido')
  if (!isRecord(source)) return bad('open.source em falta')
  if (source.kind === 'url') {
    if (!isString(source.url) || source.url.length === 0) {
      return bad('open.source.url em falta')
    }
    return {
      ok: true,
      payload: { name, size, source: { kind: 'url', url: source.url } }
    }
  }
  if (source.kind === 'base64') {
    if (!isString(source.data) || source.data.length === 0) {
      return bad('open.source.data em falta')
    }
    return {
      ok: true,
      payload: { name, size, source: { kind: 'base64', data: source.data } }
    }
  }
  return bad('open.source.kind desconhecido')
}

function checkFind(p: Record<string, unknown>): PayloadCheck<FindPayload> {
  const { query, matchCase, scope, maxResults } = p
  if (!isString(query) || query.trim().length === 0) {
    return bad('find.query vazio')
  }
  if (query.length > MAX_QUERY_LENGTH) return bad('find.query demasiado longo')
  if (typeof matchCase !== 'boolean') return bad('find.matchCase inválido')
  if (scope !== 'drawing' && scope !== 'layout') {
    return bad('find.scope inválido')
  }
  if (
    maxResults !== undefined &&
    !(
      isNonNegInt(maxResults) &&
      maxResults >= 1 &&
      maxResults <= FIND_MAX_RESULTS
    )
  ) {
    return bad(`find.maxResults fora de 1..${FIND_MAX_RESULTS}`)
  }
  const payload: FindPayload = { query, matchCase, scope }
  if (maxResults !== undefined) payload.maxResults = maxResults
  return { ok: true, payload }
}

function checkStep(
  p: Record<string, unknown>,
  withIndex: boolean
): PayloadCheck<GotoPayload | FindStepPayload> {
  if (!isNonNegInt(p.findId)) return bad('findId inválido')
  if (withIndex && !isNonNegInt(p.index)) return bad('goto.index inválido')
  if (p.insets !== undefined && !isValidInsets(p.insets)) {
    return bad('insets inválidos')
  }
  const payload: GotoPayload | FindStepPayload = withIndex
    ? { findId: p.findId, index: p.index as number }
    : { findId: p.findId }
  if (p.insets !== undefined) payload.insets = pickInsets(p.insets)
  return { ok: true, payload }
}

function checkZoom(p: Record<string, unknown>): PayloadCheck<ZoomPayload> {
  const { op, factor } = p
  if (op !== 'in' && op !== 'out' && op !== 'extents') {
    return bad('zoom.op inválido')
  }
  if (factor === undefined) return { ok: true, payload: { op } }
  if (op === 'extents') return bad('zoom.factor não se aplica a extents')
  if (
    typeof factor !== 'number' ||
    !Number.isFinite(factor) ||
    factor < ZOOM_FACTOR_MIN ||
    factor > ZOOM_FACTOR_MAX
  ) {
    return bad(`zoom.factor fora de ${ZOOM_FACTOR_MIN}..${ZOOM_FACTOR_MAX}`)
  }
  return { ok: true, payload: { op, factor } }
}

/**
 * Valida o payload de `type` e devolve uma cópia só com as chaves do contrato
 * (nada do objecto recebido é passado adiante por referência).
 */
export function checkAppPayload<T extends AppToViewerType>(
  type: T,
  payload: unknown
): PayloadCheck<AppPayloads[T]> {
  if (!isRecord(payload)) return bad('payload não é um objecto')
  let out: PayloadCheck<unknown>
  switch (type) {
    case 'open':
      out = checkOpen(payload)
      break
    case 'find':
      out = checkFind(payload)
      break
    case 'goto':
      out = checkStep(payload, true)
      break
    case 'findNext':
    case 'findPrev':
      out = checkStep(payload, false)
      break
    case 'zoom':
      out = checkZoom(payload)
      break
    case 'clearHighlight':
      out =
        Object.keys(payload).length === 0
          ? { ok: true, payload: {} }
          : bad('clearHighlight não tem campos')
      break
    case 'setInsets':
      out = isValidInsets(payload)
        ? { ok: true, payload: pickInsets(payload) }
        : bad('insets inválidos')
      break
    default:
      out = bad('tipo desconhecido')
  }
  return out as PayloadCheck<AppPayloads[T]>
}

export function isAppToViewerType(x: unknown): x is AppToViewerType {
  return isOneOf(APP_TO_VIEWER_TYPES, x)
}

// -- saída (as mesmas guardas que o app aplica ao receber) -------------------

/** `opened` aceite pelo app: nome, formato, layouts válidos e activo presente. */
export function isValidOpenedPayload(p: OpenedPayloadShape): boolean {
  return (
    isString(p.name) &&
    p.name.length > 0 &&
    (p.format === 'dwg' || p.format === 'dxf') &&
    Array.isArray(p.layouts) &&
    p.layouts.length > 0 &&
    p.layouts.every(
      l => isString(l.name) && isString(l.btrId) && isNonNegInt(l.tabOrder)
    ) &&
    p.layouts.some(l => l.btrId === p.activeLayoutId)
  )
}

/** `findResult` aceite pelo app (`hits[i].index === i`, `kind` conhecido…). */
export function isValidFindResult(p: FindResultPayload): boolean {
  return (
    isNonNegInt(p.findId) &&
    isNonNegInt(p.total) &&
    typeof p.truncated === 'boolean' &&
    isNonNegInt(p.layoutCount) &&
    Array.isArray(p.hits) &&
    p.hits.length === p.total &&
    p.hits.every(
      (h, i) =>
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
  )
}

export function isFindOutcome(x: unknown): x is FindOutcome {
  return isOneOf(FIND_OUTCOMES, x)
}
