# OBJ-0104 · M2 I1 — Spec e plano: fluxo offline de ficheiros até à entrada do viewer

Card `t_a3c89c48` (milestone M2-I1). Fonte vinculativa: `docs/OBJ-0104-architecture.md` §§3, 4, 6, 9 e 11 (cards I1/I5 do plano), decisões D-1…D-5 e D-10. **Fora de âmbito**: servidor HTTP local (I5), parser/conversor DWG/DXF, licenças/publicação, upstream. O fluxo termina no **ponto de entrada do viewer** = `BridgeClient.open(payload)`; o que acontece depois (`opened`/`openFailed`) é consumido só para gerir o ciclo de vida dos assets.

## 1. Desvios e interpretação (a registar)

| Tema           | Pedido no card                         | Realidade verificada                                                                                                                                    | Decisão                                                                                                                                                                           |
| -------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Caminhos       | `apps/viewer/**`, `packages/viewer/**` | não existem; D-9 fixa `apps/freedom-mobile/` (usado por B1, M1-B2, M1-S1) e `packages/cad-mobile-viewer/` (B2, inexistente)                             | tudo em `apps/freedom-mobile/src/**` + `docs/OBJ-0104-*`. Nada em `packages/**`, `jest.config.ts`, `pnpm-lock.yaml`, `package.json` do app.                                       |
| Remote         | «push para origin»                     | `origin` = upstream `mlightcad/cad-viewer`; D-5 proíbe qualquer acção upstream                                                                          | push só para `fork` (como M1-B2/M1-S1). Nada é enviado a `origin`.                                                                                                                |
| Picker/storage | «seleção, cópia/hand-off»              | `expo-file-system@57.0.7` (já dependência transitiva do `expo`, instalado) expõe `File.pickFileAsync`, `File.copy/move/delete/size/base64`, `Directory` | **sem dependência nova** (sem `expo-document-picker`/`expo-sharing`): adaptadores finos sobre `expo-file-system`; núcleo puro com _ports_.                                        |
| Servidor local | «fluxo offline de ficheiros»           | o servidor loopback é I5; S1 de arquitectura (escolha de biblioteca) não existe                                                                         | o núcleo recebe um _port_ `AssetUrlPort`; sem servidor, `urlFor()` devolve `null` e aplica-se o **fallback base64 ≤ 8 MB** (§5.3). Acima disso → `too-large` explícito, sem rede. |
| Viewer real    | «viewer entry point»                   | `handleBridgeMessage`/bundle são I1-do-viewer/B2 (`packages/cad-mobile-viewer`), fora das fronteiras                                                    | os testes usam o `BridgeClient` real + `SyntheticViewer` (M1-S1) como viewer; **não** validam o viewer real nem DXF/DWG reais.                                                    |

## 2. O que já existia (inspeccionado em `4f96cdb6`, não repetido)

`contracts/protocol.ts` (`OpenPayload{name,size,source:url|base64}`, `detectDocumentFormat`, `MAX_DOCUMENT_BYTES` 20/10 MB, `MAX_BASE64_BYTES` 8 MB, `validateOpen` fail-closed), `bridge/BridgeClient.ts` (`open()` com fila pré-`ready`, `open-superseded`, `opened|open-failed|viewer-error`, `OPEN_TIMEOUT_MS`, `ready-timeout`, `process-gone`), `state/document.ts` (loading/erro/preservação do documento anterior), `ViewerSurface` (`about:blank`). **Faltava**: tudo o que está **antes** de `BridgeClient.open` (escolher, validar, copiar para área controlada, decidir `url`|`base64`, nomes seguros) e o **ciclo de vida dos assets** copiados (quando apagar), com erros comunicados pelo mesmo protocolo/estado.

## 3. Modelo

