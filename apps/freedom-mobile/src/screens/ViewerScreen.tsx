// SPDX-License-Identifier: GPL-3.0-or-later

import {
  type ReactElement,
  useEffect,
  useReducer,
  useRef,
  useState
} from 'react'
import {
  AppState,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native'

import {
  createExpoAssetStore,
  createExpoPicker
} from '../files/expoFileAdapters'
import { createNativeServer } from '../server/nativeServer'
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
import {
  type ServerFactory,
  startViewerSession,
  type ViewerSession
} from './viewerSession'

export {
  SERVER_FAILED_TEXT,
  SERVER_UNAVAILABLE_TEXT,
  type ServerFactory
} from './viewerSession'

export function ViewerScreen({
  createServer = createNativeServer
}: { createServer?: ServerFactory } = {}): ReactElement {
  const [session, dispatch] = useReducer(sessionReducer, initialSessionState)
  /** Página da sessão (token): só em memória, nunca registada. */
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [serverIssue, setServerIssue] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const injectRef = useRef<InjectFn | null>(null)
  const sessionRef = useRef<ViewerSession | null>(null)
  const { generation } = session.shell

  // Uma sessão por geração: recarregar (ou perder o listener) gera servidor e
  // token novos e recria a WebView; a anterior é desmontada por ordem fixa
  // (ponte → assets → servidor) — `viewerSession.ts`.
  useEffect(() => {
    const live = startViewerSession({
      createServer,
      inject: script => {
        const inject = injectRef.current
        if (!inject) throw new Error('superfície do viewer indisponível')
        inject(script)
      },
      picker: createExpoPicker(),
      store: createExpoAssetStore(),
      appState: AppState,
      dispatch,
      onViewerUrl: setViewerUrl,
      onServerIssue: setServerIssue
    })
    sessionRef.current = live
    return () => {
      sessionRef.current = null
      void live.dispose()
    }
  }, [generation, createServer])

  const onMessage = (raw: string) => {
    sessionRef.current?.receive(raw)
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
  const client = sessionRef.current?.client ?? null
  const canOpen = !choosing && shell.viewer !== 'failed' && !serverIssue
  const hasDocument = shell.viewer === 'ready' && !!session.document.current
  const { findId, activeIndex } = session.find
  // FIND/zoom vão pela ponte; o resultado (ou o erro) volta pelo reducer e é
  // mostrado acima — nada é decidido aqui.
  const find = () => {
    const q = query.trim()
    if (q) client?.find({ query: q, matchCase: false, scope: 'drawing' })
  }
  const step = (dir: 1 | -1) => {
    if (findId === null) return
    if (activeIndex < 0) client?.goto({ findId, index: 0 })
    else if (dir > 0) client?.findNext({ findId })
    else client?.findPrev({ findId })
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Freedom DWG/CAD Viewer</Text>
        <Text style={styles.status} accessibilityLiveRegion="polite">
          {serverIssue ?? describeViewerStatus(shell)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir ficheiro DWG ou DXF"
          disabled={!canOpen}
          onPress={() => void sessionRef.current?.flow?.pickAndOpen()}
          style={[styles.button, !canOpen && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>Abrir</Text>
        </Pressable>
        {hasDocument ? (
          <View style={styles.toolbar}>
            <TextInput
              accessibilityLabel="Texto a procurar"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={find}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              placeholder="Procurar texto"
              style={styles.input}
            />
            <ToolButton label="Procurar" onPress={find} />
            <ToolButton
              label="Resultado anterior"
              text="‹"
              disabled={findId === null}
              onPress={() => step(-1)}
            />
            <ToolButton
              label="Resultado seguinte"
              text="›"
              disabled={findId === null}
              onPress={() => step(1)}
            />
            <ToolButton
              label="Aproximar"
              text="+"
              onPress={() => client?.zoom({ op: 'in' })}
            />
            <ToolButton
              label="Afastar"
              text="−"
              onPress={() => client?.zoom({ op: 'out' })}
            />
            <ToolButton
              label="Ajustar ao desenho"
              text="Ajustar"
              onPress={() => client?.zoom({ op: 'extents' })}
            />
          </View>
        ) : null}
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
        onProcessGone={() => sessionRef.current?.processGone()}
      />
    </View>
  )
}

function ToolButton({
  label,
  text = label,
  disabled = false,
  onPress
}: {
  label: string
  text?: string
  disabled?: boolean
  onPress: () => void
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.tool, disabled && styles.buttonDisabled]}
    >
      <Text style={styles.buttonText}>{text}</Text>
    </Pressable>
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
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    flexGrow: 1,
    minWidth: 140,
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#888888',
    borderRadius: 8,
    fontSize: 16
  },
  tool: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1a56db'
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#ffffff', fontSize: 16 }
})
