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

| Gate                                                        | Resultado                                                                                                                                                                                            |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test` (`node:test`)                                    | 149/149 verdes (protocolo 37, BridgeClient 42, shell 15, state 55)                                                                                                                                   |
| `npm run typecheck` (TS 6.0.3, `strict`)                    | rc=0                                                                                                                                                                                                 |
| `pnpm exec eslint apps/freedom-mobile/src App.tsx index.ts` | rc=0                                                                                                                                                                                                 |
| `pnpm exec prettier --check apps/freedom-mobile/src`        | verde                                                                                                                                                                                                |
| `git diff --check`                                          | rc=0                                                                                                                                                                                                 |
| `expo export --platform android` (Metro)                    | OK, `.hbc` 1,5 MB                                                                                                                                                                                    |
| `jest --listTests` (raiz) em `/apps/`                       | 0                                                                                                                                                                                                    |
| Base `d1568b73` vs HEAD                                     | os 28 testes do B1 + 3 de recuperação tardia (shell) + 12 de recuperação tardia (BridgeClient/session/document) mantêm-se verdes; sem ficheiros fora de `apps/freedom-mobile/**` e `docs/OBJ-0104-*` |

## 5. Limitações / pendentes

- **Dispatcher do viewer** (`handleBridgeMessage`, adapters `acapFindText`/`acapNavigateToFindHit`, zoom `applyRelativeScale`, `stale-find`, wrap next/prev): pendente para o card que criar `packages/cad-mobile-viewer` (B2/I1). Os payloads que ele tem de produzir/aceitar estão fixados e testados aqui; o comportamento do lado web **não** foi exercitado contra o viewer real nem contra fixtures DXF (`find-layouts.dxf`, `find-blocks.dxf`).
- Transporte real (`injectJavaScript` ↔ `__cadBridge`/`postMessage`), servidor local e bundle: S1/I2. G-man não executado (sem JDK/emulador; iOS sem Xcode).
- UI de FIND (lista, contador, prev/next, insets) é I3; o estado/protocolo já existem. `ViewerScreen` não envia comandos ainda (sem botões): a ligação está feita mas só é exercitada por testes de integração com viewer simulado.
- `jest.config.ts` não tocado (testes `*.node-test.ts`).
- O commit `db9f45ab` (TypeScript ~6.0.3, `package.json`/lock) é de outra sessão (engineer-glm), anterior a este card.

## 6. Âmbito face ao follow-up `t_254a5902` (reconciliação)

Fontes vinculativas (`docs/OBJ-0104-architecture.md`):

- §3.2 «Permitido»: «`apps/freedom-mobile/**`, `packages/cad-mobile-viewer/**`, `docs/OBJ-0104-*.md`, `jest.config.ts` (só `testPathIgnorePatterns`/`moduleNameMapper` para o novo pacote), …». Todos os 28 ficheiros de `origin/main..HEAD` caem em `apps/freedom-mobile/**` ou `docs/OBJ-0104-*.md`; `jest.config.ts`, `packages/**` e `pnpm-lock.yaml` não são tocados.
- §11, linha **I2**: «Toca: … `apps/freedom-mobile/src/bridge/BridgeClient.ts`, …»; linha **I3**: «Toca: `apps/freedom-mobile/src/screens/Find*.tsx`, `src/state/find.ts`. Não toca viewer.». `BridgeClient.ts` e `state/find.ts` são, portanto, caminhos previstos; `contracts/protocol.ts` (tipos §5.2), `state/{document,session,describe}.ts` e `ViewerScreen`/`ViewerSurface` ficam sob o «Permitido» de §3.2 e implementam §5–§6.4 e D-4.
- Card `t_c3ae146f` (M1 B2), fonte «`docs/OBJ-0104-architecture.md` §2, §5–§7, §11, D-4»: é o card de implementação vivo desta branch partilhada e autoriza o contrato, o cliente e o estado.

Classificação do delta `origin/main..HEAD`:

| Grupo                                                                                                                | Commits                                                    | Pertence a                                 |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| Docs/arquitectura, shell B1, specs B1                                                                                | `e60893ce` … `d1568b73`                                    | stream do objectivo (M0/M1-B1), já revisto |
| Follow-up TypeScript `~6.0.3` (`package.json`, lock)                                                                 | `db9f45ab`                                                 | `t_c2d1877c`                               |
| Follow-up `ready` tardio, camada shell (`shellState.ts` + teste)                                                     | `531f82ef`                                                 | `t_37f549f1`                               |
| Rework: recuperação coerente BridgeClient/shell/documento + testes (`BridgeClient.node-test`, `document`, `session`) | `fde7b3e8`                                                 | `t_254a5902` (finding 2)                   |
| Contrato, `BridgeClient`, estado, ecrã, esta spec                                                                    | `bafa36d9`, `53b4013c`, `ece6717a`, `36a7ecee`, `80a72923` | `t_c3ae146f` (M1-B2), **não** do follow-up |

O follow-up original é independente do M1-B2: `db9f45ab` + `531f82ef` aplicados sobre `d1568b73` (sem nenhum commit M1-B2) alteram só `package.json`, `package-lock.json`, `shellState.ts` e `shellState.node-test.ts`, e passam `npm test` (31/31), `npm run typecheck`, `expo install --check` e `git diff --check`. Só o `fde7b3e8` toca ficheiros M1-B2, porque a recuperação tardia exigida pelo rework atravessa o `BridgeClient` e o estado do documento, que só existem no M1-B2.

Desvios que **esta spec não ratifica** (decisão do CTO/Kevin):

1. **Ordem**: §11 sequencia «B0 → B1 → B2 → S1 → I1/T1 → I2 → I3», i.e. `BridgeClient`/`find.ts` (I2/I3) depois de S1/I1; o card M1-B2 antecipou o lado app. Os caminhos são os do §11/§3.2; a antecipação não está prevista.
2. **Boundaries do card `t_c3ae146f`** («Somente `apps/viewer/**` e `packages/viewer/**`»): caminhos inexistentes; a arquitectura fixa `apps/freedom-mobile/` (D-9, §3.1). Ver §1.

Consequência para a revisão do follow-up: rever `db9f45ab`, `531f82ef` e `fde7b3e8` (base `d1568b73`), não `origin/main..HEAD` inteiro; os restantes commits M1-B2 são revistos no card `t_c3ae146f`.

**Rótulos de commit.** O assunto de `fde7b3e8` termina em «(M1-B2)», mas o commit pertence ao follow-up `t_254a5902` (tabela acima), não ao M1-B2 (`t_c3ae146f`). O histórico já publicado não é reescrito (sem force-push); vale a atribuição desta tabela. Commits de follow-up identificam o card de follow-up e não usam o rótulo «M1-B2».

## 7. Follow-up `t_fc841e51` (MINORs da revisão; não é M1-B2)

Fora do âmbito do M1-B2 (`t_c3ae146f`) e do follow-up `t_254a5902`: corrige um caso que o `fde7b3e8` deixou silencioso. Mantém a recuperação por `ready` válido tardio (decisão `531f82ef`) e não reenvia o que foi descartado.

- **Problema**: com um `open` em fila (antes de `ready`) ou em curso, `process-gone` descartava-o em `BridgeClient.fail()` sem evento próprio, e `documentReducer` limpava `opening` e `error`; depois de um `ready` tardio a app ficava sem documento, sem loading e sem erro — a abertura desaparecia em silêncio.
- **Cliente** (`src/bridge/BridgeClient.ts`): `fail(cause)` emite, logo a seguir a `ready-timeout`/`process-gone`, `{ kind: 'open-dropped', id, cause }` com o id do `open` descartado (o mais recente, se havia substituição em fila). Sem `open` pendente, nada é emitido. A resposta tardia a esse id continua `stale-reply`.
- **Documento** (`src/state/document.ts`): `process-gone` com abertura em curso termina o loading com erro local `viewer-unavailable` («o viewer terminou inesperadamente; a abertura foi cancelada»), que sobrevive ao `ready` tardio; sem abertura em curso o comportamento é o anterior (estado vazio). `ready-timeout` não muda.
- **Testes** (`node:test`, timers falsos, deterministas): `BridgeClient.node-test` (fila/em curso × `process-gone`/`ready-timeout`; só o `open` realmente descartado), `document.node-test` (erro explícito em `process-gone`), `session.node-test` (ponta-a-ponta: `process-gone` → `ready` tardio → erro visível, nada reenviado, resposta tardia stale). Os 4 testes novos falham sem a correcção e passam com ela; `npm test` 153/153.
- **Limitação**: o texto mostrado (`describeDocument`) é o genérico de `viewer-unavailable` («O viewer não está disponível; recarregue.»), igual ao caminho `ready-timeout`; um texto próprio para «reabra o ficheiro» após recuperação fica para decisão de UI (I3).
