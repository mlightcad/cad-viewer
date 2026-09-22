import * as THREE from 'three'

import {
  buildComplexLineTypeGeometry,
  estimateComplexLineTypeCycles,
  MAX_COMPLEX_LINETYPE_CYCLES,
  resolveLinetypeEmbeddedText
} from '../src/linetype/AcTrComplexLineBuilder'
import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrGlyphEntity } from '../src/object/AcTrGlyphEntity'
import { AcTrLine } from '../src/object/AcTrLine'
import { AcTrMText } from '../src/object/AcTrMText'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrSubEntityTraitsUtil } from '../src/util'

describe('resolveLinetypeEmbeddedText', () => {
  it('keeps non-blank pattern text', () => {
    expect(resolveLinetypeEmbeddedText('GAS', 'GAS  - GAS -')).toBe('GAS')
  })

  it('falls back to the first description segment when text is blank', () => {
    expect(
      resolveLinetypeEmbeddedText(' ', '6" VCP C700  - 6" VCP C700 - 6" V')
    ).toBe('6" VCP C700')
  })
})

describe('buildComplexLineTypeGeometry', () => {
  it('expands text linetypes into stroke children and glyph shells', () => {
    const context = new AcTrRenderContext()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.lineType = {
      ...traits.lineType,
      name: 'GAS',
      pattern: [
        { elementLength: 4, elementTypeFlag: 0 },
        { elementLength: -2, elementTypeFlag: 0 },
        {
          elementLength: -1,
          elementTypeFlag: 2,
          text: 'GAS',
          scale: 0.1,
          rotation: 0
        }
      ],
      totalPatternLength: 7
    }

    const line = new AcTrLine(
      [
        { x: 0, y: 0, z: 0 },
        { x: 30, y: 0, z: 0 }
      ],
      traits,
      context
    )

    expect(line.hasComplexLinetypeGlyphs).toBe(true)
    expect(line.children.length).toBeGreaterThan(1)

    let glyphCount = 0
    let strokeCount = 0
    line.traverse(child => {
      if (child instanceof AcTrGlyphEntity) {
        glyphCount++
      } else if (
        child !== line &&
        (child instanceof THREE.LineSegments ||
          (child as { isLineSegments2?: boolean }).isLineSegments2 ||
          (child as THREE.Mesh).isMesh)
      ) {
        strokeCount++
      }
    })
    expect(glyphCount).toBeGreaterThan(0)
    expect(strokeCount).toBeGreaterThan(0)
  })

  it('uses description when LibreDWG returns a blank text dash', () => {
    const context = new AcTrRenderContext()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.lineType = {
      ...traits.lineType,
      name: 'VCP C700 6 inch',
      description: '6" VCP C700  - 6" VCP C700 - 6" V',
      pattern: [
        { elementLength: 1.05, elementTypeFlag: 0 },
        {
          elementLength: -0.6,
          elementTypeFlag: 2,
          text: ' ',
          scale: 0.1
        },
        { elementLength: -0.6, elementTypeFlag: 0 }
      ],
      totalPatternLength: 2.25
    }

    const line = new AcTrLine(
      [
        { x: 0, y: 0, z: 0 },
        { x: 20, y: 0, z: 0 }
      ],
      traits,
      context
    )

    expect(line.hasComplexLinetypeGlyphs).toBe(true)
    let found = ''
    line.traverse(child => {
      if (child instanceof AcTrMText) {
        found = (child as unknown as { _text: { text: string } })._text.text
      }
    })
    expect(found).toBe('6" VCP C700')
  })

  it('returns false for simple dash patterns', () => {
    const context = new AcTrRenderContext()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.lineType = {
      ...traits.lineType,
      pattern: [
        { elementLength: 5, elementTypeFlag: 0 },
        { elementLength: -2, elementTypeFlag: 0 }
      ]
    }
    const entity = new AcTrEntity(context)
    expect(
      buildComplexLineTypeGeometry(
        entity,
        [
          { x: 0, y: 0, z: 0 },
          { x: 10, y: 0, z: 0 }
        ],
        traits,
        context
      )
    ).toBe(false)
  })

  it('reports pending drawable until complex glyphs are drawn', () => {
    const context = new AcTrRenderContext()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.lineType = {
      ...traits.lineType,
      name: 'GAS',
      pattern: [
        { elementLength: 4, elementTypeFlag: 0 },
        { elementLength: -2, elementTypeFlag: 0 },
        {
          elementLength: -1,
          elementTypeFlag: 2,
          text: 'GAS',
          scale: 0.1,
          rotation: 0
        }
      ],
      totalPatternLength: 7
    }

    const line = new AcTrLine(
      [
        { x: 0, y: 0, z: 0 },
        { x: 30, y: 0, z: 0 }
      ],
      traits,
      context
    )

    expect(line.hasComplexLinetypeGlyphs).toBe(true)
    expect(line.hasDrawableGeometry()).toBe(false)
  })

  it('falls back when pattern cycles exceed the density cap', () => {
    const context = new AcTrRenderContext()
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.lineTypeScale = 0.01
    traits.lineType = {
      ...traits.lineType,
      name: 'FENCELINE1',
      pattern: [
        { elementLength: 6.35, elementTypeFlag: 0 },
        {
          elementLength: -2.54,
          elementTypeFlag: 4,
          shapeNumber: 133
        },
        { elementLength: -2.54, elementTypeFlag: 0 },
        { elementLength: 25.4, elementTypeFlag: 0 }
      ],
      totalPatternLength: 36.83
    }

    const points = [
      { x: 0, y: 0, z: 0 },
      { x: 43809, y: 0, z: 0 }
    ]
    expect(
      estimateComplexLineTypeCycles(points, traits.lineType.pattern!, 0.01)
    ).toBeGreaterThan(MAX_COMPLEX_LINETYPE_CYCLES)

    const entity = new AcTrEntity(context)
    expect(
      buildComplexLineTypeGeometry(entity, points, traits, context)
    ).toBe(false)
    expect(entity.children.length).toBe(0)

    const line = new AcTrLine(points, traits, context)
    expect(line.hasComplexLinetypeGlyphs).toBe(false)
    expect(line.children.length).toBeGreaterThan(0)
    // Density fallback: GPU dash mesh, no SHAPE glyph shells.
    expect(line.children[0]).toBeInstanceOf(THREE.LineSegments)
  })
})
