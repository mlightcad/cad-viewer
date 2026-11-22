import {
  AcDbLine,
  AcDbMText,
  AcDbText,
  AcDbTextHorizontalMode,
  AcDbTextVerticalMode,
  AcGePoint3d,
  AcGiMTextAttachmentPoint
} from '@mlightcad/data-model'

import {
  acapBuildMergedMText,
  acapEscapePlainTextForMText,
  acapIsTextOrMText,
  acapMergeTextParts,
  acapTextEntityToMergePart,
  acapTextEntityToMergeParts,
  acapWrapMTextContentsWithStyle,
  expandMTextToMergeParts,
  mtextBaselineStep,
  splitMTextParagraphs,
  textAttachmentPoint,
  type AcApTextMergeMeasure,
  type AcApTextMergeStyle
} from '../src/command/modify/acapMergeTextEntities'

function style(
  overrides: Partial<AcApTextMergeStyle> = {}
): AcApTextMergeStyle {
  return {
    styleName: 'Standard',
    fontPrimary: '',
    fontBig: '',
    height: 1,
    widthFactor: 1,
    obliqueDeg: 0,
    ...overrides
  }
}

/** Fixed-width measurer: each non-space char is `height`, space is `0.5 * height`. */
const monoMeasure: AcApTextMergeMeasure = (text, height) => {
  let width = 0
  for (const char of text) {
    width += char === ' ' ? height * 0.5 : height
  }
  return width
}

function text(
  content: string,
  x: number,
  y: number,
  height = 1,
  options: {
    rotation?: number
    widthFactor?: number
    styleName?: string
    oblique?: number
    horizontalMode?: AcDbTextHorizontalMode
    verticalMode?: AcDbTextVerticalMode
    alignmentPoint?: AcGePoint3d
  } = {}
) {
  const entity = new AcDbText()
  entity.textString = content
  entity.position = new AcGePoint3d(x, y, 0)
  entity.height = height
  entity.rotation = options.rotation ?? 0
  entity.widthFactor = options.widthFactor ?? 1
  entity.styleName = options.styleName ?? 'Standard'
  entity.oblique = options.oblique ?? 0
  if (options.horizontalMode != null) {
    entity.horizontalMode = options.horizontalMode
  }
  if (options.verticalMode != null) {
    entity.verticalMode = options.verticalMode
  }
  if (options.alignmentPoint) {
    entity.alignmentPoint = options.alignmentPoint
  }
  return entity
}

function mtext(
  contents: string,
  x: number,
  y: number,
  height = 1,
  options: {
    rotation?: number
    styleName?: string
    lineSpacingFactor?: number
    lineSpacingStyle?: number
    attachmentPoint?: AcGiMTextAttachmentPoint
  } = {}
) {
  const entity = new AcDbMText()
  entity.contents = contents
  entity.location = new AcGePoint3d(x, y, 0)
  entity.height = height
  entity.rotation = options.rotation ?? 0
  entity.styleName = options.styleName ?? 'Standard'
  if (options.lineSpacingFactor != null) {
    entity.lineSpacingFactor = options.lineSpacingFactor
  }
  if (options.lineSpacingStyle != null) {
    entity.lineSpacingStyle = options.lineSpacingStyle
  }
  if (options.attachmentPoint != null) {
    entity.attachmentPoint = options.attachmentPoint
  }
  return entity
}

