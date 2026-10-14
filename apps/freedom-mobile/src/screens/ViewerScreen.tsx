// SPDX-License-Identifier: GPL-3.0-or-later

import {
  type ReactElement,
  useEffect,
  useReducer,
  useRef,
  useState
} from 'react'
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native'

import { BridgeClient } from '../bridge/BridgeClient'
import {
  createExpoAssetStore,
  createExpoPicker
} from '../files/expoFileAdapters'
import { FileFlow } from '../files/fileFlow'
import { NO_LOCAL_SERVER } from '../files/ports'
import type { LocalAssetServer } from '../server/localAssetServer'
import type { ServerEvent } from '../server/types'
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

/**
 * Fábrica do servidor loopback da sessão (spec M3-I5 §8 itens 1 e 4). Recebe o
 * observador de eventos do servidor. `null` = este build não tem listener
 * nativo: a superfície fica em `about:blank` e o erro é VISÍVEL (sem queda
 * silenciosa para outra origem).
 */
export type ServerFactory = (
  onEvent: (event: ServerEvent) => void
) => LocalAssetServer | null

/** Build actual: nenhum listener nativo ligado (bloqueio documentado no I6). */
export const NO_NATIVE_LISTENER: ServerFactory = () => null

export const SERVER_UNAVAILABLE_TEXT =
  'Servidor local indisponível neste build: o viewer não pode arrancar.'
export const SERVER_FAILED_TEXT =
  'Falha ao arrancar o servidor local do viewer. Tente recarregar.'

export function ViewerScreen({
  createServer = NO_NATIVE_LISTENER
}: { createServer?: ServerFactory } = {}): ReactElement {
  const [session, dispatch] = useReducer(sessionReducer, initialSessionState)
  /** Página da sessão (token): só em memória, nunca registada. */
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [serverIssue, setServerIssue] = useState<string | null>(null)
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
    let disposed = false
    // Servidor por geração: recarregar (ou perder o listener) gera token novo
    // e recria a WebView com o URL novo; o anterior morre já (revogação).
    const server = createServer(event => {
      if (event.kind === 'listener-lost' && !disposed) {
        setViewerUrl(null)
        dispatch({ kind: 'reload' })
      }
    })
    setViewerUrl(null)
    setServerIssue(server ? null : SERVER_UNAVAILABLE_TEXT)
    if (server) {
      server.start().then(
        info => {
          if (!disposed) setViewerUrl(info.viewerUrl)
        },
        () => {
          if (!disposed) setServerIssue(SERVER_FAILED_TEXT)
        }
      )
    }
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
      urls: server ?? NO_LOCAL_SERVER,
      bridge: client,
      onEvent: dispatch
    })
    clientRef.current = client
    flowRef.current = flow
    void flow.startup()
    // Ao voltar a primeiro plano com o listener morto (iOS suspende sockets),
    // recarrega: novo servidor, novo token, nova WebView.
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active' && server && server.state === 'stopped') {
        dispatch({ kind: 'reload' })
      }
    })
    return () => {
      disposed = true
      appState.remove()
      client.dispose()
      void flow?.dispose()
      void server?.dispose()
      clientRef.current = null
      flowRef.current = null
    }
  }, [generation, createServer])

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
        {serverIssue ? (
          <Text style={styles.issue} accessibilityLiveRegion="polite">
            {serverIssue}
          </Text>
        ) : null}
        {issueText ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dispensar aviso"
            onPress={() => dispatch({ kind: 'issue-dismissed' })}
            style={styles.target}
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
        viewerUrl={viewerUrl}
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
  target: { minHeight: 44, justifyContent: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#ffffff', fontSize: 16 }
})
