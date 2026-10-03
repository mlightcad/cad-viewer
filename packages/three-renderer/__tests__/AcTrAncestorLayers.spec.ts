import type { AcGiTextStyle } from '@mlightcad/data-model'
import type { MTextObject } from '@mlightcad/mtext-renderer'
import * as THREE from 'three'

import { syncComplexLineTypeGlyphs } from '../src/linetype/AcTrComplexLineBuilder'
import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrGroup } from '../src/object/AcTrGroup'
import { AcTrLine } from '../src/object/AcTrLine'
import { AcTrMText } from '../src/object/AcTrMText'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { acTrResolveAncestorLayerNames } from '../src/util/AcTrAncestorLayers'
import { AcTrSubEntityTraitsUtil } from '../src/util/AcTrEntityTraitsUtil'

const style: AcGiTextStyle = {
  name: 'Standard',
  standardFlag: 0,
  fixedTextHeight: 0,
  widthFactor: 1,
  obliqueAngle: 0,
  textGenerationFlag: 0,
  lastHeight: 1,
  font: 'simplex.shx',
  bigFont: ''
}

function glyph(context: AcTrRenderContext) {
  return new AcTrMText(
    { text: 'GAS', height: 1, width: 10, position: { x: 0, y: 0, z: 0 } },
    AcTrSubEntityTraitsUtil.createDefaultTraits(),
    style,
    context,
    true
  )
}

function glyphGeometry(): MTextObject {
  const result = new THREE.Object3D() as MTextObject
  result.box = new THREE.Box3()
  result.createLayoutData = () => ({ lines: [], chars: [] })
  result.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 0),
      new THREE.MeshBasicMaterial()
    )
  )
  return result
}

