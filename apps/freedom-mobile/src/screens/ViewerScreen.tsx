// SPDX-License-Identifier: GPL-3.0-or-later

import { type ReactElement, useEffect, useReducer } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import {
  describeViewerStatus,
  initialShellState,
  READY_TIMEOUT_MS,
  shellReducer
} from '../shell/shellState'
import { ViewerSurface } from '../viewer/ViewerSurface'

export function ViewerScreen(): ReactElement {
  const [state, dispatch] = useReducer(shellReducer, initialShellState)

  // `ready` tem de chegar a tempo; recriar a superfície (generation) rearma o timer.
  useEffect(() => {
    const t = setTimeout(
      () => dispatch({ type: 'ready-timeout' }),
      READY_TIMEOUT_MS
    )
    return () => clearTimeout(t)
  }, [state.generation])

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Freedom DWG/CAD Viewer</Text>
        <Text style={styles.status} accessibilityLiveRegion="polite">
          {describeViewerStatus(state)}
        </Text>
        {state.viewer === 'failed' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => dispatch({ type: 'reload' })}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Recarregar</Text>
          </Pressable>
        ) : null}
      </View>
      <ViewerSurface
        key={state.generation}
        onMessage={raw => dispatch({ type: 'viewer-message', raw })}
        onProcessGone={() => dispatch({ type: 'process-gone' })}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  header: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  title: { fontSize: 18, fontWeight: '600' },
  status: { fontSize: 14, color: '#444444' },
  button: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1a56db'
  },
  buttonText: { color: '#ffffff', fontSize: 16 }
})
