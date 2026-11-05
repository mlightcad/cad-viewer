/**
 * @jest-environment jsdom
 */

import type {
  AcApDataSource,
  AcApDataSourceAuthState,
  AcApDataSourceFile
} from '../src/app/dataSource/AcApDataSource'
import { AcApDataSourceManager } from '../src/app/dataSource/AcApDataSourceManager'
import {
  AcUiFileOpenLanding,
  type AcUiFileOpenRequest
} from '../src/ui/AcUiFileOpenLanding'

function makeSource(
  partial: Partial<AcApDataSource> & Pick<AcApDataSource, 'id' | 'labelKey'>
): AcApDataSource {
  return {
    requiresAuth: false,
    requiresUserGesture: false,
    getAuthState: () => 'none' as AcApDataSourceAuthState,
    signIn: async () => undefined,
    signOut: async () => undefined,
    pick: async () => null as AcApDataSourceFile | null,
    ...partial
  }
}

describe('AcUiFileOpenLanding', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  function mountLanding(onOpen: (request: AcUiFileOpenRequest) => void) {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const landing = new AcUiFileOpenLanding({
      host,
      showNewDrawing: true,
      onOpen
    })
    return { host, landing }
  }

  it('emits onOpen for new drawing', () => {
    const opens: AcUiFileOpenRequest[] = []
    const { host, landing } = mountLanding(req => opens.push(req))

    const newBtn = host.querySelector(
      '.ml-ui-file-open-primary'
    ) as HTMLButtonElement
    newBtn.click()

    expect(opens).toEqual([{ kind: 'new' }])
    landing.dispose()
  })

  it('emits onOpen for a local file selection', () => {
    const opens: AcUiFileOpenRequest[] = []
    const { host, landing } = mountLanding(req => opens.push(req))

    const input = host.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    const file = new File([new Uint8Array([1, 2, 3])], 'demo.dwg', {
      type: 'application/octet-stream'
    })
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [file]
    })
    input.dispatchEvent(new Event('change'))

    expect(opens).toHaveLength(1)
    expect(opens[0]?.kind).toBe('file')
    if (opens[0]?.kind === 'file') {
      expect(opens[0].file.name).toBe('demo.dwg')
    }
    landing.dispose()
  })

  async function selectSourceByIndex(host: HTMLElement, index: number) {
    const footerBtn = host.querySelector(
      '.ml-ui-file-open-footer-btn'
    ) as HTMLButtonElement
    footerBtn.click()
    const menuItems = Array.from(
      host.querySelectorAll('.ml-ui-file-open-menu-item')
    ) as HTMLButtonElement[]
    expect(menuItems.length).toBeGreaterThan(index)
    menuItems[index]!.click()
  }

  it('emits onOpen for a URL submit', async () => {
    const opens: AcUiFileOpenRequest[] = []
    const { host, landing } = mountLanding(req => opens.push(req))

    await selectSourceByIndex(host, 1)

    const urlInput = host.querySelector(
      '.ml-ui-file-open-url-input'
    ) as HTMLInputElement
    urlInput.value = 'https://example.com/a.dxf'
    const openBtn = host.querySelector(
      '.ml-ui-file-open-secondary'
    ) as HTMLButtonElement
    openBtn.click()

    expect(opens).toEqual([
      { kind: 'url', url: 'https://example.com/a.dxf' }
    ])
    landing.dispose()
  })

  it('maps a cloud pick with content into onOpen file', async () => {
    const opens: AcUiFileOpenRequest[] = []
    const { host, landing } = mountLanding(req => opens.push(req))

    const bytes = new Uint8Array([9, 8, 7]).buffer
    landing.registerSource(
      makeSource({
        id: 'cloud',
        labelKey: 'main.dataSource.onedrive',
        requiresAuth: true,
        getAuthState: () => 'signed-in',
        getAccountProfile: () => ({ displayName: 'Ada' }),
        pick: async () => ({ name: 'cloud.dwg', content: bytes })
      })
    )

    // local (0), url (1), cloud (2)
    await selectSourceByIndex(host, 2)

    const pickBtn = host.querySelector(
      '.ml-ui-file-open-source-btn--primary'
    ) as HTMLButtonElement
    expect(pickBtn).toBeTruthy()
    expect(pickBtn.disabled).toBe(false)
    pickBtn.click()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(opens).toHaveLength(1)
    expect(opens[0]?.kind).toBe('file')
    if (opens[0]?.kind === 'file') {
      expect(opens[0].file.name).toBe('cloud.dwg')
    }
    landing.dispose()
  })

  it('does not call onOpen for sign-in', async () => {
    const opens: AcUiFileOpenRequest[] = []
    let signedIn = false
    const { host, landing } = mountLanding(req => opens.push(req))

    landing.registerSource(
      makeSource({
        id: 'cloud',
        labelKey: 'main.dataSource.onedrive',
        requiresAuth: true,
        getAuthState: () => (signedIn ? 'signed-in' : 'signed-out'),
        signIn: async () => {
          signedIn = true
        }
      })
    )

    // Selecting a signed-out auth source auto-triggers signIn (no onOpen).
    await selectSourceByIndex(host, 2)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(signedIn).toBe(true)
    expect(opens).toEqual([])
    landing.dispose()
  })

  it('attachSourcesTo registers the same instances on another manager', () => {
    const opens: AcUiFileOpenRequest[] = []
    const { landing } = mountLanding(req => opens.push(req))
    const source = makeSource({
      id: 'cloud',
      labelKey: 'main.dataSource.onedrive'
    })
    landing.registerSource(source)

    const target = new AcApDataSourceManager()
    landing.attachSourcesTo(target)

    expect(target.get('cloud')).toBe(source)
    // Second attach is a no-op for the same instance.
    landing.attachSourcesTo(target)
    expect(target.get('cloud')).toBe(source)

    landing.dispose()
  })
})