describe('native ancestor layer ownership', () => {
  let context: AcTrRenderContext
  beforeEach(() => {
    context = new AcTrRenderContext()
  })
  afterEach(() => {
    jest.restoreAllMocks()
    context.dispose()
  })

  it('resolves layer 0 at its nearest parent without mutating cached names', () => {
    const cached = ['0', 'DETAIL'] as const
    const first = acTrResolveAncestorLayerNames(cached, 'INSERT-A', [
      'ROOT',
      'DETAIL'
    ])
    const second = acTrResolveAncestorLayerNames(cached, 'INSERT-B', ['ROOT'])
    expect(first).toEqual(['DETAIL', 'INSERT-A', 'ROOT'])
    expect(second).toEqual(['DETAIL', 'INSERT-B', 'ROOT'])
    expect(cached).toEqual(['0', 'DETAIL'])
    expect(acTrResolveAncestorLayerNames(undefined)).toBeUndefined()
    expect(acTrResolveAncestorLayerNames(['0'], '0')).toEqual(['0'])
    expect(acTrResolveAncestorLayerNames(undefined, 'DETAIL', ['0'])).toEqual([
      '0',
      'DETAIL'
    ])
  })

  it('carries canonical ancestry through nested layer-0 INSERTs and template cloning', () => {
    const leaf = new AcTrEntity(context)
    leaf.layerName = 'DETAIL'
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 0),
      new THREE.MeshBasicMaterial()
    )
    leaf.add(mesh)
    const inner = new AcTrGroup([leaf], context)
    inner.layerName = '0'
    const template = new AcTrGroup([inner], context)
    template.sealForSharedClone()
    const first = template.fastDeepClone()
    first.layerName = 'INSERT-A'
    const second = template.fastDeepClone()
    second.layerName = 'INSERT-B'
    const outer = new AcTrGroup([first, second], context)
    expect(
      outer.children.map(child => child.userData.ancestorLayerNames)
    ).toEqual([
      ['DETAIL', 'INSERT-A'],
      ['DETAIL', 'INSERT-B']
    ])
    expect(template.children[0].userData.ancestorLayerNames).toEqual([
      '0',
      'DETAIL'
    ])
  })

  it('compacts common-material leaves only within the same ancestor visibility set', () => {
    function insert(layerName: string, offset: number) {
      const lines = [0, 1, 2, 3].map(index => {
        const line = new AcTrLine(
          [
            { x: offset + index, y: 0, z: 0 },
            { x: offset + index + 0.5, y: 0, z: 0 }
          ],
          AcTrSubEntityTraitsUtil.createDefaultTraits(),
          context,
          true
        )
        line.layerName = 'DETAIL'
        line.objectId = `${layerName}-${index}`
        return line
      })
      const result = new AcTrGroup(lines, context)
      result.compactForInstancing()
      result.layerName = layerName
      return result
    }
    const outer = new AcTrGroup(
      [insert('A', 0), insert('B', 10), insert('A', 20)],
      context
    )
    outer.compactForInstancing()
    expect(outer.children).toHaveLength(2)
    expect(
      outer.children.map(child => child.userData.ancestorLayerNames).sort()
    ).toEqual([
      ['A', 'DETAIL'],
      ['B', 'DETAIL']
    ])
    expect(outer.wcsChildBoxes).toHaveLength(12)
  })

  it('propagates preserved ancestry into glyph leaves produced after flattening', async () => {
    const text = glyph(context)
    text.layerName = '0'
    const nested = new AcTrGroup([text], context)
    nested.layerName = 'NESTED'
    const outer = new AcTrGroup([nested], context)
    outer.sealForSharedClone()
    const cloned = outer.fastDeepClone()
    const pending = cloned.children[0] as AcTrMText
    expect(pending.userData.ancestorLayerNames).toEqual(['NESTED'])
    let resolve!: (value: MTextObject) => void
    const render = new Promise<MTextObject>(yes => {
      resolve = yes
    })
    jest
      .spyOn(context.mtextRenderer, 'asyncRenderMText')
      .mockReturnValue(render)
    const drawing = pending.asyncDraw()
    resolve(glyphGeometry())
    await drawing
    expect(pending.children.length).toBeGreaterThan(0)
    for (const child of pending.children) {
      expect(child.userData.ancestorLayerNames).toEqual(['NESTED'])
    }
  })

  it('keeps an outer layer-0 binding when a named glyph finishes later', async () => {
    const text = glyph(context)
    text.layerName = 'DETAIL'
    const nested = new AcTrGroup([text], context)
    nested.layerName = '0'
    const outer = new AcTrGroup([nested], context)
    outer.layerName = 'ROOT'
    expect(text.userData.ancestorLayerNames).toEqual(['0'])
    jest
      .spyOn(context.mtextRenderer, 'asyncRenderMText')
      .mockResolvedValue(glyphGeometry())
    await text.asyncDraw()
    for (const child of text.children) {
      expect(child.userData.ancestorLayerNames).toEqual(['0', 'DETAIL'])
      expect(
        acTrResolveAncestorLayerNames(
          child.userData.ancestorLayerNames,
          outer.layerName
        )
      ).toEqual(['DETAIL', 'ROOT'])
    }
  })

  it.each(['group', 'complex-line'] as const)(
    'shares deferred %s glyph geometry only within matching ancestor gates',
    kind => {
      const texts = ['A', 'B', 'A'].map(name => {
        const text = glyph(context)
        text.userData.ancestorLayerNames = [name]
        return text
      })
      const render = jest
        .spyOn(context.mtextRenderer, 'syncRenderMText')
        .mockImplementation(glyphGeometry)
      if (kind === 'group') {
        new AcTrGroup(texts, context).syncDraw()
      } else {
        const line = new AcTrEntity(context)
        texts.forEach(text => line.add(text))
        syncComplexLineTypeGlyphs(line)
      }
      expect(render).toHaveBeenCalledTimes(2)
      expect(texts[0].children[0].userData.ancestorLayerNames).toEqual(['A'])
      expect(texts[1].children[0].userData.ancestorLayerNames).toEqual(['B'])
      expect(texts[2].children[0].userData.ancestorLayerNames).toEqual(['A'])
    }
  )
})
