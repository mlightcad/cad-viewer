import type { AcExSnapshot } from '@mlightcad/cad-html-core'
import {
  ACEX_HTML_BACKGROUND_BLACK,
  ACEX_HTML_BACKGROUND_WHITE,
  acExHtmlBackgroundRgb,
  acExHtmlLayoutBackground,
  applyAcExHtmlBackground,
  remapAcExSnapshotForegroundForBackground,
  resolveAcExHtmlBackground
} from '@mlightcad/cad-html-core'

function snapshot(options?: {
  lineColor?: number
  meshColor?: number
  texture?: boolean
  gradient?: { startColor: number; endColor: number }
}): AcExSnapshot {
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
  } as unknown as AcExSnapshot
}

describe('HTML export background', () => {
  it('resolves omitted and black to black, and white to white', () => {
    expect(acExHtmlBackgroundRgb(undefined)).toBe(ACEX_HTML_BACKGROUND_BLACK)
    expect(acExHtmlBackgroundRgb('black')).toBe(ACEX_HTML_BACKGROUND_BLACK)
    expect(acExHtmlBackgroundRgb('white')).toBe(ACEX_HTML_BACKGROUND_WHITE)
  })

  it('keeps paper-space ink when the export canvas stays light', () => {
    const exported = snapshot({ lineColor: 0x000000, meshColor: 0xffffff })
    remapAcExSnapshotForegroundForBackground(
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
    remapAcExSnapshotForegroundForBackground(
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
    remapAcExSnapshotForegroundForBackground(
      exported,
      ACEX_HTML_BACKGROUND_BLACK,
      ACEX_HTML_BACKGROUND_WHITE
    )
    expect(exported.layouts[0]!.lineBatches[0]!.color).toBe(0xff00ff)
    expect(exported.layouts[0]!.meshBatches[0]!.color).toBe(0xffffff)
  })

  it('resolves space and treats anything else as black', () => {
    expect(resolveAcExHtmlBackground(undefined)).toBe('black')
    expect(resolveAcExHtmlBackground('black')).toBe('black')
    expect(resolveAcExHtmlBackground('white')).toBe('white')
    expect(resolveAcExHtmlBackground('space')).toBe('space')
    expect(acExHtmlLayoutBackground('space', true, 0xffffff)).toBe(
      ACEX_HTML_BACKGROUND_BLACK
    )
    expect(acExHtmlLayoutBackground('space', false, 0)).toBe(
      ACEX_HTML_BACKGROUND_WHITE
    )
    expect(acExHtmlLayoutBackground('black', false, 0x112233)).toBe(0x112233)
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
    } as unknown as AcExSnapshot

    applyAcExHtmlBackground(exported, ACEX_HTML_BACKGROUND_WHITE, 'space')

    expect(exported.meta.backgroundMode).toBe('space')
    expect(exported.meta.background).toBe(ACEX_HTML_BACKGROUND_WHITE)
    expect(exported.layouts[0]!.lineBatches[0]!.color).toBe(0xffffff)
    expect(exported.layouts[1]!.lineBatches[0]!.color).toBe(0x101010)
    expect(exported.layouts[1]!.meshBatches[0]!.color).toBe(0xf0f0f0)
  })
})
