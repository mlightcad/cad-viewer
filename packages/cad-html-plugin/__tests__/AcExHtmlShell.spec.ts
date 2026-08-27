jest.mock('@mlightcad/cad-simple-viewer', () => ({
  ML_UI_MOBILE_MAX_WIDTH: 768
}))

import { buildAcExHtmlShellBody } from '../src/AcExHtmlShell'

describe('buildAcExHtmlShellBody', () => {
  it('puts viewer config on #mlcad-root and omits measure chrome in view mode', () => {
    const html = buildAcExHtmlShellBody('#000000', 'view')

    expect(html).toContain('id="mlcad-root"')
    expect(html).toContain('data-viewer-mode="view"')
    expect(html).toContain('data-export-layouts="1"')
    expect(html).toContain('id="mlcad-layer-drawer"')
    expect(html).toContain('id="mlcad-status-bar"')
    expect(html).not.toContain('id="mlcad-toolbar-host"')
    expect(html).not.toContain('id="mlcad-toolbar"')
    expect(html).not.toContain('data-action=')
    expect(html).not.toContain('id="mlcad-polar-angles"')
    expect(html).not.toContain('id="mlcad-review-drawer"')
  })

  it('includes polar panel and review drawer in measure mode', () => {
    const html = buildAcExHtmlShellBody('#000000', 'measure')

    expect(html).toContain('data-viewer-mode="measure"')
    expect(html).toContain('id="mlcad-polar-angles"')
    expect(html).toContain('data-polar-ang="90"')
    expect(html).toContain('id="mlcad-review-drawer"')
    expect(html).toContain('mlcad-review-detail-close')
    expect(html).not.toContain('id="mlcad-toolbar-host"')
  })

  it('records exportLayouts=false on #mlcad-root', () => {
    const html = buildAcExHtmlShellBody('#000000', 'measure', false)

    expect(html).toContain('data-export-layouts="0"')
    expect(html).toContain('id="mlcad-root"')
  })
})
