// SPDX-License-Identifier: GPL-3.0-or-later
//
// Detecção e validação de formato (D-3). `AcApDocument.openDocument` trata
// qualquer extensão que não seja `dwg` como DXF (AcApDocument.ts:154); aqui não
// há default silencioso: extensão desconhecida é erro explícito.

import type { ImportFormat } from './types'

/** Último segmento depois do último `.`, minúsculas; `null` se não houver. */
export function detectImportFormat(name: string): ImportFormat | null {
  const base = name.split(/[\\/]/).pop() ?? ''
  const dot = base.lastIndexOf('.')
  // sem nome antes do ponto (`.dwg`) ou sem extensão → inválido
  if (dot <= 0) return null
  const ext = base.slice(dot + 1).toLowerCase()
  return ext === 'dwg' || ext === 'dxf' ? ext : null
}

export type SniffResult =
  | { ok: true; dwgVersion?: string }
  | { ok: false; reason: 'not-dxf' | 'binary-dxf' | 'not-dwg' }

/** Versões DWG `AC1012` (R13) e seguintes; formatos anteriores não são suportados em v1. */
const DWG_MAGIC = /^AC10(?:1[2-9]|[2-9]\d)$/
const BINARY_DXF = 'AutoCAD Binary DXF'

function latin1(bytes: Uint8Array, length: number): string {
  let out = ''
  const n = Math.min(length, bytes.length)
  for (let i = 0; i < n; i++) out += String.fromCharCode(bytes[i])
  return out
}

/**
 * Valida o cabeçalho. O parser DXF MIT aceita lixo sem excepção (F2 da spec),
 * por isso a rejeição tem de ser explícita: um DXF ASCII começa (após BOM,
 * espaços e comentários `999`) por `0` + `SECTION`.
 */
export function sniffFormat(
  format: ImportFormat,
  bytes: ArrayBuffer
): SniffResult {
  const view = new Uint8Array(bytes)
  if (format === 'dwg') {
    const magic = latin1(view, 6)
    return DWG_MAGIC.test(magic)
      ? { ok: true, dwgVersion: magic }
      : { ok: false, reason: 'not-dwg' }
  }
  const head = latin1(view, 4096).replace(/^ï»¿/, '')
  if (head.startsWith(BINARY_DXF)) return { ok: false, reason: 'binary-dxf' }
  const dxfStart =
    /^\s*(?:999[ \t]*\r?\n[^\r\n]*\r?\n\s*)*0[ \t]*\r?\n[ \t]*SECTION[ \t]*(?:\r?\n|$)/
  return dxfStart.test(head) ? { ok: true } : { ok: false, reason: 'not-dxf' }
}
