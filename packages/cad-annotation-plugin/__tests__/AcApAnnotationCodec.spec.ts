import { AcApAnnotationStore } from '../src/model/AcApAnnotationStore'
import { AcApAnnotationJsonCodec } from '../src/io/AcApAnnotationJsonCodec'
import { DEFAULT_ANNOTATION_STYLE } from '../src/model/types'

describe('AcApAnnotationStore', () => {
  it('filters annotations by keyword and type', () => {
    const store = new AcApAnnotationStore()
    store.addAnnotation({
      id: 'a1',
      type: 'text',
      carrier: 'text',
      layoutSpaceId: 'ms',
      geometry: { anchor: { x: 0, y: 0 } },
      style: { ...DEFAULT_ANNOTATION_STYLE },
      content: { text: 'door height issue' },
      meta: {
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        keywords: []
      },
      visible: true
    })
    store.addAnnotation({
      id: 'a2',
      type: 'line',
      carrier: 'text',
      layoutSpaceId: 'ms',
      geometry: { p1: { x: 0, y: 0 }, p2: { x: 1, y: 1 } },
      style: { ...DEFAULT_ANNOTATION_STYLE },
      meta: {
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        keywords: []
      },
      visible: true
    })
    const filtered = store.filterAnnotations({
      types: ['text'],
      keyword: 'door'
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.id).toBe('a1')
  })
})

describe('AcApAnnotationJsonCodec', () => {
  it('round-trips store data', () => {
    const store = new AcApAnnotationStore()
    store.setDrawingId('drawing-1')
    store.addBookmark({
      id: 'bm1',
      name: 'Lobby',
      layoutSpaceId: 'ms',
      center: { x: 10, y: 20 },
      scale: 2
    })
    store.addAnnotation({
      id: 'ann1',
      type: 'rect',
      carrier: 'text',
      layoutSpaceId: 'ms',
      geometry: {
        box: { min: { x: 0, y: 0 }, max: { x: 5, y: 5 } }
      },
      style: { ...DEFAULT_ANNOTATION_STYLE },
      meta: {
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        keywords: ['review']
      },
      visible: true
    })
    const codec = new AcApAnnotationJsonCodec()
    const json = codec.export(store)
    const target = new AcApAnnotationStore()
    codec.import(json, target, { mode: 'replace' })
    expect(target.drawingId).toBe('drawing-1')
    expect(target.bookmarks).toHaveLength(1)
    expect(target.annotations).toHaveLength(1)
    expect(target.annotations[0]?.type).toBe('rect')
  })
})