import {
  AcGePoint3dLike,
  AcGiSubEntityTraits,
  AcGiTextStyle,
  log
} from '@mlightcad/data-model'
import { ColorSettings, MTextObject } from '@mlightcad/mtext-renderer'
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

/** Scratch box reused by {@link AcTrGlyphEntity.raycast} during bbox fallback. */
const _raycastBox = /*@__PURE__*/ new THREE.Box3()
/** Scratch point reused by {@link AcTrGlyphEntity.raycast} during bbox fallback. */
const _raycastPoint = /*@__PURE__*/ new THREE.Vector3()

/**
 * Base display object for CAD entities rendered through the shared mtext-renderer
 * pipeline, including MTEXT and SHAPE.
 *
 * Subclasses supply glyph-specific renderer input and API calls. This class owns
 * the shared integration concerns: trait/color snapshots, batch/unbatch placement,
 * selection-box construction, raycast fallback, and invalid-geometry cleanup.
 */
export abstract class AcTrGlyphEntity extends AcTrEntity {
  /** Latest rendered output returned by the mtext-renderer, when available. */
  protected _rendered?: MTextObject
  /** Resolved CAD text style passed to the mtext-renderer. */
  protected _style: AcGiTextStyle
  /** Color resolution settings derived from entity traits and background color. */
  protected _colorSettings: ColorSettings
  /** Snapshot of color/layer traits used for rematerialization and unbatched drawables. */
  protected _entityTraits: AcTrMTextEntityTraits

  /**
   * Creates a glyph entity and optionally draws it immediately.
   *
   * @param context Active renderer context that owns style and batching policy.
   * @param traits CAD sub-entity traits used to resolve color and layer behavior.
   * @param style Resolved text style for the mtext-renderer.
   * @param delay When `true`, skips the initial {@link syncDraw} call so callers can
   *   finish setup before geometry is built.
   */
  protected constructor(
    context: AcTrRenderContext,
    traits: AcGiSubEntityTraits,
    style: AcGiTextStyle,
    delay: boolean = false
  ) {
    super(context)
    this._style = style
    this._entityTraits = AcTrMTextColorUtil.snapshotEntityTraits(traits)
    this._colorSettings = AcTrMTextColorUtil.buildColorSettingsFromTraits(
      traits,
      context.styleManager.currentBackgroundColor
    )
    if (!delay) {
      this.syncDraw()
    }
  }

  /**
   * Reapplies CAD text materials from the stored entity traits snapshot.
   *
   * Called when layer color or background changes so glyph drawables pick up the
   * latest resolved display color without rebuilding geometry.
   *
   * @param layerTraits Optional layer-level trait overrides, typically the owning
   *   layer color when the entity color is BYLAYER.
   */
  refreshTextMaterials(layerTraits?: Partial<AcGiSubEntityTraits>): void {
    this._colorSettings = AcTrMTextColorUtil.buildColorSettingsFromTraits(
      {
        ...AcTrSubEntityTraitsUtil.createDefaultTraits(),
        color: this._entityTraits.color,
        layer: this._entityTraits.layer
      },
      this.renderContext.styleManager.currentBackgroundColor
    )
    if (layerTraits?.color && this._entityTraits.color.isByLayer) {
      const rgb = layerTraits.color.RGB
      if (typeof rgb === 'number') {
        this._colorSettings.byLayerColor = rgb
      }
    }
    AcTrMTextColorUtil.rematerializeTextHierarchy(
      this,
      this._entityTraits,
      this.renderContext.styleManager
    )
  }

  /**
   * Returns the insertion point used to resolve batch versus unbatch placement.
   *
   * @returns World-space insertion point for this glyph entity.
   */
  protected abstract getDrawPosition(): AcGePoint3dLike

  /**
   * Renders this entity synchronously through the shared mtext-renderer.
   *
   * @param renderer Initialized mtext-renderer facade.
   * @returns Rendered glyph object tree from the mtext-renderer.
   */
  protected abstract renderSync(renderer: AcTrMTextRenderer): MTextObject

  /**
   * Renders this entity asynchronously through the shared mtext-renderer.
   *
   * @param renderer Initialized mtext-renderer facade.
   * @returns Promise that resolves to the rendered glyph object tree.
   */
  protected abstract renderAsync(
    renderer: AcTrMTextRenderer
  ): Promise<MTextObject>

  /**
   * Builds a short human-readable label for render-failure logging.
   *
   * @returns Description fragment appended to the shared failure log message.
   */
  protected abstract describeRenderFailure(): string

  /**
   * Builds glyph geometry synchronously and attaches it to this entity.
   *
   * No-op when the mtext-renderer has not been initialized yet.
   */
  override syncDraw(): void {
    const mtextRenderer = AcTrMTextRenderer.getInstance()
    if (!mtextRenderer) return

    try {
      this._rendered = this.renderSync(mtextRenderer)
      this.attachRendered(this._rendered)
    } catch (error) {
      log.info(
        `Failed to render ${this.describeRenderFailure()} with the following error:\n`,
        error
      )
    }
  }

