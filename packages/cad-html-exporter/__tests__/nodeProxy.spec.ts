import { normalizeProxyServer } from '../src/nodeProxy'

describe('normalizeProxyServer', () => {
  it('accepts host:port and absolute http URLs', () => {
    expect(normalizeProxyServer('127.0.0.1:7897')).toBe('http://127.0.0.1:7897')
    expect(normalizeProxyServer('http://127.0.0.1:7897')).toBe(
      'http://127.0.0.1:7897'
    )
  })

  it('prefers the https entry in a WinINET proxy map', () => {
    expect(
      normalizeProxyServer('http=10.0.0.1:8080;https=10.0.0.2:8443')
    ).toBe('http://10.0.0.2:8443')
  })

  it('ignores empty and socks-only values', () => {
    expect(normalizeProxyServer('  ')).toBeUndefined()
    expect(normalizeProxyServer('socks=127.0.0.1:1080')).toBeUndefined()
  })
})
