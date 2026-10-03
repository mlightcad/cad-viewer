import {
  AcCmUiYieldGate,
  AcDbDatabase,
  AcDbViewport
} from '@mlightcad/data-model'
import { AcTrEntity, AcTrGroup, AcTrRenderer } from '@mlightcad/three-renderer'

import { AcTrInheritedLayerMaterialMapper } from './AcTrInheritedLayerMaterialMapper'
import { AcTrLayout } from './AcTrLayout'
import {
  acTrCheckOverlaySignal,
  AcTrOverlayOptions,
  acTrSnapshotOverlayTransform
} from './AcTrOverlayOptions'
import { acTrRegisterGroup } from './AcTrRegisterGroup'

/**
 * Builds a detached reference layout using its own native renderer context.
 * No scene is modified. The returned layout owns that renderer: clear its
 * geometry before releasing the renderer's materials, fonts and block cache.
 * An entity conversion failure fails the whole preparation; unsupported native
 * entities that return null and paper-space viewports remain omitted.
 */
export async function acTrPrepareOverlay(
  hostRenderer: AcTrRenderer,
  database: AcDbDatabase,
  options: AcTrOverlayOptions = {}
): Promise<AcTrLayout> {
  acTrCheckOverlaySignal(options.signal)
  const transform = acTrSnapshotOverlayTransform(options.transform)
  const renderer = hostRenderer.createReferenceRenderer(database)
  const context = renderer.context
  const controller = new AbortController()
  const abort = () => controller.abort()
  options.signal?.addEventListener('abort', abort, { once: true })
  if (options.signal?.aborted) controller.abort()
  context.ownResource({ dispose: abort })
  const layout = new AcTrLayout(() => renderer.dispose())
  layout.isReference = true
  layout.internalObject.userData.isReference = true
  const check = () => {
    acTrCheckOverlaySignal(controller.signal)
    if (context.isDisposed) {
      throw new DOMException('Overlay renderer was disposed', 'AbortError')
    }
  }
  const mapper = new AcTrInheritedLayerMaterialMapper(layerName => {
    const layer = database.tables.layerTable.getAt(layerName)
    return layer
      ? {
          layer: layer.name,
          color: layer.color.clone(),
          lineType: layer.lineStyle,
          lineWeight: layer.lineWeight,
          transparency: layer.transparency
        }
      : undefined
  }, renderer)

  try {
    if (transform) {
      const root = layout.internalObject
      root.position.set(
        transform.position.x,
        transform.position.y,
        transform.position.z ?? 0
      )
      root.scale.setScalar(transform.scale)
      root.rotation.set(0, 0, transform.rotationRad)
      root.updateMatrixWorld(true)
    }
    for (const layer of database.tables.layerTable.newIterator()) {
      layout.addLayer({
        name: layer.name,
        isOff: layer.isOff,
        isFrozen: layer.isFrozen,
        color: layer.color
      })
    }
    const yieldGate = new AcCmUiYieldGate(16)
    for (const entity of database.tables.blockTable.modelSpace.newIterator()) {
      check()
      if (entity instanceof AcDbViewport) continue
      let drawable: AcTrEntity | null = null
      try {
        drawable = entity.worldDraw(renderer, false) as AcTrEntity | null
        if (!drawable) continue
        drawable.objectId = entity.objectId
        drawable.ownerId = entity.ownerId
        drawable.layerName = entity.layer
        drawable.visible = entity.visibility !== false
        // Native asyncDraw handles deferred glyphs, linetypes and nested groups
        // using the reference context, without borrowing host font-preload state.
        await finishOverlayGeometry(drawable, controller.signal)
        check()
        if (drawable instanceof AcTrGroup) {
          const group = drawable
          drawable = null // The shared registration owner consumes this group.
          acTrRegisterGroup(group, mapper, {
            addEntity: entity => {
              layout.addEntity(entity)
            }
          })
        } else {
          layout.addEntity(drawable)
        }
      } finally {
        drawable?.dispose()
      }
      await yieldGate.maybeYield(
        () => new Promise<void>(resolve => setTimeout(resolve, 0))
      )
    }
    check()
    return layout
  } catch (error) {
    layout.clear()
    throw error
  } finally {
    options.signal?.removeEventListener('abort', abort)
  }
}

/**
 * Native image/font work may outlive an abort. Stop waiting promptly, then
 * dispose any late geometry without ever allowing it into the published scene.
 * Scope disposal guards native callbacks; this also releases entity wrappers.
 */
function finishOverlayGeometry(
  drawable: AcTrEntity,
  signal?: AbortSignal
): Promise<void> {
  const work = drawable.asyncDraw()
  if (!signal) return work
  return new Promise<void>((resolve, reject) => {
    let aborted = false
    const abort = () => {
      aborted = true
      reject(new DOMException('Overlay attachment was cancelled', 'AbortError'))
    }
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    work.then(
      () => {
        signal.removeEventListener('abort', abort)
        if (aborted) drawable.dispose()
        else resolve()
      },
      error => {
        signal.removeEventListener('abort', abort)
        if (aborted) drawable.dispose()
        else reject(error)
      }
    )
  })
}
