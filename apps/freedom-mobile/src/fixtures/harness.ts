// SPDX-License-Identifier: GPL-3.0-or-later
//
// Harness determinístico: `BridgeClient` real + `sessionReducer` real + viewer
// sintético. As respostas do viewer só chegam à app em `flush()`, por isso os
// estados de loading (`searching`, `opening`, `navigating`) são observáveis e
// reproduzíveis; os timers são falsos (`advance(ms)`), sem relógio real.

import {
  BridgeClient,
  type BridgeEvent,
  type Timers
} from '../bridge/BridgeClient.ts'
import {
  initialSessionState,
  type SessionAction,
  sessionReducer,
  type SessionState
} from '../state/session.ts'
import { SYNTHETIC_DOCUMENTS } from './syntheticDocuments.ts'
import {
  SyntheticViewer,
  type SyntheticViewerOptions
} from './syntheticViewer.ts'

export class FakeTimers implements Timers {
  private now = 0
  private seq = 0
  private readonly tasks = new Map<number, { at: number; fn: () => void }>()

  set(fn: () => void, ms: number): unknown {
    const handle = ++this.seq
    this.tasks.set(handle, { at: this.now + ms, fn })
    return handle
  }

  clear(handle: unknown): void {
    this.tasks.delete(handle as number)
  }

  get active(): number {
    return this.tasks.size
  }

  /** Avança o relógio e dispara, por ordem, os timers que vencem. */
  advance(ms: number): void {
    const target = this.now + ms
    for (;;) {
      const due = [...this.tasks.entries()]
        .filter(([, t]) => t.at <= target)
        .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0]
      if (!due) break
      this.tasks.delete(due[0])
      this.now = due[1].at
      due[1].fn()
    }
    this.now = target
  }
}

export interface HarnessOptions extends Partial<SyntheticViewerOptions> {
  /** Chamado em cada evento da ponte (como o `onEvent` do ecrã real). */
  onEvent?: (event: BridgeEvent) => void
  /** `true` faz `inject` lançar (WebView sem ref) para `predicate`. */
  failInject?: (type: string) => boolean
}

export interface Harness {
  client: BridgeClient
  viewer: SyntheticViewer
  timers: FakeTimers
  /** Eventos da ponte, por ordem. */
  events: BridgeEvent[]
  /** Estado de sessão actual (`sessionReducer` real). */
  readonly state: SessionState
  dispatch(action: SessionAction): void
  /** Entrega ao cliente tudo o que o viewer já enviou (e o que isso provocar). */
  flush(): void
  /** `viewer.boot()` + `flush()`. */
  boot(): void
  /** `client.open(...)` de um documento sintético + `flush()`. */
  open(name: string): void
}

export function createHarness(options: HarnessOptions = {}): Harness {
  const timers = new FakeTimers()
  const viewer = new SyntheticViewer({
    documents: options.documents ?? SYNTHETIC_DOCUMENTS,
    dwg: options.dwg,
    missingLayouts: options.missingLayouts
  })
  const events: BridgeEvent[] = []
  let state: SessionState = initialSessionState
  const dispatch = (a: SessionAction) => {
    state = sessionReducer(state, a)
  }
  const client = new BridgeClient({
    timers,
    onEvent: e => {
      events.push(e)
      dispatch(e)
      options.onEvent?.(e)
    },
    inject: script => {
      const probe = JSON.parse(
        JSON.parse(
          script.slice('window.__cadBridge.receive('.length, -');true;'.length)
        ) as string
      ) as { type: string }
      if (options.failInject?.(probe.type)) {
        throw new Error('webview ref em falta')
      }
      viewer.handle(script)
    }
  })
  const h: Harness = {
    client,
    viewer,
    timers,
    events,
    dispatch,
    get state() {
      return state
    },
    flush() {
      // Uma resposta pode provocar novos comandos (goto automático) → repetir.
      for (let guard = 0; viewer.pending > 0; guard++) {
        if (guard > 50) throw new Error('flush não convergiu')
        for (const raw of viewer.drain()) client.receive(raw)
      }
    },
    boot() {
      viewer.boot()
      h.flush()
    },
    open(name) {
      const r = client.open({
        name,
        size: 1024,
        source: { kind: 'url', url: `http://127.0.0.1/${name}` }
      })
      if (!r.ok) throw new Error(`open rejeitado: ${r.error.message}`)
      h.flush()
    }
  }
  return h
}
