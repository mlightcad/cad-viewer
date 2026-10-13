# OBJ-0104 · M1 B2 — Protocolo app↔viewer e FIND (lado app)

Fonte vinculativa: `docs/OBJ-0104-architecture.md` §§2, 5–7, 11 e D-4. Sem parser, conversão, servidor local, integração upstream, licenciamento ou publicação.

## 1. Desvios de fronteira (a registar)

| Tema                 | Pedido no card                         | Realidade                                                                                                                                                 | Decisão                                                                                                                            |
| -------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Caminhos             | `apps/viewer/**`, `packages/viewer/**` | não existem; a arquitectura fixa `apps/freedom-mobile/` (D-9, §3.1; `architecture.md:34,116,353`) e `packages/cad-mobile-viewer/` (B2, ainda inexistente) | tudo em `apps/freedom-mobile/src/**` (mesma precedência do B1, ver `m1-b1-shell-spec.md` §1). Nada em `packages/**`.               |
| Dispatcher do viewer | "message bridge"                       | `handleBridgeMessage` (§3.1/§7, lado web) vive em `packages/cad-mobile-viewer/src/bridge/`, que não existe e está fora das fronteiras                     | **não implementado**: ver §5 (pendente). Este card entrega o contrato partilhado (tipos+validação dos dois sentidos) e o lado app. |
| Remote               | "push para origin"                     | `origin` = upstream `mlightcad/cad-viewer` (D-5 proíbe acção upstream)                                                                                    | push só para `fork`.                                                                                                               |
| `layout-mismatch`    | §5.4 lista 5 resultados de navegação   | `AcApFindNavigateResult` tem 6 (`AcApFindNavigator.ts:123-129`)                                                                                           | contrato aceita os 6; `layout-mismatch` trata-se como "layout indisponível".                                                       |

## 2. Contrato (`src/contracts/protocol.ts`)

- Payload tipado e validado campo a campo para **todos** os tipos: viewer→app (`ready`, `opened`, `openFailed`, `findResult`, `findActive`, `error`, `log`) via `parseViewerMessage`; app→viewer (`open`, `find`, `goto`, `findNext`, `findPrev`, `zoom`, `clearHighlight`, `setInsets`) via `buildAppMessage`.
- Fail-closed: payload inválido ⇒ `invalid-payload` (recebido) ou `OutgoingError` (a enviar: `invalid-payload`, `unsupported-ext`, `too-large`); nada é corrigido, coagido nem enviado.
- Decisões novas do contrato (não estavam em §5.2): `findResult.hits.length === total` e `hits[i].index === i`; `findId` inteiro ≥ 0; `zoom.factor ∈ [0.1, 10]` e proibido com `extents` ([H]); `find.query` não pode ser vazio; `maxResults ∈ 1..500`; limites 20 MB DXF / 10 MB DWG / 8 MB base64 ([H] §4, §5.3).
- "Progress": §5.2 não define mensagem de progresso. Modelado como estado app `document.opening` (de `open` enviado/enfileirado até `opened`/`openFailed`/timeout 120 s). Não foi inventada mensagem nova.

## 3. Cliente e estado

- `src/bridge/BridgeClient.ts` (puro; WebView só como `inject`): fila pré-`ready` (1 `open`, o mais recente substitui), outros comandos antes de `ready` ⇒ `not-ready`; correlação por `replyTo` (`opened`/`openFailed`↔`open`, `findResult`↔`find`, `findActive`↔`goto|findNext|findPrev`, `error`↔qualquer); `open`/`find` novos tornam obsoleta a resposta anterior (`stale-reply`); `goto{index:0}` automático após `find` com hits (§5.4); timeouts `ready` 15 s e `open` 120 s; falha de `inject` ⇒ `send-failed`; `ready` válido tardio recupera (decisão `531f82ef`).
- Estado puro (`src/state/*`): `document` (loading/opened/erro; documento anterior preservado em falha), `find` (`idle|searching|results|empty|error`, `truncated`, navegação `navigating|ok|unavailable`, `lastOutcome`), `zoom`, `issue` (erros de protocolo/viewer sem comando atribuível). `session.ts` compõe-os com o `shellReducer`.
- UI mínima (`ViewerScreen`): textos PT-PT de documento/FIND/erro; **sem** UI de FIND (I3).

## 4. Gates (em `apps/freedom-mobile`)

| Gate                                                        | Resultado                                                                                                                         |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `npm test` (`node:test`)                                    | 137/137 verdes (protocolo 37, BridgeClient 34, shell 15, state 51)                                                                |
| `npm run typecheck` (TS 6.0.3, `strict`)                    | rc=0                                                                                                                              |
| `pnpm exec eslint apps/freedom-mobile/src App.tsx index.ts` | rc=0                                                                                                                              |
| `pnpm exec prettier --check apps/freedom-mobile/src`        | verde                                                                                                                             |
| `git diff --check`                                          | rc=0                                                                                                                              |
| `expo export --platform android` (Metro)                    | OK, `.hbc` 1,5 MB                                                                                                                 |
| `jest --listTests` (raiz) em `/apps/`                       | 0                                                                                                                                 |
| Base `d1568b73` vs HEAD                                     | os 28 testes do B1 + 3 de recuperação tardia mantêm-se verdes; sem ficheiros fora de `apps/freedom-mobile/**` e `docs/OBJ-0104-*` |

## 5. Limitações / pendentes

- **Dispatcher do viewer** (`handleBridgeMessage`, adapters `acapFindText`/`acapNavigateToFindHit`, zoom `applyRelativeScale`, `stale-find`, wrap next/prev): pendente para o card que criar `packages/cad-mobile-viewer` (B2/I1). Os payloads que ele tem de produzir/aceitar estão fixados e testados aqui; o comportamento do lado web **não** foi exercitado contra o viewer real nem contra fixtures DXF (`find-layouts.dxf`, `find-blocks.dxf`).
- Transporte real (`injectJavaScript` ↔ `__cadBridge`/`postMessage`), servidor local e bundle: S1/I2. G-man não executado (sem JDK/emulador; iOS sem Xcode).
- UI de FIND (lista, contador, prev/next, insets) é I3; o estado/protocolo já existem. `ViewerScreen` não envia comandos ainda (sem botões): a ligação está feita mas só é exercitada por testes de integração com viewer simulado.
- `jest.config.ts` não tocado (testes `*.node-test.ts`).
- O commit `db9f45ab` (TypeScript ~6.0.3, `package.json`/lock) é de outra sessão (engineer-glm), anterior a este card.
