# OBJ-0104 · M4-I6 — Evidência de superfície real (desktop e 390px)

Cards `t_8b6c66e1` / `t_dc4ed9f0` (rework da revisão `t_3172081b`). Decisão t_d2446cfc (arquitectura §7 item 6): a prova são **píxeis do compositor**, não `FakeView` nem asserções sobre o modelo.

## Método (caminho da app, não o do servidor isolado)

`apps/freedom-mobile/src/proof/surfaceProof.node-test.ts` (opt-in `FREEDOM_SURFACE_PROOF=1`; sem bundle ou sem Chromium o teste **falha**, não é saltado em silêncio):

1. `startViewerSession` — o **mesmo** ciclo de vida que o `ViewerScreen` usa — cria o `LocalAssetServer` sobre `createTcpHttpListener` (o listener de produção; aqui com o `net` do Node em `127.0.0.1`, no dispositivo com `react-native-tcp-socket`) e serve o **bundle real** (`packages/cad-mobile-viewer/dist`, vite, `AcApDocManager` real) com a CSP `DEFAULT_CSP`.
2. Chromium real do Playwright (canal `chromium`, WebGL ANGLE/SwiftShader) carrega o `viewerUrl` devolvido pela sessão. `window.ReactNativeWebView` é simulado; as ordens FIND/zoom saem do `BridgeClient` (`encodeInjection`, a string que a `ViewerSurface` injecta) e as respostas voltam por `session.receive` ao `sessionReducer` real.
3. O ficheiro é escolhido pelo `FileFlow` (picker → cópia para a pasta controlada → concessão → URL do asset), não por mensagens montadas à mão.
4. Viewports: **desktop 1280×800 @1x** e **390×844 @3x** (`isMobile`, `hasTouch`), em separado.
5. Píxeis: os screenshots são descodificados no Chromium. O fundo é a cor mais frequente; `drawnPixels` conta os píxeis ≠ fundo; o hash mostra se o ecrã mudou.
6. Cada navegação do Chromium é confrontada com `isAllowedNavigation` (a política da `ViewerSurface`).

Comando: `cd apps/freedom-mobile && FREEDOM_SURFACE_PROOF=1 node --test src/proof/surfaceProof.node-test.ts` → **3/3 pass**. Artefactos em `chromium/` (PNG por passo + `metrics.json`). Antes: `pnpm exec vite build -c packages/cad-mobile-viewer/vite.config.ts`.

## Resultados (`chromium/metrics.json`, `block-color.dxf`, 0,6 MB)

| Passo                                               | desktop drawnPixels | 390px drawnPixels   |
| --------------------------------------------------- | ------------------- | ------------------- |
| viewer carregado, sem documento                     | 0                   | 0                   |
| `open{url}` → `opened`                              | 13 247 (144 cores)  | 31 923              |
| `zoom in` (o hash muda)                             | 12 989              | 32 447              |
| `zoom extents`                                      | 13 088              | 32 014              |
| `find` («A», 3 hits) + `goto` → `navigated` (muda)  | 9 380               | 34 589              |
| DXF inválido → `openFailed{parse}`; desenho mantido | 9 380 (mesmo hash)  | 34 589 (mesmo hash) |

Arranque até `ready` 1 528 ms (desktop) e 1 031 ms (390px); abertura 651 ms e 498 ms (indicativo, SwiftShader). Depois do `dispose` o fetch do asset é **recusado**. Zero pedidos externos; zero violações de CSP do próprio viewer; `fetch('https://…')` bloqueado pela CSP (`connect-src`) antes da rede; única navegação de topo = `/s/<token>/` (permitida).

## Sec-Fetch / Origin observados no Chromium real

- Página: `Sec-Fetch-Site: none`, `dest=document` → 200. Script do bundle e assets: `same-origin` → 200.
- Outra origem em loopback (outra porta ⇒ `same-site`), em `cors` e `no-cors` → **403** nos dois.
- Todo o pedido servido com 200 tinha `same-origin` ou `none`.

## O que o código entrega (verificável sem dispositivo)

- `ViewerSurface`: WebView só com `viewerUrl` válido (`http://127.0.0.1:<porta>/s/<token>/`); sem URL **não monta WebView** (nada de `about:blank`); `originWhitelist` só `http://127.0.0.1:*`; `onShouldStartLoadWithRequest` fail-closed (`navigation.ts`); `incognito`, sem acesso a ficheiros.
- `ViewerScreen` → `createNativeServer` (`LocalAssetServer` + `createTcpHttpListener` sobre `react-native-tcp-socket`, bundle de `viewer-bundle/` + `MANIFEST.json`, token por `expo-crypto`). Sem módulo nativo (Expo Go) ou bundle em falta: erro visível, **sem** queda para outra origem. Barra com FIND (anterior/seguinte) e zoom (≥44px).
- Ciclo de vida (`viewerSession.ts`): desmontagem por ordem fixa (ponte → assets → servidor); `listener-lost`/regresso a primeiro plano com listener morto ⇒ novo servidor, token novo, WebView nova.
- Plugin Expo `withLoopbackViewer`: cleartext só para `127.0.0.1` (Android `networkSecurityConfig`, sem `usesCleartextTraffic`; iOS `NSAllowsLocalNetworking`), copia o bundle real para os recursos nativos; sem bundle o prebuild **falha**.
- `expo export --platform android`: Metro empacota 654 módulos (incl. `react-native-tcp-socket`, `expo-crypto`), `.hbc` 1,7 MB.

