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
  acuiBindDrawStyleSessionAccessory,
  acuiResolveDrawStyleKind,
  acuiShouldShowDrawStyleToolbar
} from '../src/ui/AcUiDrawStyle'
import { acapDrawStyleKindForCommand } from '../src/util/AcApCommandUtil'

jest.mock('../src/app/AcApSettingManager', () => ({
  AcApSettingManager: {
    instance: {
      isShowRibbon: false,
      events: {
        modified: {
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        }
      }
    }
  }
}))

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

describe('acuiResolveDrawStyleKind', () => {
  it('keeps the overlay kind from overlay selection when no draw command is active', () => {
    expect(acuiResolveDrawStyleKind({ markupSelected: true })).toBe('markup')
    expect(acuiResolveDrawStyleKind({ measurementSelected: true })).toBe(
      'measure'
    )
    expect(acuiResolveDrawStyleKind({})).toBeUndefined()
  })

  it('prefers an active draw command over overlay selection', () => {
    expect(
      acuiResolveDrawStyleKind({
        commandKind: 'measure',
        markupSelected: true
      })
    ).toBe('measure')
    expect(
      acuiResolveDrawStyleKind({
        commandKind: 'markup',
        markupSelected: true,
        measurementSelected: true
      })
    ).toBe('markup')
  })

  it('hides the overlay when markup and measurement are both selected', () => {
    expect(
      acuiResolveDrawStyleKind({
        markupSelected: true,
        measurementSelected: true
      })
    ).toBeUndefined()
  })
})

describe('acuiShouldShowDrawStyleToolbar', () => {
  it('shows the overlay when a draw command is active and the ribbon is hidden', () => {
    expect(acuiShouldShowDrawStyleToolbar('measure', false)).toBe(true)
    expect(acuiShouldShowDrawStyleToolbar('markup', false)).toBe(true)
  })

  it('hides the overlay when the ribbon is visible so ribbon style controls stay usable', () => {
    expect(acuiShouldShowDrawStyleToolbar('measure', true)).toBe(false)
    expect(acuiShouldShowDrawStyleToolbar('markup', true)).toBe(false)
  })

  it('hides the overlay when no draw command is active', () => {
    expect(acuiShouldShowDrawStyleToolbar(undefined, false)).toBe(false)
    expect(acuiShouldShowDrawStyleToolbar(undefined, true)).toBe(false)
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

describe('acuiBindDrawStyleSessionAccessory', () => {
  it('assigns a draw-style sessionAccessory that mounts the view host', () => {
    const container = { parentElement: null } as unknown as HTMLElement
    const accessory = {
      id: 'draw-style',
      mount: jest.fn(),
      unmount: jest.fn()
    }
    const setActiveKind = jest.fn()
    const host = {
      setActiveKind,
      createSessionAccessory: () => accessory
    }
    const providers = new Map<string, unknown>()
    const view = {
      container,
      sessionProviders: {
        get: <T,>(id: string) => providers.get(id) as T | undefined,
        set: (id: string, value: unknown) => {
          providers.set(id, value)
        },
        delete: (id: string) => providers.delete(id)
      }
    }
    view.sessionProviders.set('draw-style', host)
    const command = {
      globalName: 'measuredistance',
      sessionAccessory: null as null | typeof accessory
    }
    acuiBindDrawStyleSessionAccessory(command)
    expect(command.sessionAccessory?.id).toBe('draw-style')
    command.sessionAccessory!.mount({
      host: container,
      type: 'desktop',
      view: view as never
    })
    expect(setActiveKind).toHaveBeenCalledWith('measure')
    expect(accessory.mount).toHaveBeenCalled()
    view.sessionProviders.delete('draw-style')
    expect(() =>
      command.sessionAccessory!.mount({
        host: container,
        type: 'desktop',
        view: view as never
      })
    ).toThrow()
  })

  it('skips desktop chrome mount when the shortcut toolbar owns the slot', () => {
    const container = { parentElement: null } as unknown as HTMLElement
    const accessory = {
      id: 'draw-style',
      mount: jest.fn(),
      unmount: jest.fn()
    }
    const host = {
      setActiveKind: jest.fn(),
      createSessionAccessory: () => accessory
    }
    const providers = new Map<string, unknown>()
    const view = {
      container,
      sessionProviders: {
        get: <T,>(id: string) => providers.get(id) as T | undefined,
        set: (id: string, value: unknown) => {
          providers.set(id, value)
        },
        delete: (id: string) => providers.delete(id)
      }
    }
    view.sessionProviders.set('draw-style', host)
    view.sessionProviders.set('shortcut-toolbar', { isVisible: true })
    const command = {
      globalName: 'measuredistance',
      sessionAccessory: null as null | {
        id: string
        mount: (options: unknown) => void
        unmount: () => void
      }
    }
    acuiBindDrawStyleSessionAccessory(command)
    expect(() =>
      command.sessionAccessory!.mount({
        host: container,
        type: 'desktop',
        view: view as never
      })
    ).toThrow()
    expect(accessory.mount).not.toHaveBeenCalled()
  })
})
