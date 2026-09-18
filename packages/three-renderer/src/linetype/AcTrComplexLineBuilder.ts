import {
  AcGePoint3dLike,
  AcGiMTextAttachmentPoint,
  AcGiMTextData,
  AcGiShapeData,
  AcGiSubEntityTraits,
  AcGiTextStyle
} from '@mlightcad/data-model'
import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import { AcTrEntity } from '../object/AcTrEntity'
import { AcTrGlyphEntity } from '../object/AcTrGlyphEntity'
import { buildLineGeometry } from '../object/AcTrLineGeometryBuilder'
import { AcTrMText } from '../object/AcTrMText'
import { AcTrShape } from '../object/AcTrShape'
import { AcTrRenderContext } from '../renderer/AcTrRenderContext'
import { AcTrBufferGeometryUtil, getSceneDrawableUserData } from '../util'
import {
  AcTrLineWalkPlacement,
  isComplexLineType,
  isComplexShapeElement,
  isComplexTextElement,
  walkLineType
} from './AcTrLineTypeWalker'

const EMPTY_TEXT_STYLE: AcGiTextStyle = {
  name: '',
  standardFlag: 0,
  fixedTextHeight: 0,
  widthFactor: 1,
  obliqueAngle: 0,
  textGenerationFlag: 0,
  lastHeight: 0,
  font: '',
  bigFont: '',
  extendedFont: ''
}

/**
 * LibreDWG's JS dash binding often returns a single space for complex TEXT
 * elements while DXF group 9 / the linetype description still carry the label
 * (e.g. `6" VCP C700`). Prefer the pattern text when non-blank; otherwise take
 * the first description segment before the repeating ` - ` preview separator.
 */
export function resolveLinetypeEmbeddedText(
  elementText: string | undefined,
  description: string | undefined
): string {
  const raw = elementText ?? ''
  if (raw.trim().length > 0) {
    return raw
  }
  const desc = (description ?? '').trim()
  if (!desc) {
    return raw
  }
  const first = desc.split(/\s+-\s+/)[0]?.trim()
  return first || raw
}

/**
 * Effective linetype scale matching {@link AcTrLineMaterialManager}.
 */
export function resolveLineTypeScale(
  traits: AcGiSubEntityTraits,
  context: AcTrRenderContext
): number {
  const options = context.styleManager.options
  return (options.ltscale || 1) * (options.celtscale || 1) * traits.lineTypeScale
}

function resolveTextStyleForElement(
  placement: AcTrLineWalkPlacement,
  context: AcTrRenderContext
): AcGiTextStyle {
  const database = context.database
  const styleObjectId = placement.element.styleObjectId
  if (database && styleObjectId) {
    const record = database.openObjectForRead(styleObjectId) as
      | { textStyle?: AcGiTextStyle }
      | undefined
    if (record?.textStyle) {
      return { ...record.textStyle }
    }
  }

  const styleName = placement.element.style?.trim()
  if (database && styleName) {
    const record = database.tables.textStyleTable.getAt(styleName) as
      | { textStyle?: AcGiTextStyle }
      | undefined
    if (record?.textStyle) {
      return { ...record.textStyle }
    }
  }

  if (database) {
    const standard = database.tables.textStyleTable.getAt('Standard') as
      | { textStyle?: AcGiTextStyle }
      | undefined
    if (standard?.textStyle) {
      return { ...standard.textStyle }
    }
  }

  return { ...EMPTY_TEXT_STYLE }
}

function createPlacementGlyph(
  placement: AcTrLineWalkPlacement,
  traits: AcGiSubEntityTraits,
  context: AcTrRenderContext,
  lineTypeScale: number
): AcTrGlyphEntity | null {
  const flag = placement.element.elementTypeFlag
  const size = Math.max(
    (placement.element.scale ?? 0.1) * lineTypeScale,
    1e-6
  )
  const style = resolveTextStyleForElement(placement, context)

  if (isComplexTextElement(flag)) {
    const text = resolveLinetypeEmbeddedText(
      placement.element.text,
      traits.lineType.description
    )
    if (text.trim().length > 0) {
      const mtext: AcGiMTextData = {
        text,
        height: size,
        width: 0,
        position: { x: placement.x, y: placement.y, z: placement.z },
        rotation: placement.angle,
        attachmentPoint: AcGiMTextAttachmentPoint.MiddleCenter,
        widthFactor: style.widthFactor || 1
      }
      return new AcTrMText(mtext, traits, style, context, true)
    }
    // Blank TEXT after description fallback — do not invent a shape.
    return null
  }

  if (isComplexShapeElement(flag)) {
    const shape: AcGiShapeData = {
      name: placement.element.shapeName,
      shapeNumber: placement.element.shapeNumber,
      size,
      position: { x: placement.x, y: placement.y, z: placement.z },
      rotation: placement.angle,
      widthFactor: style.widthFactor || 1
    }
    return new AcTrShape(shape, traits, style, context, true)
  }

  // Non-text/shape flag residue with an explicit shape identity.
  if (
    placement.element.shapeNumber != null ||
    placement.element.shapeName
  ) {
    const shape: AcGiShapeData = {
      name: placement.element.shapeName,
      shapeNumber: placement.element.shapeNumber,
      size,
      position: { x: placement.x, y: placement.y, z: placement.z },
      rotation: placement.angle,
      widthFactor: style.widthFactor || 1
    }
    return new AcTrShape(shape, traits, style, context, true)
  }

  return null
}

