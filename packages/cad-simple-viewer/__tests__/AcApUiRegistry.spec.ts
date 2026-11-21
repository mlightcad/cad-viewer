import { AcApI18n } from '../src/i18n/AcApI18n'
import {
  acapMergeMenuContributions,
  acapMergeRibbonContributions,
  AcApUiRegistry,
  type AcApUiRibbonGroup
} from '../src/ui/AcApUiRegistry'

interface TestGroup {
  id: string
  items: string[]
}

interface TestTab {
  id: string
  titleKey?: string
  groups: TestGroup[]
}

const adapt = {
  createTab: (tabId: string, tabTitleKey: string | undefined): TestTab => ({
    id: tabId,
    titleKey: tabTitleKey,
    groups: []
  }),
  createGroup: (source: AcApUiRibbonGroup): TestGroup => ({
    id: source.id,
    items: source.items.map(item => item.id)
  }),
  appendItems: (group: TestGroup, source: AcApUiRibbonGroup) => {
    group.items.push(...source.items.map(item => item.id))
  }
}

describe('AcApUiRegistry', () => {
  afterEach(() => {
    AcApUiRegistry.reset()
  })

  it('shows nothing until a plugin registers', () => {
    expect(AcApUiRegistry.ribbonGroups()).toEqual([])
    expect(AcApUiRegistry.menuItems('file.export')).toEqual([])
    const tabs = acapMergeRibbonContributions(
      [{ id: 'ai', groups: [{ id: 'ai-smart-blocks', items: ['bsearch'] }] }],
      AcApUiRegistry.ribbonGroups(),
      adapt
    )
    expect(tabs[0].groups.map(group => group.id)).toEqual(['ai-smart-blocks'])
  })

  it('adds ribbon groups and export rows, then removes them', () => {
    const events: string[] = []
    const onChanged = (args: { type: string }) => {
      events.push(args.type)
    }
    AcApUiRegistry.events.changed.addEventListener(onChanged)
    const dispose = AcApUiRegistry.register({
      plugin: 'PdfPlugin',
      messages: {
        en: { test: { uiRegistry: { pdfGroup: 'PDF' } } }
      },
      ribbonGroups: [
        {
          id: 'ai-pdf',
          tabId: 'ai',
          titleKey: 'test.uiRegistry.pdfGroup',
          items: [{ id: 'cmd-pdfimport', command: 'pdfimport' }]
        }
      ],
      menuItems: [
        {
          id: 'ExportPdf',
          parentId: 'file.export',
          labelKey: 'main.mainMenu.exportPdf',
          command: 'cpdf',
          order: 20
        }
      ]
    })

    expect(AcApUiRegistry.ribbonGroups().map(group => group.id)).toEqual([
      'ai-pdf'
    ])
    expect(
      AcApUiRegistry.menuItems('file.export').map(item => item.id)
    ).toEqual(['ExportPdf'])
    expect(AcApI18n.t('test.uiRegistry.pdfGroup')).toBe('PDF')
    expect(events).toEqual(['register'])

    dispose()
    expect(AcApUiRegistry.ribbonGroups()).toEqual([])
    expect(AcApUiRegistry.menuItems('file.export')).toEqual([])
    expect(events).toEqual(['register', 'unregister'])
    AcApUiRegistry.events.changed.removeEventListener(onChanged)
  })

  it('omits export rows when the plugin registers without them', () => {
    AcApUiRegistry.register({
      plugin: 'PdfPlugin',
      ribbonGroups: [
        {
          id: 'ai-pdf',
          tabId: 'ai',
          titleKey: 'main.ribbon.group.pdf',
          items: [{ id: 'cmd-pdfimport', command: 'pdfimport' }]
        }
      ]
    })
    const menu = acapMergeMenuContributions(
      [
        { id: 'Convert', label: 'DXF' },
        { id: 'PngOut', label: 'Image' }
      ],
      AcApUiRegistry.menuItems(),
      'file.export',
      item => ({ id: item.id, label: item.labelKey }),
      'PngOut'
    )
    expect(menu.map(item => item.id)).toEqual(['Convert', 'PngOut'])
  })

  it('replaces a plugin and ignores the stale disposer', () => {
    const first = AcApUiRegistry.register({
      plugin: 'AgentPlugin',
      ribbonGroups: [
        {
          id: 'ai-agent',
          tabId: 'ai',
          titleKey: 'main.ribbon.group.agent',
          items: [{ id: 'cmd-agent-old', command: 'agent' }]
        }
      ]
    })
    AcApUiRegistry.register({
      plugin: 'AgentPlugin',
      ribbonGroups: [
        {
          id: 'ai-agent',
          tabId: 'ai',
          titleKey: 'main.ribbon.group.agent',
          items: [{ id: 'cmd-agent', command: 'agent' }]
        }
      ]
    })
    first()
    expect(
      AcApUiRegistry.ribbonGroups()[0]?.items.map(item => item.id)
    ).toEqual(['cmd-agent'])
    expect(AcApUiRegistry.clearPlugin('AgentPlugin')).toBe(true)
    expect(AcApUiRegistry.clearPlugin('AgentPlugin')).toBe(false)
  })

  it('rejects an empty plugin name', () => {
    expect(() => AcApUiRegistry.register({ plugin: '  ' })).toThrow(
      /Plugin name is required/
    )
  })
})

