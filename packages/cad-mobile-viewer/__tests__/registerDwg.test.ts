// SPDX-License-Identifier: GPL-3.0-or-later
import {
  AcDbDatabaseConverter,
  AcDbDatabaseConverterManager,
  AcDbFileType
} from '@mlightcad/data-model'
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter'

import { isLocalWorkerUrl, registerDwg } from '../src/import/registerDwg'

const WORKER = './assets/libredwg-parser-worker.js'

describe('isLocalWorkerUrl', () => {
  test.each([
    './assets/libredwg-parser-worker.js',
    '/assets/libredwg-parser-worker.js',
    'assets/w.js',
    'http://127.0.0.1:8080/assets/w.js',
    'http://localhost:3000/w.js'
  ])('aceita %s', u => expect(isLocalWorkerUrl(u)).toBe(true))

  test.each([
    'https://cdn.jsdelivr.net/gh/mlightcad/x.js',
    'http://example.com/w.js',
    '//cdn.example.com/w.js',
    'https://127.0.0.1/w.js',
    'file:///w.js',
    ''
  ])('rejeita %s', u => expect(isLocalWorkerUrl(u)).toBe(false))
})

describe('registerDwg com o conversor LibreDWG REAL', () => {
  afterEach(() => {
    AcDbDatabaseConverterManager.instance.unregister(AcDbFileType.DWG)
  })

  test('regista AcDbLibreDwgConverter para DWG com worker local e useWorker', () => {
    const r = registerDwg(WORKER, { workerSupported: true })
    expect(r).toEqual({ status: 'ok' })
    const converter = AcDbDatabaseConverterManager.instance.get(
      AcDbFileType.DWG
    )
    expect(converter).toBeInstanceOf(AcDbLibreDwgConverter)
    expect(converter?.config.parserWorkerUrl).toBe(WORKER)
    expect(converter?.config.useWorker).toBe(true)
    expect(converter?.config.convertByEntityType).toBe(false)
  })

  test('DXF mantém o parser nativo (MIT) registado por omissão', () => {
    registerDwg(WORKER, { workerSupported: true })
    const dxf = AcDbDatabaseConverterManager.instance.get(AcDbFileType.DXF)
    expect(dxf).toBeDefined()
    expect(dxf).not.toBeInstanceOf(AcDbLibreDwgConverter)
  })

  test('sem Worker (jest/node) → unavailable e NADA registado', () => {
    expect(typeof Worker).toBe('undefined')
    const r = registerDwg(WORKER)
    expect(r.status).toBe('unavailable')
    expect(r.reason).toMatch(/Worker/)
    expect(
      AcDbDatabaseConverterManager.instance.get(AcDbFileType.DWG)
    ).toBeUndefined()
  })

  test('worker externo recusado sem registar (offline §6.2)', () => {
    const r = registerDwg('https://cdn.jsdelivr.net/x/w.js', {
      workerSupported: true
    })
    expect(r.status).toBe('unavailable')
    expect(
      AcDbDatabaseConverterManager.instance.get(AcDbFileType.DWG)
    ).toBeUndefined()
  })

  test('falha ao construir → unavailable, desregista, DXF intacto', () => {
    const manager = {
      register: jest.fn(),
      unregister: jest.fn()
    }
    const r = registerDwg(WORKER, {
      workerSupported: true,
      manager,
      createConverter: () => {
        throw new Error('wasm em falta')
      }
    })
    expect(r).toEqual({ status: 'unavailable', reason: 'wasm em falta' })
    expect(manager.register).not.toHaveBeenCalled()
    expect(manager.unregister).toHaveBeenCalledWith('dwg')
  })

  test('falha no registo → unavailable mesmo se o desregisto também falhar', () => {
    const manager = {
      register: () => {
        throw new Error('registo recusado')
      },
      unregister: () => {
        throw new Error('nada a desregistar')
      }
    }
    const r = registerDwg(WORKER, {
      workerSupported: true,
      manager,
      createConverter: cfg =>
        ({ config: cfg }) as unknown as AcDbDatabaseConverter
    })
    expect(r.status).toBe('unavailable')
    expect(r.reason).toBe('registo recusado')
  })
})
