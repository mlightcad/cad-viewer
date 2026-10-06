/**
 * Post-processing helpers so exported SVG opens cleanly via file:// in browsers.
 */
export class AcSvgExportUtil {
  /**
   * Only in-document fragments and data URLs are safe in a downloaded SVG.
   */
  static isSafeEmbeddedUrl(url: string): boolean {
    const trimmed = url.trim()
    return trimmed.startsWith('data:') || trimmed.startsWith('#')
  }

  /**
   * Removes elements whose href/xlink:href points outside the document.
   * Browsers block these under the file:// origin and may log errors such as
   * "Unsafe attempt to load URL file:///…/drawing.svg".
   */
  static sanitizeExternalReferences(markup: string): string {
    return markup.replace(
      /<(?:image|use)\b[^>]*\s(?:xlink:)?href="(?!data:|#)[^"]*"[^>]*\/?>\s*/gi,
      ''
    )
  }

  /**
   * Drops characters that are illegal in XML 1.0 (and therefore in SVG text /
   * attribute content). CAD text sometimes embeds C0 controls such as STX
   * (U+0002); browsers reject the whole file with
   * "PCDATA invalid Char value …".
   *
   * Removes C0 controls other than TAB/LF/CR, plus U+FFFE / U+FFFF.
   * Uses a regex (not a per-code-point loop) so large exports stay responsive.
   */
  static stripInvalidXmlChars(text: string): string {
    return text.replace(
      // eslint-disable-next-line no-control-regex -- intentional C0 / noncharacter filter
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g,
      ''
    )
  }

  /**
   * Escapes XML special characters and strips illegal control characters so
   * text content is safe inside SVG PCDATA / attributes.
   */
  static escapeXml(text: string): string {
    return AcSvgExportUtil.stripInvalidXmlChars(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  /**
   * Rasterizes an SVG data URL to PNG so nested SVG cannot reference external files.
   */
  static async rasterizeSvgDataUrl(dataUrl: string): Promise<string> {
    if (typeof document === 'undefined') {
      return dataUrl
    }

    return new Promise<string>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const width = Math.max(1, img.naturalWidth || 1)
        const height = Math.max(1, img.naturalHeight || 1)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () =>
        reject(new Error('Failed to rasterize embedded SVG image'))
      img.src = dataUrl
    })
  }
}
