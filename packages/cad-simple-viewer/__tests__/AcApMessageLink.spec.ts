/** @jest-environment jsdom */

import {
  ACAP_DWG_PARSER_PRODUCT_URL,
  acapAppendLinkedText,
  acapEscapeHtml,
  acapFormatMessageHtml,
  acapMarkdownLink
} from '../src/util/AcApMessageLink'

describe('AcApMessageLink', () => {
  it('exports the commercial DWG parser product URL', () => {
    expect(ACAP_DWG_PARSER_PRODUCT_URL).toBe(
      'https://mlightcad.com/dwg-parser.html'
    )
  })

  it('escapes HTML special characters', () => {
    expect(acapEscapeHtml(`a <b> & "c"`)).toBe('a &lt;b&gt; &amp; &quot;c&quot;')
  })

  it('builds a markdown link', () => {
    expect(acapMarkdownLink('this page', ACAP_DWG_PARSER_PRODUCT_URL)).toBe(
      `[this page](${ACAP_DWG_PARSER_PRODUCT_URL})`
    )
  })

  it('formats markdown links as safe HTML anchors', () => {
    const html = acapFormatMessageHtml(
      `Failed. Click [this page](${ACAP_DWG_PARSER_PRODUCT_URL}) to buy.`
    )
    expect(html).toBe(
      `Failed. Click <a href="${ACAP_DWG_PARSER_PRODUCT_URL}" target="_blank" rel="noopener noreferrer">this page</a> to buy.`
    )
  })

  it('escapes surrounding text when formatting HTML', () => {
    expect(acapFormatMessageHtml('a <b> & c')).toBe('a &lt;b&gt; &amp; c')
  })

  it('escapes quotes in href when formatting HTML', () => {
    const html = acapFormatMessageHtml(
      'Click [x](https://evil.example/"onclick="alert(1)) now.'
    )
    expect(html).toContain(
      'href="https://evil.example/&quot;onclick=&quot;alert(1"'
    )
    expect(html).not.toContain('href="https://evil.example/"onclick="')
  })

  it('appends linked text as DOM nodes', () => {
    const container = document.createElement('div')
    acapAppendLinkedText(
      container,
      `Click [this page](${ACAP_DWG_PARSER_PRODUCT_URL}) now.`
    )
    expect(container.childNodes).toHaveLength(3)
    expect(container.childNodes[0].textContent).toBe('Click ')
    const anchor = container.childNodes[1] as HTMLAnchorElement
    expect(anchor.tagName).toBe('A')
    expect(anchor.href).toBe(ACAP_DWG_PARSER_PRODUCT_URL)
    expect(anchor.target).toBe('_blank')
    expect(anchor.rel).toBe('noopener noreferrer')
    expect(anchor.textContent).toBe('this page')
    expect(container.childNodes[2].textContent).toBe(' now.')
  })
})
