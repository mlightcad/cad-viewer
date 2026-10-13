// SPDX-License-Identifier: GPL-3.0-or-later
//
// Sonda do conversor DWG (spec M2-I3 §3.3). O worker+wasm não corre em
// jest/node: `AcDbLibreDwgConverter.prototype.parse` é substituído por um
// modelo SINTÉTICO. Parse real de DWG = «não verificado (EXT-3)».

import {
  AcDbDatabaseConverterManager,
  AcDbFileType
} from '@mlightcad/data-model'
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter'

import { registerDwg } from '../src/import/registerDwg'
import {
  DwgCoverageConverter,
  dwgCoverageSource,
  isDwgCoverageSource
} from '../src/model/dwgCoverage'

const WORKER = './assets/libredwg-parser-worker.js'

type ParseFn = (data: ArrayBuffer, timeout?: number) => Promise<unknown>
const parseOf = (c: DwgCoverageConverter): ParseFn =>
  (c as unknown as { parse: ParseFn }).parse.bind(c)

afterEach(() => {
  jest.restoreAllMocks()
  AcDbDatabaseConverterManager.instance.unregister(AcDbFileType.DWG)
})

describe('DwgCoverageConverter', () => {
  const synthetic = {
    model: {
      tables: {
        BLOCK_RECORD: {
          entries: [
            { entities: [{ type: 'LINE' }, { type: '3DSOLID' }] },
            { entities: [{ type: 'REGION' }, { type: 'TEXT' }] }
          ]
        }
      }
    },
    data: { unknownEntityCount: 0 }
  }

  it('continua a ser um AcDbLibreDwgConverter com a mesma configuração', () => {
    const c = new DwgCoverageConverter({
      convertByEntityType: false,
      useWorker: true,
      parserWorkerUrl: WORKER
    })
    expect(c).toBeInstanceOf(AcDbLibreDwgConverter)
    expect(c.config.parserWorkerUrl).toBe(WORKER)
    expect(c.config.useWorker).toBe(true)
  })

  it('depois do parse conta os tipos descartados; takeReport devolve e limpa', async () => {
    const spy = jest
      .spyOn(AcDbLibreDwgConverter.prototype as never, 'parse')
      .mockResolvedValue(synthetic as never)
    const c = new DwgCoverageConverter({ useWorker: false })
    const result = await parseOf(c)(new ArrayBuffer(8), 1234)
    expect(result).toBe(synthetic) // o resultado do conversor passa intacto
    expect(spy).toHaveBeenCalledWith(expect.any(ArrayBuffer), 1234)
    expect(c.takeReport()).toEqual({ '3DSOLID': 1, REGION: 1 })
    expect(c.takeReport()).toEqual({})
  })

  it('cada conversão substitui o relatório anterior (não acumula entre documentos)', async () => {
    const spy = jest.spyOn(AcDbLibreDwgConverter.prototype as never, 'parse')
    spy.mockResolvedValueOnce(synthetic as never)
    spy.mockResolvedValueOnce({
      model: { tables: { BLOCK_RECORD: { entries: [] } } },
      data: { unknownEntityCount: 0 }
    } as never)
    const c = new DwgCoverageConverter({ useWorker: false })
    await parseOf(c)(new ArrayBuffer(1))
    await parseOf(c)(new ArrayBuffer(1))
    expect(c.takeReport()).toEqual({})
  })

  it('modelo ausente/estragado nunca estraga a conversão', async () => {
    const spy = jest.spyOn(AcDbLibreDwgConverter.prototype as never, 'parse')
    const broken = { model: undefined, data: { unknownEntityCount: 0 } }
    spy.mockResolvedValueOnce(broken as never)
    const c = new DwgCoverageConverter({ useWorker: false })
    await expect(parseOf(c)(new ArrayBuffer(1))).resolves.toBe(broken)
    expect(c.takeReport()).toEqual({})
  })

  it('o erro do parse (p.ex. worker_error) propaga-se sem ser engolido', async () => {
    jest
      .spyOn(AcDbLibreDwgConverter.prototype as never, 'parse')
      .mockRejectedValue(new Error('Worker is not defined') as never)
    const c = new DwgCoverageConverter({ useWorker: false })
    await expect(parseOf(c)(new ArrayBuffer(1))).rejects.toThrow(
      'Worker is not defined'
    )
    expect(c.takeReport()).toEqual({})
  })
})

describe('registerDwg + dwgCoverageSource', () => {
  it('o registo por omissão instala a sonda; dwgCoverageSource devolve-a', () => {
    expect(registerDwg(WORKER, { workerSupported: true })).toEqual({
      status: 'ok'
    })
    const registered = AcDbDatabaseConverterManager.instance.get(
      AcDbFileType.DWG
    )
    expect(registered).toBeInstanceOf(DwgCoverageConverter)
    expect(registered).toBeInstanceOf(AcDbLibreDwgConverter)
    expect(dwgCoverageSource()).toBe(registered)
  })

  it('sem conversor DWG registado, ou com um que não é sonda → undefined', () => {
    expect(dwgCoverageSource()).toBeUndefined()
    registerDwg(WORKER, {
      workerSupported: true,
      createConverter: cfg => new AcDbLibreDwgConverter(cfg)
    })
    expect(dwgCoverageSource()).toBeUndefined()
  })

  it('isDwgCoverageSource é estrito', () => {
    expect(isDwgCoverageSource(null)).toBe(false)
    expect(isDwgCoverageSource({})).toBe(false)
    expect(isDwgCoverageSource({ takeReport: 1 })).toBe(false)
    expect(isDwgCoverageSource({ takeReport: () => ({}) })).toBe(true)
  })
})
