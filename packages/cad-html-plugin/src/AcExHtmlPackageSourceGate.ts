/**
 * Overlay that lets the user open a multi-file ACEX package when the sibling
 * `drawing.acex.json` is missing: pick a local folder (when supported) or
 * paste a manifest URL.
 *
 * @packageDocumentation
 */

import type { AcExHtmlI18n, AcExHtmlMessageKey } from './AcExHtmlI18n'
import {
  ACEX_DEFAULT_MANIFEST_FILE,
  type AcExLocalFolderOpenSupport,
  buildPackageDirectoryFileMap,
  canOpenLocalPackageFolder,
  createPackageDirectoryFetch,
  detectLocalFolderOpenSupport} from './AcExHtmlPackageBootstrap'

export type AcExHtmlPackageSourceChoice =
  | { kind: 'url'; href: string }
  | {
      kind: 'directory'
      manifestUrl: string
      fetchImpl: typeof fetch
    }

/**
 * Shows the package source picker and resolves when the user submits a URL or
 * (when supported) selects a folder that contains {@link ACEX_DEFAULT_MANIFEST_FILE}.
 */
export function promptAcExHtmlPackageSource(
  i18n: AcExHtmlI18n,
  options?: {
    errorKey?: Extract<
      AcExHtmlMessageKey,
      | 'package.manifestNotFound'
      | 'package.invalidManifest'
      | 'package.folderMissingManifest'
      | 'package.loadFailed'
    >
    errorMessage?: string
    /** Override capability detection (tests). */
    folderSupport?: AcExLocalFolderOpenSupport
  }
): Promise<AcExHtmlPackageSourceChoice> {
  const loading = document.getElementById('mlcad-loading')
  loading?.classList.remove('mlcad-loading--done')
  loading?.classList.add('mlcad-loading--gate')

  const folderSupport =
    options?.folderSupport ?? detectLocalFolderOpenSupport()
  const folderAvailable = canOpenLocalPackageFolder(folderSupport)

  ensurePackageSourceGateDom(folderSupport)
  const gate = document.getElementById('mlcad-package-gate')
  const form = document.getElementById(
    'mlcad-package-url-form'
  ) as HTMLFormElement | null
  const input = document.getElementById(
    'mlcad-package-url'
  ) as HTMLInputElement | null
  const folderBtn = document.getElementById('mlcad-package-folder-btn')
  const folderInput = document.getElementById(
    'mlcad-package-folder-input'
  ) as HTMLInputElement | null
  const hintEl = document.getElementById('mlcad-package-gate-hint')
  const errorEl = document.getElementById('mlcad-package-gate-error')

  if (!gate || !form || !input) {
    return Promise.reject(new Error('Package source gate is not available.'))
  }
  if (folderAvailable && (!folderBtn || !folderInput)) {
    return Promise.reject(new Error('Package source gate is not available.'))
  }

  if (hintEl) {
    const hintKey = folderAvailable ? 'package.hint' : 'package.hintUrlOnly'
    hintEl.setAttribute('data-i18n-key', hintKey)
    hintEl.textContent = i18n.t(hintKey)
  }
  if (folderBtn) {
    folderBtn.hidden = !folderAvailable
  }
  if (folderInput) {
    folderInput.hidden = !folderAvailable
    folderInput.disabled = !folderAvailable
  }

  i18n.applyToDocument()
  gate.hidden = false
  input.value = ''

  if (errorEl) {
    if (options?.errorMessage) {
      errorEl.hidden = false
      errorEl.textContent = options.errorMessage
    } else if (options?.errorKey) {
      errorEl.hidden = false
      errorEl.textContent = i18n.t(options.errorKey)
    } else {
      errorEl.hidden = true
      errorEl.textContent = ''
    }
  }

  return new Promise((resolve, reject) => {
    const showError = (message: string) => {
      if (!errorEl) return
      errorEl.hidden = false
      errorEl.textContent = message
    }

    const cleanup = () => {
      form.removeEventListener('submit', onSubmit)
      folderBtn?.removeEventListener('click', onFolderClick)
      folderInput?.removeEventListener('change', onFolderChange)
      gate.hidden = true
      loading?.classList.remove('mlcad-loading--gate')
    }

    const finish = (choice: AcExHtmlPackageSourceChoice) => {
      cleanup()
      resolve(choice)
    }

    const onSubmit = (event: Event) => {
      event.preventDefault()
      const href = input.value.trim()
      if (!href) {
        showError(i18n.t('package.urlRequired'))
        return
      }
      finish({ kind: 'url', href })
    }

    const ingestFileList = async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) {
        showError(i18n.t('package.folderMissingManifest'))
        return
      }
      try {
        const entries: { relativePath: string; bytes: Uint8Array }[] = []
        for (const file of Array.from(fileList)) {
          const relativePath =
            (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
            file.name
          const buffer = new Uint8Array(await file.arrayBuffer())
          entries.push({ relativePath, bytes: buffer })
        }
        const files = buildPackageDirectoryFileMap(entries)
        if (!files.has(ACEX_DEFAULT_MANIFEST_FILE)) {
          showError(i18n.t('package.folderMissingManifest'))
          return
        }
        const { manifestUrl, fetchImpl } = createPackageDirectoryFetch(files)
        finish({ kind: 'directory', manifestUrl, fetchImpl })
      } catch (error) {
        showError(
          i18n.t('package.loadFailed', {
            error: error instanceof Error ? error.message : String(error)
          })
        )
      }
    }

    const openWebkitDirectoryInput = () => {
      if (!folderSupport.webkitDirectory || !folderInput) {
        showError(i18n.t('package.folderUnsupported'))
        return
      }
      folderInput.click()
    }

    const onFolderChange = () => {
      if (!folderInput) return
      void ingestFileList(folderInput.files)
      folderInput.value = ''
    }

    const onFolderClick = () => {
      if (!folderAvailable) return

      if (folderSupport.directoryPicker) {
        const dirPicker = (
          globalThis as {
            showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
          }
        ).showDirectoryPicker
        if (typeof dirPicker !== 'function') {
          openWebkitDirectoryInput()
          return
        }
        void (async () => {
          try {
            const root = await dirPicker.call(globalThis)
            const entries = await collectDirectoryEntries(root)
            const files = buildPackageDirectoryFileMap(entries)
            if (!files.has(ACEX_DEFAULT_MANIFEST_FILE)) {
              showError(i18n.t('package.folderMissingManifest'))
              return
            }
            const { manifestUrl, fetchImpl } = createPackageDirectoryFetch(files)
            finish({ kind: 'directory', manifestUrl, fetchImpl })
          } catch (error) {
            // User cancel — keep the gate open.
            if (
              error instanceof DOMException &&
              (error.name === 'AbortError' || error.name === 'NotAllowedError')
            ) {
              return
            }
            // Degrade to <input webkitdirectory> when the picker fails
            // (SecurityError, missing async iteration, etc.).
            if (folderSupport.webkitDirectory) {
              openWebkitDirectoryInput()
              return
            }
            showError(
              i18n.t('package.loadFailed', {
                error: error instanceof Error ? error.message : String(error)
              })
            )
          }
        })()
        return
      }

      openWebkitDirectoryInput()
    }

    form.addEventListener('submit', onSubmit)
    if (folderAvailable && folderBtn && folderInput) {
      folderBtn.addEventListener('click', onFolderClick)
      folderInput.addEventListener('change', onFolderChange)
    }
    window.setTimeout(() => input.focus(), 0)

    gate.addEventListener(
      'cancel',
      () => {
        cleanup()
        reject(new Error('Package source selection cancelled.'))
      },
      { once: true }
    )
  })
}

