import type {
  AnnotationDocumentSnapshot,
  AnnotationRecord,
  AnnotationType,
  Bookmark} from './types'

export type AnnotationFilter = {
  types?: AnnotationType[]
  keyword?: string
  createdBy?: string
  dateFrom?: string
  dateTo?: string
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Per-document annotation and bookmark store.
 */
export class AcApAnnotationStore {
  private _drawingId = ''
  private _annotations: AnnotationRecord[] = []
  private _bookmarks: Bookmark[] = []
  private _listeners: Array<() => void> = []

  get drawingId(): string {
    return this._drawingId
  }

  setDrawingId(id: string) {
    this._drawingId = id
  }

  get annotations(): readonly AnnotationRecord[] {
    return this._annotations
  }

  get bookmarks(): readonly Bookmark[] {
    return this._bookmarks
  }

  subscribe(listener: () => void): () => void {
    this._listeners.push(listener)
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener)
    }
  }

  private notify() {
    this._listeners.forEach(l => l())
  }

  addAnnotation(record: AnnotationRecord) {
    this._annotations.push(record)
    this.notify()
  }

  updateAnnotation(id: string, patch: Partial<AnnotationRecord>) {
    const index = this._annotations.findIndex(a => a.id === id)
    if (index < 0) return false
    this._annotations[index] = {
      ...this._annotations[index],
      ...patch,
      id
    }
    this.notify()
    return true
  }

  removeAnnotation(id: string) {
    const next = this._annotations.filter(a => a.id !== id)
    if (next.length === this._annotations.length) return false
    this._annotations = next
    this.notify()
    return true
  }

  getAnnotation(id: string): AnnotationRecord | undefined {
    return this._annotations.find(a => a.id === id)
  }

  setAllVisible(visible: boolean) {
    this._annotations = this._annotations.map(a => ({ ...a, visible }))
    this.notify()
  }

  filterAnnotations(filter: AnnotationFilter): AnnotationRecord[] {
    return this._annotations.filter(record => {
      if (filter.types?.length && !filter.types.includes(record.type)) {
        return false
      }
      if (filter.createdBy && record.meta.createdBy !== filter.createdBy) {
        return false
      }
      if (filter.keyword) {
        const kw = filter.keyword.toLowerCase()
        const text = record.content?.text?.toLowerCase() ?? ''
        const keywords = record.meta.keywords.join(' ').toLowerCase()
        if (!text.includes(kw) && !keywords.includes(kw)) return false
      }
      if (filter.dateFrom && record.meta.createdAt < filter.dateFrom) {
        return false
      }
      if (filter.dateTo && record.meta.createdAt > filter.dateTo) {
        return false
      }
      return true
    })
  }

  addBookmark(bookmark: Bookmark) {
    this._bookmarks.push(bookmark)
    this.notify()
  }

  updateBookmark(id: string, patch: Partial<Bookmark>) {
    const index = this._bookmarks.findIndex(b => b.id === id)
    if (index < 0) return false
    this._bookmarks[index] = { ...this._bookmarks[index], ...patch, id }
    this.notify()
    return true
  }

  removeBookmark(id: string) {
    const next = this._bookmarks.filter(b => b.id !== id)
    if (next.length === this._bookmarks.length) return false
    this._bookmarks = next
    this.notify()
    return true
  }

  getBookmark(id: string): Bookmark | undefined {
    return this._bookmarks.find(b => b.id === id)
  }

  createBookmarkId(): string {
    return createId('bookmark')
  }

  createAnnotationId(): string {
    return createId('ann')
  }

  loadSnapshot(snapshot: AnnotationDocumentSnapshot, mode: 'merge' | 'replace') {
    this._drawingId = snapshot.drawingId
    if (mode === 'replace') {
      this._annotations = [...snapshot.annotations]
      this._bookmarks = [...snapshot.bookmarks]
    } else {
      const annIds = new Set(this._annotations.map(a => a.id))
      for (const ann of snapshot.annotations) {
        if (!annIds.has(ann.id)) {
          this._annotations.push(ann)
        }
      }
      const bmIds = new Set(this._bookmarks.map(b => b.id))
      for (const bm of snapshot.bookmarks) {
        if (!bmIds.has(bm.id)) {
          this._bookmarks.push(bm)
        }
      }
    }
    this.notify()
  }

  toSnapshot(): AnnotationDocumentSnapshot {
    return {
      drawingId: this._drawingId,
      bookmarks: [...this._bookmarks],
      annotations: [...this._annotations]
    }
  }

  clear() {
    this._annotations = []
    this._bookmarks = []
    this.notify()
  }
}