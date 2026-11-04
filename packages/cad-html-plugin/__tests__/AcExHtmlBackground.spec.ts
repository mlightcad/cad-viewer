import type { AcExHtmlSnapshot } from '@mlightcad/cad-html-core'
import {
  ACEX_HTML_BACKGROUND_BLACK,
  ACEX_HTML_BACKGROUND_WHITE,
  acexHtmlBackgroundRgb,
  acexHtmlLayoutBackground,
  acexHtmlApplyBackground,
  acexHtmlRemapSnapshotForegroundForBackground,
  acexHtmlResolveBackground
} from '@mlightcad/cad-html-core'

function snapshot(options?: {
  lineColor?: number
  meshColor?: number
  texture?: boolean
  gradient?: { startColor: number; endColor: number }
}): AcExHtmlSnapshot {
  return {
    meta: { background: 0x112233 },
    layouts: [
      {
        lineBatches: [{ color: options?.lineColor ?? 0x000000 }],
        meshBatches: [
          {
            color: options?.meshColor ?? 0xffffff,
            texture: options?.texture
              ? { mimeType: 'image/png', bytes: new Uint8Array() }
              : undefined,
            gradientFill: options?.gradient
              ? {
                  startColor: options.gradient.startColor,
                  endColor: options.gradient.endColor,
                  angle: 0,
                  shift: 0,
                  gradientType: 0
                }
              : undefined
          }
        ]
      }
    ]
  } as unknown as AcExHtmlSnapshot
}

describe('HTML export background', () => {
  it('resolves omitted and black to black, and white to white', () => {
    expect(acexHtmlBackgroundRgb(undefined)).toBe(ACEX_HTML_BACKGROUND_BLACK)
    expect(acexHtmlBackgroundRgb('black')).toBe(ACEX_HTML_BACKGROUND_BLACK)
    expect(acexHtmlBackgroundRgb('white')).toBe(ACEX_HTML_BACKGROUND_WHITE)
  })

  it('keeps paper-space ink when the export canvas stays light', () => {
    const exported = snapshot({ lineColor: 0x000000, meshColor: 0xffffff })
    acexHtmlRemapSnapshotForegroundForBackground(
      exported,
      ACEX_HTML_BACKGROUND_WHITE,
      ACEX_HTML_BACKGROUND_WHITE
    )
    expect(exported.meta.background).toBe(ACEX_HTML_BACKGROUND_WHITE)
    expect(exported.layouts[0]!.lineBatches[0]!.color).toBe(0x000000)
    expect(exported.layouts[0]!.meshBatches[0]!.color).toBe(0xffffff)
  })

  it('flips near-black and near-white ink when paper space is exported on black', () => {
    const exported = snapshot({
      lineColor: 0x101010,
      meshColor: 0xf0f0f0,
      gradient: { startColor: 0x000000, endColor: 0xff0000 }
    })
    acexHtmlRemapSnapshotForegroundForBackground(
      exported,
      ACEX_HTML_BACKGROUND_WHITE,
      ACEX_HTML_BACKGROUND_BLACK
    )
    expect(exported.meta.background).toBe(ACEX_HTML_BACKGROUND_BLACK)
    expect(exported.layouts[0]!.lineBatches[0]!.color).toBe(0xffffff)
    expect(exported.layouts[0]!.meshBatches[0]!.color).toBe(0x000000)
    expect(exported.layouts[0]!.meshBatches[0]!.gradientFill!.startColor).toBe(
      0xffffff
    )
    expect(exported.layouts[0]!.meshBatches[0]!.gradientFill!.endColor).toBe(
      0xff0000
    )
  })

  it('does not tint image textures when the canvas flips', () => {
    const exported = snapshot({
      lineColor: 0xff00ff,
      meshColor: 0xffffff,
      texture: true
    })
    acexHtmlRemapSnapshotForegroundForBackground(
      exported,
      ACEX_HTML_BACKGROUND_BLACK,
      ACEX_HTML_BACKGROUND_WHITE
    )
    expect(exported.layouts[0]!.lineBatches[0]!.color).toBe(0xff00ff)
    expect(exported.layouts[0]!.meshBatches[0]!.color).toBe(0xffffff)
  })

  it('resolves space and treats anything else as black', () => {
    expect(acexHtmlResolveBackground(undefined)).toBe('black')
    expect(acexHtmlResolveBackground('black')).toBe('black')
    expect(acexHtmlResolveBackground('white')).toBe('white')
    expect(acexHtmlResolveBackground('space')).toBe('space')
    expect(acexHtmlLayoutBackground('space', true, 0xffffff)).toBe(
      ACEX_HTML_BACKGROUND_BLACK
    )
    expect(acexHtmlLayoutBackground('space', false, 0)).toBe(
      ACEX_HTML_BACKGROUND_WHITE
    )
    expect(acexHtmlLayoutBackground('black', false, 0x112233)).toBe(0x112233)
  })

  it('bakes model space black and paper space white', () => {
    const exported = {
      activeLayoutBtrId: 'paper',
      meta: { background: ACEX_HTML_BACKGROUND_WHITE },
      layouts: [
        {
          btrId: 'model',
          isModelSpace: true,
          lineBatches: [{ color: 0x101010 }],
          meshBatches: []
        },
        {
          btrId: 'paper',
          isModelSpace: false,
          lineBatches: [{ color: 0x101010 }],
          meshBatches: [{ color: 0xf0f0f0, texture: undefined }]
        }
      ]
    } as unknown as AcExHtmlSnapshot

    acexHtmlApplyBackground(exported, ACEX_HTML_BACKGROUND_WHITE, 'space')

    expect(exported.meta.backgroundMode).toBe('space')
    expect(exported.meta.background).toBe(ACEX_HTML_BACKGROUND_WHITE)
    expect(exported.layouts[0]!.lineBatches[0]!.color).toBe(0xffffff)
    expect(exported.layouts[1]!.lineBatches[0]!.color).toBe(0x101010)
    expect(exported.layouts[1]!.meshBatches[0]!.color).toBe(0xf0f0f0)
  })
})
