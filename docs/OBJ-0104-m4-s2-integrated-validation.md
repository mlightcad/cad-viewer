# OBJ-0104 M4-S2 — Validação integrada do MVP (evidência)

Âmbito: **só validação** (fixtures autorizadas, harness, teste integrado, evidência). Não cria contratos, não implementa o listener nativo, cleartext/transporte em dispositivo, `ViewerSurface`, CSP/`Sec-Fetch` (dono: M4-I6, `docs/OBJ-0104-m3-i5-local-asset-server-spec.md` §8) e não mexe em licenciamento.

## 0. O que o S2 prova — e o que NÃO prova (decisão vinculativa de descoping)

**S2 prova: modelo, layout e comandos.** Abertura (`opened`, layouts, `DocumentMap`), FIND, comandos de zoom/`clearHighlight` até ao `ViewPort`, erros e offline, no circuito real descrito em §1.

**S2 NÃO prova renderização.** A vista do circuito é o `FakeView` (`__tests__/helpers/viewerHarness.ts`), um duplo do `ViewPort` que só regista `zoomTo`/`clearSelection`/`navigate`: não há canvas, WebGL, pixels nem layout CSS. Nenhuma asserção do teste integrado é evidência de renderização, **nem em desktop nem a 390 px**; por isso este documento **não** traz métricas desktop/390 px — são **N/A (dependência)**, não «passou». A ausência de WebGL/dispositivo neste ambiente **não** é tratada como sucesso.

**Rota escolhida: descoping explícito (não evidência de pixels).** Não existe neste produto uma superfície real exercitável a partir do S2 (o `ViewerSurface` não existe — é do I6), e implementá-la violaria as fronteiras do card. Âncoras:

| Fonte                                                      | O que fixa                                                                                                                                                                                                                               |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/OBJ-0104-m3-i5-local-asset-server-spec.md` §8 item 6 | S2 «mede o que o produto actual permite» e regista o resto como «não verificado»; «S2 não pode declarar a integração por URL validada»                                                                                                   |
| mesma spec §8 item 3 e «Descoping vinculativo»             | `ViewerSurface` (a superfície real) é do **M4-I6**; qualquer card que declare estes itens «feitos» sem prova em dispositivo contradiz a secção                                                                                           |
| `docs/OBJ-0104-architecture.md` §11 linha **T2**           | matriz por SO com evidência (modo avião, DXF pequeno/médio/grande, FIND em todos os layouts, zoom, falhas, zero pedidos externos), `G-man`: é aqui que a renderização real é verificada                                                  |
| `docs/OBJ-0104-architecture.md` §7 item 4                  | E2E browser da página do bundle: opcional em T1, **obrigatório em T2** se o emulador falhar                                                                                                                                              |
| `docs/OBJ-0104-architecture.md` §11 linha **S1** e D-2/D-4 | WebGL/Worker activos em dispositivo são critério do S1 (spike em dispositivo); D-2 (DWG via LibreDWG, sem parser proprietário) e D-4 (FIND é prioridade) mantêm-se: o S2 cobre DXF/FIND/zoom/erros/offline e o DWG fica «não verificado» |

**Dono da evidência de renderização real (desktop + 390 px, com métricas): T2**, com pré-requisito no `ViewerSurface` do I6. Isto é a **leitura** do contrato acima feita neste card (a arquitectura não nomeia explicitamente «pixels a 390 px»; atribui a verificação real ao T2 e a superfície ao I6). **Residual para o driver/kanban (fora deste worktree):** acrescentar ao corpo do T2 a exigência de evidência de pixels em desktop e a 390 px, e ao S2 original (`t_48dc50bd`) a nota de limite.

Nomes de testes e legendas deste documento foram alinhados a isto: «abrir (modelo + protocolo, sem pixels)», «ViewPort de teste (FakeView)», e quatro `test.todo` em `integratedMvp.test.ts` listam as lacunas (o jest mostra-as como **todo**, nunca como passadas).

## 1. Circuito validado

`packages/cad-mobile-viewer/__tests__/integratedMvp.test.ts` (24 testes + 4 `test.todo` de lacunas) liga, **sem duplos pelo meio**:

`FileFlow` → `LocalAssetServer` → sockets reais `127.0.0.1` (listener `node:http` de teste) → `createLoopbackFetch` → importador + parser DXF reais → FIND real → `ViewerSession`/dispatcher → `BridgeClient` → `sessionReducer` (todos reais). O caminho de fallback `base64` é corrido em paralelo (`describe.each`).

Fixtures: só as DXF de `packages/cad-viewer-example/e2e/fixtures` lidas in-place (`minimal-line`, `find-layouts` (3 layouts), `find-blocks` (CARIMBO), `block-color` (0,6 MB), `sheet_0` (1,9 MB)) e DXF sintéticos gerados em memória; proveniência em `packages/cad-mobile-viewer/__tests__/PROVENANCE.md`. Nenhum binário novo entrou no repo.

## 2. Cobertura por critério

| Critério   | Cenário (teste)                                                                                                                                                                                                                                               | Resultado         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Abrir      | 4 DXF pequenos/médios + `sheet_0`, por URL loopback e por base64; estado `document.current`, `clearSelection` pedido ao `ViewPort` de teste, caminho (`url`/`base64`) confirmado no `open` enviado                                                            | passou            |
| Renderizar | **N/A em S2 — diferido a T2/I6.** Só o modelo é provado (`opened` com layouts/extents, `DocumentMap`, caixas finitas pedidas ao `ViewPort`). A vista é o `FakeView` (regista, não desenha): sem pixels, desktop nem 390 px                                    | N/A (diferido)    |
| FIND       | multi-layout, 1.º hit seleccionado e navegado, next/prev com wrap nos dois sentidos, vazio ≠ erro, texto em bloco, `maxResults`/`truncated`, metacaracteres literais, `findId` antigo → `error{stale-find}` sem navegar                                       | passou            |
| Zoom       | comandos `in`/`out`/`extents` e `clearHighlight` chegam ao `ViewPort` (`FakeView`) e o estado fica sem issue; o enquadramento visual **não** é verificado                                                                                                     | passou (comandos) |
| Erros      | extensão inválida e acima do limite (recusadas no app, viewer intocado); DXF corrompido e sem nada desenhável (`parse`); DWG sem conversor (`dwg-unavailable`); `process-gone` liberta assets. Em todos, documento/FIND/selecção anteriores ficam preservados | passou            |
| Offline    | liga-se por TCP **só** a `127.0.0.1` (destino real lido de `socket.remoteAddress`); `XMLHttpRequest`/`WebSocket`/`EventSource` armadilhados; URL externo → `read-failed` sem ligação                                                                          | passou            |
| DXF        | todos os cenários acima                                                                                                                                                                                                                                       | passou            |
| **DWG**    | `dwg-unavailable` (caminho de erro) e importador/registo cobertos em `importer.test.ts`/`registerDwg.test.ts`/`dwgCoverage.test.ts`. **Parse DWG positivo e FIND em DWG: NÃO VERIFICADO (EXT-3 — sem fixture com proveniência)**                              | limitação         |

## 3. O que NÃO foi validado (dependências explícitas)

| Item                                                                                                                        | Estado                                                                                                      | Dono / dependência                                                            |
| --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Listener nativo `HttpListenerPort` em dispositivo                                                                           | **não verificado — inexistente** (o `node:http` de teste prova o núcleo, não o dispositivo)                 | M4-I6                                                                         |
| Cleartext só para `127.0.0.1` (Android `networkSecurityConfig`, iOS `NSAllowsLocalNetworking`)                              | **não verificado — não implementado**                                                                       | M4-I6                                                                         |
| `ViewerSurface` (`source.uri`, `originWhitelist`, bloqueio de navegação)                                                    | **não verificado — não implementado** (o gate `fixtureGate` continua a exigir `about:*`)                    | M4-I6                                                                         |
| CSP, `Origin`/`Sec-Fetch-*`/`Host` reais no WebView Android / WKWebView                                                     | **não verificado** (sem JDK/AVD/Xcode neste ambiente); a integração por URL **não** fica declarada validada | M4-I6 (critério de aceitação não negociável, spec M3-I5 §8 item 6)            |
| Renderização real (pixels, desktop + 390 px), WebGL, pinch/pan, modo avião, medições em dispositivo (memória de pico, TTFB) | **não verificado — N/A em S2** (sem superfície real; FakeView não desenha)                                  | T2 (matriz, `G-man`), pré-requisito `ViewerSurface` do M4-I6 (arq. §11, §7.4) |
| Parse DWG positivo (worker + wasm LibreDWG) e FIND em DWG                                                                   | **não verificado (EXT-3)**                                                                                  | Kevin fornece/autoriza fixture com `PROVENANCE.md` (arquitectura §10.2)       |

## 4. Medições (P-5) — indicativas

O teste regista o tempo até `opened` de `sheet_0.dxf` (1 928 331 B) em Node/jest: ≈ 0,55–0,65 s (url e base64) numa máquina descarregada; chegou a ≈ 1,3–5 s com a máquina sob carga concorrente. **São medidas de Node, não de dispositivo**: não fixam os limites P-5 (que exigem Android/iOS), apenas mostram que os limites actuais (DXF 20 MB, DWG 10 MB) não são postos em causa por um desenho de 1,9 MB.

## 5. Infra de teste tocada

- `jest.config.ts`: `diagnostics.ignoreCodes: [5097]` — o teste integrado importa módulos do app que usam imports `.ts` (corre em `node --test`); o jest resolve-os, só o diagnóstico TS5097 recusava.
- `packages/cad-mobile-viewer/tsconfig.json`: `allowImportingTsExtensions` (já é `noEmit`) pelo mesmo motivo, para o `tsc --noEmit` do viewer.

## 6. Gates (em `HEAD` do commit deste documento)

| Gate                                                                                                 | Resultado                                                                                                     |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `apps/freedom-mobile`: `npm test`                                                                    | 650/650 em 110 suites                                                                                         |
| `apps/freedom-mobile`: `npx tsc --noEmit`                                                            | rc=0                                                                                                          |
| viewer: `pnpm exec jest packages/cad-mobile-viewer --maxWorkers=2 --detectOpenHandles` (via `heavy`) | 690 passed + 4 todo em 21 suites (inclui os 24 testes do integrado; os 4 `test.todo` são lacunas, não passes) |
| viewer: `tsc --noEmit -p tsconfig.json` / `eslint packages/cad-mobile-viewer jest.config.ts`         | rc=0 / rc=0                                                                                                   |
| `prettier --check` no delta e `git diff --check`                                                     | rc=0                                                                                                          |

Nota de ambiente (rework de descoping, sem alteração de código de produto): corrido sem `heavy` com a máquina em carga (load average ≈ 28 em 12 CPUs), o teste integrado deu 3 timeouts do jest de 5 s (`sheet_0` por URL e dois DXF por base64; o próprio `sheet_0` mede ≈ 1 s) — o mesmo efeito de carga já registado em §4. Repetido via `heavy` (serializado): 24 passed + 4 todo. Os limites de timeout não foram alterados.