```
Picker (SO) ──► PickedFile{name, uri, size|null, owned}
   │  validar nome/extensão (local) ──► rejeita ANTES de copiar
   │  validar tamanho (local, 0 < size ≤ limite do formato)
   ▼
AssetStore.stage(uri → assetId opaco)   ← cópia numa pasta controlada da app;
   │  re-validação do tamanho REAL depois da cópia (TOCTOU)    a cópia da cache do picker é consumida
   ▼
entrega: urls.urlFor(assetId) → url loopback validada | null → base64 (≤ 8 MB)
   ▼
BridgeClient.open({name seguro, size real, source})        ← ponto de entrada do viewer
   ▼
ciclo de vida (eventos da ponte): opened → activo; falha/timeout/superseded/ready-timeout → apagado
```

### 3.1 Estados de um asset

`staged` (copiado, ainda não entregue) → `pending` (entregue com um `open` em curso/em fila) → `active` (o documento aberto; mantido para a partilha futura, I6) → `released` (apagado). Um por vez em `active`; `pending` pode haver vários transitoriamente (supersede).

| Evento                                                                                                 | Efeito sobre os assets                                                                                                           |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `bridge.open` aceite (`queued` ou não)                                                                 | asset → `pending`; **qualquer outro** `pending` → `released('superseded')` (a resposta antiga passa a `stale-reply`)             |
| `bridge.open` rejeitado (validação, `not-ready`, `viewer-unavailable`, …)                              | asset → `released('open-rejected')`; erro `file-rejected` com o mesmo código                                                     |
| `opened{replyTo}` do `open` deste asset                                                                | asset → `active`; o `active` anterior → `released('replaced')`                                                                   |
| `open-failed{replyTo}` (viewer, `timeout`, `send-failed`), `viewer-error` do `open`, `open-superseded` | asset do `replyTo` → `released(...)`; o `active` anterior **mantém-se** (§6.4: falha preserva o documento)                       |
| `ready-timeout`                                                                                        | todos os `pending` → `released('ready-timeout')` (a ponte descarta o `open` em fila e não o reenvia)                             |
| `process-gone`, `find-active{no-document}`, `dispose()`                                                | **todos** (`pending` + `active`) → `released(...)` (o documento já não existe)                                                   |
| `opened`/falha de um `replyTo` desconhecido (já libertado/substituído)                                 | ignorado (idempotente); nunca ressuscita um asset                                                                                |
| Arranque (`startup()`)                                                                                 | `sweep`: apaga tudo o que a pasta controlada contiver (sobras de crash/kill; nada está `active` num arranque)                    |
| Falha ao apagar                                                                                        | `file-cleanup-failed` + o id fica em `leaked`; `retryCleanup()` e o próximo `startup()` voltam a tentar (nunca se perde o rasto) |

Escolhas pedidas ao `open` concorrente: um pedido novo enquanto outro ainda está a **copiar** substitui-o (geração monotónica): o antigo, ao terminar a cópia, apaga o seu asset e devolve `superseded` — nunca chega à ponte.

### 3.2 Nomes e caminhos (acceptance 2; arquitectura §9)

