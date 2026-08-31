import {
  AcCmColor,
  AcCmColorMethod
} from '@mlightcad/data-model'

import {
  markupGeometryCenter,
  translateMarkupGeometry
} from '../src/command/markup/AcApMarkupGeometry'
import { isMarkupDoublePointer } from '../src/command/markup/AcApMarkupTextEdit'
import type { AcApMarkupGeometry } from '../src/command/markup/AcApMarkupTypes'
import {
  createDefaultMarkupColor,
  MARKUP_FONT_SIZE,
  setMarkupDrawColor,
  setMarkupDrawFontSize,
  subscribeMarkupDrawStyle
} from '../src/command/markup/AcApMarkupUtil'
import {
  acapDrawStyleKindForCommand,
  acapIsDrawStyleToolbarVisible,
  acapResolveDrawStyleKind,
  acapSetDrawStyleHostHasRibbon,
  acapSetDrawStyleToolbarVisible,
  acapShouldShowDrawStyleToolbar,
  acapSubscribeDrawStyleToolbarVisibility
} from '../src/ui/AcApDrawStyle'

describe('subscribeMarkupDrawStyle', () => {
  it('notifies when markup draw color or font size change', () => {
    const seen: string[] = []
    const unsubscribe = subscribeMarkupDrawStyle(() => seen.push('change'))
    setMarkupDrawColor(new AcCmColor(AcCmColorMethod.ByACI, 3))
    setMarkupDrawFontSize(16)
    unsubscribe()
    setMarkupDrawColor(createDefaultMarkupColor())
    setMarkupDrawFontSize(MARKUP_FONT_SIZE)
    expect(seen).toEqual(['change', 'change'])
  })
})

describe('acapDrawStyleKindForCommand', () => {
  it('classifies measurement drawing commands', () => {
    expect(acapDrawStyleKindForCommand('measuredistance')).toBe('measure')
    expect(acapDrawStyleKindForCommand('measurecontinuous')).toBe('measure')
    expect(acapDrawStyleKindForCommand('MEASUREANGLE')).toBe('measure')
  })

  it('ignores visibility / import commands', () => {
    expect(acapDrawStyleKindForCommand('measurementvis')).toBeUndefined()
    expect(acapDrawStyleKindForCommand('markupvis')).toBeUndefined()
    expect(acapDrawStyleKindForCommand('line')).toBeUndefined()
  })
})

describe('acapResolveDrawStyleKind', () => {
  it('keeps the overlay kind from overlay selection when no draw command is active', () => {
    expect(acapResolveDrawStyleKind({ markupSelected: true })).toBe('markup')
    expect(acapResolveDrawStyleKind({ measurementSelected: true })).toBe(
      'measure'
    )
    expect(acapResolveDrawStyleKind({})).toBeUndefined()
  })

  it('prefers an active draw command over overlay selection', () => {
    expect(
      acapResolveDrawStyleKind({
        commandKind: 'measure',
        markupSelected: true
      })
    ).toBe('measure')
    expect(
      acapResolveDrawStyleKind({
        commandKind: 'markup',
        markupSelected: true,
        measurementSelected: true
      })
    ).toBe('markup')
  })

  it('hides the overlay when markup and measurement are both selected', () => {
    expect(
      acapResolveDrawStyleKind({
        markupSelected: true,
        measurementSelected: true
      })
    ).toBeUndefined()
  })
})

describe('draw style toolbar visibility', () => {
  afterEach(() => {
    acapSetDrawStyleToolbarVisible(false)
  })

  it('notifies subscribers when visibility changes', () => {
    const seen: boolean[] = []
    const unsubscribe = acapSubscribeDrawStyleToolbarVisibility(value => {
      seen.push(value)
    })
    acapSetDrawStyleToolbarVisible(true)
    expect(acapIsDrawStyleToolbarVisible()).toBe(true)
    acapSetDrawStyleToolbarVisible(true)
    acapSetDrawStyleToolbarVisible(false)
    unsubscribe()
    expect(seen).toEqual([true, false])
  })
})

