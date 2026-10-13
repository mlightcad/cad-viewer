// SPDX-License-Identifier: GPL-3.0-or-later
//
// Dispatcher do protocolo v1, lado do viewer (arquitectura §5.1; spec M3-I4
// §2.1): texto JSON recebido do app → envelope validado → sessão → envelopes
// de saída (`w-N`, com `replyTo`). Nunca lança: qualquer entrada fora do
// contrato produz um `error` explícito e nada é executado.

import type { DwgStatus } from '../import/types'
import {
  type AppMessage,
  checkAppPayload,
  isAppToViewerType,
  MAX_ID_LENGTH,
  MAX_MESSAGE_CHARS,
  PROTOCOL_VERSION,
  type ReadyPayload,
  type ViewerErrorCode,
  type ViewerOutput
} from './protocol'

/** Versão anunciada em `ready` (pacote `@mlightcad/cad-mobile-viewer`). */
export const VIEWER_VERSION = '0.0.0'

export interface SessionLike {
  handle(msg: AppMessage): Promise<ViewerOutput[]>
}

export interface ViewerDispatcher {
  /** Processa uma mensagem do app; devolve os envelopes JSON a enviar. */
  receive(raw: unknown): Promise<string[]>
  /** Envelope `ready` (enviado uma vez, depois do registo DWG). */
  ready(dwg: DwgStatus): string
}

export function readyPayload(dwg: DwgStatus): ReadyPayload {
  return {
    viewerVersion: VIEWER_VERSION,
    protocol: PROTOCOL_VERSION,
    // DWG só é anunciado quando utilizável (§6.4; igual ao viewer sintético)
    caps: dwg === 'ok' ? ['find', 'dwg', 'dxf'] : ['find', 'dxf'],
    dwg
  }
}

type Parsed =
  | { ok: true; msg: AppMessage }
  | { ok: false; code: ViewerErrorCode; message: string; replyTo?: string }

function parseEnvelope(raw: unknown): Parsed {
  if (typeof raw !== 'string') {
    return { ok: false, code: 'invalid-json', message: 'mensagem não é texto' }
  }
  if (raw.length > MAX_MESSAGE_CHARS) {
    return {
      ok: false,
      code: 'message-too-large',
      message: `mensagem com ${raw.length} caracteres (máx. ${MAX_MESSAGE_CHARS})`
    }
  }
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return { ok: false, code: 'invalid-json', message: 'JSON inválido' }
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      ok: false,
      code: 'invalid-envelope',
      message: 'envelope não é objecto'
    }
  }
  const env = data as Record<string, unknown>
  const id = env.id
  if (typeof id !== 'string' || id.length === 0 || id.length > MAX_ID_LENGTH) {
    return {
      ok: false,
      code: 'invalid-envelope',
      message: 'envelope sem id válido'
    }
  }
  if (env.v !== PROTOCOL_VERSION) {
    return {
      ok: false,
      code: 'unsupported-version',
      message: `v=${String(env.v).slice(0, 32)}`,
      replyTo: id
    }
  }
  if (!isAppToViewerType(env.type)) {
    return {
      ok: false,
      code: 'unknown-type',
      message: `type=${String(env.type).slice(0, 32)}`,
      replyTo: id
    }
  }
  const checked = checkAppPayload(env.type, env.payload)
  if (!checked.ok) {
    return {
      ok: false,
      code: 'invalid-payload',
      message: `${env.type}: ${checked.message}`,
      replyTo: id
    }
  }
  return {
    ok: true,
    msg: { id, type: env.type, payload: checked.payload } as AppMessage
  }
}

export function createViewerDispatcher(
  session: SessionLike,
  options: { idPrefix?: string } = {}
): ViewerDispatcher {
  const prefix = options.idPrefix ?? 'w'
  let counter = 0

  const envelope = (out: ViewerOutput, replyTo?: string): string => {
    const payload =
      out.type === 'error' && replyTo !== undefined
        ? { ...out.payload, replyTo }
        : out.payload
    return JSON.stringify({
      v: PROTOCOL_VERSION,
      id: `${prefix}-${++counter}`,
      type: out.type,
      ...(replyTo !== undefined ? { replyTo } : {}),
      payload
    })
  }

  const errorOut = (code: ViewerErrorCode, message: string): ViewerOutput => ({
    type: 'error',
    payload: { code, message }
  })

  return {
    async receive(raw) {
      let parsed: Parsed
      try {
        parsed = parseEnvelope(raw)
      } catch {
        // getters hostis / objectos exóticos: nunca chegam à sessão
        parsed = {
          ok: false,
          code: 'invalid-payload',
          message: 'payload ilegível'
        }
      }
      if (!parsed.ok) {
        return [envelope(errorOut(parsed.code, parsed.message), parsed.replyTo)]
      }
      let outputs: ViewerOutput[]
      try {
        outputs = await session.handle(parsed.msg)
      } catch {
        outputs = [errorOut('internal', 'falha interna da sessão')]
      }
      return outputs.map(out => envelope(out, parsed.msg.id))
    },
    ready(dwg) {
      return envelope({ type: 'ready', payload: readyPayload(dwg) })
    }
  }
}
