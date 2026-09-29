import {
  allocatePdfFallbackLayerName,
  collectPdfOcgLayers,
  getPdfMarkedContentTarget,
  getPdfOcgIdFromMarkedContentArgs,
  normalizeCadLayerKey,
  PDF_FALLBACK_LAYER,
  pdfOperatorListHasOptionalContent,
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

  test('treats layer names that differ only by case as the same layer', () => {
    const opList = {
      fnArray: [BEGIN_MARKED_CONTENT_PROPS, BEGIN_MARKED_CONTENT_PROPS],
      argsArray: [
        ['OC', { id: 'first' }],
        ['OC', { id: 'second' }]
      ]
    }

    const layers = collectPdfOcgLayers(opList, BEGIN_MARKED_CONTENT_PROPS, {
      getGroup: id => ({
        name: id === 'first' ? 'Walls' : 'walls',
        visible: true
      })
    })

    expect(normalizeCadLayerKey(layers.get('first')?.layerName ?? '')).toBe(
      'WALLS'
    )
    expect(normalizeCadLayerKey(layers.get('second')?.layerName ?? '')).not.toBe(
      'WALLS'
    )
  })

  test('does not reuse a layer that already exists in the drawing', () => {
    const opList = {
      fnArray: [BEGIN_MARKED_CONTENT_PROPS],
      argsArray: [['OC', { type: 'OCG', id: 'walls' }]]
    }

    const layers = collectPdfOcgLayers(
      opList,
      BEGIN_MARKED_CONTENT_PROPS,
      {
        getGroup: () => ({ name: 'a_wall', visible: false })
      },
      ['A_WALL']
    )

    expect(normalizeCadLayerKey(layers.get('walls')?.layerName ?? '')).not.toBe(
      'A_WALL'
    )
    expect(layers.get('walls')?.visible).toBe(false)
  })

  test('reserves the fallback layer name case-insensitively', () => {
    const opList = {
      fnArray: [BEGIN_MARKED_CONTENT_PROPS],
      argsArray: [['OC', { id: 'same-name' }]]
    }

    const layers = collectPdfOcgLayers(opList, BEGIN_MARKED_CONTENT_PROPS, {
      getGroup: () => ({ name: 'pdf_ungrouped', visible: true })
    })

    expect(normalizeCadLayerKey(layers.get('same-name')?.layerName ?? '')).not.toBe(
      normalizeCadLayerKey(PDF_FALLBACK_LAYER)
    )
  })

  test('uses OptionalContentConfig.isVisible for the initial on/off state', () => {
    const opList = {
      fnArray: [BEGIN_MARKED_CONTENT_PROPS],
      argsArray: [['OC', { id: 'walls' }]]
    }

    const layers = collectPdfOcgLayers(opList, BEGIN_MARKED_CONTENT_PROPS, {
      getGroup: () => ({ name: 'Walls', visible: true }),
      isVisible: group => group.id !== 'walls'
    })

    expect(layers.get('walls')?.visible).toBe(false)
  })

  test('keeps a multi-group OCMD off a single CAD layer', () => {
    const opList = {
      fnArray: [BEGIN_MARKED_CONTENT_PROPS],
      argsArray: [
        ['OC', { type: 'OCMD', ids: ['walls', 'doors'], policy: 'AnyOn' }]
      ]
    }

    expect(getPdfMarkedContentTarget(opList.argsArray[0])).toEqual({
      kind: 'fallback'
    })
    expect(collectPdfOcgLayers(opList, BEGIN_MARKED_CONTENT_PROPS, {}).size).toBe(
      0
    )
    expect(
      pdfOperatorListHasOptionalContent(opList, BEGIN_MARKED_CONTENT_PROPS)
    ).toBe(true)
  })

  test('maps a single-group OCMD onto that group', () => {
    const opList = {
      fnArray: [BEGIN_MARKED_CONTENT_PROPS],
      argsArray: [['OC', { type: 'OCMD', id: 'walls' }]]
    }

    const layers = collectPdfOcgLayers(opList, BEGIN_MARKED_CONTENT_PROPS, {
      getGroup: () => ({ name: 'Walls', visible: true })
    })

    expect(layers.get('walls')?.layerName).toBe('Walls')
  })

  test('suffixes the fallback layer when the drawing already uses that name', () => {
    expect(allocatePdfFallbackLayerName(['pdf_ungrouped'], [])).not.toBe(
      PDF_FALLBACK_LAYER
    )
    expect(
      normalizeCadLayerKey(allocatePdfFallbackLayerName(['pdf_ungrouped'], []))
    ).not.toBe(normalizeCadLayerKey(PDF_FALLBACK_LAYER))
    expect(allocatePdfFallbackLayerName(['pdf_ungrouped'], [])).toBe(
      'PDF_UNGROUPED_2'
    )
  })

  test('keeps suffixed layer names within 255 characters', () => {
    const longName = 'A'.repeat(255)
    const opList = {
      fnArray: [BEGIN_MARKED_CONTENT_PROPS, BEGIN_MARKED_CONTENT_PROPS],
      argsArray: [
        ['OC', { id: 'first' }],
        ['OC', { id: 'second' }]
      ]
    }

    const layers = collectPdfOcgLayers(opList, BEGIN_MARKED_CONTENT_PROPS, {
      getGroup: () => ({ name: longName, visible: true })
    })

    const first = layers.get('first')?.layerName ?? ''
    const second = layers.get('second')?.layerName ?? ''
    expect(first.length).toBeLessThanOrEqual(255)
    expect(second.length).toBeLessThanOrEqual(255)
    expect(normalizeCadLayerKey(first)).not.toBe(normalizeCadLayerKey(second))
  })
})
