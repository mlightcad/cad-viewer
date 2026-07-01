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
    expect(html).not.toContain('id="mlcad-settings-btn"')
    expect(html).not.toContain('id="mlcad-settings-wrap"')
    expect(html).not.toContain('mlcad-tool-separator')
    expect(html).not.toContain('id="mlcad-status-bar"')
  })

  it('includes measurement toolbar controls in measure mode', () => {
    const html = buildAcExHtmlShellBody('#000000', 'measure')

    expect(html).toContain('data-measure-mode="distance"')
    expect(html).toContain('id="mlcad-settings-btn"')
    expect(html).toContain('id="mlcad-settings-wrap"')
    expect(html).toContain('id="mlcad-lang-btn"')
    expect(html).toContain('id="mlcad-status-bar"')
    expect(html.match(/mlcad-tool-separator/g)?.length).toBe(2)
    expect(html.indexOf('id="mlcad-layers-btn"')).toBeLessThan(
      html.indexOf('id="mlcad-settings-btn"')
    )
  })
})
