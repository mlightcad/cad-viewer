// SPDX-License-Identifier: GPL-3.0-or-later
//
// Superfície do viewer: a única parte da app que hospeda código web. A app não
// interpreta desenhos; só encaminha mensagens (strings JSON) e sinais de crash.
// Carrega a página REAL do bundle (`packages/cad-mobile-viewer`) servida pelo
// `LocalAssetServer` em `http://127.0.0.1:<porta>/s/<token>/`. Sem página
// válida NÃO monta a WebView (fail-closed: nada de página em branco nem de outra
// origem); o app mostra o erro. Qualquer outra navegação é bloqueada
// (`navigation.ts`). O `viewerUrl` nunca é registado.

import {
  type MutableRefObject,
  type ReactElement,
  useEffect,
  useRef
} from 'react'
import { StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'

import {
  isAllowedNavigation,
  isViewerUrl,
  SURFACE_ORIGIN_WHITELIST
} from './navigation'

export const VIEWER_SURFACE_TEST_ID = 'viewer-surface'

/** `webview.injectJavaScript`, exposto à ponte; lança se a WebView não existir. */
export type InjectFn = (script: string) => void

export interface ViewerSurfaceProps {
  /** Página do viewer da sessão (contém o token); `null` = ainda/sem servidor. */
  viewerUrl: string | null
  onMessage: (raw: string) => void
  onProcessGone: () => void
  /** Preenchido com a função de injecção enquanto a WebView estiver montada. */
  injectRef: MutableRefObject<InjectFn | null>
}

export function ViewerSurface({
  viewerUrl,
  onMessage,
  onProcessGone,
  injectRef
}: ViewerSurfaceProps): ReactElement {
  const webViewRef = useRef<WebView>(null)
  const page = isViewerUrl(viewerUrl) ? viewerUrl : null

  useEffect(() => {
    if (!page) return
    injectRef.current = script => {
      const view = webViewRef.current
      if (!view) throw new Error('WebView indisponível')
      view.injectJavaScript(script)
    }
    return () => {
      injectRef.current = null
    }
  }, [injectRef, page])

  if (!page) {
    return <View testID={VIEWER_SURFACE_TEST_ID} style={styles.surface} />
  }

  return (
    <WebView
      ref={webViewRef}
      testID={VIEWER_SURFACE_TEST_ID}
      style={styles.surface}
      source={{ uri: page }}
      originWhitelist={[...SURFACE_ORIGIN_WHITELIST]}
      onShouldStartLoadWithRequest={req => isAllowedNavigation(req.url, page)}
      javaScriptEnabled
      allowFileAccess={false}
      allowsLinkPreview={false}
      setSupportMultipleWindows={false}
      incognito
      onMessage={e => onMessage(e.nativeEvent.data)}
      onContentProcessDidTerminate={onProcessGone}
      onRenderProcessGone={onProcessGone}
    />
  )
}

const styles = StyleSheet.create({
  surface: { flex: 1, backgroundColor: 'transparent' }
})
