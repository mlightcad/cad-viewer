/**
 * Stage-level profiler for DXF open + model-space conversion.
 *
 * Run:
 *   RUN_OPEN_STAGES_BENCH=1 BENCH_DXF="C:\path\to\file.dxf" pnpm test -- \
 *     --testPathPatterns=AcTrOpenStages.bench --no-coverage
 *
 * Skipped unless both env vars are set, so it never runs in CI.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'

import {
  AcDbBlockReference,
  AcDbDatabase,
  AcDbDatabaseConverterManager,
  AcDbFileType,
  AcDbNativeDxfConverter,
  AcDbRenderingCache,
  acdbHostApplicationServices,
  type AcDbProgressdEventArgs
} from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrRenderer } from '../src/renderer/AcTrRenderer'

const DXF_PATH = process.env.BENCH_DXF ?? ''

const runBench = process.env.RUN_OPEN_STAGES_BENCH === '1' && DXF_PATH !== ''

type StageStats = {
  durationMs: number
}

function ensureStage(map: Map<string, StageStats>, name: string): StageStats {
  let stats = map.get(name)
  if (!stats) {
    stats = { durationMs: 0 }
    map.set(name, stats)
  }
  return stats
}

/** Active-stage wall time: first event of A → first event of B. */
function attachActiveStageTimer(stages: Map<string, StageStats>) {
  let active: string | undefined
  let activeStartedAt = 0
  const close = (now: number) => {
    if (active == null) return
    ensureStage(stages, active).durationMs += Math.max(0, now - activeStartedAt)
    active = undefined
  }
  return {
    onProgress(args: AcDbProgressdEventArgs) {
      const name = String(args.subStage ?? args.stage ?? 'UNKNOWN')
      const now = performance.now()
      if (active == null) {
        active = name
        activeStartedAt = now
        return
      }
      if (name !== active) {
        close(now)
        active = name
        activeStartedAt = now
      }
    },
    close
  }
}

function pct(part: number, total: number): string {
  if (total <= 0) return '0%'
  return `${((part / total) * 100).toFixed(1)}%`
}

function pad(s: string, n: number) {
  return s.length >= n ? s : s + ' '.repeat(n - s.length)
}