function appendStrokeGeometry(
  entity: AcTrEntity,
  points: AcGePoint3dLike[],
  material: THREE.Material,
  box: THREE.Box3
): void {
  const built = buildLineGeometry(points, material)
  if (!built) {
    return
  }
  box.union(built.wcsBbox)

  if (built.kind === 'fat') {
    const line = new LineSegments2(
      built.geometry as LineSegmentsGeometry,
      material as LineMaterial
    )
    line.position.copy(built.worldOffset)
    getSceneDrawableUserData(line).styleMaterialId = material.id
    entity.add(line)
    return
  }

  const line = new THREE.LineSegments(
    built.geometry as THREE.BufferGeometry,
    material
  )
  line.position.copy(built.worldOffset)
  entity.add(line)
}

/**
 * Expands a complex (TEXT/SHAPE) linetype into solid stroke pieces plus glyph
 * shells under {@link entity}. Returns `false` when the pattern is simple.
 */
export function buildComplexLineTypeGeometry(
  entity: AcTrEntity,
  points: AcGePoint3dLike[],
  traits: AcGiSubEntityTraits,
  context: AcTrRenderContext
): boolean {
  const pattern = traits.lineType.pattern
  const complex = isComplexLineType(pattern)
  if (!complex || !pattern || points.length < 2) {
    return false
  }

  const lineTypeScale = resolveLineTypeScale(traits, context)
  const walked = walkLineType(points, pattern, lineTypeScale)

  // Solid strokes — complex patterns are already excluded from the dash
  // shader via isComplexLineType; keep lineweight-aware materials.
  const material = context.styleManager.getLineMaterial(traits)
  const box = new THREE.Box3()

  for (const stroke of walked.strokes) {
    if (stroke.length < 2) {
      continue
    }
    appendStrokeGeometry(
      entity,
      stroke.map(p => ({ x: p.x, y: p.y, z: p.z ?? 0 })),
      material,
      box
    )
  }

  for (const placement of walked.placements) {
    const glyph = createPlacementGlyph(
      placement,
      traits,
      context,
      lineTypeScale
    )
    if (glyph) {
      entity.add(glyph)
      // Placement point contributes until glyph geometry is drawn.
      box.expandByPoint(
        new THREE.Vector3(placement.x, placement.y, placement.z)
      )
    }
  }

  if (!box.isEmpty()) {
    entity.wcsBbox = box
  }
  return true
}

/**
 * Draws deferred glyph children of a complex-linetype entity and refreshes
 * the parent bounding box.
 */
export function syncComplexLineTypeGlyphs(entity: AcTrEntity): void {
  entity.traverse(child => {
    if (child === entity) {
      return
    }
    if (child instanceof AcTrGlyphEntity && !child.hasDrawableGeometry()) {
      child.syncDraw()
    }
  })
  refreshComplexLineTypeBbox(entity)
}

/**
 * Async variant of {@link syncComplexLineTypeGlyphs}.
 */
export async function asyncComplexLineTypeGlyphs(
  entity: AcTrEntity
): Promise<void> {
  const tasks: Promise<void>[] = []
  entity.traverse(child => {
    if (child === entity) {
      return
    }
    if (child instanceof AcTrGlyphEntity && !child.hasDrawableGeometry()) {
      tasks.push(child.asyncDraw())
    }
  })
  if (tasks.length > 0) {
    await Promise.all(tasks)
  }
  refreshComplexLineTypeBbox(entity)
}

/**
 * True when any descendant glyph shell still lacks drawable geometry.
 */
export function hasPendingComplexLineTypeGlyphs(entity: AcTrEntity): boolean {
  let pending = false
  entity.traverse(child => {
    if (child instanceof AcTrGlyphEntity && !child.hasDrawableGeometry()) {
      pending = true
    }
  })
  return pending
}

function refreshComplexLineTypeBbox(entity: AcTrEntity): void {
  const box = new THREE.Box3()
  const childBox = new THREE.Box3()
  entity.updateMatrixWorld(true)
  entity.traverse(object => {
    if (object === entity) {
      return
    }
    const mesh = object as THREE.Mesh
    if (!mesh.geometry) {
      return
    }
    const boundingBox = AcTrBufferGeometryUtil.safeComputeBoundingBox(
      mesh.geometry as THREE.BufferGeometry
    )
    if (!boundingBox) {
      return
    }
    object.updateMatrixWorld(true)
    childBox.copy(boundingBox).applyMatrix4(object.matrixWorld)
    box.union(childBox)
  })
  if (!box.isEmpty()) {
    entity.wcsBbox = box
  }
}
