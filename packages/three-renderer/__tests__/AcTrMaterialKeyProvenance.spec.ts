import { AcGiSubEntityTraits } from '@mlightcad/data-model'

import { AcTrStyleManager } from '../src/style/AcTrStyleManager'
import { AcTrSubEntityTraitsUtil } from '../src/util'

/**
 * Builds layer-0 traits whose colour resolves to ACI 7 (foreground), optionally
 * recording whether that colour was authored ByLayer.
 *
 * Both cases are byte-identical in `traits.color` after `AcDbEntity.worldDraw`
 * resolves ByLayer against the layer table, so only `isColorByLayer` tells them
 * apart.
 */
function makeAci7Traits(isColorByLayer: boolean): AcGiSubEntityTraits {
  const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
  traits.layer = '0'
  traits.color.setForeground()
  ;(
    traits as AcGiSubEntityTraits & { isColorByLayer?: boolean }
  ).isColorByLayer = isColorByLayer
  return traits
}

describe('material cache key colour provenance', () => {
  it('keeps explicit ACI-7 and ByLayer ACI-7 in separate cache entries', () => {
    // Regression: a title frame authored with an explicit ACI-7 polyline on
    // layer 0 inside a red INSERT layer. Both variants share the resolved
    // symbolic colour, so a shared cache entry made whichever material was
    // created first decide `isByLayerColor` for both — the frame then either
    // inherited the INSERT red or an inherited entity stayed white, purely
    // depending on draw order.
    const styleManager = new AcTrStyleManager()

    const byLayer = styleManager.getLineMaterial(makeAci7Traits(true), false)
    const explicit = styleManager.getLineMaterial(makeAci7Traits(false), false)

    expect(byLayer).not.toBe(explicit)
    expect(byLayer.userData.materialKey).not.toBe(
      explicit.userData.materialKey
    )
  })

  it('reuses one cache entry for the same provenance', () => {
    const styleManager = new AcTrStyleManager()

    const first = styleManager.getLineMaterial(makeAci7Traits(false), false)
    const second = styleManager.getLineMaterial(makeAci7Traits(false), false)

    expect(second).toBe(first)
  })

  it('keeps the key stable for traits without provenance', () => {
    // Older data-model releases do not report `isColorByLayer`; those keys must
    // not change or every cached material would be recreated on upgrade.
    const styleManager = new AcTrStyleManager()
    const traits = makeAci7Traits(false)
    delete (traits as AcGiSubEntityTraits & { isColorByLayer?: boolean })
      .isColorByLayer

    const withoutProvenance = styleManager.getLineMaterial(traits, false)
    expect(withoutProvenance.userData.materialKey).toBe('0_basic_7_1')
  })
})
