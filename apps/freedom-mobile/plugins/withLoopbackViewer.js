// SPDX-License-Identifier: GPL-3.0-or-later
//
// Plugin Expo do viewer loopback (spec M3-I5 §8 itens 2 e 5; card M4-I6):
//
// 1. Cleartext SÓ para 127.0.0.1. Android: `networkSecurityConfig` com
//    `base-config cleartextTrafficPermitted="false"` e um único
//    `domain-config` para `127.0.0.1` (nunca `usesCleartextTraffic` global; o
//    atributo é removido). Builds debug recebem um ficheiro próprio em
//    `src/debug/res/xml` que acrescenta `localhost`/`10.0.2.2` para o Metro —
//    o release nunca o vê. iOS: ATS `NSAllowsArbitraryLoads=false` e
//    `NSAllowsLocalNetworking=true`.
// 2. Bundle REAL do viewer (`packages/cad-mobile-viewer/dist`) copiado para os
//    recursos nativos `viewer-bundle/` com `MANIFEST.json` (caminho + bytes),
//    que `src/server/viewerBundle.ts` lê. Sem bundle o prebuild FALHA (nunca
//    se gera um app com o viewer em falta).
//
// Puro e testável (`src/contract/loopbackPlugin.node-test.ts`).

// Plugin Expo = CommonJS (o `app.json` carrega-o com `require`): o ESLint da
// raiz assume módulos ES e globais de browser.
/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const fs = require('node:fs')
const path = require('node:path')

const {
  AndroidConfig,
  IOSConfig,
  withAndroidManifest,
  withDangerousMod,
  withInfoPlist,
  withXcodeProject
} = require('expo/config-plugins')

const BUNDLE_DIR = 'viewer-bundle'
const MANIFEST_FILE = 'MANIFEST.json'
const NSC_NAME = 'network_security_config'
const LOOPBACK = '127.0.0.1'
/** Só no build debug (Metro); nunca no release. */
const DEBUG_HOSTS = ['localhost', '10.0.2.2']

function networkSecurityXml(extraHosts = []) {
  const domains = [LOOPBACK, ...extraHosts]
    .map(h => `    <domain includeSubdomains="false">${h}</domain>`)
    .join('\n')
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!-- Gerado por plugins/withLoopbackViewer.js: HTTP em claro só para o servidor loopback do viewer. -->',
    '<network-security-config>',
    '  <base-config cleartextTrafficPermitted="false" />',
    '  <domain-config cleartextTrafficPermitted="true">',
    domains,
    '  </domain-config>',
    '</network-security-config>',
    ''
  ].join('\n')
}

/** Lista recursiva (caminhos com `/`, ordenados) e tamanhos do bundle. */
function bundleManifest(dir) {
  const files = []
  const walk = rel => {
    for (const entry of fs.readdirSync(path.join(dir, rel)).sort()) {
      const relPath = rel ? `${rel}/${entry}` : entry
      const stat = fs.statSync(path.join(dir, relPath))
      if (stat.isDirectory()) walk(relPath)
      else files.push({ path: relPath, bytes: stat.size })
    }
  }
  walk('')
  return { files }
}

function resolveBundle(projectRoot, bundleDir) {
  const dir = path.resolve(projectRoot, bundleDir)
  if (!fs.existsSync(path.join(dir, 'index.html'))) {
    throw new Error(
      `withLoopbackViewer: bundle do viewer em falta (${bundleDir}/index.html). ` +
        'Construa-o: pnpm exec vite build -c packages/cad-mobile-viewer/vite.config.ts'
    )
  }
  return dir
}

/** Copia o bundle e escreve o manifesto em `target/viewer-bundle`. */
function copyBundle(source, target) {
  const out = path.join(target, BUNDLE_DIR)
  fs.rmSync(out, { recursive: true, force: true })
  fs.mkdirSync(out, { recursive: true })
  const manifest = bundleManifest(source)
  for (const file of manifest.files) {
    const dest = path.join(out, file.path)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(path.join(source, file.path), dest)
  }
  fs.writeFileSync(
    path.join(out, MANIFEST_FILE),
    JSON.stringify(manifest, null, 2) + '\n'
  )
  return manifest
}

