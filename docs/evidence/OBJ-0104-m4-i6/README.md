# OBJ-0104 · M4-I6 — Evidência de superfície real (desktop e 390px)

Card `t_8b6c66e1`. Decisão t_d2446cfc (arquitectura §7 item 6): a prova são **píxeis do compositor**, não `FakeView` nem asserções sobre o modelo.

## Método

`apps/freedom-mobile/src/proof/surfaceProof.node-test.ts` (opt-in `FREEDOM_SURFACE_PROOF=1`; sem bundle ou sem Chromium o teste **falha**, não é saltado em silêncio):

1. Bundle real `packages/cad-mobile-viewer/dist` (vite, `vite.config.ts`, bootstrap `src/web/main.ts`: `AcApDocManager` real, `ViewerSession` + `createDocManagerViewPort` + `createLoopbackFetch`, transporte `src/web/transport.ts`).
2. Servido pelo `LocalAssetServer` real (`createManifestBundle`) em sockets reais de `127.0.0.1` (listener `node:http` de teste), com a CSP `DEFAULT_CSP`.
3. Chromium real do Playwright (canal `chromium`, WebGL ANGLE/SwiftShader). `window.ReactNativeWebView` é simulado. As mensagens são construídas por `buildAppMessage` + `encodeInjection` (a mesma string que a `ViewerSurface` injecta) e as respostas são validadas por `parseViewerMessage` do app.
4. Viewports: **desktop 1280×800 @1x** e **390×844 @3x** (`isMobile`, `hasTouch`).
5. Píxeis: os screenshots são descodificados no Chromium. O fundo é a cor mais frequente; `drawnPixels` conta os píxeis ≠ fundo; o hash serve para ver se o ecrã mudou.

Comando: `cd apps/freedom-mobile && FREEDOM_SURFACE_PROOF=1 node --test src/proof/surfaceProof.node-test.ts` → **3/3 pass**.

## Resultados (`metrics.json`, `block-color.dxf`, 0,6 MB)

| Passo                                                                              | desktop drawnPixels  | 390px drawnPixels     |
| ---------------------------------------------------------------------------------- | -------------------- | --------------------- |
| `ready`, sem documento                                                             | 0                    | 0                     |
| `open{url}` → `opened`                                                             | 13 247 (144 cores)   | 31 923                |
| `zoom in` (o hash muda)                                                            | 12 989               | 32 447                |
| `zoom extents`                                                                     | 13 088               | 32 014                |
| `find` («A», 3 hits) + `goto` → `navigated` (o hash muda)                          | 9 380                | 34 589                |
| `open` de um DXF partido → `openFailed{read-failed}`; o desenho anterior mantém-se | 9 380 (o mesmo hash) | 34 589 (o mesmo hash) |

Tempo de abertura (indicativo): 242 ms no desktop e 129 ms a 390px. Depois de `release`, o URL do asset devolve **404**. Não houve pedidos externos (0) nem violações de CSP do próprio viewer (0). `fetch('https://cdn.jsdelivr.net/…')` foi bloqueado pela CSP **antes** da rede (`connect-src`).

## Sec-Fetch / Origin observados no Chromium real

- Página: `Sec-Fetch-Site: none`, `dest=document` → 200.
- Script do bundle: `same-origin`, `Origin` própria → 200.
- Asset: `same-origin`, `mode=same-origin` → 200.
- Outra origem em loopback (outra porta ⇒ `same-site`), em `cors` e `no-cors` → **403** nos dois.
- Todo o pedido servido com 200 tinha `same-origin` ou `none`.

## Limitações (não reivindicadas)

- **Sem dispositivo**: não há JDK/AVD/Xcode. A pilha é a do Chromium desktop, que está próxima da Android System WebView mas **não é** WebView Android nem WKWebView.
- **Listener nativo `HttpListenerPort`: bloqueado**. Nenhuma biblioteca nativa foi instalada (não é verificável em dispositivo e ficaria por rever). O app usa `NO_NATIVE_LISTENER` e mostra o erro visível «Servidor local indisponível neste build», sem cair em silêncio para outra origem.
- **Cleartext (`networkSecurityConfig` / `NSAllowsLocalNetworking`): não feito**. Depende do listener nativo.
- **Fontes CAD**: o bundle não traz `assets/cad-data/fonts` (404 em `fonts.json`, item [H] B2/L1 de licença). Por isso o **texto não é desenhado**: o FIND encontra e navega, mas o hit de texto não se vê. A geometria é desenhada.
- Touch targets ≥44px: aplicados nos estilos do `ViewerScreen` (`minHeight: 44`). A UI nativa não foi renderizada (não há react-native-web nem dispositivo).
