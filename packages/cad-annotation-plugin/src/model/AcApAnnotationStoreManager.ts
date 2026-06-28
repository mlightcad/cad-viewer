import type { AcDbDatabase } from '@mlightcad/data-model'

import { AcApAnnotationStore } from './AcApAnnotationStore'

/**
 * Weak-map keyed store manager — one {@link AcApAnnotationStore} per database.
 */
export class AcApAnnotationStoreManager {
  private readonly stores = new WeakMap<AcDbDatabase, AcApAnnotationStore>()

  getStore(database: AcDbDatabase): AcApAnnotationStore {
    let store = this.stores.get(database)
    if (!store) {
      store = new AcApAnnotationStore()
      store.setDrawingId(String(database.tables.blockTable.modelSpace.objectId))
      this.stores.set(database, store)
    }
    return store
  }
}