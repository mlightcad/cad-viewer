// SPDX-License-Identifier: GPL-3.0-or-later
import { AcDbOpenDatabaseError } from '@mlightcad/data-model'

import {
  IMPORT_MESSAGES,
  makeFailure,
  mapOpenError,
  redactDetail,
  toOpenFailedPayload
} from '../src/import/errors'
import { IMPORT_ERROR_CODES } from '../src/import/types'

/** Apóstrofo: evita conflito entre prettier (aspas duplas) e eslint (`quotes`). */
const Q = String.fromCharCode(39)

const real = (
  code: ConstructorParameters<typeof AcDbOpenDatabaseError>[1],
  message = 'x'
) => new AcDbOpenDatabaseError(message, code, { stage: 'PARSE' })

describe('mapOpenError — AcDbOpenDatabaseError real (por code, não por nome de classe)', () => {
  test.each([
    ['worker_oom', 'dwg', 'oom'],
    ['worker_timeout', 'dwg', 'timeout'],
    ['fetch_failed', 'dxf', 'read-failed'],
    ['parse_failed', 'dxf', 'parse'],
    ['parse_failed', 'dwg', 'parse'],
    ['font_load_failed', 'dxf', 'parse'],
    ['unknown', 'dxf', 'parse'],
    ['license_expired', 'dwg', 'dwg-unavailable'],
    ['license_invalid', 'dwg', 'dwg-unavailable']
  ] as const)('%s (%s) → %s', (code, format, expected) => {
    const failure = mapOpenError(real(code), { format })
    expect(failure.code).toBe(expected)
    expect(failure.message).toBe(IMPORT_MESSAGES[expected])
    expect(failure.stage).toBe('convert')
  })

  test('worker_error: worker/wasm indisponível (mensagem medida) → dwg-unavailable', () => {
    const failure = mapOpenError(
      real(
        'worker_error',
        'Failed to parse drawing due to error: ' +
          Q +
          'Worker is not defined' +
          Q
      ),
      { format: 'dwg' }
    )
    expect(failure.code).toBe('dwg-unavailable')
  })

  test.each([
    'WebAssembly.instantiate(): expected magic word',
    'Failed to load libredwg-web.wasm',
    'importScripts failed',
    'Failed to construct Worker'
  ])('worker_error: %j → dwg-unavailable (DWG)', message => {
    expect(
      mapOpenError(real('worker_error', message), { format: 'dwg' }).code
    ).toBe('dwg-unavailable')
  })

  test('worker_error sem padrão de worker (DWG corrupto) → parse; em DXF nunca dwg-unavailable', () => {
    expect(
      mapOpenError(real('worker_error', 'invalid DWG section'), {
        format: 'dwg'
      }).code
    ).toBe('parse')
    expect(
      mapOpenError(real('worker_error', Q + 'Worker is not defined' + Q), {
        format: 'dxf'
      }).code
    ).toBe('parse')
  })

  test('worker_error por memória → oom', () => {
    expect(
      mapOpenError(
        real('worker_error', 'WebAssembly.Memory(): could not allocate'),
        {
          format: 'dwg'
        }
      ).code
    ).toBe('oom')
  })
})

describe('mapOpenError — outras excepções', () => {
  test('conversor DWG não registado (F3) → dwg-unavailable só em DWG', () => {
    const e = new Error(
      'Database converter for file type ' +
        Q +
        'dwg' +
        Q +
        ' isn' +
        Q +
        't registered and can can' +
        Q +
        't read this file!'
    )
    expect(mapOpenError(e, { format: 'dwg' }).code).toBe('dwg-unavailable')
    expect(mapOpenError(e, { format: 'dxf' }).code).toBe('parse')
  })

  test('RangeError e mensagens de memória → oom', () => {
    expect(
      mapOpenError(new RangeError('Invalid array length'), { format: 'dxf' })
        .code
    ).toBe('oom')
    expect(
      mapOpenError(new Error('Array buffer allocation failed'), {
        format: 'dxf'
      }).code
    ).toBe('oom')
    expect(
      mapOpenError(new Error('memory access out of bounds'), { format: 'dwg' })
        .code
    ).toBe('oom')
  })

  test('AbortError/TimeoutError → timeout', () => {
    for (const name of ['AbortError', 'TimeoutError']) {
      const e = new Error('cancelado')
      e.name = name
      expect(mapOpenError(e, { format: 'dxf' }).code).toBe('timeout')
    }
  })

  test.each([
    ['Error genérico', new Error('boom')],
    ['string', 'boom'],
    ['null', null],
    ['undefined', undefined],
    ['objecto', { code: 'xpto' }],
    ['code desconhecido', Object.assign(new Error('x'), { code: 'EACCES' })]
  ])('%s → parse (nunca lança, nunca silencioso)', (_n, e) => {
    const f = mapOpenError(e, { format: 'dxf' })
    expect(f.code).toBe('parse')
    expect(f.message).toBe(IMPORT_MESSAGES.parse)
  })

  test('stage personalizado é preservado', () => {
    expect(
      mapOpenError(new Error('x'), { format: 'dxf', stage: 'inspect' }).stage
    ).toBe('inspect')
  })
})

