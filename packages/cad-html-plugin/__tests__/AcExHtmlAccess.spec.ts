import {
  acexHtmlDecryptSnapshotPayload,
  acexHtmlEncryptSnapshotPayload,
  acexHtmlFormatCountdown,
  acexHtmlIsAccessExpired,
  acexHtmlIsExpiryCountdownActive,
  acexHtmlNeedsAccessControl,
  acexHtmlProtectEncodedSnapshot,
  acexHtmlResolveExpiresAt
} from '@mlightcad/cad-html-core'

describe('AcExHtmlAccess', () => {
  it('resolves expiry timestamps from validity periods', () => {
    const exportedAt = Date.UTC(2026, 0, 1)
    expect(acexHtmlResolveExpiresAt('never', exportedAt)).toBeNull()
    expect(acexHtmlResolveExpiresAt(1, exportedAt)).toBe(
      exportedAt + 24 * 60 * 60 * 1000
    )
    expect(acexHtmlResolveExpiresAt(7, exportedAt)).toBe(
      exportedAt + 7 * 24 * 60 * 60 * 1000
    )
    expect(acexHtmlResolveExpiresAt('custom', exportedAt, 123)).toBe(123)
    expect(acexHtmlResolveExpiresAt('custom', exportedAt)).toBeNull()
  })

  it('formats countdown durations', () => {
    expect(acexHtmlFormatCountdown(5_000)).toBe('0:05')
    expect(acexHtmlFormatCountdown(65_000)).toBe('1:05')
    expect(acexHtmlFormatCountdown(3_665_000)).toBe('1:01:05')
  })

  it('detects the near-expiry countdown window', () => {
    const expiresAt = Date.now() + 5 * 60 * 1000
    expect(acexHtmlIsExpiryCountdownActive(expiresAt)).toBe(true)
    expect(
      acexHtmlIsExpiryCountdownActive(Date.now() + 20 * 60 * 1000)
    ).toBe(false)
  })

  it('detects when access control is required', () => {
    expect(
      acexHtmlNeedsAccessControl({ expiresAt: null, password: '' })
    ).toBe(false)
    expect(
      acexHtmlNeedsAccessControl({ expiresAt: Date.now() + 1000 })
    ).toBe(true)
    expect(
      acexHtmlNeedsAccessControl({ expiresAt: null, password: 'secret' })
    ).toBe(true)
  })

  it('detects expired manifests', () => {
    expect(
      acexHtmlIsAccessExpired(
        { v: 1, expiresAt: Date.now() - 1, encrypted: false },
        Date.now()
      )
    ).toBe(true)
    expect(
      acexHtmlIsAccessExpired(
        { v: 1, expiresAt: Date.now() + 60_000, encrypted: false },
        Date.now()
      )
    ).toBe(false)
  })

  it('encrypts and decrypts snapshot payloads with a password', async () => {
    const { acexHtmlBytesToBase85 } = await import('@mlightcad/cad-html-core')
    const payload = acexHtmlBytesToBase85(
      new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
    )
    const password = 'cad-export-password'

    const encrypted = await acexHtmlEncryptSnapshotPayload(password, payload)
    const decrypted = await acexHtmlDecryptSnapshotPayload(
      password,
      encrypted.encryptedPayload,
      encrypted.salt
    )

    expect(decrypted).toBe(payload)
    await expect(
      acexHtmlDecryptSnapshotPayload(
        'wrong-password',
        encrypted.encryptedPayload,
        encrypted.salt
      )
    ).rejects.toThrow()
  })

  it('builds manifests for expiry-only and password-protected exports', async () => {
    const { acexHtmlBytesToBase85 } = await import('@mlightcad/cad-html-core')
    const encoded = {
      payload: acexHtmlBytesToBase85(new Uint8Array([9, 8, 7])),
      compression: 'gzip' as const
    }
    const expiresAt = Date.now() + 86_400_000

    const expiryOnly = await acexHtmlProtectEncodedSnapshot(encoded, {
      expiresAt
    })
    expect(expiryOnly.manifest).toEqual({
      v: 1,
      expiresAt,
      encrypted: false
    })
    expect(expiryOnly.encoded).toEqual(encoded)

    const protectedExport = await acexHtmlProtectEncodedSnapshot(encoded, {
      expiresAt,
      password: 'secret'
    })
    expect(protectedExport.manifest?.encrypted).toBe(true)
    expect(protectedExport.manifest?.salt).toBeTruthy()
    expect(protectedExport.encoded.payload).not.toBe(encoded.payload)
  })

  it('does not encrypt when password is omitted, empty, or whitespace', async () => {
    // Regression: optional HTML open password must stay off unless the user
    // sets one. Empty/autofilled whitespace must never produce encrypted:true.
    const { acexHtmlBytesToBase85 } = await import('@mlightcad/cad-html-core')
    const encoded = {
      payload: acexHtmlBytesToBase85(new TextEncoder().encode('plaintext')),
      compression: 'gzip' as const
    }

    for (const password of [undefined, '', '   ', '\t\n'] as const) {
      const result = await acexHtmlProtectEncodedSnapshot(encoded, {
        expiresAt: null,
        password
      })
      expect(result.manifest).toBeUndefined()
      expect(result.encoded).toEqual(encoded)
      expect(result.encoded.payload).toBe(encoded.payload)
    }
  })
})
