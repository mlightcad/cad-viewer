/**
 * Ambient typings for `@paddleocr/paddleocr-js`.
 *
 * The published package only exposes types under the `import` export
 * condition, which classic `moduleResolution: "node"` cannot resolve.
 */
declare module '@paddleocr/paddleocr-js' {
  export interface PaddleOcrItem {
    text: string
    score?: number
  }

  export interface PaddleOcrResult {
    items: PaddleOcrItem[]
  }

  export interface PaddleOcrEngine {
    predict(
      image: Blob | Blob[],
      params?: Record<string, unknown>
    ): Promise<PaddleOcrResult[]>
    dispose(): Promise<void> | void
  }

  export const PaddleOCR: {
    create(options: Record<string, unknown>): Promise<PaddleOcrEngine>
  }
}
