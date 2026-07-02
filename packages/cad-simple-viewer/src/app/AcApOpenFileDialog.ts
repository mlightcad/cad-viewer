import { log } from '@mlightcad/data-model'

import { eventBus } from '../editor/global/eventBus'
import { AcEdOpenMode } from '../editor/view/AcEdOpenMode'
import type { AcApOpenDatabaseOptions } from './AcDbOpenDatabaseOptions'

/** File extensions accepted by the built-in OPEN file dialog. */
const SUPPORTED_EXTENSIONS = ['.dxf', '.dwg'] as const

/**
 * Resolver for default options used by the built-in OPEN file dialog.
 *
 * May be a static options object or a factory that returns options synchronously
 * or asynchronously.
 */
export type AcApOpenDocumentDefaultsResolver =
  | AcApOpenDatabaseOptions
  | (() => AcApOpenDatabaseOptions | Promise<AcApOpenDatabaseOptions>)

/**
 * Configuration for the built-in OPEN file dialog installed by {@link acapInstallOpenFileDialog}.
 */
export interface AcApOpenFileDialogOptions {
  /** When false, the built-in OPEN dialog is not installed. Defaults to true. */
  enabled?: boolean
  /** Supplies open options for files chosen through the built-in dialog. */
  getOpenDocumentDefaults?: () =>
    | AcApOpenDatabaseOptions
    | Promise<AcApOpenDatabaseOptions>
}

/** Hidden `<input type="file">` element reused across OPEN requests. */
let fileInput: HTMLInputElement | undefined
/** Whether {@link acapInstallOpenFileDialog} has registered the `open-file` listener. */
let installed = false
/** Active dialog options merged from install and update calls. */
let currentOptions: AcApOpenFileDialogOptions = {}

/**
 * Returns whether the given file name has a supported CAD extension.
 *
 * @param fileName - Local file name including extension.
 * @returns `true` when the name ends with `.dxf` or `.dwg` (case-insensitive).
 */
const isSupportedCadFile = (fileName: string) => {
  const lowerName = fileName.toLowerCase()
  return SUPPORTED_EXTENSIONS.some(ext => lowerName.endsWith(ext))
}

/**
 * Reads a browser {@link File} into memory as raw bytes.
 *
 * @param file - File selected from the hidden file input.
 * @returns Resolves with the file contents as an {@link ArrayBuffer}.
 */
const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () =>
      reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })

/**
 * Resolves database open options for a user-selected file.
 *
 * Falls back to `{ minimumChunkSize: 1000 }` when no custom resolver is configured.
 *
 * @param getDefaults - Optional callback from {@link AcApOpenFileDialogOptions.getOpenDocumentDefaults}.
 * @returns Resolved open options passed to {@link AcApDocManager.openDocument}.
 */
const resolveOpenDocumentDefaults = async (
  getDefaults?: AcApOpenFileDialogOptions['getOpenDocumentDefaults']
): Promise<AcApOpenDatabaseOptions> => {
  if (!getDefaults) {
    return { minimumChunkSize: 1000 }
  }
  return getDefaults()
}

/**
 * Opens the hidden file picker in response to an `open-file` event.
 *
 * Creates and appends the input element on first use, then triggers `click()`.
 */
const onOpenFile = () => {
  if (!fileInput) {
    fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = SUPPORTED_EXTENSIONS.join(',')
    fileInput.style.display = 'none'
    fileInput.addEventListener('change', onFileChange)
    document.body.appendChild(fileInput)
  }
  fileInput.click()
}

/**
 * Handles file selection from the hidden input.
 *
 * Validates the extension, reads the file, and delegates opening to
 * {@link AcApDocManager.openDocument}. Clears the input value so the same file
 * can be chosen again.
 *
 * @param event - `change` event from the hidden file input.
 */
const onFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return

  if (!isSupportedCadFile(file.name)) {
    log.warn(`Unsupported file type: ${file.name}`)
    return
  }

  try {
    const content = await readFileAsArrayBuffer(file)
    const { AcApDocManager } = await import('./AcApDocManager')
    const options = await resolveOpenDocumentDefaults(
      currentOptions.getOpenDocumentDefaults
    )
    eventBus.emit('open-local-file-started', {
      mode: options.mode ?? AcEdOpenMode.Read
    })
    await AcApDocManager.instance.openDocument(file.name, content, options)
  } catch (error) {
    log.error('Failed to open selected file:', error)
  }
}

/**
 * Installs the built-in file picker used by the OPEN command.
 *
 * Listens for `open-file` events, prompts for a local `.dxf` / `.dwg` file,
 * and opens it through {@link AcApDocManager.openDocument}.
 *
 * @param options - Dialog configuration. When `enabled` is `false`, installation is skipped.
 */
export function acapInstallOpenFileDialog(
  options: AcApOpenFileDialogOptions = {}
) {
  if (options.enabled === false) return

  currentOptions = options
  if (installed) return

  eventBus.on('open-file', onOpenFile)
  installed = true
}

/**
 * Updates options for an already installed built-in OPEN file dialog.
 *
 * @param options - Replacement dialog configuration merged into the active install.
 */
export function acapUpdateOpenFileDialogOptions(
  options: AcApOpenFileDialogOptions
) {
  currentOptions = options
}

/** Removes the built-in OPEN file dialog and its hidden input element. */
export function acapUninstallOpenFileDialog() {
  if (!installed) return

  eventBus.off('open-file', onOpenFile)
  fileInput?.removeEventListener('change', onFileChange)
  fileInput?.remove()
  fileInput = undefined
  installed = false
  currentOptions = {}
}
