import type { AcApContext } from '@mlightcad/cad-simple-viewer'
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import type { AcDbDatabase } from '@mlightcad/data-model'

import { AcApAnnotationJsonCodec } from './io/AcApAnnotationJsonCodec'
import type { AcApAnnotationStore } from './model/AcApAnnotationStore'
import { AcApAnnotationStoreManager } from './model/AcApAnnotationStoreManager'
import {
  type AnnotationMeta,
  type AnnotationRecord,
  type AnnotationStyle,
  DEFAULT_ANNOTATION_STYLE} from './model/types'
import { AcApAnnotationRenderer } from './render/AcApAnnotationRenderer'
import type { AcExAnnotationShell } from './ui/AcExAnnotationShell'
import { asTrView, captureViewState } from './util/annotationUtil'

/**
 * Shared runtime services for annotation commands and UI.
 */
export class AcApAnnotationServices {
  readonly storeManager = new AcApAnnotationStoreManager()
  readonly codec = new AcApAnnotationJsonCodec()
  readonly renderer: AcApAnnotationRenderer

  currentStyle: AnnotationStyle = { ...DEFAULT_ANNOTATION_STYLE }
  selectedId?: string
  activeTool?: string
  panelVisible = false
  annotationsVisible = true
  shell?: AcExAnnotationShell

  constructor() {
    this.renderer = new AcApAnnotationRenderer(
      () => {
        const view = AcApDocManager.instance.curView
        return view ?? undefined
      },
      id => {
        this.selectedId = id
        this.shell?.refresh()
      }
    )
  }

  getStore(database: AcDbDatabase): AcApAnnotationStore {
    return this.storeManager.getStore(database)
  }

  getStoreFromContext(context: AcApContext): AcApAnnotationStore {
    return this.getStore(context.doc.database)
  }

  createMeta(createdBy?: string): AnnotationMeta {
    const now = new Date().toISOString()
    return {
      createdBy,
      createdAt: now,
      updatedAt: now,
      keywords: []
    }
  }

  addRecord(context: AcApContext, record: AnnotationRecord) {
    const store = this.getStoreFromContext(context)
    store.addAnnotation(record)
    if (this.annotationsVisible && record.visible) {
      this.renderer.add(record)
    }
    this.shell?.refresh()
  }

  updateRecord(context: AcApContext, id: string, patch: Partial<AnnotationRecord>) {
    const store = this.getStoreFromContext(context)
    const existing = store.getAnnotation(id)
    if (!existing) return
    store.updateAnnotation(id, {
      ...patch,
      meta: {
        ...existing.meta,
        ...patch.meta,
        updatedAt: new Date().toISOString()
      }
    })
    const updated = store.getAnnotation(id)
    if (updated) {
      this.renderer.update(updated)
    }
    this.shell?.refresh()
  }

  removeRecord(context: AcApContext, id: string) {
    const store = this.getStoreFromContext(context)
    store.removeAnnotation(id)
    this.renderer.remove(id)
    if (this.selectedId === id) this.selectedId = undefined
    this.shell?.refresh()
  }

  updateActiveRecord(id: string, patch: Partial<AnnotationRecord>) {
    const doc = AcApDocManager.instance.curDocument
    const view = AcApDocManager.instance.curView
    if (!doc || !view) return
    this.updateRecord({ doc, view } as unknown as AcApContext, id, patch)
  }

  removeActiveRecord(id: string) {
    const doc = AcApDocManager.instance.curDocument
    const view = AcApDocManager.instance.curView
    if (!doc || !view) return
    this.removeRecord({ doc, view } as unknown as AcApContext, id)
  }

  gotoBookmarkActive(bookmarkId: string) {
    const doc = AcApDocManager.instance.curDocument
    const view = AcApDocManager.instance.curView
    if (!doc || !view) return
    this.gotoBookmark({ doc, view } as unknown as AcApContext, bookmarkId)
  }

  createBookmarkActive(name: string) {
    const doc = AcApDocManager.instance.curDocument
    const view = AcApDocManager.instance.curView
    if (!doc || !view) return
    this.createBookmark({ doc, view } as unknown as AcApContext, name)
  }

  refreshActive() {
    const doc = AcApDocManager.instance.curDocument
    const view = AcApDocManager.instance.curView
    if (!doc || !view) return
    this.refreshAll({ doc, view } as unknown as AcApContext)
  }

  syncRenderer(context: AcApContext) {
    const store = this.getStoreFromContext(context)
    const layoutId = String(context.doc.database.currentSpaceId)
    this.renderer.setCurrentLayoutId(layoutId)
    this.renderer.syncAll(
      store.annotations.filter(
        (a: AnnotationRecord) => a.visible && a.layoutSpaceId === layoutId
      )
    )
  }

  refreshAll(context: AcApContext) {
    this.renderer.clear()
    if (!this.annotationsVisible) return
    const store = this.getStoreFromContext(context)
    const layoutId = String(context.doc.database.currentSpaceId)
    this.renderer.setCurrentLayoutId(layoutId)
    for (const ann of store.annotations) {
      if (ann.visible && ann.layoutSpaceId === layoutId) {
        this.renderer.add(ann)
      }
    }
  }

  bindDocument(context: AcApContext) {
    const layoutId = String(context.doc.database.currentSpaceId)
    this.renderer.setCurrentLayoutId(layoutId)
    const store = this.getStoreFromContext(context)
    store.subscribe(() => {
      if (AcApDocManager.instance.curDocument?.database === context.doc.database) {
        this.refreshAll(context)
      }
    })
    this.refreshAll(context)
  }

  createBookmark(context: AcApContext, name: string) {
    const store = this.getStoreFromContext(context)
    const view = context.view
    const state = captureViewState(view)
    const trView = asTrView(view)
    const camera = trView.internalCamera
    const scale =
      camera && 'zoom' in camera ? (camera as { zoom: number }).zoom : 1
    store.addBookmark({
      id: store.createBookmarkId(),
      name,
      layoutSpaceId: String(context.doc.database.currentSpaceId),
      center: state.center,
      scale
    })
    this.shell?.refresh()
  }

  gotoBookmark(context: AcApContext, bookmarkId: string) {
    const store = this.getStoreFromContext(context)
    const bm = store.getBookmark(bookmarkId)
    if (!bm) return
    asTrView(context.view).flyTo(bm.center, bm.scale)
  }

  dispose() {
    this.renderer.dispose()
    this.shell?.destroy()
    this.shell = undefined
  }
}

let annotationServices: AcApAnnotationServices | null = null

export function getAnnotationServices(): AcApAnnotationServices {
  if (!annotationServices) {
    annotationServices = new AcApAnnotationServices()
  }
  return annotationServices
}

export function resetAnnotationServices() {
  if (annotationServices) {
    annotationServices.dispose()
  }
  annotationServices = null
}