import * as THREE from 'three'

import {
  applyAnnotationScalePass,
  hasAnnotationScaleUserData
} from '../src/viewport/AcTrAnnotationScale'

describe('applyAnnotationScalePass', () => {
  it('scales matching annotative drawables and restores afterward', () => {
    const scene = new THREE.Group()
    const text = new THREE.Object3D()
    text.position.set(10, 20, 0)
    text.scale.set(1, 1, 1)
    text.userData.annotationScale = {
      drawnScaleFactor: 50,
      drawnScaleName: '1:50',
      supportedScaleFactors: [50, 100],
      supportedScaleNames: ['1:50', '1:100']
    }
    scene.add(text)

    const restore = applyAnnotationScalePass(scene, {
      annotationScaleFactor: 100
    })
    expect(text.scale.x).toBeCloseTo(2)
    expect(text.scale.y).toBeCloseTo(2)
    expect(text.visible).toBe(true)

    restore()
    expect(text.scale.x).toBeCloseTo(1)
    expect(text.position.x).toBe(10)
  })

  it('scales baked world-matrix clones used by unbatched MTEXT', () => {
    const scene = new THREE.Group()
    const text = new THREE.Object3D()
    text.matrixAutoUpdate = false
    // Matrix4.set is row-major: scale 2 on XY, translation (10, 20).
    text.matrix.set(
      2, 0, 0, 10,
      0, 2, 0, 20,
      0, 0, 1, 0,
      0, 0, 0, 1
    )
    text.matrixWorld.copy(text.matrix)
    text.matrixWorldNeedsUpdate = false
    text.userData.annotationScale = {
      drawnScaleFactor: 50,
      supportedScaleFactors: [50, 100],
      supportedScaleNames: ['1:50', '1:100']
    }
    scene.add(text)

    const child = new THREE.Object3D()
    child.position.set(1, 0, 0)
    child.updateMatrix()
    text.add(child)
    child.matrixWorld.multiplyMatrices(text.matrixWorld, child.matrix)

    const restore = applyAnnotationScalePass(scene, {
      annotationScaleFactor: 100
    })

    // Uniform scale about the baked origin: 3x3 doubles, translation stays.
    expect(text.matrix.elements[0]).toBeCloseTo(4)
    expect(text.matrix.elements[5]).toBeCloseTo(4)
    expect(text.matrix.elements[12]).toBeCloseTo(10)
    expect(text.matrix.elements[13]).toBeCloseTo(20)
    expect(text.matrixWorld.elements[0]).toBeCloseTo(4)
    // Child world X = origin + local*(scaled basis) = 10 + 1*4
    expect(child.matrixWorld.elements[12]).toBeCloseTo(14)

    restore()
    expect(text.matrix.elements[0]).toBeCloseTo(2)
    expect(text.matrix.elements[12]).toBeCloseTo(10)
    expect(child.matrixWorld.elements[12]).toBeCloseTo(12)
  })

  it('hides unsupported annotative drawables when annoAllVisible is false', () => {
    const scene = new THREE.Group()
    const text = new THREE.Object3D()
    text.userData.annotationScale = {
      drawnScaleFactor: 50,
      supportedScaleFactors: [50],
      supportedScaleNames: ['1:50']
    }
    scene.add(text)

    const restore = applyAnnotationScalePass(scene, {
      annotationScaleFactor: 100,
      annoAllVisible: false
    })
    expect(text.visible).toBe(false)
    restore()
    expect(text.visible).toBe(true)
  })

  it('keeps unsupported drawables visible by default (AutoCAD ANNOALLVISIBLE=1)', () => {
    const scene = new THREE.Group()
    const text = new THREE.Object3D()
    text.userData.annotationScale = {
      drawnScaleFactor: 50,
      supportedScaleFactors: [50],
      supportedScaleNames: ['1:50']
    }
    scene.add(text)

    const restore = applyAnnotationScalePass(scene, {
      annotationScaleFactor: 100
    })
    expect(text.visible).toBe(true)
    expect(text.scale.x).toBe(1)
    restore()
  })

  it('keeps unsupported drawables visible when annoAllVisible is true', () => {
    const scene = new THREE.Group()
    const text = new THREE.Object3D()
    text.userData.annotationScale = {
      drawnScaleFactor: 50,
      supportedScaleFactors: [50],
      supportedScaleNames: ['1:50']
    }
    scene.add(text)

    const restore = applyAnnotationScalePass(scene, {
      annotationScaleFactor: 100,
      annoAllVisible: true
    })
    expect(text.visible).toBe(true)
    expect(text.scale.x).toBe(1)
    restore()
  })

  it('does not rescale a nested annotative child on top of its parent', () => {
    const scene = new THREE.Group()
    const parent = new THREE.Object3D()
    parent.matrixAutoUpdate = false
    parent.matrix.set(1, 0, 0, 10, 0, 1, 0, 20, 0, 0, 1, 0, 0, 0, 0, 1)
    parent.matrixWorld.copy(parent.matrix)
    parent.userData.annotationScale = {
      drawnScaleFactor: 50,
      supportedScaleFactors: [50, 100],
      supportedScaleNames: ['1:50', '1:100']
    }
    const child = new THREE.Object3D()
    child.matrixAutoUpdate = false
    child.matrix.identity()
    child.matrixWorld.copy(parent.matrixWorld)
    child.userData.annotationScale = {
      drawnScaleFactor: 50,
      supportedScaleFactors: [50, 100],
      supportedScaleNames: ['1:50', '1:100']
    }
    parent.add(child)
    scene.add(parent)

    const parentBefore = parent.matrix.clone()
    const childBefore = child.matrixWorld.clone()

    const restore = applyAnnotationScalePass(scene, {
      annotationScaleFactor: 100
    })
    expect(parent.matrix.elements[0]).toBeCloseTo(2)
    expect(child.matrix.elements[0]).toBeCloseTo(1)

    restore()
    expect(parent.matrix.elements).toEqual(parentBefore.elements)
    expect(child.matrixWorld.elements).toEqual(childBefore.elements)

    const again = applyAnnotationScalePass(scene, {
      annotationScaleFactor: 100
    })
    again()
    expect(parent.matrix.elements).toEqual(parentBefore.elements)
    expect(child.matrixWorld.elements).toEqual(childBefore.elements)
  })

  it('detects annotation-scale userData in a hierarchy', () => {
    const root = new THREE.Group()
    const child = new THREE.Object3D()
    child.userData.annotationScale = {
      drawnScaleFactor: 1,
      supportedScaleFactors: [1],
      supportedScaleNames: ['1:1']
    }
    root.add(child)
    expect(hasAnnotationScaleUserData(root)).toBe(true)
    expect(hasAnnotationScaleUserData(new THREE.Group())).toBe(false)
  })
})