function withAndroidLoopback(config) {
  config = withAndroidManifest(config, c => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults)
    app.$['android:networkSecurityConfig'] = `@xml/${NSC_NAME}`
    delete app.$['android:usesCleartextTraffic']
    return c
  })
  return withDangerousMod(config, [
    'android',
    c => {
      const main = path.join(c.modRequest.platformProjectRoot, 'app/src/main')
      const debug = path.join(c.modRequest.platformProjectRoot, 'app/src/debug')
      fs.mkdirSync(path.join(main, 'res/xml'), { recursive: true })
      fs.writeFileSync(
        path.join(main, 'res/xml', `${NSC_NAME}.xml`),
        networkSecurityXml()
      )
      fs.mkdirSync(path.join(debug, 'res/xml'), { recursive: true })
      fs.writeFileSync(
        path.join(debug, 'res/xml', `${NSC_NAME}.xml`),
        networkSecurityXml(DEBUG_HOSTS)
      )
      return c
    }
  ])
}

function withAndroidBundle(config, bundleDir) {
  return withDangerousMod(config, [
    'android',
    c => {
      const source = resolveBundle(c.modRequest.projectRoot, bundleDir)
      copyBundle(
        source,
        path.join(c.modRequest.platformProjectRoot, 'app/src/main/assets')
      )
      return c
    }
  ])
}

function withIosLoopback(config) {
  return withInfoPlist(config, c => {
    c.modResults.NSAppTransportSecurity = {
      NSAllowsArbitraryLoads: false,
      NSAllowsLocalNetworking: true
    }
    return c
  })
}

function withIosBundle(config, bundleDir) {
  config = withDangerousMod(config, [
    'ios',
    c => {
      const source = resolveBundle(c.modRequest.projectRoot, bundleDir)
      const name = IOSConfig.XcodeUtils.getProjectName(c.modRequest.projectRoot)
      copyBundle(source, path.join(c.modRequest.platformProjectRoot, name))
      return c
    }
  ])
  // referência de pasta (azul): preserva `assets/…` dentro do .app
  return withXcodeProject(config, c => {
    const project = c.modResults
    const name = IOSConfig.XcodeUtils.getProjectName(c.modRequest.projectRoot)
    IOSConfig.XcodeUtils.addResourceFileToGroup({
      filepath: `${name}/${BUNDLE_DIR}`,
      groupName: name,
      isBuildFile: true,
      project,
      verbose: false
    })
    const refs = project.pbxFileReferenceSection()
    for (const key of Object.keys(refs)) {
      const ref = refs[key]
      if (
        ref &&
        typeof ref === 'object' &&
        String(ref.path).replace(/"/g, '').endsWith(`/${BUNDLE_DIR}`)
      ) {
        ref.lastKnownFileType = 'folder'
        // o pbxFile do `xcode` deixa estes campos sem valor numa pasta
        for (const field of ['fileEncoding', 'explicitFileType']) {
          if (ref[field] === undefined) delete ref[field]
        }
      }
    }
    return c
  })
}

/** @param {{ bundleDir?: string }} [options] */
function withLoopbackViewer(config, options = {}) {
  const bundleDir = options.bundleDir ?? '../../packages/cad-mobile-viewer/dist'
  config = withAndroidLoopback(config)
  config = withAndroidBundle(config, bundleDir)
  config = withIosLoopback(config)
  config = withIosBundle(config, bundleDir)
  return config
}

module.exports = withLoopbackViewer
module.exports.networkSecurityXml = networkSecurityXml
module.exports.bundleManifest = bundleManifest
module.exports.copyBundle = copyBundle
module.exports.DEBUG_HOSTS = DEBUG_HOSTS
