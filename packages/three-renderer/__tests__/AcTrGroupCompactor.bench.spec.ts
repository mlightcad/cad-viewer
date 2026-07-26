/**
 * Block-template compaction bench against a real drawing.
 *
 * Run:
 *   RUN_BLOCK_CACHE_BENCH=1 BENCH_DXF="C:\path\to\file.dxf" pnpm test -- \
 *     --testPathPatterns=AcTrGroupCompactor.bench --no-coverage
 *
 * Skipped unless both env vars are set, so it never runs in CI.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'

import {
  AcCmColor,
  AcDbDatabase,
  AcDbDatabaseConverterManager,
  AcDbFileType,
  AcDbNativeDxfConverter,
  AcDbRenderingCache,
  AcDbBlockTableRecord,
  AcGeMatrix3d,
  acdbHostApplicationServices
} from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrGroup } from '../src/object/AcTrGroup'
import { AcTrRenderer } from '../src/renderer/AcTrRenderer'

const DXF_PATH = process.env.BENCH_DXF ?? ''

const runBench = process.env.RUN_BLOCK_CACHE_BENCH === '1' && DXF_PATH !== ''

;(runBench ? describe : describe.skip)('AcTrGroupCompactor DXF bench', () => {
  it('compacts large blocks from the sample floor-plan DXF', async () => {
    let buffer: Buffer
    try {
      buffer = readFileSync(DXF_PATH)
    } catch {
      console.warn(`Skipping bench; DXF not found: ${DXF_PATH}`)
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

    const t0 = performance.now()
    const db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db
    const ab = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer
    await db.read(ab, { fileName: path.basename(DXF_PATH) }, AcDbFileType.DXF)
    console.log(
      `\n[bench] database open: ${(performance.now() - t0).toFixed(0)} ms`
    )

    const webgl = {
      getSize(target = new THREE.Vector2()) {
        return target.set(1024, 768)
      }
    } as unknown as THREE.WebGLRenderer
    const renderer = new AcTrRenderer(webgl)
    renderer.context.database = db

    const blocks: Array<{ block: AcDbBlockTableRecord; count: number }> = []
    for (const block of db.tables.blockTable.newIterator()) {
      if (
        AcDbBlockTableRecord.isModelSapceName(block.name) ||
        AcDbBlockTableRecord.isPaperSapceName(block.name)
      ) {
        continue
      }
      let count = 0
      for (const entity of block.newIterator()) {
        if (entity.visibility) count++
      }
      if (count > 0) blocks.push({ block, count })
    }
    blocks.sort((a, b) => b.count - a.count)
    console.log(`[bench] non-layout blocks: ${blocks.length}`)
    for (const entry of blocks.slice(0, 8)) {
      console.log(`[bench]   ${entry.block.name}: ${entry.count} entities`)
    }

    // Prefer mid-size blocks so the bench finishes in reasonable time while
    // still exercising compaction on real floor-plan content.
    const sample = blocks
      .filter(b => b.count >= 80 && b.count <= 800)
      .slice(0, 5)
    expect(sample.length).toBeGreaterThan(0)

    let totalBefore = 0
    let totalAfter = 0
    let measured = 0
    const cache = new AcDbRenderingCache()
    const color = new AcCmColor().setForeground()

    for (const { block, count } of sample) {
      const entities: AcTrEntity[] = []
      for (const entity of block.newIterator()) {
        if (!entity.visibility) continue
        try {
          const drawn = entity.worldDraw(renderer)
          if (drawn instanceof AcTrEntity) {
            drawn.objectId = entity.objectId
            drawn.ownerId = entity.ownerId
            drawn.layerName = entity.layer
            entities.push(drawn)
          }
        } catch {
          // ignore entities that need unavailable browser APIs
        }
      }
      if (entities.length < 2) continue

      const group = renderer.group(entities)
      const before = group.children.length
      const tCompact0 = performance.now()
      group.compactForInstancing()
      const compactMs = performance.now() - tCompact0
      const after = group.children.length
      const drawableAfter = group.children.filter(
        child => !(child instanceof AcTrEntity)
      ).length

      const iterations = 3
      const tClone0 = performance.now()
      for (let i = 0; i < iterations; i++) {
        const cloned = group.fastDeepClone() as AcTrGroup
        cloned.applyMatrix(new AcGeMatrix3d().makeTranslation(i, 0, 0))
      }
      const cloneMs = (performance.now() - tClone0) / iterations

      totalBefore += before
      totalAfter += after
      measured++
      console.log(
        `[bench] ${block.name}: entities=${count}, drawn=${entities.length}, children ${before}->${after} (drawables=${drawableAfter}), compact=${compactMs.toFixed(1)}ms, clone=${cloneMs.toFixed(1)}ms, compacted=${group.isCompacted}`
      )

      cache.clear()
      const tMiss0 = performance.now()
      cache.draw(renderer, block, color, [], true)
      const missMs = performance.now() - tMiss0
      const tHit0 = performance.now()
      for (let i = 0; i < iterations; i++) {
        cache.draw(
          renderer,
          block,
          color,
          [],
          true,
          new AcGeMatrix3d().makeTranslation(i * 100, 0, 0)
        )
      }
      const hitMs = (performance.now() - tHit0) / iterations
      console.log(
        `[bench]   cache miss=${missMs.toFixed(1)}ms, hit=${hitMs.toFixed(1)}ms`
      )

      expect(after).toBeLessThanOrEqual(before)
    }

    expect(measured).toBeGreaterThan(0)
    console.log(
      `[bench] summary children ${totalBefore} -> ${totalAfter} (${(
        (1 - totalAfter / Math.max(totalBefore, 1)) *
        100
      ).toFixed(1)}% fewer)`
    )
    expect(totalAfter).toBeLessThanOrEqual(totalBefore)

    cache.clear()
    const tPre0 = performance.now()
    await cache.prebuildAll(renderer, db.tables.blockTable.newIterator())
    console.log(
      `[bench] prebuildAll: ${(performance.now() - tPre0).toFixed(0)} ms`
    )
  }, 300_000)
})
