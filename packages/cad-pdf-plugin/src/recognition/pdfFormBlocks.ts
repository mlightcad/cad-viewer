/**
 * Rebuilds blocks from repeated Form XObjects.
 *
 * CAD producers often write each block definition once as a Form XObject and
 * paint it once per insert. PDF.js inlines every paint without naming the
 * form, so instances are matched by their geometry mapped back into form
 * space: identical local geometry means the same form, and each instance's
 * form matrix becomes the block reference transform.
 */

import type {
  PdfImportedSubpath,
  PdfImportFormInstance,
  PdfImportPageContent,
  PdfImportSegment
} from '../pdfVectorImport'
import {
  type PdfCurveRecognitionOptions,
  type PdfRecognizedShape,
  recognizePdfCurves
} from './pdfCurveRecognition'
import type { PdfRecPoint } from './pdfRecGeometry'

/** One shape of a block definition. */
export interface PdfFormBlockShape {
  shape: PdfRecognizedShape
  layerName?: string
  color?: string
  lineWidth?: number
}

/** Placement of one block reference, in model-space millimeters. */
export interface PdfFormBlockReference {
  position: PdfRecPoint
  rotation: number
  scaleX: number
  scaleY: number
  /** Layer of the instance's first subpath. */
  layerName?: string
}

/** A recovered block: its definition and every reference to it. */
export interface PdfFormBlock {
  shapes: PdfFormBlockShape[]
  references: PdfFormBlockReference[]
}

/** Result of {@link buildPdfFormBlocks}. */
export interface PdfFormBlockResult {
  blocks: PdfFormBlock[]
  /** Indices into `content.subpaths` now represented by blocks. */
  consumed: Set<number>
}

/** Tuning for {@link buildPdfFormBlocks}. */
export interface PdfFormBlockOptions {
  /** Fewest identical instances that make a block. Default 2. */
  minInstances?: number
  curveRecognition?: PdfCurveRecognitionOptions
}

type Affine = PdfImportFormInstance['toCad']

function invert(t: Affine): Affine | undefined {
  const det = t.a * t.d - t.b * t.c
  if (!(Math.abs(det) > 1e-15)) return undefined
  const a = t.d / det
  const b = -t.b / det
  const c = -t.c / det
  const d = t.a / det
  return { a, b, c, d, e: -(a * t.e + c * t.f), f: -(b * t.e + d * t.f) }
}

function apply(t: Affine, p: PdfRecPoint): PdfRecPoint {
  return { x: t.a * p.x + t.c * p.y + t.e, y: t.b * p.x + t.d * p.y + t.f }
}

function mapSegment(t: Affine, segment: PdfImportSegment): PdfImportSegment {
  return segment.kind === 'line'
    ? { kind: 'line', p0: apply(t, segment.p0), p1: apply(t, segment.p1) }
    : {
        kind: 'cubic',
        p0: apply(t, segment.p0),
        p1: apply(t, segment.p1),
        p2: apply(t, segment.p2),
        p3: apply(t, segment.p3)
      }
}

/**
 * Decomposes a form matrix into a block reference transform
 * (`translate · rotate · scale`), or `undefined` when it has shear, which a
 * block reference cannot express.
 */
function decompose(t: Affine) {
  const scaleX = Math.hypot(t.a, t.b)
  if (!(scaleX > 0)) return undefined
  const det = t.a * t.d - t.b * t.c
  const scaleY = det / scaleX
  const skew = Math.abs(t.a * t.c + t.b * t.d)
  if (skew > 1e-6 * scaleX * Math.abs(scaleY)) return undefined
  return { rotation: Math.atan2(t.b, t.a), scaleX, scaleY }
}

