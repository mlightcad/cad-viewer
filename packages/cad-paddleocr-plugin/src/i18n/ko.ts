import type { paddleOcrEn } from './en.js'

export const paddleOcrKo = {
  ocrLabel: 'PaddleOCR(로컬)',
  ocrKeywordDisplay: 'PaddleOCR(P)',
  ocrKeywordLocal: 'PaddleOCR',
  ocrKeywordGlobal: 'PaddleOcr'
} satisfies Record<keyof typeof paddleOcrEn, string>
