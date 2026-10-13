// SPDX-License-Identifier: GPL-3.0-or-later
//
// Registo do conversor DWG LibreDWG (D-2). Réplica de
// packages/cad-viewer-example/src/registerLibreDwg.ts:12-19 com as salvaguardas
// de §6.2/§6.4: worker local, `Worker` obrigatório, falha → `unavailable` (DXF
// continua) e nunca outro parser: só os pacotes LibreDWG declarados em
// package.json; nenhum conversor proprietário (a guarda está em guards.test.ts).

import type {
  AcDbDatabaseConverter,
  AcDbDatabaseConverterConfig
} from '@mlightcad/data-model'
import {
  AcDbDatabaseConverterManager,
  AcDbFileType
} from '@mlightcad/data-model'
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter'

import type { DwgStatus } from './types'

export interface DwgRegistration {
  status: DwgStatus
  /** Motivo técnico (canal `log`); nunca vai ao utilizador. */
  reason?: string
}

export interface ConverterManagerLike {
  register(fileType: string, converter: AcDbDatabaseConverter): void
  unregister(fileType: string): void
}

export interface RegisterDwgDeps {
  manager?: ConverterManagerLike
  createConverter?: (
    config: AcDbDatabaseConverterConfig
  ) => AcDbDatabaseConverter
  /** Por omissão `typeof Worker !== 'undefined'`. */
  workerSupported?: boolean
}

/** Relativo, absoluto no mesmo host (`/…`) ou loopback; nunca `http(s)` externo. */
export function isLocalWorkerUrl(url: string): boolean {
  if (typeof url !== 'string' || url.length === 0) return false
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) {
    try {
      const parsed = new URL(url)
      return (
        parsed.protocol === 'http:' &&
        ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname)
      )
    } catch {
      return false
    }
  }
  return true
}

export function registerDwg(
  parserWorkerUrl: string,
  deps: RegisterDwgDeps = {}
): DwgRegistration {
  if (!isLocalWorkerUrl(parserWorkerUrl)) {
    return { status: 'unavailable', reason: 'URL do worker não é local' }
  }
  const workerSupported = deps.workerSupported ?? typeof Worker !== 'undefined'
  if (!workerSupported) {
    return { status: 'unavailable', reason: 'Worker não suportado' }
  }
  const manager: ConverterManagerLike =
    deps.manager ?? AcDbDatabaseConverterManager.instance
  const create =
    deps.createConverter ??
    ((config: AcDbDatabaseConverterConfig) => new AcDbLibreDwgConverter(config))
  try {
    manager.register(
      AcDbFileType.DWG,
      create({ convertByEntityType: false, useWorker: true, parserWorkerUrl })
    )
    return { status: 'ok' }
  } catch (error) {
    try {
      manager.unregister(AcDbFileType.DWG)
    } catch {
      // sem conversor registado já é o estado pretendido
    }
    return {
      status: 'unavailable',
      reason: error instanceof Error ? error.message : String(error)
    }
  }
}
