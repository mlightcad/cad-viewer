import {
  collectPdfOcgLayers,
  getPdfOcgIdFromMarkedContentArgs,
  PDF_FALLBACK_LAYER,
  sanitizePdfLayerName
} from '../src/pdfOptionalContent'

const BEGIN_MARKED_CONTENT_PROPS = 99

describe('pdfOptionalContent', () => {
  test('extracts OCG ids from marked-content properties', () => {
    expect(getPdfOcgIdFromMarkedContentArgs(['OC', { id: 'ocg-1' }])).toBe(
      'ocg-1'
    )

    expect(getPdfOcgIdFromMarkedContentArgs(['OC', 'ocg-2'])).toBe('ocg-2')

    expect(
      getPdfOcgIdFromMarkedContentArgs(['Span', { id: 'ignored' }])
    ).toBeUndefined()
  })

  test('maps referenced OCGs to CAD-safe layer names and visibility', () => {
    const opList = {
      fnArray: [1, BEGIN_MARKED_CONTENT_PROPS, 2],
      argsArray: [[], ['OC', { id: 'walls' }], []]
    }

    const layers = collectPdfOcgLayers(opList, BEGIN_MARKED_CONTENT_PROPS, {
      getGroup: id =>
        id === 'walls' ? { name: 'A/WALL', visible: false } : undefined
    })

    expect(layers.get('walls')).toEqual({
      id: 'walls',
      layerName: 'A_WALL',
      visible: false
    })
  })

  test('falls back to an OCG id when the PDF group has no usable name', () => {
    const opList = {
      fnArray: [BEGIN_MARKED_CONTENT_PROPS],
      argsArray: [['OC', { id: '42' }]]
    }

    const layers = collectPdfOcgLayers(opList, BEGIN_MARKED_CONTENT_PROPS, {
      getGroup: () => ({ name: '   ', visible: true })
    })

    expect(layers.get('42')).toEqual({
      id: '42',
      layerName: 'PDF_OCG_42',
      visible: true
    })
  })

  test('keeps duplicate OCG names on distinct CAD layers', () => {
    const opList = {
      fnArray: [BEGIN_MARKED_CONTENT_PROPS, BEGIN_MARKED_CONTENT_PROPS],
      argsArray: [
        ['OC', { id: 'first' }],
        ['OC', { id: 'second' }]
      ]
    }

    const layers = collectPdfOcgLayers(opList, BEGIN_MARKED_CONTENT_PROPS, {
      getGroup: () => ({ name: 'Shared', visible: true })
    })

    expect(layers.get('first')?.layerName).toBe('Shared')
    expect(layers.get('second')?.layerName).toBe('Shared_second')
  })

  test('reserves the ungrouped fallback layer name', () => {
    const opList = {
      fnArray: [BEGIN_MARKED_CONTENT_PROPS],
      argsArray: [['OC', { id: 'same-name' }]]
    }

    const layers = collectPdfOcgLayers(opList, BEGIN_MARKED_CONTENT_PROPS, {
      getGroup: () => ({
        name: PDF_FALLBACK_LAYER,
        visible: true
      })
    })

    expect(layers.get('same-name')?.layerName).not.toBe(PDF_FALLBACK_LAYER)
  })

  test('sanitizes characters that are invalid in CAD layer names', () => {
    expect(sanitizePdfLayerName('A/B:C*D?E')).toBe('A_B_C_D_E')
  })
})
