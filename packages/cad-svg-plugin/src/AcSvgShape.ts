import {
  AcGiShapeData,
  AcGiSubEntityTraits,
  AcGiTextStyle
} from '@mlightcad/data-model'

import { AcSvgEntity } from './AcSvgEntity'
import { buildSvgShape } from './AcSvgShapeUtil'
import { AcSvgStyleContext } from './AcSvgStyleUtil'

/**
 * SVG entity for AutoCAD SHAPE objects.
 *
 * Renders SHX shape definitions as stroked SVG paths, matching the line-based
 * geometry produced by {@link @mlightcad/mtext-renderer} for the Three.js viewer.
 */
export class AcSvgShape extends AcSvgEntity {
  constructor(
    shape: AcGiShapeData,
    style: AcGiTextStyle,
    traits: AcGiSubEntityTraits,
    ctx: AcSvgStyleContext
  ) {
    super()
    const built = buildSvgShape(shape, style, traits, ctx)
    this._localSvg = built.localSvg
    this._box = built.box
  }
}