  /**
   * Builds glyph geometry asynchronously and attaches it to this entity.
   *
   * No-op when the mtext-renderer has not been initialized yet.
   */
  override async asyncDraw() {
    const mtextRenderer = AcTrMTextRenderer.getInstance()
    if (!mtextRenderer) return

    try {
      this._rendered = await this.renderAsync(mtextRenderer)
      this.attachRendered(this._rendered)
    } catch (error) {
      log.info(
        `Failed to render ${this.describeRenderFailure()} with the following error:\n`,
        error
      )
    }
  }

  /**
   * Gets intersections between a casted ray and this glyph entity.
   *
   * The mtext renderer provides a logical hit-test when its cached layout is
   * still available. After this entity is flattened for batching, that logical
   * hierarchy may no longer report a hit. In that case we fall back to the
   * entity selection box, which is rebuilt from rendered child geometry in
   * {@link updateSelectionBox}.
   *
   * @param raycaster Raycaster configured by the active view.
   * @param intersects Output array populated with any detected intersections.
   */
  raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
    const previousLength = intersects.length

    this._rendered?.raycast(raycaster, intersects)
    if (intersects.length > previousLength || this.wcsBbox.isEmpty()) return

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
   * Resolves whether this glyph entity should batch with other drawables.
   *
   * Delegates to {@link AcTrBatchDrawPolicy} using the subclass insertion point.
   *
   * @returns `'batch'` when the entity can share batched geometry, otherwise
   *   `'unbatch'`.
   */
  override resolveDrawMode(): AcTrDrawMode {
    return this.batchDrawPolicy.resolveDrawMode({
      position: this.getDrawPosition()
    })
  }

  /**
   * Attaches rendered glyph output and prepares it for batching and selection.
   *
   * The mtext renderer can return a nested hierarchy of meshes and line objects.
   * Batched entities flatten that hierarchy so each renderable leaf becomes a
   * direct child of this entity. Unbatched entities keep the renderer root intact
   * and store trait metadata on the drawable for per-object material updates.
   * Every leaf is marked for bounding-box-based intersection because glyph
   * outlines are often too thin for pleasant CAD-style point selection.
   *
   * @param rendered Rendered glyph object returned by the shared mtext-renderer.
   */
  protected attachRendered(rendered: MTextObject) {
    this.add(rendered)
    const renderRoot = resolveMTextRenderRoot(rendered)
    if (this.resolveDrawMode() === 'unbatch') {
      this.markDrawableUnbatched(renderRoot)
      AcTrMTextColorUtil.storeTextEntityTraitsOnDrawable(
        renderRoot,
        this._entityTraits
      )
    } else {
      this.flatten()
    }
    this.removeInvalidGeometryLeaves()
    this.traverse(object => {
      getSceneDrawableUserData(object).bboxIntersectionCheck = true
    })
    this.updateSelectionBox(rendered)
  }

  /**
   * Rebuilds the entity selection box used by the scene spatial index.
   *
   * The box exposed by the mtext renderer describes its logical layout, including
   * vertical space above baseline-drawn glyphs. The box computed from rendered
   * children tracks visible geometry more closely. Use child geometry as the
   * anchor for selection, then merge the renderer box only when it overlaps the
   * geometry so legitimate spacing is preserved while displaced renderer boxes
   * are ignored.
   *
   * @param rendered Rendered glyph object whose logical box is used as fallback.
   */
  protected updateSelectionBox(rendered: MTextObject) {
    const geometryBox = this.computeGeometryBox()
    if (geometryBox.isEmpty()) {
      this.wcsBbox = rendered.box
      return
    }
    if (!rendered.box.isEmpty() && rendered.box.intersectsBox(geometryBox)) {
      this.wcsBbox = geometryBox.clone().union(rendered.box)
      return
    }
    this.wcsBbox = geometryBox
  }

  /**
   * Computes a bounding box from all renderable child geometry.
   *
   * Each child geometry owns a local bounding box. After flattening, child
   * transforms carry placement that used to live in intermediate groups, so
   * each child box is transformed by the child's matrix before being unioned
   * into the result.
   *
   * @returns Bounding box containing all child meshes, lines, and points.
   */
  protected computeGeometryBox() {
    const box = new THREE.Box3()
    const childBox = new THREE.Box3()

    this.updateMatrixWorld(true)
    this.traverse(object => {
      if (!this.hasGeometry(object)) return

      const geometry = object.geometry
      const boundingBox =
        AcTrBufferGeometryUtil.safeComputeBoundingBox(geometry)
      if (boundingBox == null) return

      object.updateMatrixWorld(true)
      childBox.copy(boundingBox).applyMatrix4(object.matrixWorld)
      box.union(childBox)
    })

    return box
  }

  /**
   * Drops render leaves whose buffer positions contain NaN or Infinity.
   *
   * Degenerate glyph meshes would poison bounding-box aggregation and flood the
   * console with THREE.js warnings during batching.
   */
  protected removeInvalidGeometryLeaves() {
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
   * Glyph render trees may contain plain grouping nodes as well as renderable
   * leaves. This guard keeps bounding-box collection focused on leaves that can
   * contribute visible geometry.
   *
   * @param object Object in the glyph render subtree.
   * @returns `true` when the object is a mesh, line, or point-like render leaf.
   */
  protected hasGeometry(
    object: THREE.Object3D
  ): object is THREE.Mesh | THREE.Line | THREE.Points {
    return (
      'geometry' in object && object.geometry instanceof THREE.BufferGeometry
    )
  }
}
