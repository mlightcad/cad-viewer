import { AcApMarkupStore } from '../src/command/markup/AcApMarkupStore'
import type { AcApMarkupRecord } from '../src/command/markup/AcApMarkupTypes'

function sampleRecord(id = 'markup-1'): AcApMarkupRecord {
  return {
    id,
    type: 'text',
    style: { color: '#ff0000' },
    text: 'Hello',
    comment: 'note',
    status: 'open',
    author: 'alice',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    geometry: { type: 'text', position: { x: 1, y: 2 } }
  }
}

describe('AcApMarkupStore', () => {
  it('reset drops records, selection, dirty flag, and drawing name', () => {
    const store = new AcApMarkupStore()
    store.drawingName = 'demo.dwg'
    store.upsert(sampleRecord())
    store.setSelectedId('markup-1')

    expect(store.size).toBe(1)
    expect(store.dirty).toBe(true)
    expect(store.selectedId).toBe('markup-1')

    store.reset()

    expect(store.size).toBe(0)
    expect(store.dirty).toBe(false)
    expect(store.selectedId).toBeUndefined()
    expect(store.drawingName).toBeUndefined()
  })

  it('updateMeta patches the label and keeps attached callout text in sync', () => {
    const store = new AcApMarkupStore()
    store.upsert({
      ...sampleRecord('cloud-1'),
      type: 'cloud',
      text: 'Old',
      geometry: {
        type: 'cloud',
        corner1: { x: 0, y: 0 },
        corner2: { x: 2, y: 2 },
        callout: {
          tip: { x: 0, y: 0 },
          anchor: { x: 3, y: 3 },
          text: 'Old'
        }
      }
    })

    const updated = store.updateMeta('cloud-1', { text: 'New label' })
    expect(updated?.text).toBe('New label')
    expect(store.get('cloud-1')?.text).toBe('New label')
    const geom = store.get('cloud-1')?.geometry
    expect(geom?.type).toBe('cloud')
    if (geom?.type === 'cloud') {
      expect(geom.callout?.text).toBe('New label')
    }
  })
})