describe('acapMergeTextEntities', () => {
  it('filters only text and mtext entities', () => {
    const line = new AcDbLine()
    expect(acapIsTextOrMText(text('A', 0, 0))).toBe(true)
    expect(acapIsTextOrMText(mtext('B', 0, 0))).toBe(true)
    expect(acapIsTextOrMText(line)).toBe(false)
  })

  it('escapes backslashes and braces for plain text', () => {
    expect(acapEscapePlainTextForMText('a\\b{c}')).toBe('a\\\\b\\{c\\}')
  })

  it('does not trim leading or trailing spaces in fragments', () => {
    // mono: "  A" advances 2; place "B  " immediately after so no extra spaces
    const a = text('  A', 0, 0)
    const b = text('B  ', 2, 0)
    const result = acapBuildMergedMText([a, b], { measure: monoMeasure })
    expect(result!.contents).toBe('  AB  ')
  })

  it('emits \\W for the first fragment when TEXT widthFactor differs from style', () => {
    const a = text('A', 0, 0, 1, { widthFactor: 0.55 })
    const b = text('B', 1, 0, 1, { widthFactor: 0.55 })
    const result = acapBuildMergedMText([a, b], { measure: monoMeasure })
    expect(result!.contents).toMatch(/^\{\\W0\.55;A\}/)
  })

  it('merges adjacent characters on one baseline into one paragraph', () => {
    const parts = [
      acapTextEntityToMergePart(text('A', 0, 0)),
      acapTextEntityToMergePart(text('B', 1, 0)),
      acapTextEntityToMergePart(text('C', 2, 0))
    ]
    // Wrap base matches fragment widthFactor so no \\W noise in this case
    const merged = acapMergeTextParts(parts, parts[0].style, {
      measure: monoMeasure
    })
    expect(merged?.paragraphs).toHaveLength(1)
    expect(merged?.paragraphs[0].plain).toBe('ABC')
    expect(merged?.paragraphs[0].contents).toBe('ABC')
  })

  it('inserts measured spaces from the free advance between parts', () => {
    // mono: "A" advances 1; "B" starts at 3 → free = 2 → 2 / 0.5 = 4 spaces
    const parts = [
      acapTextEntityToMergePart(text('A', 0, 0)),
      acapTextEntityToMergePart(text('B', 3, 0))
    ]
    const merged = acapMergeTextParts(parts, undefined, {
      measure: monoMeasure
    })
    expect(merged?.paragraphs[0].plain).toBe('A    B')
  })

  it('inserts a fallback space when parts are farther apart without a measurer', () => {
    // Extents use ~1×height per char: "Hello" ≈ 5 wide; World at 7 → gap > 0.5h
    const parts = [
      acapTextEntityToMergePart(text('Hello', 0, 0)),
      acapTextEntityToMergePart(text('World', 7, 0))
    ]
    const merged = acapMergeTextParts(parts)
    expect(merged?.paragraphs[0].plain).toBe('Hello World')
  })

  it('stacks vertically separated parts as MTEXT paragraphs', () => {
    const parts = [
      acapTextEntityToMergePart(text('UP', 0, 2)),
      acapTextEntityToMergePart(text('LO{W}', 0, 0))
    ]
    const merged = acapMergeTextParts(parts)
    expect(merged?.paragraphs.map(item => item.plain)).toEqual(['UP', 'LO{W}'])
    expect(merged?.paragraphs.map(item => item.contents)).toEqual([
      'UP',
      'LO\\{W\\}'
    ])
    expect(merged?.lineSpacing).toBeCloseTo(2)
  })

  it('uses the alignment grip for middle-center TEXT, not position', () => {
    const entity = text('Hi', 0, 0, 2, {
      horizontalMode: AcDbTextHorizontalMode.CENTER,
      verticalMode: AcDbTextVerticalMode.MIDDLE,
      alignmentPoint: new AcGePoint3d(10, 5, 0)
    })
    expect(textAttachmentPoint(entity)).toBe(
      AcGiMTextAttachmentPoint.MiddleCenter
    )
    const part = acapTextEntityToMergePart(entity)
    expect(part.x).toBeCloseTo(10)
    expect(part.y).toBeCloseTo(5)
    expect(part.attachment).toBe(AcGiMTextAttachmentPoint.MiddleCenter)

    const other = text('X', 20, 4, 2)
    const result = acapBuildMergedMText([entity, other], {
      measure: monoMeasure
    })
    expect(result).toBeInstanceOf(AcDbMText)
    // MiddleCenter at y=5, height 2 → baseline 4; "X" at baseline 4 → one line
    expect(result!.contents.includes('\\P')).toBe(false)
    expect(result!.attachmentPoint).toBe(AcGiMTextAttachmentPoint.BottomLeft)
  })

  it('keeps middle-center TEXT at the origin when grips are unavailable', () => {
    const atOrigin = text('Origin', 100, 100, 2, {
      horizontalMode: AcDbTextHorizontalMode.CENTER,
      verticalMode: AcDbTextVerticalMode.MIDDLE,
      alignmentPoint: new AcGePoint3d(0, 0, 0)
    })
    // data-model resolveTextAnchor treats (0,0,0) as unset; force the
    // detached fallback so hasAlignmentPoint alone decides the anchor.
    jest.spyOn(atOrigin, 'subGetGripPoints').mockImplementation(() => {
      throw new Error('no grips')
    })
    const part = acapTextEntityToMergePart(atOrigin)
    expect(part.x).toBeCloseTo(0)
    expect(part.y).toBeCloseTo(0)
    expect(part.attachment).toBe(AcGiMTextAttachmentPoint.MiddleCenter)
  })

  it('builds one MTEXT and preserves display traits from the first entity', () => {
    const a = text('A', 0, 0, 2.5, { styleName: 'Title' })
    a.layer = 'ANN'
    const b = text('B', 3, 0, 2.5)
    const result = acapBuildMergedMText([a, b], { measure: monoMeasure })
    expect(result).toBeInstanceOf(AcDbMText)
    // Default TEXT widthFactor is 1 — matches wrap base, no \\W
    expect(result!.contents).toBe('AB')
    expect(result!.styleName).toBe('Title')
    expect(result!.height).toBeCloseTo(2.5)
    expect(result!.attachmentPoint).toBe(AcGiMTextAttachmentPoint.BottomLeft)
    expect(result!.width).toBe(0)
  })

  it('keeps existing MTEXT formatting codes when merging', () => {
    const a = mtext('{\\C1;Red}', 0, 0, 1, {
      attachmentPoint: AcGiMTextAttachmentPoint.BaselineLeft
    })
    // mono at height 1: "Red" advances 3; one space (=0.5) → Blue at 3.5
    const b = text('Blue', 3.5, 0)
    const result = acapBuildMergedMText([a, b], { measure: monoMeasure })
    expect(result!.contents).toBe('{\\C1;Red} Blue')
  })

  it('indents a paragraph with a stretched leading space, not \\pl', () => {
    const a = text('UP', 0, 2)
    const b = text('LO', 3, 0)
    const result = acapBuildMergedMText([a, b], { measure: monoMeasure })
    // mono space advance at height 1 is 0.5 → \\W6 for indent 3
    expect(result!.contents).toBe('UP\\P{\\W6; }LO')
  })

  it('keeps an unindented following line free of leftover margin codes', () => {
    const a = text('UP', 3, 2)
    const b = text('LO', 0, 0)
    const result = acapBuildMergedMText([a, b], { measure: monoMeasure })
    expect(result!.contents).toBe('{\\W6; }UP\\PLO')
    expect(result!.contents.includes('\\pl')).toBe(false)
    expect(result!.contents.includes('\\pxi')).toBe(false)
  })

  it('sets exact line spacing for multi-line merges', () => {
    const result = acapBuildMergedMText([
      text('UP', 0, 0, 1),
      text('LO', 0, -2, 1)
    ])
    expect(result!.contents).toBe('UP\\PLO')
    expect(result!.lineSpacingStyle).toBe(2)
    // Equal heights → Exact advance equals baseline gap (2 / (5/3) = 1.2)
    expect(result!.lineSpacingFactor).toBeCloseTo(1.2)
  })

  it('compensates Exact spacing when consecutive lines have different heights', () => {
    const result = acapBuildMergedMText([
      text('UP', 0, 10, 4),
      text('LO', 0, 0, 2)
    ])
    expect(result!.height).toBeCloseTo(4)
    // gap=10, h1=4, h2=2 → spacing = 10+4-2 = 12 → factor 12/(4*5/3)=1.8
    expect(result!.lineSpacingFactor).toBeCloseTo(1.8)
  })

  it('returns undefined when fewer than two entities are given', () => {
    expect(acapBuildMergedMText([text('A', 0, 0)])).toBeUndefined()
    expect(acapBuildMergedMText([])).toBeUndefined()
  })

  it('wraps fragments that differ in height, width, oblique, font or color', () => {
    const base = style({
      height: 2,
      widthFactor: 1,
      fontPrimary: 'Arial',
      colorCode: 'C7'
    })
    expect(
      acapWrapMTextContentsWithStyle(
        'Tall',
        style({ ...base, height: 4 }),
        base
      )
    ).toBe('{\\H4;Tall}')
    expect(
      acapWrapMTextContentsWithStyle(
        'Wide',
        style({ ...base, widthFactor: 0.8 }),
        base
      )
    ).toBe('{\\W0.8;Wide}')
    expect(
      acapWrapMTextContentsWithStyle(
        'Slant',
        style({ ...base, obliqueDeg: 15 }),
        base
      )
    ).toBe('{\\Q15;Slant}')
    expect(
      acapWrapMTextContentsWithStyle(
        'Font',
        style({ ...base, fontPrimary: 'SimSun', fontBig: 'gbcbig' }),
        base
      )
    ).toBe('{\\fSimSun,gbcbig|b0|i0;Font}')
    expect(
      acapWrapMTextContentsWithStyle(
        'Red',
        style({ ...base, colorCode: 'C1' }),
        base
      )
    ).toBe('{\\C1;Red}')
    expect(acapWrapMTextContentsWithStyle('Same', base, base)).toBe('Same')
  })

  it('preserves per-fragment height and width factor in the merged contents', () => {
    const a = text('A', 0, 0, 2)
    // A's extents end at x=2; place B there so measured free advance is 0
    const b = text('B', 2, 0, 4, { widthFactor: 0.75 })
    const result = acapBuildMergedMText([a, b], { measure: monoMeasure })
    expect(result!.height).toBeCloseTo(2)
    expect(result!.contents).toBe('A{\\H4;\\W0.75;B}')
  })

  it('preserves per-fragment oblique angle in degrees', () => {
    const a = text('A', 0, 0, 1)
    const b = text('B', 1, 0, 1, { oblique: Math.PI / 12 })
    const result = acapBuildMergedMText([a, b], { measure: monoMeasure })
    expect(result!.contents).toBe('A{\\Q15;B}')
  })

  it('splits MTEXT paragraphs on \\P without breaking escaped backslashes', () => {
    expect(splitMTextParagraphs('UP\\PLO')).toEqual(['UP', 'LO'])
    expect(splitMTextParagraphs('a\\\\Pb')).toEqual(['a\\\\Pb'])
    expect(splitMTextParagraphs('A\nB')).toEqual(['A', 'B'])
  })

  it('expands multi-line MTEXT into parts spaced by the original line spacing', () => {
    const entity = mtext('UP\\PLO', 0, 0, 1, {
      lineSpacingFactor: 1.2,
      lineSpacingStyle: 2,
      attachmentPoint: AcGiMTextAttachmentPoint.BottomLeft
    })
    expect(mtextBaselineStep(entity)).toBeCloseTo(2)
    const parts = expandMTextToMergeParts(entity)
    expect(parts.map(part => part.plain)).toEqual(['UP', 'LO'])
    // BottomLeft: last baseline at y=0, first one step above.
    expect(parts[0].y).toBeCloseTo(2)
    expect(parts[1].y).toBeCloseTo(0)
  })

  it('keeps the original MTEXT line spacing when merging a multi-line mtext', () => {
    const multi = mtext('UP\\PLO', 0, 0, 1, {
      lineSpacingFactor: 1.2,
      lineSpacingStyle: 2,
      attachmentPoint: AcGiMTextAttachmentPoint.BottomLeft
    })
    // "LO" advances 2; one mono space (0.5) → X at 2.5
    const side = text('X', 2.5, 0, 1)
    const result = acapBuildMergedMText([multi, side], { measure: monoMeasure })
    expect(result!.contents).toBe('UP\\PLO X')
    expect(result!.lineSpacingStyle).toBe(2)
    expect(result!.lineSpacingFactor).toBeCloseTo(1.2)
  })

  it('keeps measured spacing when stacking single-line texts into multiple lines', () => {
    const result = acapBuildMergedMText([
      text('UP', 0, 3, 1),
      text('MID', 0, 1.5, 1),
      text('LO', 0, 0, 1)
    ])
    expect(result!.contents).toBe('UP\\PMID\\PLO')
    expect(result!.lineSpacingStyle).toBe(2)
    // Baseline gaps of 1.5 at height 1 → factor 1.5 / (5/3) = 0.9
    expect(result!.lineSpacingFactor).toBeCloseTo(0.9)
  })

  it('returns one part per paragraph from acapTextEntityToMergeParts', () => {
    const entity = mtext('A\\PB\\PC', 0, 0, 2, {
      lineSpacingFactor: 1,
      lineSpacingStyle: 2,
      attachmentPoint: AcGiMTextAttachmentPoint.TopLeft
    })
    expect(acapTextEntityToMergeParts(entity)).toHaveLength(3)
    expect(acapTextEntityToMergePart(entity).plain).toBe('A')
  })

  it('applies optional \\W fit when natural width differs from ink span', () => {
    // Measure returns half the extents span so fit factor ≈ 2
    const measure: AcApTextMergeMeasure = (text, height) => {
      if (text === ' ') return height * 0.5
      return text.length * height * 0.5
    }
    const a = text('AB', 0, 0)
    const b = text('CD', 0, -2)
    const result = acapBuildMergedMText([a, b], { measure, fitWidth: true })
    expect(result!.contents).toMatch(/\\W2/)
    expect(result!.lineSpacingStyle).toBe(2)
  })
})
