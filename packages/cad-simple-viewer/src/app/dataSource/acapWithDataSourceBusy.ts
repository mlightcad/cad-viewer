import { AcApI18n } from '../../i18n/AcApI18n'
import { AcApDocManager } from '../AcApDocManager'
import { AcApProgress } from '../AcApProgress'

/**
 * Runs cloud download / post-picker work under a busy overlay.
 *
 * Uses {@link AcApDocManager.showBusyIndicator} when a DocManager exists;
 * otherwise mounts a temporary {@link AcApProgress} on `document.body` so
 * landing pages still show download feedback without host-specific UI.
 *
 * @param work - Async work (typically download after File Picker)
 * @param message - Optional overlay message (defaults to OneDrive/cloud download copy)
 */
export async function acapWithDataSourceBusy<T>(
  work: () => Promise<T>,
  message?: string
): Promise<T> {
  const text = message ?? AcApI18n.t('main.dataSource.downloading')
  const dm = AcApDocManager.tryGetInstance()
  if (dm) {
    dm.showBusyIndicator(text)
    try {
      return await work()
    } finally {
      dm.hideBusyIndicator()
    }
  }

  const progress = new AcApProgress({
    host: document.body,
    message: text
  })
  progress.show()
  try {
    return await work()
  } finally {
    progress.hide()
    progress.destroy()
  }
}
