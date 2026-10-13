// SPDX-License-Identifier: GPL-3.0-or-later
//
// Formato intermédio da camada de importação (OBJ-0104 M2-I2,
// docs/OBJ-0104-m2-i2-libredwg-import-spec.md §3.1). As formas `Opened*` /
// `OpenFailed*` são estruturalmente IGUAIS às de
// apps/freedom-mobile/src/contracts/protocol.ts (§5.2); um teste de deriva
// compara as duas definições, porque o pacote não depende do app.

import type { AcDbDatabase } from '@mlightcad/data-model'

/** Formatos aceites em v1 (D-3). DWG via LibreDWG (D-2), DXF via parser MIT. */
export type ImportFormat = 'dwg' | 'dxf'

/** `unavailable` = o conversor DWG não está utilizável; DXF continua (§6.4). */
export type DwgStatus = 'ok' | 'unavailable'

/** Códigos de `openFailed` (§5.2); mesma lista que `OPEN_FAILED_CODES` do app. */
export const IMPORT_ERROR_CODES = [
  'unsupported-ext',
  'too-large',
  'read-failed',
  'parse',
  'dwg-unavailable',
  'oom',
  'timeout'
] as const
export type ImportErrorCode = (typeof IMPORT_ERROR_CODES)[number]

/** Etapa do fluxo em que a falha ocorreu (diagnóstico; não vai ao utilizador). */
export type ImportStage =
  | 'source'
  | 'validate'
  | 'sniff'
  | 'convert'
  | 'inspect'

/** Igual a `LayoutInfo` (protocolo) e a `acapListFindLayouts`. */
export interface ImportLayout {
  name: string
  btrId: string
  tabOrder: number
}

/** Pedido de importação: bytes já lidos (a leitura da fonte é `source.ts`). */
export interface ImportRequest {
  name: string
  bytes: ArrayBuffer
  /** Tamanho anunciado pelo app (`open.size`); se existir, tem de coincidir. */
  declaredSize?: number
}

/**
 * Resultado de uma importação bem-sucedida. `database` é a base de dados
 * convertida (consumida pelo dispatcher/FIND/view); o resto é metadado
 * serializável.
 */
export interface ImportedDocument {
  name: string
  format: ImportFormat
  /** `AC10xx` lido do cabeçalho DWG; ausente em DXF. */
  dwgVersion?: string
  byteLength: number
  layouts: ImportLayout[]
  activeLayoutId: string
  database: AcDbDatabase
}

export interface ImportFailure {
  code: ImportErrorCode
  /** Texto PT-PT fixo por código; nunca texto cru de excepção. */
  message: string
  stage: ImportStage
  /** Excepção redigida (sem URLs/caminhos), só para o canal `log`. */
  detail?: string
}

export type ImportOutcome =
  | { ok: true; document: ImportedDocument }
  | { ok: false; failure: ImportFailure }

/** Forma de `OpenedPayload` (§5.2). */
export interface OpenedPayloadShape {
  name: string
  format: ImportFormat
  layouts: ImportLayout[]
  activeLayoutId: string
}

/** Forma de `OpenFailedPayload` (§5.2). */
export interface OpenFailedPayloadShape {
  code: ImportErrorCode
  message: string
}
