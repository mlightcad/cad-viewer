/** Jest stub for `@paddleocr/paddleocr-js` (resolved from package nest). */
module.exports = {
  PaddleOCR: {
    create: async () => ({
      predict: async () => [],
      dispose: async () => undefined
    })
  }
}