async function collectDirectoryEntries(
  root: FileSystemDirectoryHandle,
  prefix = ''
): Promise<{ relativePath: string; bytes: Uint8Array }[]> {
  const out: { relativePath: string; bytes: Uint8Array }[] = []
  const handles = await listDirectoryHandles(root)
  for (const { name, handle } of handles) {
    const relativePath = prefix ? `${prefix}/${name}` : name
    if (handle.kind === 'file') {
      const file = await (handle as FileSystemFileHandle).getFile()
      out.push({
        relativePath,
        bytes: new Uint8Array(await file.arrayBuffer())
      })
    } else if (handle.kind === 'directory') {
      out.push(
        ...(await collectDirectoryEntries(
          handle as FileSystemDirectoryHandle,
          relativePath
        ))
      )
    }
  }
  return out
}

/**
 * Enumerates a directory handle across browsers that expose async iteration
 * and those that only expose `.entries()` / `.values()`.
 */
async function listDirectoryHandles(
  root: FileSystemDirectoryHandle
): Promise<Array<{ name: string; handle: FileSystemHandle }>> {
  const out: Array<{ name: string; handle: FileSystemHandle }> = []
  const asEntries = root as FileSystemDirectoryHandle & {
    entries?: () => AsyncIterableIterator<[string, FileSystemHandle]>
    values?: () => AsyncIterableIterator<FileSystemHandle>
  }

  if (typeof asEntries.entries === 'function') {
    for await (const [name, handle] of asEntries.entries()) {
      out.push({ name, handle })
    }
    return out
  }

  if (
    typeof (root as unknown as AsyncIterable<[string, FileSystemHandle]>)[
      Symbol.asyncIterator
    ] === 'function'
  ) {
    for await (const [name, handle] of root as unknown as AsyncIterable<
      [string, FileSystemHandle]
    >) {
      out.push({ name, handle })
    }
    return out
  }

  if (typeof asEntries.values === 'function') {
    for await (const handle of asEntries.values()) {
      out.push({ name: handle.name, handle })
    }
    return out
  }

  throw new Error('Directory listing is not supported in this browser')
}