## Prova no dispositivo: Android 14 (emulador, WebView real, listener nativo) — `android/`

Build de release da própria app (`expo prebuild` com o plugin `withLoopbackViewer` + Gradle, JDK 17, feito fora do repo em `~/.cache/aitra-android/build`, a partir de uma cópia deste worktree: o código de runtime em `src/` é idêntico ao commitado; só diferem ficheiros de teste e comentários/`eslint-disable` do plugin), instalada no AVD `Pixel_3a_API_34_extension_level_7_x86_64` (1080×2220 @440 dpi = **393 dp de largura ≈ 390px**; Android System WebView). `react-native-tcp-socket` a escutar em `127.0.0.1`; página e bundle servidos pelo `LocalAssetServer`; **nada** de `about:blank`.

Fluxo real accionado por `adb`/`uiautomator` (picker do SO → `FileFlow` → listener nativo → WebView), screenshots do compositor com `adb exec-out screencap` (`android/*.png`, métricas em `android/metrics.json`: píxeis ≠ fundo na área da WebView, cores distintas, bbox, hash, texto do ecrã):

| Passo                                      | drawnPixels (WebView)    | Texto visível na app                                                     |
| ------------------------------------------ | ------------------------ | ------------------------------------------------------------------------ |
| `0-ready`: viewer carregado, sem documento | 0 (superfície branca)    | «Viewer pronto.»                                                         |
| `1-opened`: `block-color.dxf`              | 11 240 (1 420 cores)     | «block-color.dxf (DXF, 3 layouts)»                                       |
| `2-zoom-in` (botão «+»)                    | 11 426                   | —                                                                        |
| `3-zoom-extents` (botão «Ajustar»)         | 11 274                   | —                                                                        |
| `4-find`: «A» → 1.º resultado              | 11 360                   | «1 / 3 resultados», «Selecionado: … (Model)»                             |
| `5-find-next` (botão «›»)                  | 11 575 (hash muda)       | «2 / 3 resultados»                                                       |
| `6-open-failed`: DXF inválido (35 B)       | 11 516 (desenho mantido) | «Não foi possível abrir o desenho (ficheiro inválido ou não suportado).» |

Os botões da barra têm 121 px = **44 dp** (≥44).

Sondas ao listener nativo a partir de outro uid (`shell`, uid 2000 = «outra app»), `android/probes.txt`: token errado e `/` → 404; `Host` falso → 403; `Sec-Fetch-Site: cross-site` → 403; HTTP/1.0 → 505; LF solto e traversal → 400; POST → 405; cabeçalhos > 8 KiB → 431; slowloris cortado entre 4 e 6 s (limite 5 s); `10.0.2.15`, `10.0.2.16` e `::1` → **ligação recusada** (só 127.0.0.1). `am force-stop` fecha o listener (nenhum socket em LISTEN) e a relançada escuta noutra porta com token novo; a porta antiga recusa. APK de release: `network_security_config` só com `127.0.0.1` em claro, sem `usesCleartextTraffic`.

Observações (não escondidas):

- O `nc` do Android fecha a escrita logo após enviar (half-close); com isso ~30–45 % dos pedidos não recebem resposta (a ligação é fechada sem resposta, fail-closed). Sem half-close (`(printf …; sleep 1) | nc`) foram 30/30 com resposta. O WebView não faz half-close; as sondas finais usam esta forma.
- **Picker em «Downloads» (URI `msf:…` do `DownloadStorageProvider`)**: após relançar a app, o nome do ficheiro deixou de ser resolvido e o fluxo recusou **todos** os ficheiros com «Só são aceites ficheiros .dwg e .dxf.» (fail-closed, mas mau UX; causa não apurada — `expo-file-system` cai em `lastPathSegment` quando a consulta de `DISPLAY_NAME` falha). Pelo armazenamento principal (`content://com.android.externalstorage.documents`) o nome resolve-se sempre; é o caminho usado nas capturas. Fica como risco residual para o seguimento (não é regressão do I6).

## Limitações (não reivindicadas)

- **Dispositivo físico e iOS**: a prova nativa é um emulador Android x86_64 (SwiftShader), não hardware; iOS (WKWebView, `NSAllowsLocalNetworking`, suspensão de sockets em segundo plano) **não** foi exercitado (sem Xcode).
- **Fontes CAD**: o bundle não traz `assets/cad-data/fonts` (404 em `fonts.json`, item [H] B2/L1 de licença). O texto **não é desenhado**: o FIND encontra e navega (a selecção move a vista), mas o hit de texto não se vê. A geometria é desenhada.
- Memória de pico/TTFB de 20 MB (§8 item 6 da spec I5) não medidos em dispositivo.
- A prova Chromium (acima) usa `net` do Node e uma WebView simulada; a do dispositivo é a que cobre o `react-native-tcp-socket`.
