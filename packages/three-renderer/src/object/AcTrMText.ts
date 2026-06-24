import {
  AcGiMTextData,
  AcGiSubEntityTraits,
  AcGiTextStyle,
  log
} from '@mlightcad/data-model'
import {
  ColorSettings,
  MTextData,
  MTextObject
} from '@mlightcad/mtext-renderer'
import * as THREE from 'three'

import type { AcTrDrawMode } from '../draw/AcTrDrawMode'
import { AcTrMTextRenderer } from '../renderer'
import { AcTrRenderContext } from '../renderer/AcTrRenderContext'
import {
  AcTrMTextColorUtil,
  type AcTrMTextEntityTraits,
  AcTrSubEntityTraitsUtil
} from '../util'
import { AcTrBufferGeometryUtil } from '../util/AcTrBufferGeometryUtil'
import {
  getSceneDrawableUserData,
  resolveMTextRenderRoot
} from '../util/AcTrObjectUserData'
import { AcTrEntity } from './AcTrEntity'

// Reuse scratch objects during hover/pick hit-testing; raycast can run very
// often while the pointer moves, so keeping these allocations out of the hot
// path avoids needless garbage collection pressure.
const _raycastBox = /*@__PURE__*/ new THREE.Box3()
const _raycastPoint = /*@__PURE__*/ new THREE.Vector3()

export class AcTrMText extends AcTrEntity {
  private _mtext?: MTextObject
  private _text: AcGiMTextData
  private _style: AcGiTextStyle
  private _colorSettings: ColorSettings
  private _entityTraits: AcTrMTextEntityTraits

  constructor(
    text: AcGiMTextData,
    traits: AcGiSubEntityTraits,
    style: AcGiTextStyle,
    context: AcTrRenderContext,
    delay: boolean = false
  ) {
    super(context)
    this._text = text
    this._style = { ...style }
    this._entityTraits = AcTrMTextColorUtil.snapshotEntityTraits(traits)
    this._colorSettings = AcTrMTextColorUtil.buildColorSettingsFromTraits(
      traits,
      context.styleManager.currentBackgroundColor
    )
    if (!delay) {
      this.syncDraw()
    }
  }

  /** Reapplies CAD text materials from the entity traits snapshot. */
  refreshTextMaterials(): void {
    this._colorSettings = AcTrMTextColorUtil.buildColorSettingsFromTraits(
      {
        ...AcTrSubEntityTraitsUtil.createDefaultTraits(),
        color: this._entityTraits.color,
        layer: this._entityTraits.layer
      },
      this.renderContext.styleManager.currentBackgroundColor
    )
    AcTrMTextColorUtil.rematerializeTextHierarchy(
      this,
      this._entityTraits,
      this.renderContext.styleManager
    )
  }

  /**
   * Builds renderer input with Z flattened for the 2D plan-view camera.
   *
   * Orthographic views use a narrow near/far band around the camera. MTEXT
   * often carries large DWG elevations while linework/symbols on the same
   * layer may sit at Z=0, so preserving insertion Z would depth-clip glyphs
   * even though the label's XY is inside the viewport.
   */
  private toPlanViewMTextData(): MTextData {
    const source = this._text as MTextData
    const position = source.position
    return {
      ...source,
      position: {
        x: position.x,
        y: position.y,
        z: 0
      }
    }
  }

  override syncDraw(): void {
    const mtextRenderer = AcTrMTextRenderer.getInstance()
    if (!mtextRenderer) return

    try {
      const style = this._style
      const mtextData = this.toPlanViewMTextData()

      this._mtext = mtextRenderer.syncRenderMText(
        mtextData,
        style,
        this._colorSettings
      )
      this.attachMText(this._mtext)
    } catch (error) {
      log.info(
        `Failed to render mtext '${this._text.text}' with the following error:\n`,
        error
      )
    }
  }

  override async asyncDraw() {
    const mtextRenderer = AcTrMTextRenderer.getInstance()
    if (!mtextRenderer) return

    try {
      const style = this._style
      const mtextData = this.toPlanViewMTextData()

      const mtext = await mtextRenderer.asyncRenderMText(
        mtextData,
        style,
        this._colorSettings
      )
      this._mtext = mtext
      this.attachMText(this._mtext)
    } catch (error) {
      log.info(
        `Failed to render mtext '${this._text.text}' with the following error:\n`,
        error
      )
    }
  }

  /**
   * Gets intersections between a casted ray and this MTEXT entity.
   *
   * The mtext renderer provides a logical, per-character raycast that is useful
   * when its cached layout is still available.  After this entity is flattened
   * for batching, however, that logical hierarchy may no longer be able to
   * report a hit.  In that case we fall back to the entity selection box, which
   * is rebuilt from the actual rendered child geometry in
   * {@link updateSelectionBox}.
   *
   * This two-step approach keeps precise text picking when possible while still
   * making point selection robust for MTEXT whose renderer-provided logical box
   * is offset from the visible glyph geometry.
   *
   * @param raycaster Raycaster configured by the active view.
   * @param intersects Output array populated with any detected intersections.
   */
  raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
    const previousLength = intersects.length

    // Prefer the mtext renderer's own character/layout hit-test.  If it reports
    // a hit, keep that result because it is usually more precise than the
    // entity-level fallback below.
    this._mtext?.raycast(raycaster, intersects)
    if (intersects.length > previousLength || this.wcsBbox.isEmpty()) return

