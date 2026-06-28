import { AcCmColor } from '@mlightcad/data-model'
import {
  AcTrEntity,
  AcTrRenderContext,
  AcTrRenderer,
  getSceneDrawableUserData,
  setMaterialMetadata
} from '@mlightcad/three-renderer'
import * as THREE from 'three'

import { AcTrLayerAppearanceController } from '../src/view/AcTrLayerAppearanceController'
import { AcTrLayer } from '../src/view/AcTrLayer'
import { AcTrScene } from '../src/view/AcTrScene'

/**
 * Regression guard for remapped material ids: each layout scene layer must be
 * updated once when {@link AcTrLayer.syncAppearanceFromRecord} runs.
 */
describe('layer material remap fan-out', () => {
  it('updates batched materials once per remapped id', () => {
    const oldMaterial = new THREE.LineBasicMaterial({ color: 0xffffff })
    const newMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 })
    const materials: Record<number, THREE.Material> = {
      [oldMaterial.id]: newMaterial
    }

    const wallLayer = new AcTrLayer({
      name: 'WALL',
      isFrozen: false,
      isOff: false,
      color: new AcCmColor()
    })
    const updateMaterial = jest.spyOn(wallLayer, 'updateMaterial')

    const renderer = {
      getLayerBoundMaterial: jest.fn(
        (material: THREE.Material) => material
      ),
      styleManager: {
        getLineMaterial: jest.fn(),
        getMTextFillMaterial: jest.fn()
      }
    } as unknown as AcTrRenderer

    wallLayer.syncAppearanceFromRecord(
      'WALL',
      { layer: 'WALL' },
      materials,
      renderer
    )

    expect(updateMaterial).toHaveBeenCalledTimes(1)
    expect(updateMaterial).toHaveBeenCalledWith(oldMaterial.id, newMaterial)
  })

  it('rebinds unbatched drawables via objectLayerName after INSERT inheritance', () => {
    const oldMaterial = new THREE.LineBasicMaterial({ color: 0xffffff })
    setMaterialMetadata(oldMaterial, {
      layer: '0',
      isByLayerColor: true
    })

    const reboundMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 })
    const materials: Record<number, THREE.Material> = {}

    const wallLayer = new AcTrLayer({
      name: 'INSERT',
      isFrozen: false,
      isOff: false,
      color: new AcCmColor()
    })

    const line = new THREE.Line(new THREE.BufferGeometry(), oldMaterial)
    line.userData.layerName = 'INSERT'
    getSceneDrawableUserData(line).noBatch = true

    const entity = new AcTrEntity(new AcTrRenderContext())
    entity.objectId = 'insert-line'
    entity.add(line)
    wallLayer.addEntity(entity)

    let drawable: THREE.Line | undefined
    const unbatchedObjects = (
      wallLayer.internalObject as unknown as { _unbatchedObjects: THREE.Group }
    )._unbatchedObjects
    unbatchedObjects.traverse(child => {
      if (drawable || !(child instanceof THREE.Line)) {
        return
      }
      drawable = child
    })
    expect(drawable).toBeDefined()
    expect(drawable!.material).toBe(oldMaterial)

    const getLayerBoundMaterial = jest.fn(() => reboundMaterial)
    const renderer = {
      getLayerBoundMaterial,
      styleManager: {
        getLineMaterial: jest.fn(),
        getMTextFillMaterial: jest.fn()
      }
    } as unknown as AcTrRenderer

    wallLayer.syncAppearanceFromRecord(
      'INSERT',
      { layer: 'INSERT' },
      materials,
      renderer
    )

    expect(drawable!.material).toBe(reboundMaterial)
    expect(getSceneDrawableUserData(drawable!).styleMaterialId).toBe(
      reboundMaterial.id
    )
    expect(getLayerBoundMaterial).toHaveBeenCalled()
  })

  it('syncs each layout scene layer once via the appearance controller', () => {
    const oldMaterial = new THREE.LineBasicMaterial({ color: 0xffffff })
    const newMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 })
    const materials: Record<number, THREE.Material> = {
      [oldMaterial.id]: newMaterial
    }

    const sceneLayerA = {
      syncAppearanceFromRecord: jest.fn()
    } as unknown as AcTrLayer
    const sceneLayerB = {
      syncAppearanceFromRecord: jest.fn()
    } as unknown as AcTrLayer

    const scene = {
      forEachSceneLayer: jest.fn(
        (
          layerName: string,
          fn: (sceneLayer: AcTrLayer) => void
        ) => {
          expect(layerName).toBe('WALL')
          fn(sceneLayerA)
          fn(sceneLayerB)
        }
      )
    } as unknown as AcTrScene

    const renderer = {
      updateLayerMaterial: jest.fn(() => materials)
    } as unknown as AcTrRenderer

    const controller = new AcTrLayerAppearanceController(
      scene,
      renderer,
      () => ({ layer: 'WALL' })
    )

    controller.syncFromLiveRecord({
      name: 'WALL'
    } as Parameters<AcTrLayerAppearanceController['syncFromLiveRecord']>[0])

    expect(scene.forEachSceneLayer).toHaveBeenCalledTimes(1)
    expect(sceneLayerA.syncAppearanceFromRecord).toHaveBeenCalledTimes(1)
    expect(sceneLayerB.syncAppearanceFromRecord).toHaveBeenCalledTimes(1)
    expect(renderer.updateLayerMaterial).toHaveBeenCalledWith('WALL', {
      layer: 'WALL'
    })
  })

  it('resolves layer traits from renderer draw context by default', () => {
    const layer = {
      name: 'WALL',
      color: new AcCmColor(),
      lineStyle: 'Continuous',
      lineWeight: 25,
      transparency: 0
    }
    const database = {
      tables: {
        layerTable: {
          getAt: jest.fn(() => layer)
        }
      }
    }

    const renderer = {
      context: { database },
      updateLayerMaterial: jest.fn(() => ({}))
    } as unknown as AcTrRenderer

    const controller = new AcTrLayerAppearanceController(
      {
        forEachSceneLayer: jest.fn()
      } as unknown as AcTrScene,
      renderer
    )

    controller.syncFromLiveRecord({
      name: 'WALL'
    } as Parameters<AcTrLayerAppearanceController['syncFromLiveRecord']>[0])

    expect(database.tables.layerTable.getAt).toHaveBeenCalledWith('WALL')
    expect(renderer.updateLayerMaterial).toHaveBeenCalledWith('WALL', {
      layer: 'WALL',
      color: layer.color,
      lineType: layer.lineStyle,
      lineWeight: layer.lineWeight,
      transparency: layer.transparency
    })
  })

  it('skips layer sync when draw database is not yet bound', () => {
    const renderer = {
      context: { database: undefined },
      updateLayerMaterial: jest.fn(() => ({}))
    } as unknown as AcTrRenderer

    const controller = new AcTrLayerAppearanceController(
      {
        forEachSceneLayer: jest.fn()
      } as unknown as AcTrScene,
      renderer
    )

    controller.syncFromLiveRecord({
      name: 'WALL'
    } as Parameters<AcTrLayerAppearanceController['syncFromLiveRecord']>[0])

    expect(renderer.updateLayerMaterial).not.toHaveBeenCalled()
  })
})
