/**
 * Compares mesh-font program resolve cost: in-memory cache vs network fetch.
 *
 * Usage (from repo root):
 *   node packages/cad-pdf-plugin/scripts/bench-font-resolve.mjs
 *
 * Optional env:
 *   FONT_URL  - font program URL (default: cad-data arial.ttf)
 *   LOOPS     - timed iterations per case (default: 20)
 */
const FONT_URL =
  process.env.FONT_URL ??
  'https://cdn.jsdelivr.net/gh/mlightcad/cad-data/fonts/arial.woff'
const LOOPS = Number(process.env.LOOPS ?? 20)

/** Mirrors IndexedDB / catalog name lookup for bench purposes. */
const byName = new Map()

function hrMs(start) {
  return Number(process.hrtime.bigint() - start) / 1e6
}

async function timeAsync(label, fn, loops = LOOPS) {
  const samples = []
  for (let i = 0; i < loops; i++) {
    const start = process.hrtime.bigint()
    await fn()
    samples.push(hrMs(start))
  }
  samples.sort((a, b) => a - b)
  const sum = samples.reduce((a, b) => a + b, 0)
  return {
    label,
    loops,
    minMs: samples[0],
    medianMs: samples[Math.floor(samples.length / 2)],
    meanMs: sum / samples.length,
    maxMs: samples[samples.length - 1]
  }
}

function formatRow(row) {
  return (
    `${row.label.padEnd(36)} ` +
    `median=${row.medianMs.toFixed(3)}ms  ` +
    `mean=${row.meanMs.toFixed(3)}ms  ` +
    `min=${row.minMs.toFixed(3)}ms  ` +
    `max=${row.maxMs.toFixed(3)}ms`
  )
}

async function main() {
  console.log(`Downloading reference font once:\n  ${FONT_URL}`)
  const downloadStart = process.hrtime.bigint()
  const res = await fetch(FONT_URL, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status} ${FONT_URL}`)
  }
  const buffer = await res.arrayBuffer()
  const downloadMs = hrMs(downloadStart)
  console.log(
    `Downloaded ${(buffer.byteLength / 1024).toFixed(1)} KiB in ${downloadMs.toFixed(1)} ms\n`
  )

  byName.set('arial', buffer)

  const memory = await timeAsync('memory cache hit', async () => {
    const hit = byName.get('arial')
    if (!hit || hit.byteLength !== buffer.byteLength) {
      throw new Error('memory cache miss')
    }
    // Match PDF resolver: expose as Uint8Array view (no copy).
    void new Uint8Array(hit)
  })

  const fetchNoStore = await timeAsync(
    'fetch cache:no-store',
    async () => {
      const r = await fetch(FONT_URL, { cache: 'no-store' })
      if (!r.ok) throw new Error(`fetch failed: ${r.status}`)
      const bytes = await r.arrayBuffer()
      if (bytes.byteLength !== buffer.byteLength) {
        throw new Error('unexpected byte length')
      }
    }
  )

  const fetchDefault = await timeAsync('fetch default cache mode', async () => {
    const r = await fetch(FONT_URL)
    if (!r.ok) throw new Error(`fetch failed: ${r.status}`)
    const bytes = await r.arrayBuffer()
    if (bytes.byteLength !== buffer.byteLength) {
      throw new Error('unexpected byte length')
    }
  })

  console.log(`Loops per case: ${LOOPS}\n`)
  console.log(formatRow(memory))
  console.log(formatRow(fetchDefault))
  console.log(formatRow(fetchNoStore))
  console.log(
    `\nSpeedup vs fetch(no-store): ${(fetchNoStore.medianMs / Math.max(memory.medianMs, 0.0001)).toFixed(0)}x`
  )
  console.log(
    `Speedup vs fetch(default):  ${(fetchDefault.medianMs / Math.max(memory.medianMs, 0.0001)).toFixed(0)}x`
  )
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
