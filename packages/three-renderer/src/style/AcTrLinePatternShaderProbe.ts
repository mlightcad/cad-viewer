import { AcGiLineTypePatternElement } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrLinePatternShaders } from './AcTrLinePatternShaders'

/**
 * Detects whether the active GPU/driver can render the custom line-pattern
 * shader on native `gl.LINES`.
 *
 * Some drivers (notably integrated AMD Radeon graphics through ANGLE /
 * Direct3D 11) fail to rasterize `gl.LINES` combined with the custom
 * `ShaderMaterial` used for CAD linetype dash patterns — the program compiles
 * and draw calls are submitted, but zero fragments are produced. On such
 * drivers, patterned lines must fall back to `LineMaterial` rendered on
 * `LineSegments2` (triangle-quad meshes) instead of native lines.
 *
 * The probe renders two short lines into a tiny offscreen render target:
 *  - a `LineBasicMaterial` line (control) — proves `gl.LINES` and the probe
 *    setup itself work on this GPU.
 *  - a custom line-pattern shader line — proves the linetype shader renders.
 *
 * @returns `true` when the shader line produces fragments (GPU is fine), or
 *   when the probe is inconclusive (to avoid false positives on healthy GPUs);
 *   `false` only when the control renders but the shader does not.
 */
export class AcTrLinePatternShaderProbe {
  static test(renderer: THREE.WebGLRenderer): boolean {
    const W = 64
    const H = 32

    let target: THREE.WebGLRenderTarget | null = null
    let controlMaterial: THREE.LineBasicMaterial | null = null
    let shaderMaterial: THREE.Material | null = null

    try {
      target = new THREE.WebGLRenderTarget(W, H)

      const scene = new THREE.Scene()
      const camera = new THREE.OrthographicCamera(-10, 30, 10, -10, 0.1, 10)

      const controlGeometry = new THREE.BufferGeometry()
      controlGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute([0, -2, -1, 20, -2, -1], 3)
      )
      controlMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 })
      scene.add(new THREE.LineSegments(controlGeometry, controlMaterial))

      const shaderGeometry = new THREE.BufferGeometry()
      shaderGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute([0, 2, -1, 20, 2, -1], 3)
      )
      shaderGeometry.setAttribute(
        'lineDistance',
        new THREE.Float32BufferAttribute([0, 20], 1)
      )
      const pattern = [
        { elementLength: 100, elementTypeFlag: 0 },
        { elementLength: -1, elementTypeFlag: 0 }
      ] as AcGiLineTypePatternElement[]
      shaderMaterial = AcTrLinePatternShaders.createLineShaderMaterial(
        pattern,
        0x00ff00,
        1,
        1,
        { value: 1 }
      )
      scene.add(new THREE.LineSegments(shaderGeometry, shaderMaterial))

      const previousTarget = renderer.getRenderTarget()
      const previousClear = new THREE.Color()
      renderer.getClearColor(previousClear)
      const previousAlpha = renderer.getClearAlpha()

      renderer.setRenderTarget(target)
      renderer.setClearColor(0x000000, 1)
      renderer.clear()
      renderer.render(scene, camera)

      const pixels = new Uint8Array(W * H * 4)
      renderer.readRenderTargetPixels(target, 0, 0, W, H, pixels)

      renderer.setRenderTarget(previousTarget)
      renderer.setClearColor(previousClear, previousAlpha)

      let hasRed = false
      let hasGreen = false
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i]
        const g = pixels[i + 1]
        const b = pixels[i + 2]
        if (!hasRed && r > 120 && g < 80 && b < 80) hasRed = true
        else if (!hasGreen && g > 120 && r < 80 && b < 80) hasGreen = true
      }

      if (hasGreen) return true
      if (hasRed) return false
      return true
    } catch {
      return true
    } finally {
      target?.dispose()
      controlMaterial?.dispose()
      shaderMaterial?.dispose()
    }
  }
}
