// SPDX-License-Identifier: GPL-3.0-or-later
//
// Superfície do viewer: a única parte da app que hospeda código web. A app não
// interpreta desenhos; só encaminha mensagens (strings JSON) e sinais de crash.
// B1 carrega `about:blank`; o bundle `packages/cad-mobile-viewer` entra em S1/I2.

import {
  type MutableRefObject,
  type ReactElement,
  useEffect,
  useRef
} from 'react'
import { StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'

export const VIEWER_SURFACE_TEST_ID = 'viewer-surface'
/** Origem inicial da superfície em B1 (sem rede, sem bundle). */
export const VIEWER_INITIAL_URI = 'about:blank'

/** `webview.injectJavaScript`, exposto à ponte; lança se a WebView não existir. */
export type InjectFn = (script: string) => void

export interface ViewerSurfaceProps {
  onMessage: (raw: string) => void
  onProcessGone: () => void
  /** Preenchido com a função de injecção enquanto a superfície estiver montada. */
  injectRef: MutableRefObject<InjectFn | null>
}

export function ViewerSurface({
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
      source={{ uri: VIEWER_INITIAL_URI }}
      originWhitelist={['about:*']}
      javaScriptEnabled
      onMessage={e => onMessage(e.nativeEvent.data)}
      onContentProcessDidTerminate={onProcessGone}
      onRenderProcessGone={onProcessGone}
    />
  )
}

const styles = StyleSheet.create({
  surface: { flex: 1, backgroundColor: 'transparent' }
})