function ensurePackageSourceGateDom(
  folderSupport: AcExLocalFolderOpenSupport
): void {
  const existing = document.getElementById('mlcad-package-gate')
  if (existing) {
    syncFolderControls(existing, folderSupport)
    return
  }

  const styleId = 'mlcad-package-gate-style'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
#mlcad-package-gate {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(12, 14, 18, 0.92);
  color: #e8eaed;
}
#mlcad-package-gate[hidden] { display: none !important; }
#mlcad-package-gate-card {
  width: min(420px, 100%);
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 22px 20px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #1a1d24;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
}
#mlcad-package-gate-card h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
}
#mlcad-package-gate-card p {
  margin: 0;
  line-height: 1.45;
  color: rgba(232, 234, 237, 0.82);
  font-size: 0.92rem;
}
#mlcad-package-gate-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
#mlcad-package-folder-btn,
#mlcad-package-url-form button {
  appearance: none;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: #2a3140;
  color: inherit;
  border-radius: 6px;
  padding: 10px 12px;
  cursor: pointer;
  font: inherit;
}
#mlcad-package-folder-btn:hover,
#mlcad-package-url-form button:hover {
  background: #364052;
}
#mlcad-package-folder-btn[hidden] { display: none !important; }
#mlcad-package-url-form {
  display: flex;
  gap: 8px;
}
#mlcad-package-url {
  flex: 1;
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  background: #0f1218;
  color: inherit;
  padding: 10px 12px;
  font: inherit;
}
#mlcad-package-gate-error {
  color: #ff8a80;
  font-size: 0.88rem;
  line-height: 1.4;
}
#mlcad-package-folder-input { display: none; }
`
    document.head.appendChild(style)
  }

  const gate = document.createElement('div')
  gate.id = 'mlcad-package-gate'
  gate.hidden = true
  gate.innerHTML = `
    <div id="mlcad-package-gate-card" role="dialog" aria-modal="true" aria-labelledby="mlcad-package-gate-title">
      <h2 id="mlcad-package-gate-title" data-i18n-key="package.title" data-i18n-text>Open drawing package</h2>
      <p id="mlcad-package-gate-hint" data-i18n-key="package.hint" data-i18n-text>
        No drawing.acex.json was found next to this page. Choose a local package folder or enter the manifest URL.
      </p>
      <div id="mlcad-package-gate-actions">
        <button type="button" id="mlcad-package-folder-btn" data-i18n-key="package.chooseFolder" data-i18n-text>
          Choose local folder
        </button>
        <form id="mlcad-package-url-form">
          <input
            id="mlcad-package-url"
            type="text"
            name="manifestUrl"
            autocomplete="off"
            spellcheck="false"
            data-i18n-attr="placeholder"
            data-i18n-key="package.urlPlaceholder"
            placeholder="https://example.com/drawing.acex.json"
          />
          <button type="submit" data-i18n-key="package.openUrl" data-i18n-text>Open URL</button>
        </form>
      </div>
      <div id="mlcad-package-gate-error" hidden></div>
      <input id="mlcad-package-folder-input" type="file" multiple />
    </div>
  `

  const folderInput = gate.querySelector(
    '#mlcad-package-folder-input'
  ) as HTMLInputElement | null
  if (folderInput) {
    // Chromium / Safari / Firefox: webkitdirectory. Some engines also accept
    // the non-standard `directory` attribute.
    folderInput.setAttribute('webkitdirectory', '')
    folderInput.setAttribute('directory', '')
  }

  const host =
    document.getElementById('mlcad-loading') ?? document.body
  host.appendChild(gate)
  syncFolderControls(gate, folderSupport)
}

function syncFolderControls(
  gate: HTMLElement,
  folderSupport: AcExLocalFolderOpenSupport
): void {
  const available = canOpenLocalPackageFolder(folderSupport)
  const folderBtn = gate.querySelector(
    '#mlcad-package-folder-btn'
  ) as HTMLButtonElement | null
  const folderInput = gate.querySelector(
    '#mlcad-package-folder-input'
  ) as HTMLInputElement | null
  const hintEl = gate.querySelector('#mlcad-package-gate-hint')
  if (folderBtn) folderBtn.hidden = !available
  if (folderInput) {
    folderInput.hidden = !available
    folderInput.disabled = !available
  }
  if (hintEl) {
    hintEl.setAttribute(
      'data-i18n-key',
      available ? 'package.hint' : 'package.hintUrlOnly'
    )
  }
}
