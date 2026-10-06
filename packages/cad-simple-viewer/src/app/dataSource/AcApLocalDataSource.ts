import { log } from '@mlightcad/data-model'

import type {
  AcApDataSource,
  AcApDataSourceAuthState,
  AcApDataSourceFile
} from './AcApDataSource'

/** File extensions accepted by the local data source. */
const SUPPORTED_EXTENSIONS = ['.dxf', '.dwg'] as const

/** Built-in local-file data source id. */
export const ACAP_LOCAL_DATA_SOURCE_ID = 'local'

let fileInput: HTMLInputElement | undefined

const isSupportedCadFile = (fileName: string) => {
  const lowerName = fileName.toLowerCase()
  return SUPPORTED_EXTENSIONS.some(ext => lowerName.endsWith(ext))
}

const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () =>
      reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })

const ensureFileInput = (): HTMLInputElement => {
  if (!fileInput) {
    fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = SUPPORTED_EXTENSIONS.join(',')
    fileInput.style.display = 'none'
    document.body.appendChild(fileInput)
  }
  return fileInput
}

/**
 * Opens the browser file picker and returns the selected CAD file.
 *
 * Shared by {@link AcApLocalDataSource} and the built-in OPEN dialog.
 *
 * @returns Chosen file, or `null` when the user cancels or the type is unsupported
 */
export async function acapPickLocalCadFile(): Promise<AcApDataSourceFile | null> {
  const input = ensureFileInput()
  return new Promise(resolve => {
    const onChange = async () => {
      input.removeEventListener('change', onChange)
      const file = input.files?.[0]
      input.value = ''
      if (!file) {
        resolve(null)
        return
      }
      if (!isSupportedCadFile(file.name)) {
        log.warn(`Unsupported file type: ${file.name}`)
        resolve(null)
        return
      }
      try {
        const content = await readFileAsArrayBuffer(file)
        resolve({ name: file.name, content })
      } catch (error) {
        log.error('Failed to read selected file:', error)
        resolve(null)
      }
    }
    input.addEventListener('change', onChange)
    input.click()
  })
}

/**
 * Built-in data source that opens a local `.dwg` / `.dxf` via `<input type="file">`.
 */
export class AcApLocalDataSource implements AcApDataSource {
  readonly id = ACAP_LOCAL_DATA_SOURCE_ID
  readonly labelKey = 'main.dataSource.local'
  readonly requiresAuth = false
  readonly requiresUserGesture = false

  getAuthState(): AcApDataSourceAuthState {
    return 'none'
  }

  async signIn(): Promise<void> {
    // no-op
  }

  async signOut(): Promise<void> {
    // no-op
  }

  pick(): Promise<AcApDataSourceFile | null> {
    return acapPickLocalCadFile()
  }
}
