/** @jest-environment jsdom */

import {
  isCompactUiLayout,
  isMobileUiLayout,
  ML_UI_COMPACT_MAX_WIDTH,
  ML_UI_COMPACT_MEDIA_QUERY,
  ML_UI_MOBILE_MAX_WIDTH,
  ML_UI_MOBILE_MEDIA_QUERY
} from '../src/editor/global/AcEdUiLayout'

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
    const matchMediaDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'matchMedia'
    )

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: query === ML_UI_MOBILE_MEDIA_QUERY,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      })
    })

    expect(isMobileUiLayout()).toBe(true)
    expect(isCompactUiLayout()).toBe(false)

    if (matchMediaDescriptor) {
      Object.defineProperty(window, 'matchMedia', matchMediaDescriptor)
    }
  })

  it('reports compact layout from matchMedia', () => {
    const matchMediaDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'matchMedia'
    )

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: query === ML_UI_COMPACT_MEDIA_QUERY,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      })
    })

    expect(isCompactUiLayout()).toBe(true)

    if (matchMediaDescriptor) {
      Object.defineProperty(window, 'matchMedia', matchMediaDescriptor)
    }
  })
})
