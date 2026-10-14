// SPDX-License-Identifier: GPL-3.0-or-later
//
// Superfície do viewer: a única parte da app que hospeda código web. A app não
// interpreta desenhos; só encaminha mensagens (strings JSON) e sinais de crash.
// Com sessão do `LocalAssetServer` carrega a página do bundle
// (`packages/cad-mobile-viewer`) em `http://127.0.0.1:<porta>/s/<token>/`; sem
// ela fica em `about:blank` (o app mostra o erro de `ready`). Qualquer outra
// navegação é bloqueada (`navigation.ts`). O `viewerUrl` nunca é registado.

import {
  type MutableRefObject,
  type ReactElement,
  useEffect,
  useRef
} from 'react'
import { StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'

import {
  isAllowedNavigation,
  SURFACE_ORIGIN_WHITELIST,
  surfaceUri
} from './navigation'

export const VIEWER_SURFACE_TEST_ID = 'viewer-surface'

/** `webview.injectJavaScript`, exposto à ponte; lança se a WebView não existir. */
export type InjectFn = (script: string) => void

export interface ViewerSurfaceProps {
  /** Página do viewer da sessão (contém o token); `null` = sem servidor. */
  viewerUrl: string | null
  onMessage: (raw: string) => void
  onProcessGone: () => void
  /** Preenchido com a função de injecção enquanto a superfície estiver montada. */
  injectRef: MutableRefObject<InjectFn | null>
}

export function ViewerSurface({
  viewerUrl,
  onMessage,
  onProcessGone,
  injectRef
}: ViewerSurfaceProps): ReactElement {
  const webViewRef = useRef<WebView>(null)

  useEffect(() => {
    injectRef.current = script => {
      const view = webViewRef.current
      if (!view) throw new Error('WebView indisponível')
      view.injectJavaScript(script)
    }
    return () => {
      injectRef.current = null
    }
  }, [injectRef])

  return (
    <WebView
      ref={webViewRef}
      testID={VIEWER_SURFACE_TEST_ID}
      style={styles.surface}
      source={{ uri: surfaceUri(viewerUrl) }}
      originWhitelist={[...SURFACE_ORIGIN_WHITELIST]}
      onShouldStartLoadWithRequest={req =>
        isAllowedNavigation(req.url, viewerUrl)
      }
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
