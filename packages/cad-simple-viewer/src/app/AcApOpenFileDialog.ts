import { log } from '@mlightcad/data-model'

import { eventBus } from '../editor/global/eventBus'
import type { AcApOpenDatabaseOptions } from './AcApOpenDatabaseOptions'
import { acapPickLocalCadFile } from './dataSource/AcApLocalDataSource'
import { acapOpenDataSourceResult } from './dataSource/acapOpenDataSourceResult'

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

/** Whether {@link acapInstallOpenFileDialog} has registered the `open-file` listener. */
let installed = false
/** Active dialog options merged from install and update calls. */
let currentOptions: AcApOpenFileDialogOptions = {}

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
 * Opens the local CAD file picker in response to an `open-file` event.
 *
 * Delegates to the shared local data-source picker, then opens the document.
 */
const onOpenFile = async () => {
  try {
    const file = await acapPickLocalCadFile()
    if (!file?.content) return
    const options = await resolveOpenDocumentDefaults(
      currentOptions.getOpenDocumentDefaults
    )
    await acapOpenDataSourceResult(file, options)
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

/** Removes the built-in OPEN file dialog listener. */
export function acapUninstallOpenFileDialog() {
  if (!installed) return

  eventBus.off('open-file', onOpenFile)
  installed = false
  currentOptions = {}
}
