# OBJ-0104 — Arquitectura: app Expo mobile "Freedom DWG/CAD Viewer" (MVP)

Documento de arquitectura executável que transforma o scoping (`docs/OBJ-0104-scoping.md`) em decisões, contratos e cards sequenciais. **Apenas documentação**: nenhum código de produto, manifesto, lockfile ou fixture é alterado por este documento. Nenhuma acção, contacto ou alteração ao upstream `mlightcad`.

## 0. Base, convenções e método

| Item | Valor |
|---|---|
| Base deste documento | `e60893ce` (docs: OBJ-0104 scoping…), descendente de `442a9195` (FIND #734) e de `main` local `a39bab9b` |
| Documento de origem | `docs/OBJ-0104-scoping.md` (§§0–12) |
| Âmbito | Arquitectura e plano; sem implementação |

Marcadores usados em todo o documento:

- **[F]** facto verificado nesta árvore (ficheiro:linha ou comando). Linhas válidas na base `e60893ce`; um card que as use deve reconfirmá-las (o código pode mover-se).
- **[H]** hipótese/pressuposto ainda não verificado; cada [H] indica o card que a valida.
- **[D]** decisão vinculativa (do Kevin ou desta arquitectura dentro dessas fronteiras).
- **[EXT]** dependência externa: não é trabalho local nem bloqueia desenvolvimento.

Método: codebase-memory primeiro (`list_projects` → projecto `…-t_69c32932`; `get_architecture`; `search_graph` para `acapFindText`, `acapNavigateToFindHit`, `AcApDocManager.openDocument/openUrl`, `AcTrView2d.zoomTo/zoomToFitDrawing`, `AcApZoomCmd`, `AcApOpenDatabaseOptions`, `AcEdOpenMode`, `AcApFontLoader`, `registerLibreDwgConverter`), só depois leitura dirigida das linhas citadas, de `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `jest.config.ts`, `README.md` e `PROPRIETARY-PARSER.md`. `node_modules` **não está instalado** nesta árvore: tudo o que depende do conteúdo dos tarballs (ficheiro `LICENSE`/SPDX exacto de `libredwg-web`, tamanho do wasm) fica [H] até L1/B2.

## 1. Decisões vinculativas

| ID | Decisão | Origem |
|---|---|---|
| D-1 | **Licença não é gate de desenvolvimento.** Nenhum card I*/T* depende de L*. Os cards L* correm no fim e condicionam apenas *distribuição* (lojas/TestFlight/Play/publicação). | Kevin |
| D-2 | **DWG via `@mlightcad/libredwg-converter` + `@mlightcad/libredwg-web`** (mantidos). **Sem parser proprietário**: não se compra, avalia, integra nem se usa `tools/use-dwg-converter.mjs`/`@mlightcad/dwg-converter`. | Kevin; scoping §9 |
| D-3 | **v1 = DWG + DXF**. DXF pelo parser MIT de `@mlightcad/data-model`; DWG pelo conversor LibreDWG. A alternativa "B — só DXF" do scoping §9 fica **descartada** como modo de produto (DXF-only só existe como modo degradado quando o worker/wasm DWG falha — §6.4). | Kevin |
| D-4 | **FIND é prioridade**: os cards de FIND (I1/T1/I3) precedem qualquer extra (partilha, zoom fino, polimento). | Kevin; scoping §3, §10 |
| D-5 | **Nenhuma acção sobre upstream `mlightcad`**: sem issues, PRs, e-mails, forks novos, pedidos de licença ou contacto com o titular do parser proprietário. Os pacotes upstream existentes não são modificados por este MVP (§3.3). | Kevin |
| D-6 | **Licença recomendada do app e do código novo: `GPL-3.0-or-later`** (compatível com GPL-3.0). O código upstream mantém MIT (MIT é compatível com GPL; os avisos MIT são preservados). | Kevin; §8 |
| D-7 | **Sem promessa de publicação antes de testes**: nenhuma publicação (repo público, loja, TestFlight, Play interno) antes de T2 verde e L3 completo. | Kevin |
| D-8 | Publicação eventual do repositório, parecer jurídico GPL × lojas e proveniência de um DWG fixture são **[EXT]** (§10). | Kevin |
| D-9 | O app Expo vive em `apps/freedom-mobile/` (fora de `packages/*`, logo fora do workspace pnpm) e o bundle do viewer num novo pacote `packages/cad-mobile-viewer/`. Confirmado/ajustado em B0 (§3.1). | Esta arquitectura |
| D-10 | Modo de abertura fixo `AcEdOpenMode.Read`; sem edição, markup, cloud, contas ou IA. | Scoping §2.1, §10 |

## 2. Factos de base (do scoping §§2–8, reconfirmados)

### 2.1 Abertura de documentos
- [F] `AcApDocManager.openDocument(fileName, content: ArrayBuffer, options: AcApOpenDatabaseOptions, view?)` — `packages/cad-simple-viewer/src/app/AcApDocManager.ts:1386-1415`; devolve `Promise<boolean>`; em falha numa sessão nova chama `closeFailedOpenSession()`; excepções são relançadas.
- [F] `AcApDocManager.openUrl(url, options?)` — `AcApDocManager.ts:1345-1365` (mesmo contrato, via `context.doc.openUri`).
- [F] Detecção de formato por extensão: `AcApDocument.openDocument` (`packages/cad-simple-viewer/src/app/AcApDocument.ts:131-162`, l.154) usa `fileExtension == 'dwg' ? AcDbFileType.DWG : AcDbFileType.DXF` → **qualquer extensão que não seja `dwg` é tratada como DXF**. O bridge tem de validar a extensão antes (§5.2).
- [F] `AcApOpenDatabaseOptions` (`packages/cad-simple-viewer/src/app/AcApOpenDatabaseOptions.ts:66-161`): `mode?: AcEdOpenMode` (l.77), `openViewMode?: AcApOpenViewMode` (l.121; `Extents='extents'`, `Saved='saved'`, l.11-16; por omissão `Extents` em Read/Review), `progressiveRendering`, `convertAllLayouts`, `cooperativeYield`, etc.
- [F] `AcEdOpenMode { Read=0, Review=4, Write=8 }` — `packages/cad-simple-viewer/src/editor/view/AcEdOpenMode.ts:18-25`.
- [F] Singleton: `AcApDocManager.createInstance(options: AcApDocManagerOptions)` (l.686) / `AcApDocManager.instance` (l.709); opções incluem `baseUrl`, `preloadDefaultFonts`, `webworkerFileUrls`, `useMainThreadDraw`.

### 2.2 DWG (LibreDWG)
- [F] Registo: `registerLibreDwgConverter(parserWorkerUrl)` em `packages/cad-viewer-example/src/registerLibreDwg.ts:12-19` → `new AcDbLibreDwgConverter({ convertByEntityType:false, useWorker:true, parserWorkerUrl })` → `AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, converter)`. Cópias equivalentes em `cad-simple-viewer-example/src/registerLibreDwg.ts:11-18` e `cad-diff-viewer-example/src/registerLibreDwg.ts:16-23`.
- [F] Chamado em `packages/cad-viewer-example/src/main.ts:13` **antes** de montar o viewer, com `./assets/${LIBREDWG_PARSER_WORKER_FILE}`.
- [F] Constantes em `packages/cad-simple-viewer/src/app/AcApWorkerAssets.ts`: `LIBREDWG_PARSER_WORKER_FILE='libredwg-parser-worker.js'` (l.17), `LIBREDWG_PARSER_WASM_FILE='libredwg-web.wasm'` (l.23), `MTEXT_RENDERER_WORKER_FILE='mtext-renderer-worker.js'` (l.26), `LIBREDWG_CONVERTER_PACKAGE='@mlightcad/libredwg-converter'` (l.41).
- [F] Cópia de assets: `packages/cad-viewer-example/vite.config.ts:163-195` copia worker + wasm de `node_modules/${LIBREDWG_CONVERTER_PACKAGE}/dist`.
- [F] Lockfile: `@mlightcad/libredwg-converter@3.15.7` depende de `@mlightcad/libredwg-web@0.8.0` (`pnpm-lock.yaml:2197-2204`, `8110-8115`); override `^3.15.7` em `pnpm-workspace.yaml`.
- [F] `PROPRIETARY-PARSER.md:134` declara `libredwg-web` / `@mlightcad/libredwg-converter` como **GPL-3.0**; `packages/cad-simple-viewer/README.md:87` e `README.md:461` confirmam que `cad-simple-viewer` não depende nem regista o conversor.
- [H] SPDX exacto (`GPL-3.0-only` vs `GPL-3.0-or-later`) dos dois pacotes e licença do código LibreDWG compilado no wasm — **verificar em L1** lendo `package.json`/`LICENSE` dos tarballs. A recomendação D-6 (`GPL-3.0-or-later`) é compatível com ambos.
- [F] Não existe nenhum `.dwg` versionado (scoping §4; `find` fora de `node_modules` = 0).

### 2.3 FIND
| Símbolo | Local [F] | Uso no MVP |
|---|---|---|
| `acapFindText(db, query, {matchCase, scope, currentLayoutId, maxResults})` → `AcApFindDrawingResult {hits: AcApFindLayoutHit[], truncated}` | `packages/cad-simple-viewer/src/find/findDrawing.ts:109-147` (tipos l.39-51) | pesquisa do `find` |
| `acapListFindLayouts(db)` → `{name, btrId, tabOrder}[]` | `findDrawing.ts:82-99` | `opened.layouts` |
| `acapFindHitBox` | `findDrawing.ts:167-211` | (interno à navegação) |
| `acapFindTextInLayout` | `packages/cad-simple-viewer/src/find/findText.ts:294-579` | (interno) |
| `AcApFindHit` (`entityId`, `textEntityId`, `kind`, `text`, `tag?`, `blockName?`, `layer`, `position`, `extents?`) | `findText.ts:60-88` | projecção para `findResult` |
| `AcApFindDatabaseLike` | `findText.ts:102-119` | fakes nos testes |
| `ACAP_FIND_MAX_RESULTS = 500` | `findText.ts:35` | limite por omissão |
| `acapFindExcerpt` | `findText.ts:582-595` | `excerpt` dos hits |
| `acapNavigateToFindHit(editor, hit, {activateLayout, margin=1.1, idleTimeoutMs=15000, insets})` → `AcApFindNavigateResult` | `packages/cad-simple-viewer/src/find/AcApFindNavigator.ts:148-190` (tipo l.112-128) | `goto` |
| `zoomToVisible` (respeita `insets`) | `AcApFindNavigator.ts:55-111` | zoom para o hit |
| `useFind` (`search` l.72, `refresh` l.103, `navigateTo` l.112, `submit` l.141; wrap `(activeIndex + (backwards ? count-1 : 1)) % count` l.156) | `packages/cad-viewer/src/composable/useFind.ts:25-176` | semântica de referência para next/prev |
| Export público | `packages/cad-simple-viewer/src/find/index.ts`; alias jest `^@mlightcad/cad-simple-viewer/find$` (`jest.config.ts:33`) | import do bridge |

[F] Propriedades: pesquisa sobre a base de dados (não sobre a cena) e funciona em layouts nunca abertos (`findDrawing.ts:101-108`); `acapNavigateToFindHit` já descarta navegações obsoletas (`'stale'`, `navigationTokens`) e selecciona via `view.selectionSet.clear()` + `add(hit.entityId)`.

### 2.4 Zoom
- [F] `AcTrView2d.zoomTo(box, margin=1.1)` — `packages/cad-simple-viewer/src/view/AcTrView2d.ts:1732-1735`.
- [F] `AcTrView2d.zoomToFitDrawing(timeout=0, layoutBtrId?)` — `AcTrView2d.ts:1790-1810` (é o que `AcApZoomCmd.zoomToExtents`, `packages/cad-simple-viewer/src/command/AcApZoomCmd.ts:125-128`, chama).
- [F] **Não existe `zoomIn`/`zoomOut` público** (grep em `three-renderer/src` e `cad-simple-viewer/src`: 0). O zoom relativo existe só como privado `AcApZoomCmd.applyRelativeScale` (`AcApZoomCmd.ts:278-307`), construído sobre API pública: `view.screenToWorld({x,y})`, `view.width`, `view.height` e `view.zoomTo(box, 1)` (ver `captureViewBoxFromView`, l.92-99). O bridge replica esta fórmula (§5.5) — resolve U-7 do scoping.
- [F] `view.selectionSet.clear()` existe e é usado (`AcTrView2d.ts:742-755`) — base de `clearHighlight`.

### 2.5 Rede/offline
- [F] `DEFAULT_BASE_URL = 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data'` (`AcApDocManager.ts:138`), usado por omissão para `baseUrl` (l.534) e para fontes (`resolveFontsBaseUrl()` → `AcApFontLoader.baseUrl` / `FontManager.instance.baseUrl`, l.590-600). **Por omissão, fontes vão à rede** → o bundle mobile tem de fornecer `baseUrl` local e empacotar as fontes necessárias (§6.3). Resolve parcialmente U-6; a lista mínima de fontes é [H] (B2/S1).
- [F] `IS_OFFLINE_BUILD` não existe em `packages/` nem `tools/` (0 ocorrências); `b5ca1246` não é ancestral de HEAD (`git merge-base --is-ancestor` → 1). O "offline" do MVP é construído aqui (B2), não herdado.

### 2.6 Toolchain/monorepo
- [F] Workspace pnpm = `packages/*` apenas (`pnpm-workspace.yaml`); um directório `apps/` fica fora do workspace.
- [F] `jest.config.ts` (raiz) não restringe `roots`; ignora só `/e2e/` e `/__tests__/helpers/` → testes dentro de `apps/` seriam apanhados pelo jest da raiz. B1 tem de acrescentar `/apps/` a `testPathIgnorePatterns`.
- [F] `eslint.config.js:54` ignora `node_modules`, `dist`, `public`, `.nuxt` — `apps/freedom-mobile/node_modules` cai em `node_modules`; código do app só é lintado se o `nx run-many -t lint` o encontrar (não encontra, não é projecto nx) [H: confirmar em B1].
- [F] `docs/` é fonte do site vitepress (`docs:build`) → este documento e o scoping podem ser publicados com o site; ver higiene §9.

## 3. Arquitectura alvo

```
┌──────────────────────── apps/freedom-mobile (Expo, RN, GPL-3.0-or-later) ───────────────────────┐
│  Ecrãs nativos: Abrir · FIND (input/lista/prev/next) · Zoom · Partilhar · Acerca/Licenças         │
│  BridgeClient (TS): envelope v1, correlação id/replyTo, timeouts, fila até `ready`               │
│  FilePipeline: expo-document-picker → cache → validação ext/tamanho → servidor local | base64    │
│  LocalAssetServer [H S1]: serve viewer-bundle/ + ficheiro aberto em http://127.0.0.1:<porta>     │
│      │ injectJavaScript("window.__cadBridge.receive(<json>);true;")   ▲ onMessage(string JSON)     │
└──────┼────────────────────────────────────────────────────────────────┼───────────────────────────┘
       ▼                                                                │
┌──────────────── react-native-webview (WKWebView / Android WebView) ──┼───────────────────────────┐
│  viewer-bundle/ = build de packages/cad-mobile-viewer (HTML+JS+workers+wasm+fontes)              │
│   bridge/transport.ts  ── window.__cadBridge.receive / window.ReactNativeWebView.postMessage     │
│   bridge/dispatcher.ts ── handleBridgeMessage(msg, deps) PURO                                     │
│   bridge/adapters.ts   ── AcApDocManager.openDocument · acapFindText · acapNavigateToFindHit ·   │
│                           AcTrView2d.zoomTo/zoomToFitDrawing · selectionSet.clear               │
│   registerDwg.ts       ── AcDbLibreDwgConverter (worker+wasm locais)                             │
│   pacotes upstream INALTERADOS: cad-simple-viewer, three-renderer, data-model, libredwg-*       │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Componentes e localização
| Componente | Caminho | Estado | Notas |
|---|---|---|---|
| App Expo | `apps/freedom-mobile/` | novo (B1) | gestor de pacotes próprio (npm, `package-lock.json` local) para não tocar em `pnpm-lock.yaml`; Expo SDK fixado em B1 (U-11) |
| Bundle do viewer | `packages/cad-mobile-viewer/` | novo (B2) | depende só de `@mlightcad/cad-simple-viewer`, `@mlightcad/data-model`, `@mlightcad/libredwg-converter`; **sem** Vue/element-plus, sem `cad-simple-ui-plugin`, agent, cloud, diff, export (U-12: shell mínimo) |
| Bridge | `packages/cad-mobile-viewer/src/bridge/{protocol,dispatcher,adapters,transport}.ts` | novo (I1/I2) | dispatcher puro, testável em jest/node |
| Registo DWG | `packages/cad-mobile-viewer/src/registerDwg.ts` | novo (B2) | mesma forma de `cad-viewer-example/src/registerLibreDwg.ts`; não importa o ficheiro do example |
| Artefacto embutido | `apps/freedom-mobile/assets/viewer-bundle/` | gerado (B2/I2) | produzido pelo build de `cad-mobile-viewer`; **não** versionado (gitignore) — gerado por script `apps/freedom-mobile/scripts/sync-viewer-bundle.mjs` |
| Ecrã Acerca/Licenças | `apps/freedom-mobile/src/screens/AboutLicenses.tsx` + `apps/freedom-mobile/assets/licenses/*` | novo (L2) | §8.2 |

[H] A alternativa "repo separado" para o app fica aberta em B0 (decisão local do Kevin, não externa); se escolhida, só muda o caminho de `apps/freedom-mobile/` e o script de sincronização do bundle.

### 3.2 Fronteiras de integração (o que cada card pode tocar)
- **Permitido**: `apps/freedom-mobile/**`, `packages/cad-mobile-viewer/**`, `docs/OBJ-0104-*.md`, `jest.config.ts` (só `testPathIgnorePatterns`/`moduleNameMapper` para o novo pacote), `.gitignore` (bundle gerado), `pnpm-lock.yaml` **apenas** pela adição do pacote `cad-mobile-viewer` com deps já presentes no workspace.
- **Proibido**: alterar `packages/cad-simple-viewer/src/find/*`, `AcApDocManager.ts`, `AcTrView2d.ts`, `three-renderer`, `data-model`, overrides de `pnpm-workspace.yaml`, versões de `libredwg-*`; usar `tools/use-dwg-converter.mjs`; adicionar `@mlightcad/dwg-converter`.
- Se uma necessidade só puder ser resolvida dentro de um pacote upstream (p.ex. tornar `applyRelativeScale` público), o card **pára e reporta** em vez de alterar o pacote — decisão do Kevin, nunca PR/issue upstream (D-5).

### 3.3 Não-acção upstream (explícito)
Nenhum card abre issue/PR/discussão em `mlightcad`, envia e-mail ao titular, sincroniza com `fork/main`, ou publica pacotes `@mlightcad/*`. Actualizações de `@mlightcad/*` só por decisão do Kevin e fora deste plano.

## 4. Âmbito DWG/DXF v1

| Tema | Dentro de v1 | Fora de v1 |
|---|---|---|
| Formatos | `.dxf` (parser MIT), `.dwg` (LibreDWG wasm em worker) | `.dwf`, `.pdf`, xrefs externos, imagens raster referenciadas |
| Versões DWG | as suportadas por `libredwg-web@0.8.0` [H: matriz real só com fixtures, T2] | garantia de cobertura total de entidades (README.md:228 admite cobertura limitada) |
| Tamanho | limite inicial **[H] 20 MB DXF / 10 MB DWG**, recalibrado em S2; acima → `openFailed{code:'too-large'}` | ficheiros acima do limite medido |
| Modo | `AcEdOpenMode.Read`, `openViewMode: Extents` | edição, gravação, markup, medições |
| Layouts | todos os layouts listados (`acapListFindLayouts`); FIND em todos | impressão/plot |
| FIND | texto, MTEXT, atributos, texto em blocos (o que `acapFindTextInLayout` cobre) | substituir, regex, pesquisa em xrefs |
| Rede | zero pedidos externos em runtime | cloud, contas, IA, telemetria |

## 5. Protocolo app ↔ viewer (v1)

### 5.1 Transporte e envelope
- [F, docs react-native-webview via Context7 no scoping] Web→app: `window.ReactNativeWebView.postMessage(string)` (só existe com `onMessage` definido; um argumento string). App→web: `webviewRef.current.injectJavaScript(script)` terminado em `true;`.
- [D] Payload sempre JSON. App→web: `injectJavaScript("window.__cadBridge.receive(" + JSON.stringify(JSON.stringify(msg)) + ");true;")` (duplo stringify = literal JS seguro).
- [D] Envelope: `{ v: 1, id: string, type: string, replyTo?: string, payload: object }`. `id` = contador monotónico por lado com prefixo (`a-12`, `w-7`). Respostas levam `replyTo`.
- [D] Versão: mensagem com `v !== 1` → `error{code:'unsupported-version'}`; `type` desconhecido → `error{code:'unknown-type'}`; nunca lança.
- [D] Antes de `ready`, o app enfileira (máx. 1 `open` pendente; o mais recente substitui). Timeout de `ready`: **[H] 15 s** → ecrã de erro "viewer não arrancou" com botão Recarregar.

### 5.2 Mensagens
| Dir. | `type` | `payload` | Implementação (bridge/adapters.ts) |
|---|---|---|---|
| web→app | `ready` | `{viewerVersion, protocol:1, caps:['find','dwg','dxf'], dwg:'ok'\|'unavailable'}` | após `AcApDocManager.createInstance(...)` e `registerDwg()`; `dwg:'unavailable'` se o worker/wasm não carregar (§6.4) |
| app→web | `open` | `{name, size, source:{kind:'url',url}\|{kind:'base64',data}}` | valida extensão (`.dwg`/`.dxf`, case-insensitive) **antes** de `openDocument` (porque `AcApDocument.ts:154` trata o resto como DXF); `fetch(url)`→`ArrayBuffer` ou decode base64; `AcApDocManager.instance.openDocument(name, buf, {mode: AcEdOpenMode.Read, openViewMode: AcApOpenViewMode.Extents})` |
| web→app | `opened` | `{name, format:'dwg'\|'dxf', layouts:[{name,btrId,tabOrder}], activeLayoutId}` | `acapListFindLayouts(db)`; `view.activeLayoutBtrId` |
| web→app | `openFailed` | `{code, message}`; `code ∈ 'unsupported-ext'\|'too-large'\|'read-failed'\|'parse'\|'dwg-unavailable'\|'oom'\|'timeout'` | `openDocument` → `false` ⇒ `parse`; excepção ⇒ `parse` (ou `oom` se `RangeError`/mensagem de memória [H]); `dwg-unavailable` se `.dwg` e `ready.dwg='unavailable'` |
| app→web | `find` | `{query, matchCase, scope:'drawing'\|'layout', maxResults?}` | `acapFindText(db, query, {matchCase, scope, currentLayoutId: view.activeLayoutBtrId, maxResults})`; guarda `hits` no estado do bridge; `activeIndex=-1` |
| web→app | `findResult` | `{findId, total, truncated, layoutCount, hits:[{index, text, excerpt, layoutName, layoutId, layer, kind, tag?, blockName?}]}` | projecção sem `entityId`/`extents`/`position` (ficam no lado web, chaveados por `index`) |
| app→web | `goto` | `{findId, index, insets?:{left,right,top,bottom}}` | `acapNavigateToFindHit(AcApDocManager.instance, hits[index], {insets})` |
| app→web | `findNext` / `findPrev` | `{findId, insets?}` | `next = activeIndex<0 ? 0 : (activeIndex + (backwards ? count-1 : 1)) % count` — regra exacta de `useFind.submit` ([F] `useFind.ts:152-156`; com `activeIndex<0` vai a 0 em ambos os sentidos) → `goto` interno; com 0 hits responde `findActive{index:-1}` sem navegar |
| web→app | `findActive` | `{findId, index, outcome: AcApFindNavigateResult}` | resultado de `acapNavigateToFindHit`; `'stale'` é reportado mas a UI ignora-o |
| app→web | `zoom` | `{op:'in'\|'out'\|'extents', factor?}` | §5.5 |
| app→web | `clearHighlight` | `{}` | `view.selectionSet.clear()` |
| app→web | `setInsets` | `{left,right,top,bottom}` | guarda insets correntes (teclado/painel FIND) para `goto`/`find*` sem insets explícitos |
| web→app | `error` | `{code, message, replyTo?}` | protocolo inválido; nunca lança |
| web→app | `log` | `{level:'debug'\|'info'\|'warn'\|'error', message}` | diagnóstico; o app filtra em release |

Regras: `findId` incrementa a cada `find`; `goto`/`findNext`/`findPrev` com `findId` diferente do actual → `error{code:'stale-find'}` (sem navegar). Nenhuma mensagem de edição, cloud, conta ou IA existe no protocolo; extensões futuras são aditivas e mantêm `v:1` enquanto compatíveis.

### 5.3 Fluxo de abertura de ficheiro
1. Botão nativo "Abrir" → `expo-document-picker.getDocumentAsync({ copyToCacheDirectory: true, type: '*/*' })` (MIME de DWG é inconsistente entre plataformas — [F] scoping §7) → filtrar por extensão `.dwg`/`.dxf` no app; outra extensão → mensagem local, nada enviado ao viewer.
2. Tamanho via `expo-file-system` → acima do limite (§4) → mensagem local (`too-large`).
3. Entrega: **preferido** `source.kind='url'` servido pelo `LocalAssetServer` (mesma origem do bundle → sem CORS, Workers e `fetch` do wasm funcionam) — [H] escolha validada em S1 (U-3/U-4). **Fallback** `base64` só abaixo de **[H] 8 MB** (medido em S2).
4. Viewer responde `opened` ou `openFailed`. O app mostra overlay de progresso entre `open` e a resposta; timeout **[H] 120 s** → `timeout`.
5. "Abrir com…" do SO (intent filters/document types) está **fora** do MVP (U-8).

### 5.4 Modelo de resultados FIND (UI nativa)
- Estado no app: `{findId, query, matchCase, scope, total, truncated, layoutCount, hits[], activeIndex}`.
- Lista agrupada por `layoutName` (ordem dos hits = ordem dos layouts por `tabOrder`, [F] `acapFindText`), contador `activeIndex+1 / total`, aviso "resultados limitados a N" quando `truncated`.
- Enter/"Seguinte" = `findNext`; "Anterior" = `findPrev`; toque num item = `goto`. Nova pesquisa invalida a anterior (`findId`).
- Submeter uma pesquisa nova envia `find` e, se `total > 0`, `goto{index:0}` — o mesmo comportamento de `useFind.submit` quando a query muda ([F] `useFind.ts:147-150`: `search()` seguido de `navigateTo(0)`; alinhado com #734 "jump to first hit").
- `findActive.outcome`: `navigated` → marca item; `layout-missing`/`layout-switch-failed` → toast "layout indisponível" e mantém lista; `no-document` → volta ao ecrã Abrir; `stale` → ignorado.

### 5.5 Zoom e realce
- `extents` → `view.zoomToFitDrawing()` (mesma chamada de `AcApZoomCmd.zoomToExtents`).
- `in`/`out` → no adapter: `box = {screenToWorld(0,0), screenToWorld(width,height)}`; centro mantido; meia-largura/altura divididas por `factor` (por omissão `in=2`, `out=0.5`); `view.zoomTo(target, 1)` — réplica de `AcApZoomCmd.applyRelativeScale` com API pública apenas.
- Pinch/pan: gestos tocam directamente o canvas dentro da WebView (handlers pointer/touch existentes do viewer) [H: confirmar em S1 que a WebView não intercepta pinch — no iOS pode exigir desactivar zoom da página com `<meta name="viewport" content="…, user-scalable=no">` no HTML do bundle].
- Realce: `acapNavigateToFindHit` já faz `selectionSet.clear()` + `add(entityId)`; `clearHighlight` limpa ao fechar o painel FIND.
- `insets`: o painel FIND e o teclado ocupam o fundo do ecrã; o app envia `setInsets` (em px CSS do WebView, i.e. dp) sempre que mudam, para `zoomToVisible` enquadrar o hit na área visível.

## 6. Ponte nativa / offline

### 6.1 Origem do bundle (U-3)
Ordem de preferência a validar em S1, decisão registada com evidência:
1. **Servidor HTTP local in-app** em `127.0.0.1` a servir `viewer-bundle/` e o ficheiro aberto (origem http → Workers, wasm, `fetch` normais). [H] biblioteca concreta escolhida em S1 entre as compatíveis com o SDK fixado em B1 (módulo nativo → exige development build, já previsto).
2. Esquema custom/`file://` com `allowFileAccess` (Android) e `allowingReadAccessToURL` (iOS) — só se (1) falhar; risco conhecido de Workers/wasm em `file://` (scoping R-1).
3. `source={{html}}` inline — rejeitado para v1 (workers e wasm não carregam de forma fiável a partir de `about:blank`).

### 6.2 Bootstrap do viewer (`packages/cad-mobile-viewer/src/main.ts`)
1. `registerDwg('./assets/' + LIBREDWG_PARSER_WORKER_FILE)` em try/catch (§6.4).
2. `AcApDocManager.createInstance({ container, baseUrl: './assets/cad-data/', preloadDefaultFonts: false|true [H B2], webworkerFileUrls: {…locais…} })` — **nunca** o `DEFAULT_BASE_URL` jsdelivr.
3. `installBridge(window, deps)` → define `window.__cadBridge.receive` e envia `ready`.
4. Sem `cad-simple-ui-plugin`, sem i18n de UI web (a UI é nativa); `AcApDocManager` sem toolbar.

### 6.3 Conteúdo do bundle offline
`index.html`, JS do viewer, `assets/libredwg-parser-worker.js`, `assets/libredwg-web.wasm`, `assets/mtext-renderer-worker.js`, `assets/cad-data/fonts/*` (subconjunto mínimo [H B2]: as fontes que `AcApFontLoader` pede para os fixtures DXF de `e2e/fixtures` + 1 fonte de fallback). B2 produz `viewer-bundle/MANIFEST.json` com nome, bytes e sha256 de cada ficheiro e licença de origem (alimenta L1/L2).

### 6.4 Falhas e rollback
| Falha | Comportamento | Rollback |
|---|---|---|
| worker/wasm DWG não carrega | `ready{dwg:'unavailable'}`; `.dwg` → `openFailed{code:'dwg-unavailable'}` com texto "DWG indisponível neste dispositivo; DXF continua a funcionar" | nenhum: DXF segue; não se troca de parser (D-2) |
| `ready` não chega | ecrã de erro + Recarregar (recria a WebView) | — |
| `openDocument` falha | `openFailed{code:'parse'}`; documento anterior **mantém-se** se existir (o `AcApDocManager` só fecha a sessão nova — [F] `closeFailedOpenSession` em `openDocument`) | — |
| OOM / crash da WebView (`onContentProcessDidTerminate` iOS, `onRenderProcessGone` Android) | ecrã "ficheiro demasiado grande para este dispositivo" + recarregar WebView vazia | baixar limite em S2 |
| Pedido de rede detectado em T2 | bug bloqueante de T2 | corrigir `baseUrl`/assets no bundle |
| Card falha a meio | commit apenas no fim do card; branch do card descartável; nenhum card altera pacotes upstream, logo reverter = `git revert` do commit do card | — |

## 7. Estratégia FIND (técnica e de testes)
1. **Reutilizar, não reimplementar**: o bridge importa `acapFindText`, `acapListFindLayouts`, `acapNavigateToFindHit` de `@mlightcad/cad-simple-viewer/find`; apenas o ciclo next/prev (3 linhas de `useFind.submit`) é replicado no dispatcher — `useFind` é Vue (`packages/cad-viewer`) e não entra no bundle.
2. **Dispatcher puro** `handleBridgeMessage(msg, state, deps) → {state, out: Msg[]}` com `deps = {openDocument, getDb, getView, findText, listLayouts, navigate, zoom}` → testável em jest/node com `AcApFindDatabaseLike` falso e com a DB real de `find-text.dxf` (como `packages/cad-simple-ui-plugin/__tests__/findText.spec.ts` já faz).
3. **Cobertura obrigatória em T1**: sem match; 1 match; multi-layout (`find-layouts.dxf`: Model, Planta, Alçados); texto em bloco (`find-blocks.dxf`, CARIMBO); `truncated` (`maxResults:1`); wrap next/prev nos dois sentidos; `stale-find`; `layout-missing`; versão/type desconhecidos; extensão inválida.
4. **E2E browser**: página de teste do bundle com `window.ReactNativeWebView` simulado (array de mensagens) em Playwright, reutilizando o padrão de `packages/cad-viewer-example/e2e/` — opcional em T1, obrigatório em T2 se o emulador falhar.
5. **DWG no FIND**: o mesmo caminho (a DB convertida é a mesma interface); validado em T2 **só** com o fixture [EXT] (§10). Sem fixture, T2 regista "DWG: não verificado (fixture em falta)" — nunca "passou".

## 8. Licenciamento (não-gate) e ecrã nativo "Acerca/Licenças"

### 8.1 Recomendação
- [D] `apps/freedom-mobile` e `packages/cad-mobile-viewer`: `GPL-3.0-or-later` (campo `license` + ficheiro `LICENSE` com texto GPL-3.0 + cabeçalho SPDX nos ficheiros novos). Compatível com GPL-3.0 e com MIT (código mlightcad incorporado mantém os seus avisos MIT).
- O artefacto distribuído (app com wasm LibreDWG) é tratado como obra combinada sob GPL-3.0: oferta de código-fonte correspondente obrigatória na distribuição (L2/L3). **Isto não é parecer jurídico** (§10, EXT-2).
- Nenhuma decisão de licença bloqueia I*/T* (D-1).

### 8.2 Conteúdo do ecrã nativo "Acerca/Licenças" (L2)
Acessível pelo menu principal; funciona offline; texto em PT-PT (EN opcional). Secções:
1. **Acerca** — nome "Freedom DWG/CAD Viewer", versão da app e `viewerVersion` (de `ready`), SHA de build, "Visualizador offline de DWG/DXF; não envia ficheiros para nenhum serviço".
2. **Licença desta app** — "Este programa é software livre: pode redistribuí-lo e/ou modificá-lo nos termos da GNU General Public License, versão 3 ou (à sua escolha) qualquer versão posterior… SEM QUALQUER GARANTIA…" + botão "Ver texto completo da GPL-3.0" (ficheiro local `assets/licenses/GPL-3.0.txt`).
3. **Código-fonte** — texto da oferta de fonte com URL do repositório **apenas quando EXT-1 estiver resolvido**; até lá, o ecrã mostra o placeholder `SOURCE_URL_PENDING` e o build de loja é bloqueado pelo L3 (não pelo desenvolvimento).
4. **Créditos e avisos de terceiros** (gerado do inventário L1, nunca escrito à mão):
   - **mlightcad / cad-viewer** — MIT, "Copyright (c) 2026 mlightcad" ([F] `LICENSE`), texto MIT completo; pacotes `@mlightcad/cad-simple-viewer`, `@mlightcad/three-renderer`, `@mlightcad/data-model`, `@mlightcad/mtext-renderer` (e restantes efectivamente no bundle).
   - **LibreDWG** (via `@mlightcad/libredwg-web` e `@mlightcad/libredwg-converter`) — GPL-3.0 [H: `-only` vs `-or-later` confirmado em L1], "Copyright © Free Software Foundation, Inc." [H: linha exacta copiada do `LICENSE`/`AUTHORS` do tarball em L1], link para o projecto LibreDWG e para a fonte correspondente do wasm.
   - **three.js** (MIT), **React Native / Expo / react-native-webview** e demais dependências do app — licença e aviso de cada uma conforme L1.
   - Fontes empacotadas (§6.3) — licença de cada fonte [H B2/L1]; fonte sem licença conhecida **não entra** no bundle.
5. **Marcas** — "DWG é um formato; esta app não é afiliada à Autodesk nem ao projecto mlightcad."
6. **Privacidade** — "Sem rede, sem contas, sem telemetria."

Formato dos dados: `apps/freedom-mobile/assets/licenses/third-party.json` (`[{name, version, license, copyright, url, text}]`) gerado por `apps/freedom-mobile/scripts/generate-licenses.mjs` a partir do inventário L1 + `viewer-bundle/MANIFEST.json`.

## 9. Higiene para publicação pública
- Nenhum segredo, token, e-mail pessoal, chave de assinatura, `google-services.json`/credenciais EAS ou URL interna em ficheiros versionados; `apps/freedom-mobile/.gitignore` cobre `.env*`, `*.keystore`, `*.p8`, `*.p12`, `*.jks`, `credentials.json`.
- Nenhum caminho absoluto de máquina (`/home/…`, `C:\…`, `/mnt/…`) em código, docs novos, `MANIFEST.json` ou mensagens de erro do bundle. (Nota: `docs/OBJ-0104-scoping.md` §0 contém o caminho absoluto do workspace; a limpeza é um item de L3, não deste card.)
- Nenhuma referência a ferramentas/infra internas (Kanban, perfis de agentes) no app; logs `log` desligados em release.
- `docs/` alimenta o site vitepress: documentos OBJ-0104 só ficam no site se L3 o aprovar (senão, `srcExclude` ou mover — decisão L3).
- Scan obrigatório em L3: `git grep -nE '(/home/|/mnt/|C:\\\\Users|BEGIN (RSA|OPENSSH) PRIVATE|api[_-]?key|secret|token)' -- apps packages/cad-mobile-viewer docs/OBJ-0104-*` → zero ocorrências ou justificadas.

## 10. Dependências externas [EXT] e decisões pendentes

### 10.1 Externas (não são trabalho local; não bloqueiam desenvolvimento)
| ID | Dependência | Bloqueia | Não bloqueia |
|---|---|---|---|
| EXT-1 | Publicação eventual do repositório (URL pública para a oferta de fonte) | L3 / qualquer distribuição | B*–T2, L1, L2 (com placeholder) |
| EXT-2 | Parecer jurídico GPL-3.0 × termos App Store/Play | L3 / distribuição em loja | todo o desenvolvimento |
| EXT-3 | DWG fixture com proveniência documentada | verificação DWG em T2 (linha DWG fica "não verificado") | B*–I6, T1 (DXF), L* |

### 10.2 Evidência exigida para o DWG fixture (EXT-3)
O fixture só entra no repo (`packages/cad-mobile-viewer/test/fixtures/` ou `apps/freedom-mobile/test-fixtures/`) com `PROVENANCE.md` contendo: origem (autor/URL ou "criado pela equipa"), licença/autorização de redistribuição explícita, data, ferramenta e versão que o gerou (se gerado), versão DWG (`AC10xx`), tamanho em bytes, `sha256`, conteúdo textual esperado para FIND (ex.: 3 strings e o layout de cada) e confirmação de ausência de dados pessoais/clientes. Sem `PROVENANCE.md` completo, o ficheiro **não é commitado**. Gerar um DWG com ferramentas de terceiros ou obtê-lo de terceiros é decisão/acção do Kevin; a equipa não descarrega DWGs de origem desconhecida.

### 10.3 Decisões locais pendentes (Kevin; resolvidas no card indicado)
| ID | Pergunta | Default se não houver resposta | Card |
|---|---|---|---|
| P-1 (U-1) | Base do MVP: `e60893ce`/`main` vs branch com `b5ca1246` | `main` actualizado no momento de B0 (offline construído em B2) | B0 |
| P-2 (D-9) | `apps/freedom-mobile` neste repo vs repo separado | neste repo | B0 |
| P-3 (U-11) | Expo SDK alvo | o SDK estável mais recente suportado por `react-native-webview` no momento de B1 | B1 |
| P-4 (U-9) | Partilhar = ficheiro original ou lista de hits | ficheiro original | I6 |
| P-5 | Limites de tamanho DWG/DXF | os medidos em S2 com margem 2× | S2 |
| P-6 | Nome/ID de bundle das lojas | `pt.aitra.freedomviewer` [H] | B1 (só config local) |

## 11. Cards sequenciais

Gates: **G-tsc** = `pnpm --filter @mlightcad/cad-mobile-viewer exec tsc --noEmit` (viewer) ou `npx tsc --noEmit` em `apps/freedom-mobile`; **G-lint** = eslint do pacote tocado; **G-unit** = jest dirigido (`pnpm exec jest <paths>`); **G-git** = `git diff --check` + `git status --short` limpo + diff só dentro das fronteiras do card; **G-man** = verificação manual com evidência (screenshot/log anexados ao card). Cada card: um commit (ou poucos), nada fora das fronteiras, relatório com SHA.

Ordem: **B0 → B1 → B2 → S1 → I1/T1 → I2 → I3 → I4 → I5 → S2 → I6 → T2 → L1 → L2 → L3**. I1 e T1 são escritos no mesmo ciclo (TDD: T1 primeiro no mesmo card-par), mas mantêm-se como cards separados para atomicidade.

| ID | Tipo | Min | Depende | Fronteiras (toca / não toca) | Critérios de aceitação | Gate de verificação |
|---|---|---|---|---|---|---|
| **B0** | bootstrap | 30 | — | Toca: `docs/OBJ-0104-architecture.md` (anexo "Base fixada"). Não toca código. | P-1 e P-2 respondidos ou default aplicado e registado; SHA base escrito; confirmação de que `pnpm-workspace.yaml` continua `packages/*` | G-git; revisão do Kevin |
| **B1** | bootstrap | 90 | B0 | Toca: `apps/freedom-mobile/**` (novo; `package.json`, `package-lock.json`, `app.json`, `tsconfig.json`, `App.tsx`, `.gitignore`), `jest.config.ts` (só `testPathIgnorePatterns += '/apps/'`). Não toca `pnpm-lock.yaml`, `packages/**`. | Development build abre ecrã "olá" com `react-native-webview` a mostrar `about:blank` em Android emulador; iOS: idem **ou** registado "iOS não verificável neste ambiente" (WSL sem Xcode); versões SDK/RN/webview/picker/file-system/sharing anotadas; `pnpm test` da raiz não descobre testes em `apps/`; licença `GPL-3.0-or-later` no `package.json` | G-tsc (app); `pnpm exec jest --listTests \| grep -c /apps/` = 0; G-git; G-man (screenshot) |
| **B2** | bootstrap | 120 | B0 | Toca: `packages/cad-mobile-viewer/**` (novo: `package.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/registerDwg.ts`, `scripts/manifest.mjs`), `pnpm-lock.yaml` (só entrada do novo pacote), `.gitignore`. Não toca outros pacotes. | `pnpm --filter @mlightcad/cad-mobile-viewer build` gera `dist/` com worker+wasm LibreDWG, `mtext-renderer-worker.js`, fontes locais e `MANIFEST.json` (bytes+sha256+licença); servido por servidor estático desktop **com rede bloqueada** abre `minimal-line.dxf` e `find-layouts.dxf` (via hook de teste temporário `window.__openForTest` só em dev); zero pedidos a `cdn.jsdelivr.net` (DevTools Network); nenhum import de Vue/element-plus no bundle | G-tsc; G-lint; G-man (lista de pedidos de rede + tamanhos); G-git |
| **S1** | spike | 120 | B1, B2 | Toca: `apps/freedom-mobile/spike/**` (descartável) + `docs/OBJ-0104-architecture.md` (anexo "Decisão S1"). Não toca `packages/**`. | Em Android (e iOS se disponível): bundle carregado na WebView pela origem escolhida (§6.1), Worker e WebGL activos, `find-layouts.dxf` aberto offline (modo avião); DWG worker+wasm inicializa (sem DWG fixture: verificar só `ready.dwg='ok'`); pinch não é capturado pela página; decisões U-3/U-4/U-6 registadas com evidência | G-man (screenshots + logs); G-git |
| **I1** | impl | 120 | S1 | Toca: `packages/cad-mobile-viewer/src/bridge/{protocol,dispatcher,adapters}.ts`. Não toca `cad-simple-viewer/src/find/*`. | Tipos v1 de §5.2 exportados; `handleBridgeMessage` puro trata `open/find/findNext/findPrev/goto/zoom/clearHighlight/setInsets` e erros (§5.1); validação de extensão antes de `openDocument`; zoom in/out/extents conforme §5.5; next/prev igual a `useFind.submit` | G-tsc; G-lint; G-unit (T1) |
| **T1** | teste | 90 | I1 (mesmo ciclo) | Toca: `packages/cad-mobile-viewer/__tests__/**`, `jest.config.ts` (`moduleNameMapper` se necessário). Fixtures existentes só por leitura. | Casos de §7.3 todos presentes e verdes; teste de round-trip de serialização (duplo stringify) incluindo aspas, `\n`, `</script>` e emoji | G-unit (`pnpm exec jest packages/cad-mobile-viewer`); G-git |
| **I2** | impl | 90 | I1, T1 | Toca: `packages/cad-mobile-viewer/src/bridge/transport.ts`, `src/main.ts`; `apps/freedom-mobile/src/bridge/BridgeClient.ts`, `scripts/sync-viewer-bundle.mjs`, ecrã WebView. | Handshake `ready → open → opened` com `minimal-line.dxf` no emulador; fila pré-`ready`; timeout de `ready` mostra erro; `error` para JSON inválido; teste jest do `BridgeClient` com WebView mockada | G-tsc (ambos); G-unit (app); G-man; G-git |
| **I3** | impl | 120 | I2 | Toca: `apps/freedom-mobile/src/screens/Find*.tsx`, `src/state/find.ts`. Não toca viewer. | UI FIND de §5.4: input, matchCase, scope, lista agrupada, contador, anterior/seguinte, truncado, vazio, erro; Enter = seguinte; toque = `goto`; `setInsets` enviado quando teclado/painel mudam; testes jest do reducer `find.ts` | G-tsc; G-unit; G-man com `find-layouts.dxf` (3 layouts) e `find-blocks.dxf`; G-git |
| **I4** | impl | 60 | I3 | Toca: `apps/freedom-mobile/src/components/ZoomControls.tsx`; ajustes em `adapters.ts` só para zoom. | Botões +/−/extents funcionam; hit fica visível acima do painel FIND (insets); `clearHighlight` ao fechar FIND; pinch/pan continuam a funcionar | G-tsc; G-unit (adapter zoom com view fake); G-man; G-git |
| **I5** | impl | 120 | I4 | Toca: `apps/freedom-mobile/src/files/**`, `LocalAssetServer` conforme S1, ecrã Abrir. | Picker abre `.dxf` e `.dwg`; extensão inválida e `too-large` tratadas localmente; overlay de progresso; `openFailed` mapeado para mensagens PT-PT; falha preserva documento anterior; DWG: `ready.dwg='unavailable'` mostra mensagem de §6.4 | G-tsc; G-unit (validação ext/tamanho); G-man; G-git |
| **S2** | spike | 60 | I5 | Toca: `docs/OBJ-0104-architecture.md` (anexo "Medições S2"). | Tempo de abertura e pico de memória para `minimal-line`, `block-color` (0,6 MB), `sheet_0` (1,9 MB) em Android (+ iOS se disponível), e para o DWG fixture se EXT-3 resolvido; limites P-5 fixados; fallback base64 confirmado ou removido | G-man (tabela de medições); G-git |
| **I6** | impl | 60 | S2 | Toca: `apps/freedom-mobile/src/share/**`. | `expo-sharing.shareAsync(uri)` partilha o ficheiro aberto (P-4); sem upload; botão desactivado sem documento | G-tsc; G-man; G-git |
| **T2** | teste | 120 | I6 | Toca: `docs/OBJ-0104-test-matrix.md` (novo). | Matriz por SO: modo avião; DXF pequeno/médio/grande; FIND em todos os layouts; next/prev wrap; zoom; partilha; falhas (§6.4); **zero pedidos externos** (proxy/log); linha DWG = resultado real ou "não verificado (EXT-3)" | G-man (matriz preenchida com evidência); `pnpm exec jest packages/cad-mobile-viewer apps` verde; G-git |
| **L1** | licença | 60 | T2 | Toca: `docs/OBJ-0104-licenses-inventory.md` (novo). | Inventário de todas as deps do app (`npm ls --all --json`) e do bundle (`MANIFEST.json` + `pnpm --filter @mlightcad/cad-mobile-viewer licenses list --json`); SPDX exacto de `libredwg-web`/`libredwg-converter` lido do tarball; copyright exacto de LibreDWG; lista de deps sem licença ou incompatíveis com GPL-3.0 (deve ser vazia) | G-man (relatório); G-git |
| **L2** | licença | 120 | L1 | Toca: `apps/freedom-mobile/src/screens/AboutLicenses.tsx`, `assets/licenses/**`, `scripts/generate-licenses.mjs`, `LICENSE` (GPL-3.0) em `apps/freedom-mobile/` e `packages/cad-mobile-viewer/`. | Ecrã de §8.2 completo e offline; `third-party.json` gerado (não manual) inclui mlightcad MIT e LibreDWG GPL com texto integral; placeholder de fonte enquanto EXT-1 pendente; cabeçalhos SPDX `GPL-3.0-or-later` nos ficheiros novos | G-tsc; G-unit (gerador: falha se dependência sem licença); G-man; G-git |
| **L3** | licença | 90 | L2 (+ EXT-1, EXT-2 para concluir) | Toca: `docs/OBJ-0104-release-checklist.md` (novo); eventual `srcExclude` do vitepress se aprovado. | Checklist: T2 verde; scan de higiene §9 = 0; oferta de fonte com URL real (EXT-1); parecer jurídico anexado por referência (EXT-2); decisão sobre docs no site; **sem** submissão/publicação neste card | G-man; G-git. Estado "blocked (EXT)" é resultado válido |

Notas de sequência:
- FIND primeiro: I1/T1/I3 antecedem I4–I6 (D-4).
- Nenhum I*/T* depende de L* (D-1); L1–L2 podem correr em paralelo depois de T2 se houver capacidade, mas a ordem nominal mantém-se.
- Publicação (repo/loja) **não** é um card deste plano: só após T2 verde + L3 completo + EXT-1/EXT-2 resolvidos (D-7).

## 12. Riscos

| ID | Risco | Prob. | Impacto | Mitigação / card |
|---|---|---|---|---|
| R-1 | Workers/wasm não carregam na WebView a partir de origem local | média | alto | S1 com servidor local; fallback §6.1(2) |
| R-2 | OOM do wasm LibreDWG em dispositivos médios (README.md:228 admite memória alta) | alta | médio | limites S2; handlers de crash §6.4 |
| R-3 | Cobertura de entidades DWG limitada → desenhos incompletos | alta | médio | expectativa documentada no ecrã Acerca ("DWG via LibreDWG, cobertura parcial"); sem troca de parser (D-2) |
| R-4 | Fontes em falta offline → texto/MTEXT incorrecto e FIND sem impacto (FIND usa DB, não cena) | média | médio | subconjunto de fontes B2; matriz T2 |
| R-5 | Política das lojas incompatível com GPL | desconhecida | alto (só distribuição) | EXT-2; não afecta desenvolvimento |
| R-6 | Sem DWG fixture → DWG nunca verificado ponta-a-ponta | alta | médio | EXT-3; T2 reporta "não verificado" sem falsificar |
| R-7 | Jest/eslint da raiz apanham `apps/` | média | baixo | B1 (ignore + gate `--listTests`) |
| R-8 | Ambiente sem macOS/Xcode → iOS não verificado | alta | médio | registar explicitamente em B1/S1/T2; iOS fica pendente, não "ok" |
| R-9 | Pinch/gestos conflituam com a WebView | média | médio | S1 (`user-scalable=no`), I4 |
| R-10 | Linhas citadas mudarem com novos commits em `main` | média | baixo | cada card reconfirma símbolos via codebase-memory antes de editar |

## 13. Rastreabilidade com os critérios do card

| Critério | Onde |
|---|---|
| 1. Caminhos/símbolos reais; protocolo, ficheiro, resultados, zoom, FIND; F vs H | §2 (F), §5, §6, §7; marcadores [F]/[H] |
| 2. libredwg-web/converter e DWG+DXF v1; sem proprietário; sem acção upstream | D-2, D-3, D-5, §2.2, §3.2-3.3, §4 |
| 3. Cards sequenciais atómicos com fronteiras e gates | §11 |
| 4. Licença não-gate; GPL-3.0-or-later; ecrã Acerca/Licenças; sem promessa de publicação | D-1, D-6, D-7, §8 |
| 5. Higiene pública; externas separadas | §9, §10 |
| 6. Checkout limpo, `git diff --check`, SHA/base | relatório final do card (fora deste ficheiro) |
