/** @jest-environment jsdom */

import {
  acedGetUiLayout,
  acedIsCompactUiLayout,
  acedIsMobileUiLayout,
  acedSubscribeUiLayout,
  ML_UI_COMPACT_MAX_WIDTH,
  ML_UI_COMPACT_MEDIA_QUERY,
  ML_UI_MOBILE_MAX_WIDTH,
  ML_UI_MOBILE_MEDIA_QUERY
} from '../src/editor/global/AcEdUiLayout'

type MediaListener = (event: MediaQueryListEvent) => void

function installMatchMedia(matches: (query: string) => boolean) {
  const listeners = new Map<string, Set<MediaListener>>()
  const matchMediaDescriptor = Object.getOwnPropertyDescriptor(
    window,
    'matchMedia'
  )

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: matches(query),
      media: query,
      addEventListener: (type: string, listener: MediaListener) => {
        if (type !== 'change') return
        let set = listeners.get(query)
        if (!set) {
          set = new Set()
          listeners.set(query, set)
        }
        set.add(listener)
      },
      removeEventListener: (type: string, listener: MediaListener) => {
        if (type !== 'change') return
        listeners.get(query)?.delete(listener)
      }
    })
  })

  return {
    restore() {
      if (matchMediaDescriptor) {
        Object.defineProperty(window, 'matchMedia', matchMediaDescriptor)
      }
    },
    fire(query: string) {
      const event = { matches: matches(query), media: query } as MediaQueryListEvent
      listeners.get(query)?.forEach(listener => listener(event))
    }
  }
}

describe('AcEdUiLayout', () => {
  it('exports mobile layout constants', () => {
    expect(ML_UI_MOBILE_MAX_WIDTH).toBe(600)
    expect(ML_UI_MOBILE_MEDIA_QUERY).toBe('(max-width: 600px)')
  })

  it('exports compact layout constants', () => {
    expect(ML_UI_COMPACT_MAX_WIDTH).toBe(960)
    expect(ML_UI_COMPACT_MEDIA_QUERY).toBe('(max-width: 960px)')
  })

  it('reports mobile layout from matchMedia', () => {
    const media = installMatchMedia(
      query => query === ML_UI_MOBILE_MEDIA_QUERY
    )

    expect(acedIsMobileUiLayout()).toBe(true)
    expect(acedIsCompactUiLayout()).toBe(false)
    expect(acedGetUiLayout()).toBe('phone')

    media.restore()
  })

  it('reports compact layout from matchMedia', () => {
    const media = installMatchMedia(
      query => query === ML_UI_COMPACT_MEDIA_QUERY
    )

    expect(acedIsCompactUiLayout()).toBe(true)
    expect(acedGetUiLayout()).toBe('pad')

    media.restore()
  })

  it('reports desktop when neither mobile nor compact matches', () => {
    const media = installMatchMedia(() => false)

    expect(acedGetUiLayout()).toBe('desktop')

    media.restore()
  })

  it('notifies subscribers when layout kind changes', () => {
    let mobile = true
    let compact = true
    const media = installMatchMedia(query => {
      if (query === ML_UI_MOBILE_MEDIA_QUERY) return mobile
      if (query === ML_UI_COMPACT_MEDIA_QUERY) return compact
      return false
    })

    const listener = jest.fn()
    const unsubscribe = acedSubscribeUiLayout(listener)

    expect(acedGetUiLayout()).toBe('phone')

    mobile = false
    media.fire(ML_UI_MOBILE_MEDIA_QUERY)
    expect(listener).toHaveBeenCalledWith('pad')

    compact = false
    media.fire(ML_UI_COMPACT_MEDIA_QUERY)
    expect(listener).toHaveBeenCalledWith('desktop')

    unsubscribe()
    media.restore()
  })
})
