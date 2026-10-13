// SPDX-License-Identifier: GPL-3.0-or-later
//
// Superfície do viewer: a única parte da app que hospeda código web. A app não
// interpreta desenhos; só encaminha mensagens (strings JSON) e sinais de crash.
// B1 carrega `about:blank`; o bundle `packages/cad-mobile-viewer` entra em S1/I2.

import type { ReactElement } from 'react'
import { StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'

export const VIEWER_SURFACE_TEST_ID = 'viewer-surface'
/** Origem inicial da superfície em B1 (sem rede, sem bundle). */
export const VIEWER_INITIAL_URI = 'about:blank'

export interface ViewerSurfaceProps {
  onMessage: (raw: string) => void
  onProcessGone: () => void
}

export function ViewerSurface({
  onMessage,
  onProcessGone
}: ViewerSurfaceProps): ReactElement {
  return (
    <WebView
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
