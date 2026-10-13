# OBJ-0104 · M1 B1 — Spec e plano: shell Expo/nativo do viewer

Spec e plano do card B1 (`docs/OBJ-0104-architecture.md` §11). Fonte vinculativa: §§2–4, §11, D-2, D-4 e D-5. **Sem parser, sem bridge funcional, sem FIND funcional, sem servidor de ficheiros, sem contacto/alteração ao upstream `mlightcad`.**

## 1. Desvios de caminho e de fronteira (a registar)

| Tema             | Pedido no card                                         | Realidade verificada                                                                                          | Decisão                                                                                                                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Caminhos         | `apps/viewer/**`, `packages/viewer/**` "já existentes" | `apps/` e esses `packages/viewer` **não existem**; a arquitectura (D-9, §3.1, B1) fixa `apps/freedom-mobile/` | Usar `apps/freedom-mobile/**` (o caminho "identificado pela arquitectura", como diz o Scope do card). Nenhum ficheiro em `packages/**`.                                                                                                                                    |
| `jest.config.ts` | "não tocar configs globais"                            | §11/B1 e R-7 pedem `testPathIgnorePatterns += '/apps/'`                                                       | **Não tocar.** Em vez disso, os testes do shell usam `node:test` com ficheiros `*.node-test.ts`, que o `testMatch` por omissão do jest da raiz não apanha (verificado com `jest --listTests`). O ajuste de `jest.config.ts` fica como pendente para o card que o autorize. |
| Remote `origin`  | "push para origin"                                     | `origin` = `github.com/mlightcad/cad-viewer` (**upstream**); o fork do Kevin é o remote `fork`                | D-5 proíbe acção sobre o upstream → **push só para `fork`**.                                                                                                                                                                                                               |
| Android G-man    | revisão manual UI                                      | sem JDK em Linux/Windows (`docs/OBJ-0104-toolchain.md` §2)                                                    | Sem _development build_ nesta máquina: UI **não verificada** em emulador; registado como limitação, não como sucesso.                                                                                                                                                      |

## 2. Spec

### 2.1 Objectivo

Shell Expo (React Native) que arranca e expõe uma **superfície de viewer** (uma `WebView` por onde, em cards posteriores, o bundle `packages/cad-mobile-viewer` correrá), preservando a separação **app → viewer**: a app só hospeda a superfície e fala com ela por mensagens JSON tipadas; **não** contém parser, geometria, nem lógica de FIND.

### 2.2 Critérios de aceitação (do card)

1. Shell inicia e expõe a superfície viewer sem duplicar responsabilidade da app (arquitectura §§2–3, §11).
2. Não introduz parser proprietário nem contacto upstream; os contratos deixam espaço a DWG + DXF/libredwg (D-2, D-4).

### 2.3 Componentes (todos em `apps/freedom-mobile/`)

| Ficheiro                                   | Responsabilidade                                                                                                                                                                                                                                                                                                                                                                                                | Testável sem RN |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `src/contracts/protocol.ts`                | Contrato local v1 (§5.1/§5.2 da arquitectura): envelope `{v,id,type,replyTo?,payload}`, nomes de tipos de mensagem nos dois sentidos, payloads de ciclo de vida (`ready`, `open`, `opened`, `openFailed`, `error`, `log`), `DocumentFormat = 'dwg'\|'dxf'`, `parseViewerMessage(raw)` (nunca lança), `encodeInjection(msg)` (duplo `JSON.stringify`), `createIdGenerator(prefix)`, `detectDocumentFormat(name)` | sim             |
| `src/shell/shellState.ts`                  | Estado puro do shell: ecrã activo (`viewer`), fase do viewer (`booting`/`ready`/`failed`), capacidade DWG (`unknown`/`ok`/`unavailable`), timeout de `ready` (15 s, [H] §5.1)                                                                                                                                                                                                                                   | sim             |
| `src/viewer/ViewerSurface.tsx`             | Hospeda `react-native-webview` (`about:blank` em B1), encaminha `onMessage` (string) e sinais de crash do processo web (`onContentProcessDidTerminate` iOS, `onRenderProcessGone` Android) para o estado do shell                                                                                                                                                                                               | não (UI)        |
| `src/screens/ViewerScreen.tsx` + `App.tsx` | Ecrã único do shell: título, estado do viewer em PT-PT, botão "Recarregar" em falha, superfície                                                                                                                                                                                                                                                                                                                 | não (UI)        |

### 2.4 Contratos — espaço para DWG + DXF/LibreDWG

- `DocumentFormat` e `Capability = 'find'\|'dwg'\|'dxf'` incluem ambos os formatos (D-3); `ReadyPayload.dwg: 'ok'\|'unavailable'` modela o modo degradado §6.4 (DXF continua; sem troca de parser).
- Os tipos de mensagem de FIND/zoom (`find`, `findResult`, `goto`, `findNext`, `findPrev`, `findActive`, `zoom`, `clearHighlight`, `setInsets`) ficam **reservados** como nomes no contrato (D-4: FIND continua prioridade futura); B1 não implementa comportamento para eles e `parseViewerMessage` trata-os como mensagens válidas sem payload tipado (`unknown`).
- Nada importa `@mlightcad/*` ou `libredwg-*`: a app não depende do conversor nem do upstream.

