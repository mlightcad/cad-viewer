// SPDX-License-Identifier: GPL-3.0-or-later
//
// Bundle REAL do viewer (`packages/cad-mobile-viewer/dist`) empacotado no app
// pelo plugin `plugins/withLoopbackViewer.js` como recursos nativos
// `viewer-bundle/` (Android `assets/`, iOS recursos da app), com o
// `MANIFEST.json` (caminho + bytes) gerado no prebuild. Só os ficheiros do
// manifesto existem; a leitura confirma o tamanho (`createManifestBundle`).
// Fino de propósito: exercitado em dispositivo (evidência M4-I6); a lógica está
// em `bundle.ts` (testada em Node). Não está em `index.ts` (nativo).

import { Directory, File, Paths } from 'expo-file-system'

import {
  createManifestBundle,
  MANIFEST_FILE,
  parseBundleManifest,
  VIEWER_BUNDLE_DIR
} from './bundle.ts'
import type { BundleSourcePort } from './types.ts'

/** Lança (`invalid-config`) se o bundle não vier no binário ou o manifesto for inválido. */
export function createExpoViewerBundle(): BundleSourcePort {
  const root = new Directory(Paths.bundle, VIEWER_BUNDLE_DIR)
  const manifest = parseBundleManifest(new File(root, MANIFEST_FILE).textSync())
  return createManifestBundle(manifest, async path => {
    // `path` já validado por `isBundlePath` (sem `..`, sem absolutos)
    return new File(root, ...path.split('/')).bytes()
  })
}
