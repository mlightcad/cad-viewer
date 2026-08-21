import { AcApDiffViewer } from '@mlightcad/cad-diff-viewer'
import {
  AcApI18n,
  type AcApLocale,
  LIBREDWG_PARSER_WORKER_FILE,
  MTEXT_RENDERER_WORKER_FILE
} from '@mlightcad/cad-simple-viewer'

import { registerLibreDwgConverter } from './registerLibreDwg'

/** Picks an {@link AcApLocale} from `navigator.language`. */
function detectLocale(): AcApLocale {
  const lang = navigator.language.toLowerCase()
  if (lang.startsWith('zh')) return 'zh'
  if (lang.startsWith('tr')) return 'tr'
  if (lang.startsWith('cs')) return 'cs'
  return 'en'
}

const locale = detectLocale()
AcApI18n.setCurrentLocale(locale)
document.documentElement.lang = locale

const host = document.getElementById('diff-host')
if (!host) {
  throw new Error('Diff viewer demo markup is missing')
}

const dwgParserUrl = `./workers/${LIBREDWG_PARSER_WORKER_FILE}`
registerLibreDwgConverter(dwgParserUrl)

new AcApDiffViewer({
  container: host,
  baseUrl: 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/',
  webworkerFileUrls: {
    mtextRender: `./workers/${MTEXT_RENDERER_WORKER_FILE}`,
    dwgParser: dwgParserUrl
  }
})