- `sanitizeDocumentName(raw)`: só o _basename_ (corta `/` e `\`), remove controlos e caracteres inválidos de nome, NFC, máx. 120 chars preservando a extensão; sem extensão `.dwg|.dxf` válida → `null` (→ `unsupported-ext`). Nome seguro é o que viaja na ponte e na UI.
- O `assetId` é opaco (`f` + contador + sufixo aleatório; `^[a-z0-9-]{8,64}$`); é o **único** nome do ficheiro copiado e o único segmento do URL: o nome original e o URI do picker nunca vão para o URL, para a ponte nem para eventos.
- `redactPaths(text)` remove URIs (`file://`, `content://`) e caminhos absolutos (POSIX, `C:\`, `/mnt/…`) de qualquer mensagem de excepção antes de a mostrar. **Nenhum evento, texto de UI nem log contém o `uri` do picker nem o caminho da área controlada**; só `name` seguro, `assetId`, `size`, `code`. (O fluxo não escreve em `console`.)
- `isLocalAssetUrl(url)`: só `http://127.0.0.1|localhost|[::1]:<porta>/<segmentos seguros>`; sem `userinfo`, query, fragmento, `..`. Qualquer outro URL devolvido pelo _port_ → `invalid-url` (fail-closed). **O fluxo nunca faz pedidos de rede** (testado com `fetch`/`XMLHttpRequest` armadilhados).

### 3.3 Erros (um só vocabulário)

`FileFlowErrorCode` ⊂ códigos já existentes na UI: `unsupported-ext`, `too-large`, `read-failed` (picker/leitura/cópia/ficheiro vazio/tamanho incoerente), `invalid-url`, `viewer-unavailable`, `not-ready`, `send-failed`, `invalid-payload`, mais `cancelled` (não é erro) e `superseded`. Cada rejeição local sai como evento `file-rejected{code, message PT-PT, stage}` e entra no estado da sessão (`files.error`); a rejeição **do viewer** continua a chegar por `open-failed` → `document.error` (protocolo existente). Nada é enviado ao viewer quando a validação local falha.

## 4. Contrato público (novo, `src/files/`)

- `ports.ts` — `DocumentPickerPort.pick()`, `AssetStorePort{sizeOf, stage, readBase64, remove, sweep}`, `AssetUrlPort.urlFor`, `BridgeOpenPort{phase, open}`.
- `names.ts` — `sanitizeDocumentName`, `redactPaths`, `isLocalAssetUrl`, `isAssetId`, `createAssetIdGenerator`.
- `fileFlow.ts` — `FileFlow` (`pickAndOpen()`, `openPicked(file)`, `handle(BridgeEvent)`, `startup()`, `retryCleanup()`, `dispose()`) + `FileFlowEvent`.
- `expoFileAdapters.ts` — `createExpoPicker()`, `createExpoAssetStore()` sobre `expo-file-system` (única parte não testada em node; só typecheck/`expo export`).
- `state/files.ts` — `filesReducer` (`idle|picking|staging|handed-off`, `error`, `lastCleanupFailure`), integrado em `sessionReducer`; `describeFiles` PT-PT.
- `ViewerScreen` — botão «Abrir» (≥44 px) que chama `flow.pickAndOpen()`; o `onEvent` da ponte alimenta o estado **e** `flow.handle`.

## 5. Plano (commits)

1. Esta spec (docs-only).
2. Núcleo puro `src/files/{ports,names,fileFlow}.ts` + `src/fixtures/fakeFiles.ts` (picker/store/url falsos, relógio/ids determinísticos) + testes `names`/`fileFlow` (validação, cópia, entrega, rejeições, supersede, TOCTOU).
3. `state/files.ts` + integração em `session.ts`/`describe.ts` + hook `onEvent` no harness + testes de **ciclo de vida** com `BridgeClient` real e viewer sintético (opened/openFailed/timeout/ready-timeout/process-gone/supersede/dispose/sweep) e de **higiene** (sem caminhos nos eventos, sem rede).
4. `expoFileAdapters.ts` + botão «Abrir» no `ViewerScreen`.
5. Reconciliação desta spec com números finais e gates («Evidência»).

## 6. Gates e limitações

Gates (em `apps/freedom-mobile` e raiz): `npm test` (`node:test`), `npm run typecheck`, `pnpm exec eslint` do app (via `heavy`), `prettier --check` no delta, `git diff --check origin/main...HEAD`, `expo export --platform android` (via `heavy`), `jest --listTests` da raiz sem `/apps/`, `detect_changes` (codebase-memory, `origin/main`), base-vs-HEAD (testes novos falham sem o código novo / suite pré-existente intacta). Resultados na secção «Evidência», preenchida no último commit.

Limitações conhecidas (declaradas de antemão): servidor loopback e escolha da biblioteca = I5 (até lá só `base64 ≤ 8 MB`; DXF/DWG maiores → `too-large` com mensagem clara); `expoFileAdapters.ts` não é exercitado sem dispositivo/emulador (sem JDK/AVD — toolchain §2; iOS sem Xcode); o viewer é `about:blank` em B1, logo o `open` real só termina em `ready-timeout`/`timeout` até B2/I2; o `assetId` é opaco mas **não** é autenticação — o servidor de I5 tem de acrescentar token por sessão; «Abrir com…» do SO e partilha (I6) não existem.

## 7. Evidência

Ponto de verificação dos gates: commit de código `59957967` (o commit seguinte só toca este ficheiro). Resultados em `apps/freedom-mobile` e na raiz, worktree limpa:

| Gate                                                                      | Resultado                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test` (`node:test`)                                                  | **293/293** (224 pré-existentes + 69 novos: `names` 14, `fileFlow` 29, `fileLifecycle` 26); 0 falhas                                                                                                                                                                                                                                                                         |
| `npm run typecheck` (strict)                                              | rc=0                                                                                                                                                                                                                                                                                                                                                                         |
| `pnpm exec eslint apps/freedom-mobile/src App.tsx index.ts` (via `heavy`) | rc=0 (após `--fix` de `simple-import-sort` e correcção de `no-control-regex`/`prefer-const`/`no-useless-escape`)                                                                                                                                                                                                                                                             |
| `prettier --check` no delta `4f96cdb6..HEAD`                              | verde                                                                                                                                                                                                                                                                                                                                                                        |
| `git diff --check origin/main...HEAD`                                     | rc=0                                                                                                                                                                                                                                                                                                                                                                         |
| `expo export --platform android` (Metro/Hermes, via `heavy`)              | OK (bundle `.hbc` gerado; saída apagada)                                                                                                                                                                                                                                                                                                                                     |
| `jest --listTests` (raiz) em `/apps/`                                     | 0                                                                                                                                                                                                                                                                                                                                                                            |
| Base-vs-HEAD                                                              | em `4f96cdb6` a suite pré-existente dá 224/224; em HEAD os mesmos 224 ficheiros de teste continuam 224/224 (sem alteração de comportamento anterior); os 3 ficheiros de teste novos **não correm** sobre o código-base (`ERR_MODULE_NOT_FOUND`: `files/*` e `fakeFiles.ts` não existem)                                                                                      |
| Mutação (sanidade dos testes)                                             | `process-gone` sem libertar → 1 teste falha; `open-failed` sem libertar → 5; supersede sem libertar o pendente → 1; aceitar qualquer URL → 1; todos revertidos (`git diff` vazio)                                                                                                                                                                                            |
| `detect_changes` (codebase-memory, `origin/main`)                         | 47 ficheiros do branch, todos em `apps/freedom-mobile/**` e `docs/OBJ-0104-*`; impactados no app: `BridgeClient`, `session/describe/document/find/selection/shell` e respectivos testes (todos executados nos 293). Os símbolos `packages/*` listados como «impactados» são correspondências por nome (`pick`, `readFile`…) sem qualquer ficheiro alterado em `packages/**`. |

Fora das fronteiras: nenhum ficheiro tocado em `packages/**`, `jest.config.ts`, `pnpm-lock.yaml`, `apps/freedom-mobile/package.json`/`package-lock.json` (sem dependência nova), nem em e2e/web/API. Push só para `fork` (D-5).

Notas de implementação face ao §3: o ficheiro copiado chama-se só `<assetId>` (sem extensão); `owned` = `Platform.OS === 'ios'` no picker Expo (a doc do SDK 57 diz que o iOS devolve uma cópia temporária; no Android o ficheiro é do utilizador e nunca é apagado) — **[H]** a confirmar em dispositivo; nomes `content://` são percent-decoded antes de `sanitizeDocumentName`. Uma libertação feita enquanto a cópia ainda decorria (`dispose`/`process-gone`) repete a remoção quando a cópia termina (`dropStaged`), para não deixar o ficheiro em disco (bug apanhado pelo teste «dispose durante a cópia»).

Não executado: G-man / emulador / dispositivo (sem JDK/AVD; iOS sem Xcode) — `expoFileAdapters.ts` e o botão «Abrir» só têm typecheck, lint e bundle Metro; não foi medido o custo de memória do base64 de 8 MB (S2).
