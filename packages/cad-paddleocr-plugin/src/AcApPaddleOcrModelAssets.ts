/**
 * Fetches PP-OCR ONNX model archives for the browser SDK.
 *
 * Official Baidu BOS tars are CORS-fragile; when they fail we rebuild an
 * uncompressed ustar from Hugging Face loose files. Results are stored in
 * Cache Storage when available so the large download happens once.
 */

const BOS_BASE =
  'https://paddle-model-ecology.bj.bcebos.com/paddlex/official_inference_model/paddle3.0.0/'
const HF_BASE = 'https://huggingface.co/PaddlePaddle/'
const CACHE_NAME = 'mlightcad-paddleocr-models-v1'

/** Reused blob: URLs so Cache Storage hits do not leak object URLs. */
const blobUrlByModel = new Map<string, string>()

/** Detection / recognition model pair used for exploded CAD text lines. */
export const PADDLE_OCR_DET_MODEL = 'PP-OCRv5_mobile_det'
export const PADDLE_OCR_REC_MODEL = 'PP-OCRv5_mobile_rec'

/**
 * Longest wait for one model CDN request. A hung Baidu BOS / Hugging Face
 * fetch would otherwise block `pdftext` Auto forever before the review panel
 * opens.
 */
export const PADDLE_OCR_FETCH_TIMEOUT_MS = 10_000

export interface AcApPaddleOcrModelAsset {
  url: string
}

/**
 * Resolves blob (or remote) URLs for the det and rec model tars.
 */
export async function acapPaddleOcrResolveModelAssets(
  signal?: AbortSignal
): Promise<{
  detection: AcApPaddleOcrModelAsset
  recognition: AcApPaddleOcrModelAsset
}> {
  const [detection, recognition] = await Promise.all([
    resolveModelTar(PADDLE_OCR_DET_MODEL, signal),
    resolveModelTar(PADDLE_OCR_REC_MODEL, signal)
  ])
  return {
    detection: { url: detection },
    recognition: { url: recognition }
  }
}

async function resolveModelTar(
  modelName: string,
  signal?: AbortSignal
): Promise<string> {
  throwIfAborted(signal)
  const existing = blobUrlByModel.get(modelName)
  if (existing) return existing

  const cacheKey = `/models/${modelName}.tar`
  const cached = await matchCache(cacheKey)
  if (cached) {
    return rememberBlobUrl(modelName, await cached.blob())
  }

  let bytes: Uint8Array | undefined
  for (const query of [
    '?src=mlightcad',
    `?r=${Math.random().toString(36).slice(2)}`
  ]) {
    try {
      bytes = await fetchBytes(
        `${BOS_BASE}${modelName}_onnx_infer.tar${query}`,
        signal
      )
      break
    } catch {
      // Missing CORS header or network error — try again / fall back.
    }
  }

  if (!bytes) {
    const base = `${HF_BASE}${modelName}_onnx/resolve/main/`
    const [onnx, yml] = await Promise.all([
      fetchBytes(`${base}inference.onnx`, signal),
      fetchBytes(`${base}inference.yml`, signal)
    ])
    bytes = buildUstar([
      { name: 'inference.onnx', bytes: onnx },
      { name: 'inference.yml', bytes: yml }
    ])
  }

  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  const blob = new Blob([copy], { type: 'application/x-tar' })
  await putCache(cacheKey, blob)
  return rememberBlobUrl(modelName, blob)
}

function rememberBlobUrl(modelName: string, blob: Blob): string {
  const existing = blobUrlByModel.get(modelName)
  if (existing) return existing
  const url = URL.createObjectURL(blob)
  blobUrlByModel.set(modelName, url)
  return url
}

async function fetchBytes(
  url: string,
  signal?: AbortSignal
): Promise<Uint8Array> {
  const timeout = abortAfter(PADDLE_OCR_FETCH_TIMEOUT_MS, signal)
  try {
    throwIfAborted(timeout.signal)
    const response = await fetch(url, {
      mode: 'cors',
      signal: timeout.signal
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${url}`)
    }
    return new Uint8Array(await response.arrayBuffer())
  } finally {
    timeout.dispose()
  }
}

/**
 * Aborts after `ms`, or sooner when `parent` aborts. `setTimeout` (not
 * `AbortSignal.timeout`) so tests can drive the limit with fake timers.
 */
function abortAfter(
  ms: number,
  parent?: AbortSignal
): { signal: AbortSignal; dispose: () => void } {
  const controller = new AbortController()
  const onParentAbort = () => controller.abort(parent?.reason)
  if (parent?.aborted) onParentAbort()
  else parent?.addEventListener('abort', onParentAbort, { once: true })
  const timer = setTimeout(() => {
    controller.abort(new DOMException('TimeoutError', 'TimeoutError'))
  }, ms)
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer)
      parent?.removeEventListener('abort', onParentAbort)
    }
  }
}

async function matchCache(key: string): Promise<Response | undefined> {
  try {
    if (typeof caches === 'undefined') return undefined
    const cache = await caches.open(CACHE_NAME)
    return (await cache.match(key)) ?? undefined
  } catch {
    return undefined
  }
}

async function putCache(key: string, blob: Blob): Promise<void> {
  try {
    if (typeof caches === 'undefined') return
    const cache = await caches.open(CACHE_NAME)
    await cache.put(key, new Response(blob))
  } catch {
    // Private mode / quota — ignore; next run will re-download.
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw signal.reason instanceof Error
      ? signal.reason
      : new DOMException('Aborted', 'AbortError')
  }
}

interface TarEntry {
  name: string
  bytes: Uint8Array
}

/** Builds an uncompressed ustar archive (what PaddleOCR.js expects). */
export function buildUstar(entries: TarEntry[]): Uint8Array {
  const blocks: Uint8Array[] = []
  for (const entry of entries) {
    blocks.push(ustarHeader(entry.name, entry.bytes.length))
    blocks.push(entry.bytes)
    const pad = (512 - (entry.bytes.length % 512)) % 512
    if (pad > 0) blocks.push(new Uint8Array(pad))
  }
  // Two empty 512-byte blocks end the archive.
  blocks.push(new Uint8Array(1024))
  return concatBytes(blocks)
}

function ustarHeader(name: string, size: number): Uint8Array {
  const header = new Uint8Array(512)
  const write = (offset: number, value: string, length: number) => {
    const encoded = new TextEncoder().encode(value)
    header.set(encoded.subarray(0, length - 1), offset)
  }
  write(0, name, 100)
  write(100, '0000644\0', 8)
  write(108, '0000000\0', 8)
  write(116, '0000000\0', 8)
  write(124, `${size.toString(8).padStart(11, '0')}\0`, 12)
  write(
    136,
    `${Math.floor(Date.now() / 1000)
      .toString(8)
      .padStart(11, '0')}\0`,
    12
  )
  // Checksum field filled with spaces while summing.
  for (let i = 148; i < 156; i++) header[i] = 0x20
  header[156] = '0'.charCodeAt(0)
  write(257, 'ustar\0', 6)
  write(263, '00', 2)
  let sum = 0
  for (let i = 0; i < 512; i++) sum += header[i]
  write(148, `${sum.toString(8).padStart(6, '0')}\0 `, 8)
  return header
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  let total = 0
  for (const part of parts) total += part.length
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}
