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
})
