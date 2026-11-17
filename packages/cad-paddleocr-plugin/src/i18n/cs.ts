import type { paddleOcrEn } from './en.js'

export const paddleOcrCs = {
  ocrLabel: 'PaddleOCR (místní)',
  ocrKeywordDisplay: 'PaddleOCR(P)',
  ocrKeywordLocal: 'PaddleOCR',
  ocrKeywordGlobal: 'PaddleOcr'
} satisfies Record<keyof typeof paddleOcrEn, string>
