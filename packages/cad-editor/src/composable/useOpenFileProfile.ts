import {
  AcApOpenFileProfiler,
  type AcApOpenFileProfileSnapshot
} from '@mlightcad/cad-simple-viewer'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { store } from '../app'

export type { AcApOpenFileProfileSnapshot }

/** Latest snapshot published by the OPENPERF command (one-shot). */
let pendingSnapshot: AcApOpenFileProfileSnapshot | null | undefined

/**
 * Stores a snapshot for the Open Performance palette to pick up.
 *
 * Pass `null` to show the empty state explicitly.
 */
export function publishOpenFileProfile(
  snapshot: AcApOpenFileProfileSnapshot | null
): void {
  pendingSnapshot = snapshot
}

/**
 * Takes any snapshot published by OPENPERF (one-shot).
 */
export function takePublishedOpenFileProfile():
  | AcApOpenFileProfileSnapshot
  | null
  | undefined {
  const published = pendingSnapshot
  pendingSnapshot = undefined
  return published
}

function formatMs(ms: number): string {
  if (!Number.isFinite(ms)) return '—'
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`
  return `${ms.toFixed(0)} ms`
}

function formatPct(part: number, total: number): string {
  if (total <= 0) return '0%'
  return `${((part / total) * 100).toFixed(1)}%`
}

/**
 * Formats a profile snapshot as plain text suitable for clipboard copy.
 */
export function formatOpenFileProfileText(
  snapshot: AcApOpenFileProfileSnapshot
): string {
  const pct = formatPct
  const progressive = snapshot.progressive
  const lines: string[] = [
    '========== Open Performance ==========',
    `collected at: ${new Date(snapshot.collectedAt).toLocaleString()}`,
    progressive
      ? `progressive:          ${progressive.enabled ? 'on' : 'off'} (mid-open paints=${progressive.paintCount}, yields=${progressive.yieldCount})`
      : undefined,
    `wall clock total:     ${snapshot.totalMs.toFixed(0)} ms`,
    `  db.read:            ${snapshot.readMs.toFixed(0)} ms  (${pct(snapshot.readMs, snapshot.totalMs)})`,
    `    PARSE:            ${snapshot.parseMs.toFixed(0)} ms  (${pct(snapshot.parseMs, snapshot.readMs)} of read)`,
    `    ENTITY flush:     ${snapshot.entityMs.toFixed(0)} ms  (${pct(snapshot.entityMs, snapshot.readMs)} of read)`,
    `  scene convert:      ${snapshot.convertMs.toFixed(0)} ms  (${pct(snapshot.convertMs, snapshot.totalMs)})`,
    '',
    '--- AcDbRenderingCache (top-level INSERT draws) ---',
    `hits:   ${snapshot.cache.topLevel.hits}, hit path ${snapshot.cache.topLevel.hitMs.toFixed(0)} ms (clone ${snapshot.cache.topLevel.cloneMs.toFixed(0)} ms)`,
    `misses: ${snapshot.cache.topLevel.misses}, build ${snapshot.cache.topLevel.missBuildMs.toFixed(0)} ms, compact ${snapshot.cache.topLevel.missCompactMs.toFixed(0)} ms, set/clone ${snapshot.cache.topLevel.setCloneMs.toFixed(0)} ms`,
    `applyMatrix+attribs: ${snapshot.cache.topLevel.applyMs.toFixed(0)} ms`,
    '',
    `--- AcDbRenderingCache (all depths: hits=${snapshot.cache.hits}, misses=${snapshot.cache.misses}) ---`,
    `hit ${snapshot.cache.hitMs.toFixed(0)} ms (clone ${snapshot.cache.cloneMs.toFixed(0)}), build ${snapshot.cache.missBuildMs.toFixed(0)}, compact ${snapshot.cache.missCompactMs.toFixed(0)}, set ${snapshot.cache.setCloneMs.toFixed(0)}, apply ${snapshot.cache.applyMs.toFixed(0)}`
  ].filter((line): line is string => line != null)

  if (snapshot.slowBlocks.length > 0) {
    lines.push('', '--- Slowest block template misses (build+compact) ---')
    for (const block of snapshot.slowBlocks) {
      lines.push(
        `${block.blockName}\tbuild=${block.buildMs.toFixed(0)}ms\tcompact=${block.compactMs.toFixed(0)}ms\ttotal=${(block.buildMs + block.compactMs).toFixed(0)}ms`
      )
    }
  }

  const otherStages = snapshot.stages.filter(
    stage => !['PARSE', 'FONT', 'ENTITY', 'START', 'END'].includes(stage.name)
  )
  if (otherStages.length > 0) {
    lines.push('', '--- Other openProgress sub-stages ---')
    for (const stage of otherStages) {
      lines.push(`  ${stage.name}: ${stage.durationMs.toFixed(0)} ms`)
    }
  }

  lines.push('======================================')
  return lines.join('\n')
}

/**
 * Holds the latest open-file performance snapshot for the Open Performance palette.
 */
export function useOpenFileProfile() {
  const { t } = useI18n()
  const snapshot = ref<AcApOpenFileProfileSnapshot | null>(null)

  const collectedAtLabel = computed(() => {
    if (!snapshot.value) return ''
    return new Date(snapshot.value.collectedAt).toLocaleTimeString()
  })

  const timingRows = computed(() => {
    const s = snapshot.value
    if (!s) return []
    return [
      {
        id: 'total',
        label: t('main.toolPalette.openFileProfile.total'),
        value: formatMs(s.totalMs),
        pct: '100%'
      },
      {
        id: 'read',
        label: t('main.toolPalette.openFileProfile.read'),
        value: formatMs(s.readMs),
        pct: formatPct(s.readMs, s.totalMs)
      },
      {
        id: 'parse',
        label: t('main.toolPalette.openFileProfile.parse'),
        value: formatMs(s.parseMs),
        pct: formatPct(s.parseMs, s.readMs)
      },
      {
        id: 'entity',
        label: t('main.toolPalette.openFileProfile.entity'),
        value: formatMs(s.entityMs),
        pct: formatPct(s.entityMs, s.readMs)
      },
      {
        id: 'convert',
        label: t('main.toolPalette.openFileProfile.convert'),
        value: formatMs(s.convertMs),
        pct: formatPct(s.convertMs, s.totalMs)
      }
    ]
  })

  const cacheRows = computed(() => {
    const s = snapshot.value
    if (!s) return []
    const tl = s.cache.topLevel
    return [
      {
        id: 'tlHits',
        label: t('main.toolPalette.openFileProfile.cacheHits'),
        value: String(tl.hits)
      },
      {
        id: 'tlMisses',
        label: t('main.toolPalette.openFileProfile.cacheMisses'),
        value: String(tl.misses)
      },
      {
        id: 'tlBuild',
        label: t('main.toolPalette.openFileProfile.cacheBuild'),
        value: formatMs(tl.missBuildMs)
      },
      {
        id: 'tlCompact',
        label: t('main.toolPalette.openFileProfile.cacheCompact'),
        value: formatMs(tl.missCompactMs)
      },
      {
        id: 'tlHitPath',
        label: t('main.toolPalette.openFileProfile.cacheHitPath'),
        value: formatMs(tl.hitMs)
      }
    ]
  })

  const progressiveRows = computed(() => {
    const progressive = snapshot.value?.progressive
    if (!progressive) return []
    return [
      {
        id: 'mode',
        label: t('main.toolPalette.openFileProfile.progressiveMode'),
        value: progressive.enabled
          ? t('main.toolPalette.openFileProfile.progressiveOn')
          : t('main.toolPalette.openFileProfile.progressiveOff')
      },
      {
        id: 'paints',
        label: t('main.toolPalette.openFileProfile.midOpenPaints'),
        value: String(progressive.paintCount)
      },
      {
        id: 'yields',
        label: t('main.toolPalette.openFileProfile.yields'),
        value: String(progressive.yieldCount)
      }
    ]
  })

  const slowBlocks = computed(() => snapshot.value?.slowBlocks ?? [])

  const adoptPublishedSnapshot = (): boolean => {
    const published = takePublishedOpenFileProfile()
    if (published === undefined) return false
    snapshot.value = published
    return true
  }

  const refreshFromLast = () => {
    snapshot.value = AcApOpenFileProfiler.getLastSnapshot()
  }

  watch(
    () => store.openFileProfileTick,
    () => {
      if (!adoptPublishedSnapshot()) {
        refreshFromLast()
      }
    }
  )

  const copyText = (): string | null => {
    if (!snapshot.value) return null
    return formatOpenFileProfileText(snapshot.value)
  }

  return {
    snapshot,
    collectedAtLabel,
    timingRows,
    progressiveRows,
    cacheRows,
    slowBlocks,
    adoptPublishedSnapshot,
    refreshFromLast,
    copyText,
    formatMs
  }
}
