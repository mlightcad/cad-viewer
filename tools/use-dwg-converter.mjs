#!/usr/bin/env node
/**
 * Switch example apps / CLI from @mlightcad/libredwg-converter (GPL)
 * to the proprietary @mlightcad/dwg-converter (local realdwg-web path).
 * Also repoints the @mlightcad/data-model pnpm override to the local
 * realdwg-web checkout.
 *
 * `@mlightcad/cad-simple-viewer` no longer depends on or registers a DWG
 * converter — hosts (examples, CLI) own that opt-in.
 *
 * Usage (from repo root):
 *   node tools/use-dwg-converter.mjs
 *   pnpm use:dwg-converter
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const toolsDir = dirname(fileURLToPath(import.meta.url))
const rootDir = join(toolsDir, '..')

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

function replacePackageDep(content) {
  if (
    content.includes('"@mlightcad/dwg-converter"') &&
    !content.includes('"@mlightcad/libredwg-converter"')
  ) {
    console.log('  already using @mlightcad/dwg-converter')
    return null
  }

  const next = content.replace(
    /"@mlightcad\/libredwg-converter"\s*:\s*"[^"]*"/,
    `"@mlightcad/dwg-converter": "${DWG_CONVERTER_VERSION}"`
  )

  if (next === content) {
    throw new Error('Expected @mlightcad/libredwg-converter in package.json')
  }
  return next
}

function replaceViteLibreDwg(content) {
  if (
    content.includes('DWG_CONVERTER_PACKAGE') &&
    !content.includes('LIBREDWG_CONVERTER_PACKAGE')
  ) {
    console.log('  already using DWG_CONVERTER_PACKAGE')
    return null
  }

  let next = content
  next = next.replaceAll('LIBREDWG_CONVERTER_PACKAGE', 'DWG_CONVERTER_PACKAGE')
  next = next.replaceAll('LIBREDWG_PARSER_WORKER_FILE', 'DWG_PARSER_WORKER_FILE')
  next = next.replaceAll('LIBREDWG_PARSER_WASM_FILE', 'DWG_PARSER_MAIN_FILE')
  // Proprietary converter may not ship a sibling wasm; drop wasm-only copy blocks
  // left with an empty/mismatched asset — hosts should adjust manually if needed.

  if (next === content) {
    throw new Error('No LIBREDWG_* symbols found in vite.config.ts to replace')
  }
  return next
}

function replaceRegisterModule(content) {
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
    "from '@mlightcad/dwg-converter'"
  )
  next = next.replaceAll('AcDbLibreDwgConverter', 'AcDbDwgConverter')
  next = next.replaceAll('registerLibreDwgConverter', 'registerDwgConverter')
  next = next.replaceAll('LIBREDWG_PARSER_WORKER_FILE', 'DWG_PARSER_WORKER_FILE')
  next = next.replaceAll(
    '`@mlightcad/libredwg-converter`',
    '`@mlightcad/dwg-converter`'
  )

  if (next === content) {
    throw new Error(
      'No AcDbLibreDwgConverter / libredwg-converter found in register module'
    )
  }
  return next
}

const targets = [
  {
    path: join(
      rootDir,
      'packages',
      'cad-diff-viewer-example',
      'package.json'
    ),
    label: 'cad-diff-viewer-example/package.json',
    transform: replacePackageDep
  },
  {
    path: join(
      rootDir,
      'packages',
      'cad-simple-viewer-demo',
      'package.json'
    ),
    label: 'cad-simple-viewer-demo/package.json',
    transform: replacePackageDep
  },
  {
    path: join(rootDir, 'packages', 'cad-editor-demo', 'package.json'),
    label: 'cad-editor-demo/package.json',
    transform: replacePackageDep
  },
  {
    path: join(rootDir, 'packages', 'cad-simple-viewer-cli', 'package.json'),
    label: 'cad-simple-viewer-cli/package.json',
    transform: replacePackageDep
  },
  {
    path: join(rootDir, 'packages', 'cad-mcp-server', 'package.json'),
    label: 'cad-mcp-server/package.json',
    transform: replacePackageDep
  },
  {
    path: join(
      rootDir,
      'packages',
      'cad-diff-viewer-example',
      'vite.config.ts'
    ),
    label: 'cad-diff-viewer-example/vite.config.ts',
    transform: replaceViteLibreDwg
  },
  {
    path: join(
      rootDir,
      'packages',
      'cad-simple-viewer-demo',
      'vite.config.ts'
    ),
    label: 'cad-simple-viewer-demo/vite.config.ts',
    transform: replaceViteLibreDwg
  },
  {
    path: join(rootDir, 'packages', 'cad-editor-demo', 'vite.config.ts'),
    label: 'cad-editor-demo/vite.config.ts',
    transform: replaceViteLibreDwg
  },
  {
    path: join(
      rootDir,
      'packages',
      'cad-simple-viewer-cli',
      'scripts',
      'copy-runner-assets.mjs'
    ),
    label: 'cad-simple-viewer-cli/scripts/copy-runner-assets.mjs',
    transform: replaceViteLibreDwg
  },
  {
    path: join(
      rootDir,
      'packages',
      'cad-mcp-server',
      'scripts',
      'copy-runner-assets.mjs'
    ),
    label: 'cad-mcp-server/scripts/copy-runner-assets.mjs',
    transform: replaceViteLibreDwg
  },
  {
    path: join(
      rootDir,
      'packages',
      'cad-diff-viewer-example',
      'src',
      'registerLibreDwg.ts'
    ),
    label: 'cad-diff-viewer-example/src/registerLibreDwg.ts',
    transform: replaceRegisterModule
  },
  {
    path: join(
      rootDir,
      'packages',
      'cad-simple-viewer-demo',
      'src',
      'registerLibreDwg.ts'
    ),
    label: 'cad-simple-viewer-demo/src/registerLibreDwg.ts',
    transform: replaceRegisterModule
  },
  {
    path: join(
      rootDir,
      'packages',
      'cad-editor-demo',
      'src',
      'registerLibreDwg.ts'
    ),
    label: 'cad-editor-demo/src/registerLibreDwg.ts',
    transform: replaceRegisterModule
  },
  {
    path: join(
      rootDir,
      'packages',
      'cad-diff-viewer-example',
      'src',
      'main.ts'
    ),
    label: 'cad-diff-viewer-example/src/main.ts',
    transform(content) {
      let next = replaceLibreDwgParserWorkerFile(content)
      if (next == null) {
        next = content
      }
      const replaced = next.replaceAll(
        'registerLibreDwgConverter',
        'registerDwgConverter'
      )
      if (replaced === content && next === content) {
        console.log('  already switched')
        return null
      }
      return replaced
    }
  },
  {
    path: join(
      rootDir,
      'packages',
      'cad-simple-viewer-demo',
      'src',
      'main.ts'
    ),
    label: 'cad-simple-viewer-demo/src/main.ts',
    transform(content) {
      let next = replaceLibreDwgParserWorkerFile(content)
      if (next == null) {
        next = content
      }
      const replaced = next.replaceAll(
        'registerLibreDwgConverter',
        'registerDwgConverter'
      )
      if (replaced === content && next === content) {
        console.log('  already switched')
        return null
      }
      return replaced
    }
  },
  {
    path: join(
      rootDir,
      'packages',
      'cad-simple-viewer-demo',
      'src',
      'htmlConverter.ts'
    ),
    label: 'cad-simple-viewer-demo/src/htmlConverter.ts',
    transform(content) {
      let next = replaceLibreDwgParserWorkerFile(content)
      if (next == null) {
        next = content
      }
      const replaced = next.replaceAll(
        'registerLibreDwgConverter',
        'registerDwgConverter'
      )
      if (replaced === content && next === content) {
        console.log('  already switched')
        return null
      }
      return replaced
    }
  },
  {
    path: join(rootDir, 'packages', 'cad-editor-demo', 'src', 'main.ts'),
    label: 'cad-editor-demo/src/main.ts',
    transform(content) {
      let next = replaceLibreDwgParserWorkerFile(content)
      if (next == null) {
        next = content
      }
      const replaced = next.replaceAll(
        'registerLibreDwgConverter',
        'registerDwgConverter'
      )
      if (replaced === content && next === content) {
        console.log('  already switched')
        return null
      }
      return replaced
    }
  },
  {
    path: join(
      rootDir,
      'packages',
      'cad-simple-viewer-cli',
      'runner',
      'main.ts'
    ),
    label: 'cad-simple-viewer-cli/runner/main.ts',
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
        "from '@mlightcad/dwg-converter'"
      )
      next = next.replaceAll('AcDbLibreDwgConverter', 'AcDbDwgConverter')
      next = next.replaceAll(
        'LIBREDWG_PARSER_WORKER_FILE',
        'DWG_PARSER_WORKER_FILE'
      )

      if (next === content) {
        throw new Error('No libredwg references found in CLI runner/main.ts')
      }
      return next
    }
  },
  {
    path: join(rootDir, 'packages', 'cad-mcp-server', 'runner', 'main.ts'),
    label: 'cad-mcp-server/runner/main.ts',
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
        "from '@mlightcad/dwg-converter'"
      )
      next = next.replaceAll('AcDbLibreDwgConverter', 'AcDbDwgConverter')
      next = next.replaceAll(
        'LIBREDWG_PARSER_WORKER_FILE',
        'DWG_PARSER_WORKER_FILE'
      )

      if (next === content) {
        throw new Error('No libredwg references found in MCP runner/main.ts')
      }
      return next
    }
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
  console.log(
    'Switching example/CLI DWG path to @mlightcad/dwg-converter…'
  )

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
