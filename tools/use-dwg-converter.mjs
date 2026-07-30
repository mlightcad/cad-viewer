#!/usr/bin/env node
/**
 * Switch cad-simple-viewer from @mlightcad/libredwg-converter (GPL)
 * to the proprietary @mlight-cad/dwg-converter (local realdwg-web path).
 * Also repoints the @mlightcad/data-model pnpm override to the local
 * realdwg-web checkout.
 *
 * Usage (from repo root or package):
 *   node tools/use-dwg-converter.mjs
 *   pnpm --filter @mlightcad/cad-simple-viewer use:dwg-converter
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const toolsDir = dirname(fileURLToPath(import.meta.url))
const rootDir = join(toolsDir, '..')
const pkgDir = join(rootDir, 'packages', 'cad-simple-viewer')

const DWG_CONVERTER_VERSION =
  '../../../realdwg-web/packages/dwg-converter'

const DATA_MODEL_VERSION = '../../../realdwg-web/packages/data-model'

function replaceLibreDwgParserWorkerFile(content) {
  if (
    content.includes('DWG_PARSER_WORKER_FILE') &&
    !content.includes('LIBREDWG_PARSER_WORKER_FILE')
  ) {
    console.log('  already using DWG_PARSER_WORKER_FILE')
    return null
  }

  const next = content.replaceAll(
    'LIBREDWG_PARSER_WORKER_FILE',
    'DWG_PARSER_WORKER_FILE'
  )

  if (next === content) {
    throw new Error('No LIBREDWG_PARSER_WORKER_FILE found to replace')
  }
  return next
}

const targets = [
  {
    path: join(pkgDir, 'package.json'),
    label: 'package.json',
    transform(content) {
      if (
        content.includes('"@mlight-cad/dwg-converter"') &&
        !content.includes('"@mlightcad/libredwg-converter"')
      ) {
        console.log('  already using @mlight-cad/dwg-converter')
        return null
      }

      const next = content.replace(
        /"@mlightcad\/libredwg-converter"\s*:\s*"[^"]*"/,
        `"@mlight-cad/dwg-converter": "${DWG_CONVERTER_VERSION}"`
      )

      if (next === content) {
        throw new Error(
          'Expected @mlightcad/libredwg-converter in package.json'
        )
      }
      return next
    }
  },
  {
    path: join(pkgDir, 'vite.config.ts'),
    label: 'vite.config.ts',
    transform(content) {
      if (
        content.includes('DWG_CONVERTER_PACKAGE') &&
        !content.includes('LIBREDWG_CONVERTER_PACKAGE')
      ) {
        console.log('  already using DWG_CONVERTER_PACKAGE')
        return null
      }

      let next = content
      next = next.replaceAll(
        'LIBREDWG_CONVERTER_PACKAGE',
        'DWG_CONVERTER_PACKAGE'
      )
      next = next.replaceAll(
        'LIBREDWG_PARSER_WORKER_FILE',
        'DWG_PARSER_WORKER_FILE'
      )

      if (next === content) {
        throw new Error(
          'No LIBREDWG_* symbols found in vite.config.ts to replace'
        )
      }
      return next
    }
  },
  {
    path: join(pkgDir, 'src', 'app', 'AcApDocManager.ts'),
    label: 'AcApDocManager.ts',
    transform(content) {
      if (
        content.includes('AcDbDwgConverter') &&
        !content.includes('AcDbLibreDwgConverter')
      ) {
        console.log('  already using AcDbDwgConverter')
        return null
      }

      let next = content
      next = next.replaceAll(
        "from '@mlightcad/libredwg-converter'",
        "from '@mlight-cad/dwg-converter'"
      )
      next = next.replaceAll('AcDbLibreDwgConverter', 'AcDbDwgConverter')
      next = next.replaceAll(
        '`@mlightcad/libredwg-converter`',
        '`@mlight-cad/dwg-converter`'
      )

      if (next === content) {
        throw new Error(
          'No AcDbLibreDwgConverter / libredwg-converter found in AcApDocManager.ts'
        )
      }
      return next
    }
  },
  {
    path: join(pkgDir, 'src', 'app', 'AcApWebworkerReadiness.ts'),
    label: 'AcApWebworkerReadiness.ts',
    transform: replaceLibreDwgParserWorkerFile
  },
  {
    path: join(pkgDir, '__tests__', 'AcApWebworkerReadiness.spec.ts'),
    label: 'AcApWebworkerReadiness.spec.ts',
    transform: replaceLibreDwgParserWorkerFile
  },
  {
    path: join(
      rootDir,
      'packages',
      'cad-simple-viewer-example',
      'src',
      'main.ts'
    ),
    label: 'cad-simple-viewer-example/src/main.ts',
    transform: replaceLibreDwgParserWorkerFile
  },
  {
    path: join(rootDir, 'pnpm-workspace.yaml'),
    label: 'pnpm-workspace.yaml',
    transform(content) {
      if (content.includes(`'@mlightcad/data-model': '${DATA_MODEL_VERSION}'`)) {
        console.log('  already using local @mlightcad/data-model override')
        return null
      }

      const next = content.replace(
        /(['"]?@mlightcad\/data-model['"]?\s*:\s*)(['"]).*?\2/,
        `$1'${DATA_MODEL_VERSION}'`
      )

      if (next === content) {
        throw new Error(
          'No @mlightcad/data-model override found in pnpm-workspace.yaml'
        )
      }
      return next
    }
  }
]

function main() {
  console.log('Switching cad-simple-viewer to @mlight-cad/dwg-converter…')

  let changed = 0
  for (const target of targets) {
    console.log(`\n→ ${target.label}`)
    const original = readFileSync(target.path, 'utf8')
    const updated = target.transform(original)
    if (updated == null) {
      continue
    }
    writeFileSync(target.path, updated, 'utf8')
    console.log(`  updated ${target.path}`)
    changed++
  }

  console.log(
    changed === 0
      ? '\nNothing to change (already switched).'
      : `\nDone. Updated ${changed} file(s). Run pnpm install if package.json changed.`
  )
}

main()