    // Fallback path: use the selection box derived from rendered geometry.  This
    // is what protects point selection when the renderer's logical MTEXT box is
    // shifted by attachment/alignment handling.
    _raycastBox.copy(this.wcsBbox)
    if (raycaster.ray.intersectBox(_raycastBox, _raycastPoint)) {
      intersects.push({
        distance: raycaster.ray.origin.distanceTo(_raycastPoint),
        point: _raycastPoint.clone(),
        object: this,
        face: null,
        faceIndex: undefined,
        uv: undefined
      })
    }
  }

  /**
   * Attaches a rendered MTEXT object to this entity and prepares it for viewer
   * batching and selection.
   *
   * The mtext renderer can return a nested hierarchy of meshes and line objects.
   * The CAD renderer flattens that hierarchy so each renderable leaf becomes a
   * direct child of the entity, which keeps batching simple and preserves the
   * visual transforms.  After flattening, every leaf is marked for
   * bounding-box-based intersection because text glyph outlines are often too
   * thin or fragmented for pleasant CAD-style point selection.
   *
   * @param mtext Rendered MTEXT object returned by the shared MTEXT renderer.
   */
  override resolveDrawMode(): AcTrDrawMode {
    return this.batchDrawPolicy.resolveDrawMode({
      position: this._text.position
    })
  }

  private attachMText(mtext: MTextObject) {
    this.add(mtext)
    const renderRoot = resolveMTextRenderRoot(mtext)
    if (this.resolveDrawMode() === 'unbatch') {
      this.markDrawableUnbatched(renderRoot)
    } else {
      this.flatten()
    }
    this.removeInvalidGeometryLeaves()
    this.traverse(object => {
      // Text picking should behave like CAD object picking: the visible glyph
      // area should be selectable even when the pointer lands inside a hollow
      // glyph or between tiny outline segments.
      getSceneDrawableUserData(object).bboxIntersectionCheck = true
    })
    this.updateSelectionBox(mtext)
  }

  /**
   * Rebuilds the entity selection box used by the scene spatial index.
   *
   * The box exposed by the mtext renderer describes its logical MTEXT layout,
   * including per-line vertical space above baseline-drawn glyphs.  The box
   * computed from rendered children tracks visible geometry more closely, but
   * by itself it can trim off that leading space and make edit overlays drift
   * when they round-trip through the MTEXT input box.
   *
   * Use child geometry as the anchor for selection, then merge the renderer box
   * only when it overlaps the geometry.  This keeps legitimate line spacing while
   * still ignoring the known bad case where an aligned renderer box is displaced
   * away from the glyphs.
   *
   * @param mtext Rendered MTEXT object whose logical box is used as fallback.
   */
  private updateSelectionBox(mtext: MTextObject) {
    const geometryBox = this.computeGeometryBox()
    if (geometryBox.isEmpty()) {
      this.wcsBbox = mtext.box
      return
    }
    if (!mtext.box.isEmpty() && mtext.box.intersectsBox(geometryBox)) {
      this.wcsBbox = geometryBox.clone().union(mtext.box)
      return
    }
    this.wcsBbox = geometryBox
  }

  /**
   * Computes a bounding box from all renderable child geometry.
   *
   * Each child geometry owns a local bounding box.  After MTEXT flattening,
   * child transforms carry the placement that used to live in intermediate
   * groups, so each child box is transformed by the child's matrix before being
   * unioned into the result.  The returned box is the selection extent that best
   * matches the visible MTEXT glyph/decoration geometry at attachment time.
   *
   * @returns Bounding box containing all child meshes, lines, and points.
   */
  private computeGeometryBox() {
    const box = new THREE.Box3()
    const childBox = new THREE.Box3()

    this.updateMatrixWorld(true)
    this.traverse(object => {
      if (!this.hasGeometry(object)) return

      const geometry = object.geometry
      // Some renderer outputs already have bounds; compute lazily for those
      // that do not so custom/generated geometries still contribute.
      const boundingBox =
        AcTrBufferGeometryUtil.safeComputeBoundingBox(geometry)
      if (boundingBox == null) return

      object.updateMatrixWorld(true)
      // Move the child's local geometry box into the entity's current coordinate
      // frame before unioning.  This preserves translation/rotation/scale left on
      // the child by flattening.
      childBox.copy(boundingBox).applyMatrix4(object.matrixWorld)
      box.union(childBox)
    })

    return box
  }

  /**
   * Drops render leaves whose buffer positions contain NaN/Infinity.
   *
   * PCCAD tolerance MTEXT can occasionally emit degenerate glyph meshes; keeping
   * them would poison bounding-box aggregation and flood the console with THREE.js
   * warnings during batching.
   */
  private removeInvalidGeometryLeaves() {
    const invalidObjects: THREE.Object3D[] = []
    this.traverse(object => {
      if (!this.hasGeometry(object)) return
      if (AcTrBufferGeometryUtil.hasFinitePositions(object.geometry)) return
      invalidObjects.push(object)
    })

    for (const object of invalidObjects) {
      object.parent?.remove(object)
      if (this.hasGeometry(object)) {
        object.geometry.dispose()
      }
    }
  }

  /**
   * Type guard for Three.js objects that expose buffer geometry.
   *
   * MTEXT render trees may contain plain grouping nodes as well as renderable
   * leaves.  This guard keeps bounding-box collection focused on the leaves that
   * can actually contribute visible geometry.
   *
   * @param object Object in the MTEXT render subtree.
   * @returns True when the object is a mesh, line, or point-like render leaf.
   */
  private hasGeometry(
    object: THREE.Object3D
  ): object is THREE.Mesh | THREE.Line | THREE.Points {
    return (
      'geometry' in object && object.geometry instanceof THREE.BufferGeometry
    )
  }
}
