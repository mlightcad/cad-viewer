/// <reference types="gapi" />
/// <reference types="gapi.client.drive-v3" />
/// <reference types="google.accounts" />

/**
 * Minimal Google Picker typings used by {@link GoogleDriveClient}.
 * Full `@types/google.picker` is not always available; keep this local.
 */
declare namespace google.picker {
  enum Action {
    CANCEL = 'cancel',
    PICKED = 'picked',
    LOADED = 'loaded'
  }

  enum Feature {
    NAV_HIDDEN = 'navHidden',
    MULTISELECT_ENABLED = 'multiselectEnabled'
  }

  enum ViewId {
    DOCS = 'all',
    DOCS_IMAGES = 'docs-images',
    RECENTLY_PICKED = 'recently-picked'
  }

  enum DocsViewMode {
    GRID = 'grid',
    LIST = 'list'
  }

  interface DocumentObject {
    id: string
    name: string
    mimeType?: string
    sizeBytes?: number
    lastEditedUtc?: number
    url?: string
  }

  interface ResponseObject {
    action: string
    docs?: DocumentObject[]
  }

  class DocsView {
    constructor(viewId?: ViewId | string)
    setIncludeFolders(include: boolean): DocsView
    setSelectFolderEnabled(enabled: boolean): DocsView
    setMode(mode: DocsViewMode | string): DocsView
    setQuery(query: string): DocsView
    setMimeTypes(mimeTypes: string): DocsView
  }

  class PickerBuilder {
    addView(viewOrId: DocsView | ViewId | string): PickerBuilder
    enableFeature(feature: Feature | string): PickerBuilder
    setOAuthToken(token: string): PickerBuilder
    setDeveloperKey(key: string): PickerBuilder
    setAppId(appId: string): PickerBuilder
    setTitle(title: string): PickerBuilder
    setCallback(callback: (data: ResponseObject) => void): PickerBuilder
    build(): Picker
  }

  class Picker {
    setVisible(visible: boolean): void
  }
}
