import { AcTrGroup } from '../src/object/AcTrGroup'
import { AcTrCoalescedLineRef } from '../src/renderer/AcTrBlockLineCoalesce'
import { AcTrRenderer } from '../src/renderer/AcTrRenderer'
import * as THREE from 'three'

function createRenderer() {
  const webgl = {
    getSize: (target: THREE.Vector2) => target.set(800, 600)
  } as unknown as THREE.WebGLRenderer
  return new AcTrRenderer(webgl)
}

describe('block line coalesce', () => {
  it('merges simple block lines into one mesh and keeps a box per line', () => {
    const renderer = createRenderer()
    renderer.beginBlockLineCoalesce()
    const first = renderer.lines([
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 }
    ])
    const second = renderer.lines([
      { x: 0, y: 5, z: 0 },
      { x: 10, y: 5, z: 0 }
    ])
    expect(first).toBeInstanceOf(AcTrCoalescedLineRef)
    expect(second).toBeInstanceOf(AcTrCoalescedLineRef)
    first.objectId = 'line-a'
    second.objectId = 'line-b'
    first.layerName = '0'
    second.layerName = '0'

    const group = renderer.group([first, second])
    renderer.endBlockLineCoalesce()

    expect(group).toBeInstanceOf(AcTrGroup)
    expect(group.isCompacted).toBe(true)
    expect(group.children.length).toBe(1)
    const ids = group.wcsChildBoxes.map(box => box.id)
    expect(ids).toContain('line-a')
    expect(ids).toContain('line-b')
  })
})
