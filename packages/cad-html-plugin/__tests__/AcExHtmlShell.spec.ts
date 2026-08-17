jest.mock('@mlightcad/cad-simple-viewer', () => ({
  ML_UI_MOBILE_MAX_WIDTH: 768
}))

import { buildAcExHtmlShellBody } from '../src/AcExHtmlShell'

describe('buildAcExHtmlShellBody', () => {
  it('omits measurement toolbar controls in view mode', () => {
    const html = buildAcExHtmlShellBody('#000000', 'view')

    expect(html).toContain('data-action="fit"')
    expect(html).toContain('id="mlcad-layers-btn"')
    expect(html).toContain('id="mlcad-lang-btn"')
    expect(html).not.toContain('data-measure-mode=')
    expect(html).not.toContain('id="mlcad-measure-menu-btn"')
    expect(html).not.toContain('id="mlcad-markup-menu-btn"')
    expect(html).not.toContain('id="mlcad-settings-btn"')
    expect(html).not.toContain('id="mlcad-settings-wrap"')
    expect(html).not.toContain('mlcad-tool-separator')
    expect(html).not.toContain('id="mlcad-status-bar"')
  })

  it('uses Measurement / Review / Settings parent strips in measure mode', () => {
    const html = buildAcExHtmlShellBody('#000000', 'measure')

    expect(html).toContain('id="mlcad-measure-menu-btn"')
    expect(html).toContain('id="mlcad-markup-menu-btn"')
    expect(html).toContain('id="mlcad-settings-btn"')
    expect(html).toContain('has-children')
    expect(html).toContain('id="mlcad-measure-strip-wrap"')
    expect(html).toContain('id="mlcad-markup-strip-wrap"')
    expect(html).toContain('id="mlcad-settings-wrap"')
    expect(html).not.toContain('mlcad-measure-submenu-template')
    expect(html).not.toContain('mlcad-markup-submenu-template')
    expect(html).toContain('data-measure-mode="distance"')
    expect(html).toContain('data-action="measure-import"')
    expect(html).toContain('data-markup-mode="cloud"')
    expect(html).toContain('data-action="clear-markups"')
    expect(html).toContain('id="mlcad-status-bar"')
    expect(html.match(/mlcad-tool-separator/g)?.length).toBeGreaterThanOrEqual(2)
    // Child tools live in strips, not as first-level toolbar buttons.
    const toolbarHtml = html.match(/<nav id="mlcad-toolbar"[\s\S]*?<\/nav>/)?.[0]
    expect(toolbarHtml).toBeTruthy()
    expect(toolbarHtml).not.toContain('data-measure-mode')
    expect(toolbarHtml).not.toContain('data-markup-mode')
    expect(toolbarHtml).toContain('title="Settings"')
  })

  it('omits markup toolbar controls in view mode', () => {
    const html = buildAcExHtmlShellBody('#000000', 'view')
    expect(html).not.toContain('data-markup-mode=')
    expect(html).not.toContain('data-action="clear-markups"')
  })
})
