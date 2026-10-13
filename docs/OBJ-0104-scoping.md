# OBJ-0104 — Scoping: app Expo mobile "Freedom DWG/CAD Viewer" (MVP)

Documento de scoping (apenas análise; nenhum código de produto, manifesto ou lockfile alterado; nada instalado; sem contacto com o upstream `mlightcad`).

## 0. Estado do workspace (reportado)

| Item | Valor |
|---|---|
| Workspace | `/home/kevin/work/cad-viewer/.worktrees/t_69c32932` |
| Branch | `cad-viewer/t_69c32932-obj-0104-scoping-expo-mobile-freedom-dwg` |
| HEAD de partida | `442a9195` (fix(find): jump to first hit from Find button and frame beside dock (#734)) |
| `main` local | `a39bab9b` (feat: add Google Drive data source plugin (#709)); HEAD é descendente de `main` (merge-base = `a39bab9b`, 10+ commits à frente, incl. FIND #725/#734) |
| Base citada no contrato do card | `b5ca1246` ("fix(example): restore IS_OFFLINE_BUILD import lost when merging self-host and offline branches") |
| `git status` à entrada | limpo |

**Divergência a registar (U-1):** `b5ca1246` existe como objecto no repo mas **não é ancestral do HEAD** (só alcançável por `remotes/fork/...`/`fork/main`), e `IS_OFFLINE_BUILD` **não existe** neste checkout (pesquisa em `packages/` e `tools/`: 0 ocorrências). Ou seja, o "viewer offline" referido no contrato (branches self-host/offline) **não está nesta árvore**. Este scoping parte de `442a9195`; a decisão sobre qual a base real do MVP está em §10. Qualquer card de implementação deve começar por fixar o SHA base (card B0).

Estado final (`git status --short`, `git diff --stat`, `git diff --check`) no §12.

## 1. Método

1. `list_projects` (codebase-memory): não havia projecto para `t_69c32932` → `index_repository` (fast) → `home-kevin-work-cad-viewer-.worktrees-t_69c32932` (14 842 nós / 55 325 arestas; TS 877, Vue 76).
2. `get_architecture`, `search_graph` (FIND), `search_code` (libredwg), `trace_path` (`acapFindText`, `acapNavigateToFindHit`).
3. Só depois `Read`/`grep`/`ls` para manifestos, fixtures e confirmação de código.
4. `check_index_coverage` nos 15 caminhos de evidência: 12 `no_recorded_issue`; **3 `excluded`/`not_tracked`** (`tools/use-dwg-converter.mjs`, `packages/cad-viewer-example/e2e/tests/find-layouts.spec.ts`, `packages/cad-simple-ui-plugin/__tests__/findText.spec.ts`) — dirs `tools`, `e2e`, `__tests__` fora do grafo; estas três foram lidas directamente da fonte.
5. Docs actuais via Context7 (`/react-native-webview/react-native-webview`, `/expo/expo`) para a ponte WebView.

Limitação do grafo: modo `fast`, sinal "best effort"; ficheiros `.vue` e `<script>` têm cobertura parcial de chamadas.

## 2. Mapa factual do viewer (entrypoints e scripts)

### 2.1 Monorepo
- `package.json` (raiz): `name: mlightcad`, MIT, `pnpm@10.33.4`, `engines.node >=24`, nx. Pacotes em `packages/*` (pnpm-workspace.yaml) — 17 pastas: `cad-viewer`, `cad-simple-viewer`, `cad-simple-ui-plugin`, `three-renderer`, `pdf-renderer`, `cad-viewer-example`, `cad-simple-viewer-example`, `cad-simple-viewer-cli`, `cad-html-plugin`, `cad-svg-plugin`, `cad-pdf-plugin`, `cad-agent-plugin`, `cad-diff-viewer(-example)`, `cad-google-drive-plugin`, `cad-onedrive-plugin`, `examples`, `vite-config`. Todos `1.7.5`, MIT.
- Overrides relevantes (`pnpm-workspace.yaml`): `@mlightcad/data-model ^1.15.7`, **`@mlightcad/libredwg-converter ^3.15.7`**, `three ^0.172.0`, `vue ^3.4.21`, `element-plus ^2.12.0`.
- Scripts raiz úteis ao MVP: `dev` (→ `@mlightcad/cad-viewer-example:dev`, vite), `preview`, `build` (nx run-many), `test` (jest), `test:e2e` (playwright no example), `use:dwg-converter` (`tools/use-dwg-converter.mjs`, troca GPL→proprietário), `cli`/`export:html`, `copy:workers` (`tools/copy-workers.mjs`).
- Exclusões a retirar do MVP: `cad-agent-plugin` (IA), `cad-google-drive-plugin`/`cad-onedrive-plugin` (cloud), edição/markup (comandos em `cad-simple-viewer/src/command`, `editor/`), `cad-diff-viewer`.

### 2.2 Entrypoints do app web (candidato a "payload" da WebView)
- `packages/cad-viewer-example/src/main.ts`: regista o conversor DWG **antes** de montar o viewer — `registerLibreDwgConverter('./assets/' + LIBREDWG_PARSER_WORKER_FILE)` — depois `createApp(App).use(ElementPlus).use(i18n).mount('#app')`.
- `packages/cad-viewer-example/src/registerLibreDwg.ts`: `new AcDbLibreDwgConverter({ convertByEntityType:false, useWorker:true, parserWorkerUrl })` → `AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, converter)`. **É o único ponto onde a GPL entra** (ver §7).
- `packages/cad-viewer-example/vite.config.ts` (≈ l.163-195): copia `LIBREDWG_PARSER_WORKER_FILE` e `LIBREDWG_PARSER_WASM_FILE` de `node_modules/<converter>/dist` para os assets.
- `packages/cad-viewer-example/package.json`: deps incluem `@mlightcad/libredwg-converter ^3.15.7`, plugins cloud/agent; scripts `dev`, `build` (`vue-tsc && vite build`), `copy:workers`, `test:e2e`.
- Componente Vue: `packages/cad-viewer/src/component/MlCadViewer.vue` (`openLocalFile(file: File)` ≈ l.372-408: `FileReader.readAsArrayBuffer` → `AcApDocManager.instance.openDocument(file.name, content, options)`); atalho Ctrl/Cmd+F → `openFindPalette` (`command/AcApFindCmd`).
- Núcleo sem Vue: `packages/cad-simple-viewer/src/app/AcApDocManager.ts` — `openUrl(url, options)` (l.1345), `openDocument(fileName, content: ArrayBuffer, options, view?)` (l.1386), `loadOverlay`. É a API que o protocolo vai envolver.
- Fluxo de abertura (existente): `File`/URL → `ArrayBuffer` → `AcApDocManager.openDocument` → `context.doc.openDocument` → conversor registado por extensão (`AcDbFileType`) — DXF pelo parser MIT do `@mlightcad/data-model`; DWG só se um conversor tiver sido registado (`cad-simple-viewer` não depende de nenhum — README §License).
- Nota "offline": o `IS_OFFLINE_BUILD`/self-host do contrato não existe aqui (U-1). O que existe de "offline-friendly": `npm` workers copiados localmente (`copy:workers`), `cad-html-plugin` (`AcExPackageLoader`, `packHtmlEmbeddedPackage`/`buildExport`) que empacota um viewer HTML embebido, e o CLI `cad-simple-viewer-cli` (`export:html`). Fontes/SHX continuam carregadas de URL por omissão → **a confirmar** (U-6).

## 3. FIND — símbolos e chamadores (prioridade preservada)

| Camada | Símbolo | Ficheiro:linhas |
|---|---|---|
| Pesquisa por layout | `acapFindTextInLayout` | `packages/cad-simple-viewer/src/find/findText.ts:294-579` |
| Normalização / texto | `acapNormalizeFindText` (130-139), `acapMTextToPlainText` (146-163), `acapFindExcerpt` (582-595), constante `ACAP_FIND_MAX_RESULTS` |
| Tipo do resultado | `AcApFindHit` (l.60-88): `entityId`, `textEntityId`, `kind`, `text`, `tag?`, `blockName?`, `layer`, `position{x,y}`, `extents?` |
| Pesquisa do desenho | `acapFindText(db, query, {matchCase, scope:'drawing'|'layout', currentLayoutId, maxResults})` → `{hits: AcApFindLayoutHit[], truncated}` | `findDrawing.ts:109-147` |
| Layouts | `acapListFindLayouts` | `findDrawing.ts:82-99` |
| Caixa de zoom | `acapFindHitBox` | `findDrawing.ts:167-211` |
| Navegação | `acapNavigateToFindHit(editor, hit, {activateLayout, margin, idleTimeoutMs, insets})` → `'navigated'|'no-document'|'layout-mismatch'|'layout-missing'|'layout-switch-failed'|'stale'` | `find/AcApFindNavigator.ts:148-190` (+ `zoomToVisible`) |
| Estado/UX (Vue) | `useFind(editor,{getInsets})`: `search`, `refresh`, `submit(backwards)`, `navigateTo(index)`, `activeIndex`, `truncated`, `layoutCount`, `unavailableLayout` | `packages/cad-viewer/src/composable/useFind.ts` |
| UI | `MlFindPalette.onFindClick` (cad-viewer); `AcUiFindPaletteView` (`search` l.105; `navigateTo`, `handleEnter`, `renderResults`) e `AcApSimpleUiPlugin.mountFindDockUi` (l.1348) em `cad-simple-ui-plugin` |
| Export público | `packages/cad-simple-viewer/src/find/index.ts` (`export * from findDrawing, findText`); alias `@mlightcad/cad-simple-viewer/find` |

Grafo (`trace_path`): `acapFindText` ← `useFind.search/refresh/submit/navigateTo` e `MlFindPalette.onFindClick`; callees `acapListFindLayouts`, `acapFindTextInLayout` (→ `visitBlock`, `matrixOf`, `pointOf`, `plainText`, `isLayerSearchable`…). `acapNavigateToFindHit` ← `useFind.navigateTo/submit`, `MlFindPalette.onFindClick`, `AcUiFindPaletteView.navigateTo/handleEnter/renderResults`; callees `acapFindHitBox`, `zoomToVisible`.

Propriedades que favorecem o MVP:
- `findDrawing.ts`/`findText.ts` são **TypeScript puro sobre forma estrutural da base de dados** (sem imports de runtime) — pesquisa na DB, **não** na cena renderizada; funciona em layouts nunca abertos.
- `submit()` já implementa o ciclo "Enter = próximo, Shift+Enter = anterior" com wrap modular; é a semântica a replicar no protocolo.
- Selecção/realce é feito por `view.selectionSet.add(hit.entityId)` (highlight batch em `three-renderer/src/batch/highlight/AcTrBatchHighlightShaders.ts`).

Testes FIND existentes: unit `packages/cad-simple-ui-plugin/__tests__/findText.spec.ts` (jest, ambiente node; mapeado em `jest.config.ts` por `^@mlightcad/cad-simple-viewer/find$`); e2e `packages/cad-simple-ui-plugin/__tests__/e2e/{find-text,find-layouts}.e2e.mjs`; e2e playwright `packages/cad-viewer-example/e2e/tests/{find-layouts,find-b11l1}.spec.ts`.

## 4. Fixtures (tipo, tamanho, abertura)

**Não há nenhum `.dwg` versionado** (`find . -iname '*.dwg'` fora de node_modules: 0). Todo o FIND testado hoje é sobre **DXF**.

| Ficheiro | Bytes | Uso |
|---|---|---|
| `packages/cad-simple-ui-plugin/__tests__/fixtures/find-text.dxf` | 2 199 | unit/e2e FIND |
| `packages/cad-viewer-example/e2e/fixtures/find-layouts.dxf` | 5 516 | FIND multi-layout (Model B*, Planta C*, Alçados D*) |
| `…/find-blocks.dxf` | 6 024 | FIND texto em bloco (CARIMBO) |
| `…/minimal-line.dxf` | 362 | smoke / `export:html` |
| `…/block-color.dxf` | 605 489 | médio |
| `…/sheet_0.dxf` | 1 928 331 | maior (stress de abertura) |
| restantes (`empty`, `aci7-bylayer-background`, `shape-entity`, `*lwpolylines*`, `nested-insert-layers`) | 205–894 | regressões de render |

Abertura nos e2e: `e2e/helpers/fileUpload.ts` → `uploadFixture` usa `input[type="file"]` + modo de acesso + vista inicial `Extents` + `setInputFiles`. Em mobile o equivalente é ler bytes → `openDocument`.

Lacuna: **sem fixture DWG** → o card de licença/DWG precisa de um DWG de teste de proveniência conhecida (U-5).

## 5. Dependências e compatibilidade Expo/nativo (sem instalar)

Constatações do repo:
- Renderização por **three ^0.172 (WebGL)** (`three-renderer`), UI **Vue 3 + element-plus** (DOM), parsing com **Web Workers** (`useWorker:true`, `parserWorkerUrl`) e WASM (DWG). Nada disto corre em React Native/Hermes; **só dentro de uma WebView**.
- `engines.node >=24`, pnpm 10, nx: o toolchain do monorepo é independente do app Expo (Metro). O app Expo deve ficar **fora** do workspace pnpm ou como pacote isolado com o bundle do viewer tratado como asset estático (evita contaminar lockfile e `overrides`).
- Estrutura recomendada: (a) build do viewer = HTML+JS+workers+wasm estáticos produzido neste repo; (b) app Expo (`expo` + `react-native-webview` + `expo-document-picker` + `expo-file-system` + `expo-sharing`) que embute esse bundle.

Do Context7 (react-native-webview, docs actuais):
- `window.ReactNativeWebView.postMessage(string)` só existe se `onMessage` estiver definido; **argumento único, string** → o protocolo tem de ser JSON serializado.
- App→web: `webviewRef.injectJavaScript(script)` (corre uma vez; terminar o script com `true;`). Alternativa `injectedJavaScript` só no load.
- `source={{ html }}` exige `originWhitelist={['*']}`; **carregar HTML local por ficheiro é frágil** (a própria doc assinala `file:///android_asset` e `require()` de HTML como problemáticos, issues #428/#518) e **`Worker` + `fetch` do `.wasm` a partir de `file://`/`about:blank` costumam falhar** → risco R-1.

Implicações por plataforma (a validar em spike, não assumidas):
| Tema | iOS (WKWebView) | Android (WebView) |
|---|---|---|
| Web Workers | suportados em origem http(s); incerto em `file://`/`html` inline | idem |
| WASM | ok; limite de memória do processo WebView | ok; OOM possível em DWG grandes |
| WebGL | ok | ok (depende do dispositivo) |
| Origem do bundle | servidor HTTP local in-app (p.ex. lib de static server) **ou** esquema custom — decisão U-3 | idem; `allowFileAccess`/`allowUniversalAccessFromFileURLs` evitáveis se houver servidor local |
| Gestos | pointer/touch já existem no viewer (`AcUiMobileSessionPanel`, e2e `measure-mobile-form.spec.ts`) | idem |

Expo Go **não** serve se se adicionarem módulos nativos fora do SDK; `react-native-webview`, `expo-document-picker`, `expo-file-system`, `expo-sharing` estão no SDK Expo (versões exactas e compatibilidade com o SDK vigente: confirmar no card B1; Context7 lista SDK 54–56). Recomenda-se *development build* (EAS ou local) desde o início.

## 6. Contrato de protocolo app ↔ viewer (v0, a validar)

Transporte: JSON em string. Web→nativo: `window.ReactNativeWebView.postMessage(JSON.stringify(msg))`. Nativo→web: `injectJavaScript("window.__cadBridge.receive(" + JSON.stringify(JSON.stringify(msg)) + ");true;")`. Envelope: `{ v:1, id:string, type:string, payload:object }`; respostas repetem `id` (`replyTo`). Ficheiros grandes **não** passam por mensagem JSON em base64 sem limite — ver U-4 (alternativa: URL servida pelo servidor local do app).

| Direcção | `type` | `payload` | Mapeia para |
|---|---|---|---|
| web→app | `ready` | `{viewerVersion, caps:['find']}` | bootstrap do viewer + registo de conversores concluído |
| app→web | `open` | `{name, mime?, source:{kind:'url',url} \| {kind:'base64',data}}`, `view:'extents'` | `AcApDocManager.openDocument(name, ArrayBuffer, {mode:Read, …})` |
| web→app | `opened` / `openFailed` | `{layouts:[{name,btrId,tabOrder}], entityCount?}` / `{code:'unsupported'\|'parse'\|'oom'\|'dwg-disabled', message}` | `acapListFindLayouts` / erro de `openDocument` |
| app→web | `find` | `{query, matchCase, scope:'drawing'\|'layout', maxResults?}` | `acapFindText` (via lógica de `useFind.search`) |
| web→app | `findResult` | `{queryId, total, truncated, layoutCount, hits:[{index, text, excerpt, layoutName, layoutId, layer, kind, tag?, blockName?}]}` | `AcApFindDrawingResult` (sem `extents`/`entityId` desnecessários para a UI nativa; `index` é a chave) |
| app→web | `findNext` / `findPrev` | `{}` | `submit(false/true)` — wrap modular |
| app→web | `goto` | `{index, insets?:{left,right,top,bottom}}` | `acapNavigateToFindHit` |
| web→app | `findActive` | `{index, outcome:'navigated'\|'layout-missing'\|…}` | resultado de `acapNavigateToFindHit` |
| app→web | `zoom` | `{op:'in'\|'out'\|'extents'}` | métodos de view (`zoomTo`, extents) — nomes exactos a confirmar (U-7) |
| app→web | `clearHighlight` | `{}` | `view.selectionSet.clear()` |
| web→app | `log` | `{level, message}` | diagnóstico |

Regras: sem edição (`mode: Read` fixo), sem mensagens de cloud/conta/IA; o protocolo é aditivo e versionado (`v`). Resultados truncados reportam `truncated:true` (limite `ACAP_FIND_MAX_RESULTS`). Cancelamento: `findId` monotónico; `acapNavigateToFindHit` já descarta navegação obsoleta (`'stale'`).

## 7. Fluxo nativo de ficheiro / partilha (a validar)

1. **Abrir**: botão nativo → `expo-document-picker` (`copyToCacheDirectory:true`, tipos `.dwg/.dxf`; MIME de DWG é inconsistente por plataforma → filtrar por extensão após escolha) → ficheiro em cache.
2. **Abrir de fora** ("Abrir com…"/Share-in): intent filter Android e *document types* iOS declarados no `app.json`/config plugin → requer *prebuild*; fora do MVP mínimo (U-8).
3. **Ler**: `expo-file-system` → bytes. Entrega ao viewer: URL do servidor local (preferido) ou base64 em `open` (limite prático de tamanho — sem medição, U-4).
4. **Partilhar**: `expo-sharing` (`shareAsync(uri)`) partilha o ficheiro original ou um resultado exportado (lista de hits em texto/CSV — decisão de produto U-9). Sem upload para serviços.
5. Persistência local: pasta de documentos da app; lista "recentes" (opcional, pós-MVP).
6. Offline: tudo local; nenhuma chamada de rede do viewer (confirmar fontes/SHX, U-6).

## 8. Estratégia de testes offline

Reutilizar (sem instalar nada neste card):
- **Unit (jest, node)**: `findText.spec.ts` já cobre a pesquisa sobre `find-text.dxf`; acrescentar ao card de implementação testes do *dispatcher* de mensagens do protocolo como função pura (`handleBridgeMessage(msg, deps)`) com `AcApFindDatabaseLike` falso — sem WebView.
- **Contrato do protocolo**: schema JSON (tipos TS) + testes de (de)serialização round-trip e de versão desconhecida.
- **E2E do viewer em browser**: Playwright existente (`pnpm test:e2e`, `PLAYWRIGHT_BROWSER_CHANNEL`) com `find-layouts.dxf`/`find-blocks.dxf`; adicionar página-ponte que fala o protocolo num `window.ReactNativeWebView` simulado.
- **App Expo**: testes de lógica (jest do Expo) com bridge mockado; **emulador/dispositivo** (Android AVD, iOS Simulator) apenas como gate manual documentado, não no CI do MVP.
- **Offline**: validar com rede desligada (modo avião no emulador) abrir `find-layouts.dxf` e pesquisar; e verificar nos logs que não há pedidos externos.
- Gates pesados (`pnpm build`, e2e completos) ficam nos cards de implementação, **não** neste scoping.

## 9. Licença: GPL-3.0 (libredwg) vs MIT

Factos:
- Repo e todos os pacotes `packages/*`: **MIT** (`LICENSE`: "Copyright (c) 2026 mlightcad").
- DXF: parser MIT no `@mlightcad/data-model` (README §License).
- DWG: `@mlightcad/libredwg-converter` (**GPL-3.0**, wasm de LibreDWG) — **opt-in**, registado só em `cad-viewer-example` (`registerLibreDwg.ts`) e no CLI. `cad-simple-viewer` não depende dele.
- Alternativa comercial: `PROPRIETARY-PARSER.md` — pacote npm pré-compilado, sem código-fonte, licença perpétua, uso em produto fechado (desktop/mobile/web), contacto de compra por e-mail do titular; `tools/use-dwg-converter.mjs` troca para `@mlightcad/dwg-converter` (caminho local `realdwg-web`, não publicado neste repo).
- Consequência: distribuir na App Store/Play Store um binário que **inclua** o worker/wasm LibreDWG obriga a cumprir GPL-3.0 para essa combinação (disponibilizar fonte correspondente, licenciar a parte combinada em GPL-compatível). **Aviso adicional:** os termos da App Store têm historicamente conflitos com a GPL — **parecer jurídico necessário** (U-10). Este documento não é parecer jurídico.

### Três alternativas de publicação (nenhuma bloqueia o desenvolvimento)

| | A) Parser proprietário | B) Só DXF (open-source, MIT) | C) GPL-compatível (open-source) |
|---|---|---|---|
| DWG | Sim (pacote comercial) | **Não** (mensagem "converter para DXF") | Sim (LibreDWG) |
| Licença do app | Fechada possível | MIT | GPL-3.0 para o artefacto distribuído com libredwg (fonte do app público) |
| Custo / dependência | Compra, contacto com o titular do parser (**fora do âmbito deste card; decisão de Kevin**) | Nenhum | Publicar fonte; risco de política das lojas |
| Risco | Lock-in, preço desconhecido, API só por pacote | Produto "Freedom DWG" sem DWG — desalinhado com o nome | Compatibilidade store/GPL; manutenção de avisos |
| Esforço extra | Troca de conversor + gate de licença | Remover registo DWG, UX de erro | Avisos, oferta de fonte, repo público |

**Estratégia sem bloqueio:** desenvolver sobre DXF (fixtures existentes) e atrás de uma interface `registerDwgConverter()` opcional; o MVP funciona em B por omissão e o conversor DWG (A ou C) liga-se por configuração de build. O **gate de licença (card L1)** corre antes de qualquer build de loja/TestFlight/Play interno, não antes do desenvolvimento.

## 10. Incertezas e decisões para o Kevin

| ID | Pergunta | Recomendação provisória |
|---|---|---|
| U-1 | Base do MVP: `442a9195` (FIND ✓, sem offline) ou branch `fork/…` com `b5ca1246` (offline/self-host)? Onde está o commit que implementa "offline"? | Fixar SHA no B0; se offline for necessário, integrar essa branch primeiro |
| U-2 | Estratégia A/B/C (§9) para o lançamento | B para o primeiro build interno; decidir A vs C antes de loja |
| U-3 | Origem do bundle na WebView: servidor local in-app vs `source.html` inline vs `file://` | Spike S1 para decidir; preferência servidor local (workers/wasm) |
| U-4 | Transferência de bytes: base64 em `postMessage` vs URL local; tamanho máximo suportado | URL local; medir com `sheet_0.dxf` (1,9 MB) |
| U-5 | Existe DWG de teste com direitos de uso? (repo não tem nenhum) | Kevin fornecer 1 DWG pequeno |
| U-6 | Fontes/SHX/templates carregados por rede? Requisito de "100 % offline"? | Auditar em S1; empacotar fontes mínimas |
| U-7 | Nomes exactos das APIs de zoom/extents/limpar selecção no `AcTrView2d`/`AcApDocManager` para `zoom`/`clearHighlight` | Confirmar em B2 |
| U-8 | "Abrir com…" do SO no MVP? | Não; só picker |
| U-9 | "Partilhar" = ficheiro original ou lista de resultados? | Ficheiro original no MVP |
| U-10 | Parecer jurídico GPL × lojas (iOS em especial); e-mail/contacto com titular do parser proprietário (não feito aqui) | Kevin decide; sem contacto upstream por parte da equipa |
| U-11 | Versão do Expo SDK alvo (docs listam SDK 54–56), arquitectura nova RN, Hermes | Fixar no B1 |
| U-12 | Aceitar que o viewer web inteiro (Vue/element-plus) corre dentro da WebView vs. um shell mínimo só com canvas + UI nativa | Shell mínimo só com core (`cad-simple-viewer`) e UI nativa em RN |

Fora de âmbito (confirmado): edição, cloud (Drive/OneDrive), contas, IA (`cad-agent-plugin`). Prioridade: **FIND primeiro** — todos os cards de UI dependem de F-cards de pesquisa/navegação.

## 11. Cards executáveis (30–120 min cada)

Legenda: **B** bootstrap (sem lógica de produto) · **S** spike · **I** implementação · **T** testes · **L** licença. Gates: `G-lint` = lint/typecheck do pacote tocado; `G-unit` = jest dirigido; nenhum build completo salvo indicado.

### Bootstrap (separado)
| ID | Min | Objectivo | Fronteiras / ficheiros | Critério de aceitação | Riscos | Gate |
|---|---|---|---|---|---|---|
| B0 | 30 | Fixar base e repositório do app | Decidir U-1; criar repo/pasta `apps/freedom-mobile` **fora** do workspace pnpm (ou repo novo); README com SHA do viewer | SHA documentado; árvore do viewer inalterada | Escolher base errada | revisão Kevin |
| B1 | 60 | Esqueleto Expo (TypeScript, development build) | só o novo app; `app.json`, `package.json` do app; **sem** tocar `pnpm-lock.yaml` do viewer | App abre "olá" em Android emulador e iOS simulator; versões SDK/`react-native-webview`/pickers anotadas (U-11) | Incompatibilidade SDK; toolchain WSL sem emulador iOS | build local |
| B2 | 60 | Produzir bundle estático do viewer (HTML/JS/workers/wasm) para embutir | script no viewer **novo** (`tools/build-mobile-bundle.mjs`) ou config vite dedicada; entrypoint mínimo sem element-plus se U-12 | Pasta `dist-mobile/` abre em browser desktop e abre `minimal-line.dxf`; lista de assets e tamanhos | Tamanho; dependências Vue; workers | `G-lint` + abertura manual |

### Spikes
| ID | Min | Objectivo | Aceitação | Riscos |
|---|---|---|---|---|
| S1 | 120 | WebView: carregar o bundle (servidor local vs inline vs file) com Worker + WebGL e abrir `find-layouts.dxf` offline | Decisão U-3/U-4/U-6 documentada com evidência (screenshot + logs) em Android e iOS | Workers/wasm em `file://`; WebGL em emulador |
| S2 | 60 | Medir abertura de `sheet_0.dxf` (1,9 MB) e memória | Tempo e pico de memória registados; limite recomendado | Emulador não representativo |

### Implementação FIND-first
| ID | Min | Objectivo | Fronteiras | Aceitação | Riscos | Gate |
|---|---|---|---|---|---|---|
| I1 | 90 | Módulo `bridge` no viewer: tipos do protocolo v1 + `handleBridgeMessage` (open/find/findNext/findPrev/goto/clearHighlight) sobre `acapFindText`/`acapNavigateToFindHit` | novo `packages/<mobile-entry>/src/bridge/*`; **sem** alterar `find/*` existente | Dispatcher puro; semântica next/prev idêntica a `useFind.submit` (wrap modular) | Duplicar lógica de `useFind` — extrair partilhado só se barato | `G-unit` |
| T1 | 60 | Testes do dispatcher e do contrato (fixtures `find-layouts.dxf`, `find-blocks.dxf`) | testes novos; fixtures existentes | Cobrem: sem match, truncado, multi-layout, `layout-missing`, versão desconhecida | Mocks da DB divergirem do real | `G-unit` |
| I2 | 90 | Ligação transporte: `window.ReactNativeWebView.postMessage` ↔ `injectJavaScript` + `ready` | app Expo + bundle | Handshake `ready`→`open`→`opened` com `minimal-line.dxf` em ambos os SO | Ordem de arranque; strings escapadas | emulador manual |
| I3 | 90 | UI nativa de FIND: input, toggle matchCase/layout, lista, anterior/seguinte, contador, estado truncado | só app Expo (RN) | Enter/botões = `find`/`findNext`/`findPrev`; item toca → `goto`; estados vazio/erro | Teclado cobre canvas → usar `insets` | `G-lint` + manual |
| I4 | 60 | Zoom/pan e realce: botões zoom, extents; `insets` correctos com painel | app + `bridge` (U-7) | Hit visível fora do painel; zoom in/out/extents funcionam | APIs de view diferentes do esperado | manual |
| I5 | 90 | Abrir ficheiro (picker) e entrega ao viewer (URL local/base64 conforme S1) | app Expo | `.dxf` abre; `.dwg` sem conversor mostra erro `dwg-disabled` claro | Extensões/MIME; tamanho | manual |
| I6 | 60 | Partilhar (`expo-sharing`) conforme U-9 | app Expo | Folha de partilha abre com o ficheiro | Permissões/URI no Android | manual |
| T2 | 90 | Matriz offline: modo avião, DXF pequeno/médio/grande, FIND em todos os layouts, sem pedidos de rede | docs de teste + checklist | Registo de resultados por SO; zero pedidos externos | Dispositivo físico necessário | manual |

### Licença (gate separado, não bloqueia I*/T*)
| ID | Min | Objectivo | Aceitação |
|---|---|---|---|
| L1 | 60 | Inventário de licenças do bundle e do app (`npm ls --all --json` no ambiente do app; verificar presença de `libredwg-*` no bundle) | Relatório: nenhum artefacto GPL no build B; lista de notices |
| L2 | 90 | Integrar interface `registerDwgConverter()` opcional + build flavours (B sem DWG / A proprietário / C libredwg) | Flavour B passa os testes; A e C compilam por flag (A só com pacote licenciado — pressupõe decisão de Kevin) |
| L3 | 60 | Checklist de loja: avisos de terceiros, oferta de fonte (C), parecer jurídico anexo (U-10) | **Gate obrigatório antes de TestFlight/Play** |

Ordem sugerida: B0 → B1 → B2 → S1 → I1+T1 → I2 → I3 → I4 → I5 → S2 → I6 → T2 → L1 → L2 → L3. FIND (I1/T1/I3) antes de qualquer extra.

## 12. Verificação final

Executado após escrita do documento (outputs reais no resumo AITRA):
- `git diff --check`
- `git diff --stat`
- `git status --short`

Nenhuma dependência instalada; nenhum gate pesado executado; nenhum ficheiro além de `docs/OBJ-0104-scoping.md` alterado; sem contacto com upstream.
