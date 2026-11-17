import type { Page } from '@playwright/test'

/**
 * Hosts `acapPaddleOcrResolveModelAssets` fetches on first recognize.
 * Models are not vendored; Auto `pdftext` would otherwise download ONNX
 * archives and stall the review panel past the e2e wait.
 */
const PADDLE_OCR_MODEL_HOSTS =
  /paddle-model-ecology\.bj\.bcebos\.com|huggingface\.co\/PaddlePaddle/i

/**
 * Fails remote PaddleOCR model downloads immediately so `pdftext` Auto
 * falls through to unread lines instead of waiting on the CDN.
 */
export async function blockPaddleOcrModelDownloads(page: Page): Promise<void> {
  await page.route(PADDLE_OCR_MODEL_HOSTS, route => route.abort())
}
