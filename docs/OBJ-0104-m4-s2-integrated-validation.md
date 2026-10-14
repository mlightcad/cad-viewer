# OBJ-0104 M4-S2 — Validação integrada do MVP (evidência)

Âmbito: **só validação** (fixtures autorizadas, harness, teste integrado, evidência). Não cria contratos, não implementa o listener nativo, cleartext/transporte em dispositivo, `ViewerSurface`, CSP/`Sec-Fetch` (dono: M4-I6, `docs/OBJ-0104-m3-i5-local-asset-server-spec.md` §8) e não mexe em licenciamento.

## 1. Circuito validado

`packages/cad-mobile-viewer/__tests__/integratedMvp.test.ts` (24 testes) liga, **sem duplos pelo meio**:

`FileFlow` → `LocalAssetServer` → sockets reais `127.0.0.1` (listener `node:http` de teste) → `createLoopbackFetch` → importador + parser DXF reais → FIND real → `ViewerSession`/dispatcher → `BridgeClient` → `sessionReducer` (todos reais). O caminho de fallback `base64` é corrido em paralelo (`describe.each`).

Fixtures: só as DXF de `packages/cad-viewer-example/e2e/fixtures` lidas in-place (`minimal-line`, `find-layouts` (3 layouts), `find-blocks` (CARIMBO), `block-color` (0,6 MB), `sheet_0` (1,9 MB)) e DXF sintéticos gerados em memória; proveniência em `packages/cad-mobile-viewer/__tests__/PROVENANCE.md`. Nenhum binário novo entrou no repo.

## 2. Cobertura por critério

| Critério   | Cenário (teste)                                                                                                                                                                                                                                               | Resultado |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Abrir      | 4 DXF pequenos/médios + `sheet_0`, por URL loopback e por base64; estado `document.current`, realce limpo, caminho (`url`/`base64`) confirmado no `open` enviado                                                                                              | passou    |
| Renderizar | **Só o modelo**: `opened` com layouts/extents, `DocumentMap`, caixas finitas entregues à vista. A vista WebGL é o `FakeView` (regista zoom/realce/navegação, não desenha)                                                                                     | parcial   |
| FIND       | multi-layout, 1.º hit seleccionado e navegado, next/prev com wrap nos dois sentidos, vazio ≠ erro, texto em bloco, `maxResults`/`truncated`, metacaracteres literais, `findId` antigo → `error{stale-find}` sem navegar                                       | passou    |
| Zoom       | `in`/`out`/`extents` chegam à vista; `clearHighlight`; sem issue                                                                                                                                                                                              | passou    |
| Erros      | extensão inválida e acima do limite (recusadas no app, viewer intocado); DXF corrompido e sem nada desenhável (`parse`); DWG sem conversor (`dwg-unavailable`); `process-gone` liberta assets. Em todos, documento/FIND/selecção anteriores ficam preservados | passou    |
| Offline    | liga-se por TCP **só** a `127.0.0.1` (destino real lido de `socket.remoteAddress`); `XMLHttpRequest`/`WebSocket`/`EventSource` armadilhados; URL externo → `read-failed` sem ligação                                                                          | passou    |
| DXF        | todos os cenários acima                                                                                                                                                                                                                                       | passou    |
| **DWG**    | `dwg-unavailable` (caminho de erro) e importador/registo cobertos em `importer.test.ts`/`registerDwg.test.ts`/`dwgCoverage.test.ts`. **Parse DWG positivo e FIND em DWG: NÃO VERIFICADO (EXT-3 — sem fixture com proveniência)**                              | limitação |

## 3. O que NÃO foi validado (dependências explícitas)

| Item                                                                                           | Estado                                                                                                      | Dono / dependência                                                      |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Listener nativo `HttpListenerPort` em dispositivo                                              | **não verificado — inexistente** (o `node:http` de teste prova o núcleo, não o dispositivo)                 | M4-I6                                                                   |
| Cleartext só para `127.0.0.1` (Android `networkSecurityConfig`, iOS `NSAllowsLocalNetworking`) | **não verificado — não implementado**                                                                       | M4-I6                                                                   |
| `ViewerSurface` (`source.uri`, `originWhitelist`, bloqueio de navegação)                       | **não verificado — não implementado** (o gate `fixtureGate` continua a exigir `about:*`)                    | M4-I6                                                                   |
| CSP, `Origin`/`Sec-Fetch-*`/`Host` reais no WebView Android / WKWebView                        | **não verificado** (sem JDK/AVD/Xcode neste ambiente); a integração por URL **não** fica declarada validada | M4-I6 (critério de aceitação não negociável, spec M3-I5 §8 item 6)      |
| Renderização WebGL, pinch/pan, modo avião, medições em dispositivo (memória de pico, TTFB)     | **não verificado**                                                                                          | M4-I6 / T2 em dispositivo                                               |
| Parse DWG positivo (worker + wasm LibreDWG) e FIND em DWG                                      | **não verificado (EXT-3)**                                                                                  | Kevin fornece/autoriza fixture com `PROVENANCE.md` (arquitectura §10.2) |

## 4. Medições (P-5) — indicativas

O teste regista o tempo até `opened` de `sheet_0.dxf` (1 928 331 B) em Node/jest: ≈ 0,55–0,65 s (url e base64) numa máquina descarregada; chegou a ≈ 1,3–5 s com a máquina sob carga concorrente. **São medidas de Node, não de dispositivo**: não fixam os limites P-5 (que exigem Android/iOS), apenas mostram que os limites actuais (DXF 20 MB, DWG 10 MB) não são postos em causa por um desenho de 1,9 MB.

## 5. Infra de teste tocada

- `jest.config.ts`: `diagnostics.ignoreCodes: [5097]` — o teste integrado importa módulos do app que usam imports `.ts` (corre em `node --test`); o jest resolve-os, só o diagnóstico TS5097 recusava.
- `packages/cad-mobile-viewer/tsconfig.json`: `allowImportingTsExtensions` (já é `noEmit`) pelo mesmo motivo, para o `tsc --noEmit` do viewer.

## 6. Gates (em `HEAD` do commit deste documento)

| Gate                                                                                                 | Resultado                                 |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `apps/freedom-mobile`: `npm test`                                                                    | 650/650 em 110 suites                     |
| `apps/freedom-mobile`: `npx tsc --noEmit`                                                            | rc=0                                      |
| viewer: `pnpm exec jest packages/cad-mobile-viewer --maxWorkers=2 --detectOpenHandles` (via `heavy`) | 690/690 em 21 suites (inclui os 24 novos) |
| viewer: `tsc --noEmit -p tsconfig.json` / `eslint packages/cad-mobile-viewer jest.config.ts`         | rc=0 / rc=0                               |
| `prettier --check` no delta e `git diff --check`                                                     | rc=0                                      |
