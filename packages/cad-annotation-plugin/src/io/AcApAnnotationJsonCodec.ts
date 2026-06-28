import type { AcApAnnotationStore } from '../model/AcApAnnotationStore'
import {
  ANNOTATION_JSON_VERSION,
  type AnnotationDocumentSnapshot,
  type AnnotationRecord,
  type Bookmark
} from '../model/types'

export interface ImportOptions {
  mode: 'merge' | 'replace'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAnnotationRecord(value: unknown): value is AnnotationRecord {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    typeof value.carrier === 'string' &&
    typeof value.layoutSpaceId === 'string' &&
    isRecord(value.geometry) &&
    isRecord(value.style) &&
    isRecord(value.meta) &&
    typeof value.visible === 'boolean'
  )
}

function isBookmark(value: unknown): value is Bookmark {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.layoutSpaceId === 'string' &&
    isRecord(value.center) &&
    typeof value.scale === 'number'
  )
}

/**
 * JSON import/export for annotation stores.
 */
export class AcApAnnotationJsonCodec {
  export(store: AcApAnnotationStore): string {
    const snapshot = store.toSnapshot()
    const payload = {
      version: ANNOTATION_JSON_VERSION,
      drawingId: snapshot.drawingId,
      bookmarks: snapshot.bookmarks,
      annotations: snapshot.annotations,
      exportedAt: new Date().toISOString()
    }
    return JSON.stringify(payload, null, 2)
  }

  import(json: string, store: AcApAnnotationStore, options: ImportOptions) {
    const parsed = JSON.parse(json) as unknown
    if (!isRecord(parsed)) {
      throw new Error('Invalid annotation JSON: root must be an object')
    }
    if (parsed.version !== ANNOTATION_JSON_VERSION) {
      throw new Error(
        `Unsupported annotation JSON version: ${String(parsed.version)}`
      )
    }
    const annotations = parsed.annotations
    const bookmarks = parsed.bookmarks
    if (!Array.isArray(annotations) || !Array.isArray(bookmarks)) {
      throw new Error('Invalid annotation JSON: missing arrays')
    }
    for (const ann of annotations) {
      if (!isAnnotationRecord(ann)) {
        throw new Error('Invalid annotation record in JSON')
      }
    }
    for (const bm of bookmarks) {
      if (!isBookmark(bm)) {
        throw new Error('Invalid bookmark in JSON')
      }
    }
    const snapshot: AnnotationDocumentSnapshot = {
      drawingId:
        typeof parsed.drawingId === 'string' ? parsed.drawingId : store.drawingId,
      bookmarks,
      annotations
    }
    store.loadSnapshot(snapshot, options.mode)
  }
}