### 2.5 Fora de âmbito

Parser DWG/DXF; bridge/`BridgeClient`/fila; servidor de ficheiros local; picker; FIND funcional/UI; zoom; partilha; licença/ecrã Acerca; publicação; qualquer alteração a `packages/**`, `jest.config.ts`, `.gitignore` da raiz, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, e2e ou configs globais.

### 2.6 Testes e gates

| Gate                       | Comando                                                                     | Notas                                                                                      |
| -------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Unit                       | `npm test` em `apps/freedom-mobile` → `node --test "src/**/*.node-test.ts"` | Node ≥ 24 corre TS por _type stripping_; sem dependência de RN                             |
| Typecheck                  | `npm run typecheck` (`tsc --noEmit`)                                        | com `expo/tsconfig.base`                                                                   |
| Lint                       | eslint da raiz sobre `apps/freedom-mobile`                                  | `apps/` não é projecto nx; corre-se manualmente com `pnpm exec eslint apps/freedom-mobile` |
| Formato                    | `pnpm exec prettier --check` só nos ficheiros do delta                      |                                                                                            |
| Git                        | `git diff --check`; `git status --short`                                    | diff só em `apps/freedom-mobile/**` + este doc                                             |
| Isolamento do jest da raiz | `pnpm exec jest --listTests \| grep -c /apps/` = 0                          |                                                                                            |
| G-man                      | adiada                                                                      | sem JDK não há _development build_ (limitação §1)                                          |

## 3. Plano (commits)

1. `docs`: esta spec/plano.
2. `feat(freedom-mobile)`: contrato `protocol.ts` + testes (TDD).
3. `feat(freedom-mobile)`: `shellState.ts` + testes.
4. `feat(freedom-mobile)`: scaffolding Expo (`package.json`, `app.json`, `tsconfig.json`, `.gitignore`, `index.ts`, `App.tsx`, `ViewerSurface`, `ViewerScreen`) + typecheck.
5. `docs`: resultados dos gates e limitações (anexo abaixo, preenchido no fim).
   Cada commit é enviado para `fork` (nunca `origin`/upstream).

## 4. Anexo — resultados dos gates (preenchido no fim do card)

| Gate                                                          | Resultado                                                                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Unit (`npm test`, `node:test`)                                | 28 testes, 28 verdes (`protocol` 16 + `shellState` 12)                                                        |
| Typecheck (`npm run typecheck`, TS 7.0.2, `strict`)           | rc=0                                                                                                          |
| Bundle Metro Android (`expo export --platform android`)       | OK, 598 módulos, `index.ts` → `.hbc` 1,5 MB (prova que as importações `./x.ts` e a WebView resolvem no Metro) |
| Lint (`pnpm exec eslint apps/freedom-mobile`, config da raiz) | rc=0, 12 ficheiros, 0 erros                                                                                   |
| Prettier (`--check`, só delta)                                | verde                                                                                                         |
| `git diff --check` (staged + commits)                         | rc=0                                                                                                          |
| `jest --listTests` da raiz                                    | 296 testes, 0 em `/apps/`                                                                                     |
| `detect_changes` vs `origin/main`                             | símbolos impactados = só os 2 módulos de teste novos; nada em `packages/**`                                   |

Versões fixadas (P-3): `expo ^57.0.28`, `react 19.2.3`, `react-native 0.86.3`, `react-native-webview 13.16.1`, `react-native-safe-area-context ~5.7.0` (via `expo install`).

### Limitações

- **G-man não executado**: sem JDK não há _development build_ Android nesta máquina (`docs/OBJ-0104-toolchain.md` §2); iOS sem Xcode (R-8). A UI (`App.tsx`, `ViewerScreen.tsx`, `ViewerSurface.tsx`) tem só typecheck, lint e bundle Metro — **sem** teste unitário nem revisão visual desktop/mobile.
- `package-lock.json` local do app (npm) é novo (previsto em §3.1); `pnpm-lock.yaml` e `jest.config.ts` não foram tocados. `/apps/` continua por ignorar no jest da raiz apenas porque os testes usam o sufixo `.node-test.ts`; o ajuste formal de `jest.config.ts` (B1/R-7) fica pendente de autorização.
- `app.json`: `pt.aitra.freedomviewer` é [H] (P-6), só config local.
- `ready` tem timeout de 15 s [H]; a WebView carrega `about:blank`, logo em B1 o estado cai sempre em "não arrancou" ao fim de 15 s (comportamento esperado até S1/I2 ligarem o bundle).

### contract_precedence (caminhos)

O texto de Boundaries do card cita `apps/viewer/**` e `packages/viewer/**` "já existentes"; `git ls-files` não tem nenhum deles. A fonte vinculativa fixa outro caminho: `docs/OBJ-0104-architecture.md:34` (D-9: "O app Expo vive em `apps/freedom-mobile/`… bundle do viewer… `packages/cad-mobile-viewer/`"), `:116` (App Expo → `apps/freedom-mobile/`, novo em B1, npm com `package-lock.json` local) e `:353` (P-2 aplicado: `apps/freedom-mobile/` neste repo). Prevalece a arquitectura; o `package-lock.json` local é o previsto em `:116` (só `registry.npmjs.org`, sem caminhos locais, `npm ci --dry-run` ok).
