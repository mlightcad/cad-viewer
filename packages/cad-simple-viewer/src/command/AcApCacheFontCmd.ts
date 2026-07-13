import { AcApContext } from '../app'
import { AcEdCommand, eventBus } from '../editor'
import { AcApI18n } from '../i18n'
import { AcApFontUtil, type FontLoadStatus } from '../util/AcApFontUtil'

export type { FontLoadStatus } from '../util/AcApFontUtil'

export interface AcApCacheFontOptions {
  /** Optional alias names (e.g. missed drawing font names) */
  aliases?: string[]
  /** Emit success/error messages via the global event bus. Defaults to true. */
  notify?: boolean
}

let pendingFontFileResolve: ((file: File | undefined) => void) | null = null

eventBus.on('font-file-selected', ({ file }) => {
  pendingFontFileResolve?.(file)
  pendingFontFileResolve = null
})

function requestFontFileFromUi(): Promise<File | undefined> {
  return new Promise(resolve => {
    pendingFontFileResolve = resolve
    eventBus.emit('cache-font', {})
  })
}

/**
 * Command to cache a user-selected font file into IndexedDB.
 *
 * Opens a font file picker through the `cache-font` event, then parses and
 * caches the selected file for text rendering.
 */
export class AcApCacheFontCmd extends AcEdCommand {
  /**
   * Parses a user-uploaded font file, registers it for rendering, and stores it
   * in IndexedDB when font caching is enabled.
   */
  static async cacheFontFile(
    file: File,
    options?: AcApCacheFontOptions
  ): Promise<FontLoadStatus> {
    const shouldNotify = options?.notify ?? true
    const cmd = new AcApCacheFontCmd()

    try {
      const status = await AcApFontUtil.cacheFont(
        file,
        undefined,
        options?.aliases
      )

      if (shouldNotify) {
        if (status.status === 'Success') {
          cmd.notify(
            `${AcApI18n.t('main.message.fontCached')}: ${status.fontName}`,
            'success'
          )
        } else {
          cmd.notify(
            `${AcApI18n.t('main.message.fontCacheFailed')}: ${file.name}`,
            'error'
          )
        }
      }

      return status
    } catch {
      if (shouldNotify) {
        cmd.notify(
          `${AcApI18n.t('main.message.fontCacheFailed')}: ${file.name}`,
          'error'
        )
      }

      return {
        fontName: '',
        url: '',
        status: 'FailedToLoad'
      }
    }
  }

  async execute(_context: AcApContext) {
    const file = await requestFontFileFromUi()
    if (!file) return

    await AcApCacheFontCmd.cacheFontFile(file)
  }
}