;(runBench ? describe : describe.skip)('DXF open stage profiler', () => {
  it('profiles PARSE/FONT/ENTITY and model-space worldDraw hotspots', async () => {
    let buffer: Buffer
    try {
      buffer = readFileSync(DXF_PATH)
    } catch {
      console.warn(`[open-profile] DXF not found: ${DXF_PATH}`)
      return
    }

    try {
      AcDbDatabaseConverterManager.instance.register(
        AcDbFileType.DXF,
        new AcDbNativeDxfConverter({ useWorker: false })
      )
    } catch {
      // already registered
    }

    const stages = new Map<string, StageStats>()
    const stageTimer = attachActiveStageTimer(stages)
    const db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db

    db.events.openProgress.addEventListener(args => stageTimer.onProgress(args))

    const tRead0 = performance.now()
    const ab = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer
    await db.read(ab, { fileName: path.basename(DXF_PATH) }, AcDbFileType.DXF)
    const readMs = performance.now() - tRead0
    stageTimer.close(performance.now())

    const cache = AcDbRenderingCache.instance
    cache.clear()
    AcDbRenderingCache.resetProfile()
    AcDbRenderingCache.profiling = true

    const webgl = {
      getSize(target = new THREE.Vector2()) {
        return target.set(1024, 768)
      }
    } as unknown as THREE.WebGLRenderer
    const renderer = new AcTrRenderer(webgl)
    renderer.context.database = db

    const byType = new Map<
      string,
      { count: number; ms: number; errors: number }
    >()
    let insertCount = 0
    let insertMs = 0
    let otherCount = 0
    let otherMs = 0
    let convertErrors = 0

    // Jest has no MText worker; syncDraw logs thousands of errors and skews timing.
    const originalError = console.error
    console.error = () => {}

    const modelSpace = db.tables.blockTable.modelSpace
    const tConvert0 = performance.now()
    try {
      for (const entity of modelSpace.newIterator()) {
        if (!entity.visibility) continue
        const type = entity.type || entity.constructor.name
        const bucket = byType.get(type) ?? { count: 0, ms: 0, errors: 0 }
        const t0 = performance.now()
        try {
          entity.worldDraw(renderer)
        } catch {
          bucket.errors++
          convertErrors++
        }
        const dt = performance.now() - t0
        bucket.count++
        bucket.ms += dt
        byType.set(type, bucket)

        if (entity instanceof AcDbBlockReference) {
          insertCount++
          insertMs += dt
        } else {
          otherCount++
          otherMs += dt
        }
      }
    } finally {
      console.error = originalError
    }
    const convertMs = performance.now() - tConvert0

    AcDbRenderingCache.profiling = false
    const cacheProfile = { ...AcDbRenderingCache.profileStats }

    const totalMs = readMs + convertMs
    const parseMs = stages.get('PARSE')?.durationMs ?? 0
    const fontMs = stages.get('FONT')?.durationMs ?? 0
    const entityFlushMs = stages.get('ENTITY')?.durationMs ?? 0

    console.log('\n========== DXF OPEN STAGE PROFILE ==========')
    console.log(`file: ${DXF_PATH}`)
    console.log(`size: ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB`)
    console.log('')
    console.log('--- Wall clock ---')
    console.log(
      `db.read (PARSE+FONT+ENTITY flush): ${readMs.toFixed(0)} ms  (${pct(readMs, totalMs)})`
    )
    console.log(
      `  PARSE:  ${parseMs.toFixed(0)} ms  (${pct(parseMs, readMs)} of read)`
    )
    console.log(
      `  FONT:   ${fontMs.toFixed(0)} ms  (${pct(fontMs, readMs)} of read)`
    )
    console.log(
      `  ENTITY: ${entityFlushMs.toFixed(0)} ms  (${pct(entityFlushMs, readMs)} of read)`
    )
    console.log(
      `model-space worldDraw:             ${convertMs.toFixed(0)} ms  (${pct(convertMs, totalMs)})`
    )
    console.log(`TOTAL (read + convert):            ${totalMs.toFixed(0)} ms`)
    console.log('')
    console.log('--- Model-space convert breakdown ---')
    console.log(
      `INSERT: ${insertCount} ents, ${insertMs.toFixed(0)} ms (${pct(insertMs, convertMs)})`
    )
    console.log(
      `other:  ${otherCount} ents, ${otherMs.toFixed(0)} ms (${pct(otherMs, convertMs)})`
    )
    console.log(`errors: ${convertErrors}`)
    console.log('')
    const tl = cacheProfile.topLevel
    console.log('--- AcDbRenderingCache (top-level INSERT draws only) ---')
    console.log(
      `hits:   ${tl.hits}, hit path ${tl.hitMs.toFixed(0)} ms (clone ${tl.cloneMs.toFixed(0)} ms)`
    )
    console.log(
      `misses: ${tl.misses}, build ${tl.missBuildMs.toFixed(0)} ms (incl. nested draws), compact ${tl.missCompactMs.toFixed(0)} ms, set/clone ${tl.setCloneMs.toFixed(0)} ms`
    )
    console.log(`applyMatrix+attribs: ${tl.applyMs.toFixed(0)} ms`)
    console.log('')
    console.log(
      `--- AcDbRenderingCache (all depths: hits=${cacheProfile.hits}, misses=${cacheProfile.misses}) ---`
    )
    console.log(
      `all hit ${cacheProfile.hitMs.toFixed(0)} ms (clone ${cacheProfile.cloneMs.toFixed(0)}), build ${cacheProfile.missBuildMs.toFixed(0)}, compact ${cacheProfile.missCompactMs.toFixed(0)}, set ${cacheProfile.setCloneMs.toFixed(0)}, apply ${cacheProfile.applyMs.toFixed(0)}`
    )
    console.log('')
    console.log('--- Slowest block template misses (build+compact) ---')
    const slowBlocks = [...cacheProfile.blockMisses]
      .sort((a, b) => b.buildMs + b.compactMs - (a.buildMs + a.compactMs))
      .slice(0, 12)
    for (const b of slowBlocks) {
      console.log(
        `${pad(b.blockName.slice(0, 40), 40)} build=${b.buildMs.toFixed(0).padStart(7)}ms  compact=${b.compactMs.toFixed(0).padStart(7)}ms  total=${(b.buildMs + b.compactMs).toFixed(0).padStart(7)}ms`
      )
    }
    console.log('')
    console.log('--- Top entity types by total worldDraw time ---')
    const ranked = [...byType.entries()].sort((a, b) => b[1].ms - a[1].ms)
    for (const [type, stats] of ranked.slice(0, 15)) {
      console.log(
        `${pad(type, 22)} count=${String(stats.count).padStart(6)}  total=${stats.ms.toFixed(0).padStart(8)}ms  avg=${(stats.ms / Math.max(stats.count, 1)).toFixed(2).padStart(8)}ms  ${pct(stats.ms, convertMs)}`
      )
    }
    console.log('============================================\n')

    expect(readMs).toBeGreaterThan(0)
    expect(convertMs).toBeGreaterThan(0)
  }, 600_000)
})
