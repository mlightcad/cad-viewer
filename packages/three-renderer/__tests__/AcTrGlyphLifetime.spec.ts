import type { MTextObject } from '@mlightcad/mtext-renderer'
import * as THREE from 'three'

import { AcTrMText } from '../src/object/AcTrMText'
import { AcTrMTextRenderer } from '../src/renderer/AcTrMTextRenderer'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrStyleManager } from '../src/style/AcTrStyleManager'
import { AcTrSubEntityTraitsUtil } from '../src/util/AcTrEntityTraitsUtil'

describe('deferred glyph ownership', () => {
  it.each(['entity', 'context'] as const)(
    'discards output that finishes after its %s is disposed',
    async owner => {
      let finish!: (value: MTextObject) => void
      const result = new Promise<MTextObject>(resolve => {
        finish = resolve
      })
      const renderer = {
        asyncRenderMText: jest.fn(() => result)
      } as unknown as AcTrMTextRenderer
      const styles = new AcTrStyleManager()
      const context = new AcTrRenderContext(styles, undefined, renderer)
      const glyph = new AcTrMText(
        {
          text: 'Reference',
          height: 1,
          position: { x: 0, y: 0, z: 0 }
        } as never,
        AcTrSubEntityTraitsUtil.createDefaultTraits(),
        {} as never,
        context
      )
      const pending = glyph.asyncDraw()
      if (owner === 'entity') glyph.dispose()
      else context.dispose()
      const geometry = new THREE.BufferGeometry()
      const material = styles.getMTextFillMaterial(
        AcTrSubEntityTraitsUtil.createDefaultTraits()
      )
      const geometryDisposed = jest.spyOn(geometry, 'dispose')
      const materialDisposed = jest.spyOn(material, 'dispose')
      const output = new THREE.Object3D() as MTextObject
      output.add(new THREE.Mesh(geometry, material))
      finish(output)
      await pending

      expect(glyph.children).toHaveLength(0)
      expect(geometryDisposed).toHaveBeenCalledTimes(1)
      expect(materialDisposed).not.toHaveBeenCalled()
      styles.dispose()
      expect(materialDisposed).toHaveBeenCalledTimes(1)
    }
  )
})