describe('acapMergeRibbonContributions', () => {
  const core: TestTab[] = [
    {
      id: 'ai',
      groups: [{ id: 'ai-smart-blocks', items: ['bsearch'] }]
    },
    {
      id: 'home',
      groups: [{ id: 'home-utilities', items: ['qselect'] }]
    }
  ]

  it('places new groups around host groups and merges items into an existing group', () => {
    const contributions: AcApUiRibbonGroup[] = [
      {
        id: 'ai-pdf',
        plugin: 'PdfPlugin',
        tabId: 'ai',
        titleKey: 'main.ribbon.group.pdf',
        items: [{ id: 'cmd-pdfimport' }]
      },
      {
        id: 'ai-agent',
        plugin: 'AgentPlugin',
        tabId: 'ai',
        titleKey: 'main.ribbon.group.agent',
        placement: 'start',
        order: 0,
        items: [{ id: 'cmd-agent' }]
      },
      {
        id: 'ai-model',
        plugin: 'LlmPlugin',
        tabId: 'ai',
        titleKey: 'main.ribbon.group.aiModel',
        placement: 'start',
        order: 1,
        items: [{ id: 'cmd-llmsettings' }]
      },
      {
        id: 'home-utilities',
        plugin: 'CadScriptPlugin',
        tabId: 'home',
        merge: true,
        items: [{ id: 'cmd-cadscript' }]
      }
    ]
    const tabs = acapMergeRibbonContributions(core, contributions, adapt)
    expect(tabs[0].groups.map(group => group.id)).toEqual([
      'ai-agent',
      'ai-model',
      'ai-smart-blocks',
      'ai-pdf'
    ])
    expect(tabs[1].groups[0].items).toEqual(['qselect', 'cmd-cadscript'])
    expect(core[1].groups).toHaveLength(1)
  })

  it('creates a tab the host does not have', () => {
    const tabs = acapMergeRibbonContributions(
      [],
      [
        {
          id: 'extra-main',
          plugin: 'Extra',
          tabId: 'extra',
          tabTitleKey: 'main.ribbon.tab.extra',
          titleKey: 'main.ribbon.group.extra',
          items: [{ id: 'cmd-extra' }]
        }
      ],
      adapt
    )
    expect(tabs).toEqual([
      {
        id: 'extra',
        titleKey: 'main.ribbon.tab.extra',
        groups: [{ id: 'extra-main', items: ['cmd-extra'] }]
      }
    ])
  })
})

describe('acapMergeMenuContributions', () => {
  it('inserts export rows before the image row, in order', () => {
    const merged = acapMergeMenuContributions(
      [
        { id: 'Convert', label: 'DXF' },
        { id: 'PngOut', label: 'Image' }
      ],
      [
        {
          id: 'ExportSvg',
          plugin: 'SvgPlugin',
          parentId: 'file.export',
          labelKey: 'svg',
          order: 30
        },
        {
          id: 'ExportHtml',
          plugin: 'HtmlPlugin',
          parentId: 'file.export',
          labelKey: 'html',
          order: 10
        },
        {
          id: 'Other',
          plugin: 'Other',
          parentId: 'file.open',
          labelKey: 'open',
          order: 0
        }
      ],
      'file.export',
      item => ({ id: item.id, label: item.labelKey }),
      'PngOut'
    )
    expect(merged.map(item => item.id)).toEqual([
      'Convert',
      'ExportHtml',
      'ExportSvg',
      'PngOut'
    ])
  })
})
