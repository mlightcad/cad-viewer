import {
  decryptAcExHtmlSnapshotPayload,
  encryptAcExHtmlSnapshotPayload,
  formatAcExHtmlCountdown,
  isAcExHtmlAccessExpired,
  isAcExHtmlExpiryCountdownActive,
  needsAcExHtmlAccessControl,
  protectAcExHtmlEncodedSnapshot,
  resolveAcApHtmlExpiresAt
} from '../src/AcExHtmlAccess'

describe('AcExHtmlAccess', () => {
  it('resolves expiry timestamps from validity periods', () => {
    const exportedAt = Date.UTC(2026, 0, 1)
    expect(resolveAcApHtmlExpiresAt('never', exportedAt)).toBeNull()
    expect(resolveAcApHtmlExpiresAt(1, exportedAt)).toBe(
      exportedAt + 24 * 60 * 60 * 1000
    )
    expect(resolveAcApHtmlExpiresAt(7, exportedAt)).toBe(
      exportedAt + 7 * 24 * 60 * 60 * 1000
    )
    expect(resolveAcApHtmlExpiresAt('custom', exportedAt, 123)).toBe(123)
    expect(resolveAcApHtmlExpiresAt('custom', exportedAt)).toBeNull()
  })

  it('formats countdown durations', () => {
    expect(formatAcExHtmlCountdown(5_000)).toBe('0:05')
    expect(formatAcExHtmlCountdown(65_000)).toBe('1:05')
    expect(formatAcExHtmlCountdown(3_665_000)).toBe('1:01:05')
  })

  it('detects the near-expiry countdown window', () => {
    const expiresAt = Date.now() + 5 * 60 * 1000
    expect(isAcExHtmlExpiryCountdownActive(expiresAt)).toBe(true)
    expect(
      isAcExHtmlExpiryCountdownActive(Date.now() + 20 * 60 * 1000)
    ).toBe(false)
  })

  it('detects when access control is required', () => {
    expect(
      needsAcExHtmlAccessControl({ expiresAt: null, password: '' })
    ).toBe(false)
    expect(
      needsAcExHtmlAccessControl({ expiresAt: Date.now() + 1000 })
    ).toBe(true)
    expect(
      needsAcExHtmlAccessControl({ expiresAt: null, password: 'secret' })
    ).toBe(true)
  })

  it('detects expired manifests', () => {
    expect(
      isAcExHtmlAccessExpired(
        { v: 1, expiresAt: Date.now() - 1, encrypted: false },
        Date.now()
      )
    ).toBe(true)
    expect(
      isAcExHtmlAccessExpired(
        { v: 1, expiresAt: Date.now() + 60_000, encrypted: false },
        Date.now()
      )
    ).toBe(false)
  })

  it('encrypts and decrypts snapshot payloads with a password', async () => {
    const payload = 'dGVzdC1wYXlsb2Fk'
    const password = 'cad-export-password'

    const encrypted = await encryptAcExHtmlSnapshotPayload(password, payload)
    const decrypted = await decryptAcExHtmlSnapshotPayload(
      password,
      encrypted.encryptedPayload,
      encrypted.salt
    )

    expect(decrypted).toBe(payload)
    await expect(
      decryptAcExHtmlSnapshotPayload(
        'wrong-password',
        encrypted.encryptedPayload,
        encrypted.salt
      )
    ).rejects.toThrow()
  })

  it('builds manifests for expiry-only and password-protected exports', async () => {
    const encoded = { payload: 'abc', compression: 'gzip' as const }
    const expiresAt = Date.now() + 86_400_000

    const expiryOnly = await protectAcExHtmlEncodedSnapshot(encoded, {
      expiresAt
    })
    expect(expiryOnly.manifest).toEqual({
      v: 1,
      expiresAt,
      encrypted: false
    })
    expect(expiryOnly.encoded).toEqual(encoded)

    const protectedExport = await protectAcExHtmlEncodedSnapshot(encoded, {
      expiresAt,
      password: 'secret'
    })
    expect(protectedExport.manifest?.encrypted).toBe(true)
    expect(protectedExport.manifest?.salt).toBeTruthy()
    expect(protectedExport.encoded.payload).not.toBe(encoded.payload)
  })
})