/** Form-space signature of one instance: segments, styles and order. */
function instanceSignature(
  subpaths: PdfImportedSubpath[],
  toLocal: Affine
): string {
  // Relative rounding keeps float noise from the matrix product out of the
  // key while still separating genuinely different forms.
  const q = (v: number) => Math.round(v * 1e3) / 1e3
  const pt = (p: PdfRecPoint) => `${q(p.x)},${q(p.y)}`
  return subpaths
    .map(subpath => {
      const segments = (subpath.segments ?? []).map(s => {
        const m = mapSegment(toLocal, s)
        return m.kind === 'line'
          ? `L${pt(m.p0)} ${pt(m.p1)}`
          : `C${pt(m.p0)} ${pt(m.p1)} ${pt(m.p2)} ${pt(m.p3)}`
      })
      return `${subpath.layerName ?? ''}|${subpath.color ?? ''}|${subpath.filled ? 'F' : 'S'}|${segments.join(';')}`
    })
    .join('\n')
}

/**
 * Groups identical top-level Form XObject paints into blocks.
 *
 * Only instances whose form matrix has no shear qualify. The definition
 * uses the first instance's form space scaled so that instance's reference
 * has an X scale of 1 (so definitions keep model-space millimeters).
 *
 * @param content - Extracted page content with `formInstances`.
 * @param options - Instance threshold and curve recognition settings.
 */
export function buildPdfFormBlocks(
  content: Pick<PdfImportPageContent, 'subpaths' | 'formInstances'>,
  options: PdfFormBlockOptions = {}
): PdfFormBlockResult {
  const result: PdfFormBlockResult = { blocks: [], consumed: new Set() }
  const instances = content.formInstances ?? []
  if (instances.length === 0) return result
  const minInstances = Math.max(2, options.minInstances ?? 2)

  const members = new Map<number, number[]>()
  content.subpaths.forEach((subpath, index) => {
    if (subpath.formInstance === undefined) return
    const list = members.get(subpath.formInstance)
    if (list) list.push(index)
    else members.set(subpath.formInstance, [index])
  })

  const groups = new Map<string, number[]>()
  for (const [instance, indices] of members) {
    const toCad = instances[instance]?.toCad
    if (!toCad || !decompose(toCad)) continue
    const toLocal = invert(toCad)
    if (!toLocal) continue
    const key = instanceSignature(
      indices.map(i => content.subpaths[i]),
      toLocal
    )
    const group = groups.get(key)
    if (group) group.push(instance)
    else groups.set(key, [instance])
  }

  for (const group of groups.values()) {
    if (group.length < minInstances) continue
    const first = instances[group[0]].toCad
    const firstPlacement = decompose(first)!
    const unit = firstPlacement.scaleX
    const toLocal = invert(first)!
    // Definition space = form space × unit.
    const toDefinition: Affine = {
      a: toLocal.a * unit,
      b: toLocal.b * unit,
      c: toLocal.c * unit,
      d: toLocal.d * unit,
      e: toLocal.e * unit,
      f: toLocal.f * unit
    }
    const shapes: PdfFormBlockShape[] = []
    for (const index of members.get(group[0])!) {
      const subpath = content.subpaths[index]
      const segments = (subpath.segments ?? []).map(s =>
        mapSegment(toDefinition, s)
      )
      for (const shape of recognizePdfCurves(
        segments,
        options.curveRecognition
      )) {
        shapes.push({
          shape,
          layerName: subpath.layerName,
          color: subpath.color,
          lineWidth: subpath.lineWidth
        })
      }
    }
    if (shapes.length === 0) continue

    const references = group.map(instance => {
      const toCad = instances[instance].toCad
      const placement = decompose(toCad)!
      const firstIndex = members.get(instance)![0]
      return {
        position: { x: toCad.e, y: toCad.f },
        rotation: placement.rotation,
        scaleX: placement.scaleX / unit,
        scaleY: placement.scaleY / unit,
        layerName: content.subpaths[firstIndex].layerName
      }
    })
    result.blocks.push({ shapes, references })
    for (const instance of group) {
      for (const index of members.get(instance)!) result.consumed.add(index)
    }
  }
  return result
}
