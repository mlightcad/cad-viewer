/** @jest-environment jsdom */

const layers = [
  {
    name: 'Wall',
    color: '1',
    cssColor: '#ff0000',
    isOn: true,
    isFrozen: false,
    isLocked: false
  },
  {
    name: 'Door',
    color: '2',
    cssColor: '#ffff00',
    isOn: true,
    isFrozen: false,
    isLocked: false
  },
  {
    name: 'A-Anno',
    color: '3',
    cssColor: '#00ff00',
    isOn: false,
    isFrozen: false,
    isLocked: false
  }
]

const layerStore = {
  getLayers: jest.fn(() => [...layers]),
  getCurrentLayerName: jest.fn(() => 'Door'),
  setAllLayersOn: jest.fn(),
  setAllLayersOffExceptCurrent: jest.fn(),
  setLayerOn: jest.fn(),
  setLayerColor: jest.fn(),
  events: {
    changed: {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }
  }
}

const documentActivated = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}

const editor = {
  curDocument: { layerStore },
  events: { documentActivated }
}

jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcApDocManager: {
    instance: {
      curView: undefined
    }
  },
  AcApI18n: {
    t: (_key: string, opts?: { fallback?: string }) => opts?.fallback ?? _key,
    mergeLocaleMessage: jest.fn(),
    events: {
      localeChanged: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }
    },
    currentLocale: 'en'
  },
  AcApLayerStore: class {}
}))

jest.mock('@mlightcad/data-model', () => ({
  AcCmColor: {
    fromString: jest.fn(() => null)
  }
}))

import { AcExI18n, registerSimpleUiI18n } from '../src/i18n'
import { AcExLayerListView } from '../src/ui/AcExLayerListView'

function createView() {
  registerSimpleUiI18n()
  const host = document.createElement('div')
  document.body.appendChild(host)
  return new AcExLayerListView({
    editor: editor as never,
    i18n: new AcExI18n(),
    host
  })
}

function getLayerNames(view: AcExLayerListView) {
  return Array.from(
    view.element.querySelectorAll('.ml-ex-ui-layer-name')
  ).map(el => el.textContent?.replace(/\*$/, '') ?? '')
}

describe('AcExLayerListView', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.getElementById('ml-ex-ui-styles')?.remove()
    jest.clearAllMocks()
  })

  it('sorts layers by name when the name header is clicked', () => {
    const view = createView()
    const sortButton = view.element.querySelector(
      '.ml-ex-ui-layer-name-sort'
    ) as HTMLButtonElement

    expect(getLayerNames(view)).toEqual(['Wall', 'Door', 'A-Anno'])

    sortButton.click()
    expect(getLayerNames(view)).toEqual(['A-Anno', 'Door', 'Wall'])
    expect(
      view.element
        .querySelector('.ml-ex-ui-layer-name-header')
        ?.getAttribute('aria-sort')
    ).toBe('ascending')

    sortButton.click()
    expect(getLayerNames(view)).toEqual(['Wall', 'Door', 'A-Anno'])
    expect(
      view.element
        .querySelector('.ml-ex-ui-layer-name-header')
        ?.getAttribute('aria-sort')
    ).toBe('descending')

    sortButton.click()
    expect(getLayerNames(view)).toEqual(['Wall', 'Door', 'A-Anno'])
    expect(
      view.element
        .querySelector('.ml-ex-ui-layer-name-header')
        ?.getAttribute('aria-sort')
    ).toBe('none')

    view.destroy()
  })
})
