// SPDX-License-Identifier: GPL-3.0-or-later

import { type ReactElement, useEffect, useReducer, useRef } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { BridgeClient } from '../bridge/BridgeClient'
import {
  createExpoAssetStore,
  createExpoPicker
} from '../files/expoFileAdapters'
import { FileFlow } from '../files/fileFlow'
import { NO_LOCAL_SERVER } from '../files/ports'
import { describeViewerStatus } from '../shell/shellState'
import {
  describeDocument,
  describeFiles,
  describeFind,
  describeIssue,
  describeSelection,
  describeZoom
} from '../state/describe'
import { initialSessionState, sessionReducer } from '../state/session'
import { type InjectFn, ViewerSurface } from '../viewer/ViewerSurface'

export function ViewerScreen(): ReactElement {
  const [session, dispatch] = useReducer(sessionReducer, initialSessionState)
  const injectRef = useRef<InjectFn | null>(null)
  const clientRef = useRef<BridgeClient | null>(null)
  const flowRef = useRef<FileFlow | null>(null)
  const { generation } = session.shell

  // Um cliente por superfície: recarregar (generation) recria-o e rearma o
  // timeout de `ready`, que passa a viver no cliente.
  useEffect(() => {
    // O fluxo de ficheiros vive e morre com a ponte: os assets copiados
    // pertencem a esta superfície e são apagados quando ela é recriada.
    let flow: FileFlow | null = null
    const client = new BridgeClient({
      inject: script => {
        const inject = injectRef.current
        if (!inject) throw new Error('superfície do viewer indisponível')
        inject(script)
      },
      onEvent: event => {
        dispatch(event)
        flow?.handle(event)
      }
    })
    flow = new FileFlow({
      picker: createExpoPicker(),
      store: createExpoAssetStore(),
      urls: NO_LOCAL_SERVER,
      bridge: client,
      onEvent: dispatch
    })
    clientRef.current = client
    flowRef.current = flow
    void flow.startup()
    return () => {
      client.dispose()
      void flow?.dispose()
      clientRef.current = null
      flowRef.current = null
    }
  }, [generation])

  const onMessage = (raw: string) => {
    const client = clientRef.current
    if (client) client.receive(raw)
    // Sem cliente a mensagem não pode ser tratada: dizê-lo, nunca engolir.
    else {
      dispatch({
        kind: 'protocol-error',
        code: 'invalid-envelope',
        message: 'mensagem do viewer recebida sem ponte activa'
      })
    }
  }

  const { shell } = session
  const filesText = describeFiles(session.files)
  const documentText = describeDocument(session.document)
  const choosing =
    session.files.phase === 'picking' || session.files.phase === 'staging'
  const findText = describeFind(session.find)
  const selectionText = describeSelection(session.selection)
  const zoomText = describeZoom(session.zoom)
  const issueText = describeIssue(session.issue)

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Freedom DWG/CAD Viewer</Text>
        <Text style={styles.status} accessibilityLiveRegion="polite">
          {describeViewerStatus(shell)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir ficheiro DWG ou DXF"
          disabled={choosing || shell.viewer === 'failed'}
          onPress={() => void flowRef.current?.pickAndOpen()}
          style={[
            styles.button,
            (choosing || shell.viewer === 'failed') && styles.buttonDisabled
          ]}
        >
          <Text style={styles.buttonText}>Abrir</Text>
        </Pressable>
        {filesText ? (
          <Text
            style={session.files.error ? styles.issue : styles.status}
            accessibilityLiveRegion="polite"
          >
            {filesText}
          </Text>
        ) : null}
        {documentText ? (
          <Text style={styles.status} accessibilityLiveRegion="polite">
            {documentText}
          </Text>
        ) : null}
        {findText ? (
          <Text style={styles.status} accessibilityLiveRegion="polite">
            {findText}
          </Text>
        ) : null}
        {selectionText ? (
          <Text style={styles.status} accessibilityLiveRegion="polite">
            {selectionText}
          </Text>
        ) : null}
        {zoomText ? (
          <Text style={styles.issue} accessibilityLiveRegion="polite">
            {zoomText}
          </Text>
        ) : null}
        {issueText ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dispensar aviso"
            onPress={() => dispatch({ kind: 'issue-dismissed' })}
          >
            <Text style={styles.issue}>{issueText}</Text>
          </Pressable>
        ) : null}
        {shell.viewer === 'failed' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => dispatch({ kind: 'reload' })}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Recarregar</Text>
          </Pressable>
        ) : null}
      </View>
      <ViewerSurface
        key={generation}
        injectRef={injectRef}
        onMessage={onMessage}
        onProcessGone={() => clientRef.current?.processGone()}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  header: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  title: { fontSize: 18, fontWeight: '600' },
  status: { fontSize: 14, color: '#444444' },
  issue: { fontSize: 14, color: '#b42318' },
  button: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1a56db'
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#ffffff', fontSize: 16 }
})