describe('acapShouldShowDrawStyleToolbar', () => {
  afterEach(() => {
    acapSetDrawStyleHostHasRibbon(undefined)
  })

  it('shows the overlay when a draw command is active and the ribbon is hidden', () => {
    expect(acapShouldShowDrawStyleToolbar('measure', false)).toBe(true)
    expect(acapShouldShowDrawStyleToolbar('markup', false)).toBe(true)
  })

  it('hides the overlay when the ribbon is visible so ribbon style controls stay usable', () => {
    expect(acapShouldShowDrawStyleToolbar('measure', true)).toBe(false)
    expect(acapShouldShowDrawStyleToolbar('markup', true)).toBe(false)
  })

  it('hides the overlay when no draw command is active', () => {
    expect(acapShouldShowDrawStyleToolbar(undefined, false)).toBe(false)
    expect(acapShouldShowDrawStyleToolbar(undefined, true)).toBe(false)
  })

  it('shows the overlay for hosts without a ribbon without reading persisted settings', () => {
    acapSetDrawStyleHostHasRibbon(false)
    expect(acapShouldShowDrawStyleToolbar('measure')).toBe(true)
    expect(acapShouldShowDrawStyleToolbar('markup')).toBe(true)
    expect(acapShouldShowDrawStyleToolbar(undefined)).toBe(false)
  })
})

describe('translateMarkupGeometry', () => {
  it('translates arrow endpoints', () => {
    const geom: AcApMarkupGeometry = {
      type: 'arrow',
      start: { x: 0, y: 0 },
      end: { x: 2, y: 0 }
    }
    expect(translateMarkupGeometry(geom, 1, 3)).toEqual({
      type: 'arrow',
      start: { x: 1, y: 3 },
      end: { x: 3, y: 3 }
    })
  })

  it('translates cloud corners and attached callout', () => {
    const geom: AcApMarkupGeometry = {
      type: 'cloud',
      corner1: { x: 0, y: 0 },
      corner2: { x: 4, y: 2 },
      callout: {
        tip: { x: 4, y: 1 },
        anchor: { x: 6, y: 1 },
        text: 'note'
      }
    }
    const next = translateMarkupGeometry(geom, 10, -2)
    expect(next).toEqual({
      type: 'cloud',
      corner1: { x: 10, y: -2 },
      corner2: { x: 14, y: 0 },
      callout: {
        tip: { x: 14, y: -1 },
        anchor: { x: 16, y: -1 },
        text: 'note'
      }
    })
    expect(markupGeometryCenter(next)).toEqual({ x: 12, y: -1 })
  })

  it('translates circle center without changing radius', () => {
    const geom: AcApMarkupGeometry = {
      type: 'circle',
      center: { x: 5, y: 5 },
      radius: 3
    }
    expect(translateMarkupGeometry(geom, -5, 1)).toEqual({
      type: 'circle',
      center: { x: 0, y: 6 },
      radius: 3
    })
  })

  it('translates a standalone callout by its midpoint', () => {
    const geom: AcApMarkupGeometry = {
      type: 'callout',
      tip: { x: 0, y: 0 },
      anchor: { x: 4, y: 2 }
    }
    expect(markupGeometryCenter(geom)).toEqual({ x: 2, y: 1 })
    expect(translateMarkupGeometry(geom, 2, 2)).toEqual({
      type: 'callout',
      tip: { x: 2, y: 2 },
      anchor: { x: 6, y: 4 }
    })
  })
})

describe('isMarkupDoublePointer', () => {
  it('detects two nearby pointer downs within the double-click window', () => {
    const first = { t: 1000, x: 10, y: 10 }
    expect(isMarkupDoublePointer(first, { t: 1200, x: 12, y: 11 })).toBe(true)
  })

  it('rejects a slow or distant second pointer down', () => {
    const first = { t: 1000, x: 10, y: 10 }
    expect(isMarkupDoublePointer(first, { t: 1600, x: 10, y: 10 })).toBe(false)
    expect(isMarkupDoublePointer(first, { t: 1100, x: 40, y: 10 })).toBe(false)
    expect(isMarkupDoublePointer(undefined, { t: 1000, x: 0, y: 0 })).toBe(
      false
    )
  })
})
