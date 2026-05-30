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