describe('mapOpenError — mensagem de objectos duck-typed', () => {
  test('usa só uma `message` string de um objecto simples', () => {
    const f = mapOpenError({ message: 'falha do worker' }, { format: 'dxf' })
    expect(f).toMatchObject({ code: 'parse', detail: 'falha do worker' })
  })

  test('`message` string classifica OOM também em objectos simples', () => {
    expect(
      mapOpenError(
        { message: 'Array buffer allocation failed' },
        { format: 'dxf' }
      ).code
    ).toBe('oom')
  })

  test.each([
    ['número', { message: 42 }],
    ['objecto', { message: { secret: '/home/kevin/obra.dwg' } }],
    ['array', { message: ['/home/kevin/obra.dwg'] }],
    ['função', { message: () => '/home/kevin/obra.dwg' }],
    ['null', { message: null }],
    [
      'Error com message não string',
      Object.assign(new Error('x'), { message: { a: 1 } })
    ]
  ])('message %s nunca é exposta', (_n, error) => {
    const f = mapOpenError(error, { format: 'dxf' })
    expect(f.code).toBe('parse')
    expect(f.detail).toBe('erro desconhecido')
    expect(JSON.stringify(f)).not.toMatch(/kevin|secret/)
  })

  test('getters que lançam não escapam (message/code/name)', () => {
    const hostile = {
      get message(): string {
        throw new Error('message getter')
      },
      get code(): string {
        throw new Error('code getter')
      },
      get name(): string {
        throw new Error('name getter')
      }
    }
    expect(() => mapOpenError(hostile, { format: 'dxf' })).not.toThrow()
    expect(mapOpenError(hostile, { format: 'dxf' }).code).toBe('parse')
  })

  test('primitivos: só a string é usada', () => {
    expect(mapOpenError('texto', { format: 'dxf' }).detail).toBe('texto')
    for (const v of [42, true, null, undefined, Symbol('s')]) {
      expect(mapOpenError(v, { format: 'dxf' }).detail).toBe(
        'erro desconhecido'
      )
    }
  })
})

describe('mensagens e higiene', () => {
  test('há uma mensagem PT-PT não vazia por cada código do protocolo', () => {
    for (const code of IMPORT_ERROR_CODES) {
      expect(IMPORT_MESSAGES[code].length).toBeGreaterThan(10)
    }
    expect(Object.keys(IMPORT_MESSAGES).sort()).toEqual(
      [...IMPORT_ERROR_CODES].sort()
    )
  })

  test('a mensagem de dwg-unavailable é a de §6.4', () => {
    expect(IMPORT_MESSAGES['dwg-unavailable']).toBe(
      'DWG indisponível neste dispositivo; DXF continua a funcionar.'
    )
  })

  test('o texto cru da excepção nunca chega à mensagem do utilizador', () => {
    const f = mapOpenError(new Error('falhou em /home/kevin/obra.dwg'), {
      format: 'dwg'
    })
    expect(f.message).toBe(IMPORT_MESSAGES.parse)
    expect(f.message).not.toContain('kevin')
    expect(f.detail).not.toContain('kevin')
  })

  test.each([
    ['file:///data/user/0/app/cache/x.dwg falhou', 'file://'],
    ['content://media/x/y.dxf', 'content://'],
    ['http://127.0.0.1:8080/asset/abc', 'http://'],
    ['C:\\Users\\x\\obra.dwg', 'C:\\'],
    ['erro em /mnt/d/obra.dwg ao ler', '/mnt/'],
    ['(/home/x/a.dxf)', '/home/']
  ])('redactDetail remove %j', (text, needle) => {
    const out = redactDetail(text)
    expect(out).not.toContain(needle)
    expect(out).toMatch(/<(url|path)>/)
  })

  test('redactDetail limita o tamanho e colapsa espaços', () => {
    expect(redactDetail('a\n\n  b'.repeat(1))).toBe('a b')
    expect(redactDetail('x'.repeat(1000))).toHaveLength(200)
  })

  test('toOpenFailedPayload tem só {code, message}', () => {
    const f = makeFailure('parse', 'convert', 'detalhe /x/y')
    expect(toOpenFailedPayload(f)).toEqual({
      code: 'parse',
      message: IMPORT_MESSAGES.parse
    })
    expect(f.detail).toBe('detalhe <path>')
  })
})
