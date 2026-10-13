// SPDX-License-Identifier: GPL-3.0-or-later
//
// Mapeamento explícito de falhas de importação para os códigos de `openFailed`
// (docs/OBJ-0104-m2-i2-libredwg-import-spec.md §3.2). Sem fallback silencioso:
// toda a excepção termina num `ImportFailure` com código e texto PT-PT fixo.

import type {
  ImportErrorCode,
  ImportFailure,
  ImportFormat,
  ImportStage,
  OpenFailedPayloadShape
} from './types'

/** Texto mostrado ao utilizador: fixo por código (nunca texto cru de excepção). */
export const IMPORT_MESSAGES: Record<ImportErrorCode, string> = {
  'unsupported-ext': 'Formato não suportado. Abra um ficheiro .dwg ou .dxf.',
  'too-large': 'O ficheiro é demasiado grande para este dispositivo.',
  'read-failed': 'Não foi possível ler o ficheiro.',
  parse: 'O ficheiro está corrompido ou não pôde ser interpretado.',
  'dwg-unavailable':
    'DWG indisponível neste dispositivo; DXF continua a funcionar.',
  oom: 'Memória insuficiente para abrir este ficheiro.',
  timeout: 'A abertura demorou demasiado tempo e foi cancelada.'
}

const MAX_DETAIL = 200

/**
 * Remove URLs, URIs e caminhos absolutos (POSIX/Windows/`/mnt/…`) e limita o
 * tamanho. O resultado serve só para diagnóstico (`log`).
 */
export function redactDetail(text: string): string {
  return text
    .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s'")\]]+/gi, '<url>')
    .replace(/\b[A-Za-z]:\\[^\s'")\]]*/g, '<path>')
    .replace(/(^|[\s'"([=])\/[^\s'")\]]+/g, '$1<path>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DETAIL)
}

export function makeFailure(
  code: ImportErrorCode,
  stage: ImportStage,
  detail?: string
): ImportFailure {
  const failure: ImportFailure = {
    code,
    message: IMPORT_MESSAGES[code],
    stage
  }
  if (detail) failure.detail = redactDetail(detail)
  return failure
}

export function toOpenFailedPayload(
  failure: ImportFailure
): OpenFailedPayloadShape {
  return { code: failure.code, message: failure.message }
}

// ---------------------------------------------------------------------------
// Classificação de excepções
// ---------------------------------------------------------------------------

/** Códigos de `AcDbOpenDatabaseError` (data-model 1.15.7). */
const OPEN_ERROR_CODES = [
  'worker_oom',
  'worker_timeout',
  'worker_error',
  'parse_failed',
  'font_load_failed',
  'fetch_failed',
  'license_expired',
  'license_invalid',
  'unknown'
] as const
type OpenErrorCode = (typeof OPEN_ERROR_CODES)[number]

const isOpenErrorCode = (x: unknown): x is OpenErrorCode =>
  typeof x === 'string' && (OPEN_ERROR_CODES as readonly string[]).includes(x)

/** [H] Mensagens de falta de memória (wasm/JS). */
const OOM_PATTERN =
  /out of memory|array buffer allocation failed|memory access out of bounds|cannot allocate|invalid array length|WebAssembly\.Memory/i

/**
 * [H] `worker_error` por worker/wasm indisponível (e não por DWG corrupto).
 * Medido: «Failed to parse drawing due to error: 'Worker is not defined'».
 */
const WORKER_UNAVAILABLE_PATTERN =
  /worker is not defined|failed to (?:construct|create|load|start) .*worker|importscripts|webassembly\.(?:instantiate|compile)|failed to (?:fetch|load) .*wasm|wasm .*(?:fetch|load|instantiate)/i

const NOT_REGISTERED_PATTERN = /converter for file type .* isn't registered/i

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return ''
}

/**
 * Converte uma excepção do conversor/leitura num `ImportFailure`.
 * Classifica por `code` estruturado (duck-typing, o nome da classe é
 * minificado), depois por tipo/nome/mensagem; o resto é `parse`.
 */
export function mapOpenError(
  error: unknown,
  ctx: { format: ImportFormat; stage?: ImportStage }
): ImportFailure {
  const stage = ctx.stage ?? 'convert'
  const message = messageOf(error)
  const rawCode = (error as { code?: unknown } | null)?.code

  if (isOpenErrorCode(rawCode)) {
    switch (rawCode) {
      case 'worker_oom':
        return makeFailure('oom', stage, message)
      case 'worker_timeout':
        return makeFailure('timeout', stage, message)
      case 'fetch_failed':
        return makeFailure('read-failed', stage, message)
      case 'license_expired':
      case 'license_invalid':
        // Só o conversor proprietário emite isto (D-2: não é usado). Sem nomear
        // fornecedor: a camada DWG não está utilizável.
        return makeFailure('dwg-unavailable', stage, `licença (${rawCode})`)
      case 'worker_error':
        if (ctx.format === 'dwg' && WORKER_UNAVAILABLE_PATTERN.test(message)) {
          return makeFailure('dwg-unavailable', stage, message)
        }
        if (OOM_PATTERN.test(message)) return makeFailure('oom', stage, message)
        return makeFailure('parse', stage, message)
      default:
        // parse_failed | font_load_failed | unknown
        if (OOM_PATTERN.test(message)) return makeFailure('oom', stage, message)
        return makeFailure('parse', stage, message)
    }
  }

  const name = (error as { name?: unknown } | null)?.name
  if (name === 'AbortError' || name === 'TimeoutError') {
    return makeFailure('timeout', stage, message)
  }
  if (error instanceof RangeError || OOM_PATTERN.test(message)) {
    return makeFailure('oom', stage, message)
  }
  if (ctx.format === 'dwg' && NOT_REGISTERED_PATTERN.test(message)) {
    return makeFailure('dwg-unavailable', stage, message)
  }
  return makeFailure('parse', stage, message || 'erro desconhecido')
}
