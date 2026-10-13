# OBJ-0104 · M2 T1 — Spec e plano: testes do contrato offline app ↔ viewer

Card `t_44ecd16c` (OBJ-0104 M2 T1, `session_key OBJ-0104-M2-T1`). Fonte vinculativa: `docs/OBJ-0104-architecture.md` §§5–7, 10–11 e decisões D-2…D-5. **Fora de âmbito**: implementação de produto adicional, servidor local, parser/conversor DWG/DXF, publicação/licenciamento/upstream. Só testes e fixtures sintéticas offline, com proveniência documentada.

## 1. Desvios e interpretação (a registar)

| Tema          | Pedido no card                                                   | Realidade verificada                                                                                                                                                                     | Decisão                                                                                                                                                                                                                        |
| ------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Caminhos      | `apps/viewer/**`, `packages/viewer/**`, «testes da arquitectura» | não existem; D-9 fixa `apps/freedom-mobile/` (B1, M1-B2, M1-S1, M2-I1) e `packages/cad-mobile-viewer/` (B2, **inexistente**); o §11 pede T1 em `packages/cad-mobile-viewer/__tests__/**` | tudo em `apps/freedom-mobile/src/**` + `docs/OBJ-0104-*`. Nada em `packages/**`, `jest.config.ts`, `pnpm-lock.yaml`, `package.json` do app.                                                                                    |
| Remote        | «push para origin»                                               | `origin` = upstream `mlightcad/cad-viewer`; D-5 proíbe qualquer acção upstream                                                                                                           | push só para `fork` (como M1-B2/M1-S1/M2-I1). Nada é enviado a `origin`.                                                                                                                                                       |
| «Viewer real» | testes de contrato do viewer (§7.3 sobre `handleBridgeMessage`)  | o dispatcher real é `packages/cad-mobile-viewer` (I1/B2), ainda não existe; a DB real de `find-text.dxf` exigiria parser                                                                 | o lado web é o **viewer sintético** (`src/fixtures/syntheticViewer.ts`), executável do contrato §5.2/§5.5. O T1 do viewer real (dispatcher puro sobre `find-*.dxf`) **continua pendente** para quando B2/I1 existirem; ver §5. |
| DWG           | «DWG+DXF só quando existirem artefactos autorizados»             | não há DWG nem DXF binário no repo da app; EXT-3 (§10.2) por resolver                                                                                                                    | nenhum DWG/DXF é criado ou descarregado. A linha DWG fica **«não verificado (EXT-3)»** e há um teste-guarda que falha se um artefacto binário entrar sem `PROVENANCE.md` completo (§10.2).                                     |

## 2. O que já existia (inspeccionado em `3b69358a`, não repetido)

293 testes `node:test` (M1-B1/B2/S1, M2-I1): validação fail-closed do protocolo, `encodeInjection` (round-trip de aspas, `\n`, `</script>`, emoji, U+2028/2029), `BridgeClient` real (fila pré-`ready`, correlação `replyTo`, timeouts, `process-gone`), reducers de documento/FIND/selecção/zoom, viewer sintético com os casos de FIND, D-4 (`FIND priority P1…P5`), fluxo de ficheiros + ciclo de vida de assets, «sem rede» do fluxo de ficheiros.

**Lacunas face ao card** (o que este T1 acrescenta):

| ID  | Lacuna                                                                                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Não há **um** cenário ponta-a-ponta que atravesse picker → `FileFlow` → `BridgeClient` → viewer → FIND → zoom → `clearHighlight` → novo documento, com a rede armadilhada em todo o percurso (a prova «offline» só cobria o `FileFlow`). |
| G2  | O contrato do **lado viewer** para §5.1 (`v !== 1` → `error{unsupported-version}`, `type` desconhecido → `error{unknown-type}`, nunca lança) não está executado: o viewer sintético ignorava mensagens fora do contrato.                 |
| G3  | A fixture sintética **não tem proveniência documentada** (§10.2/D-2…D-5) nem guarda que impeça entrar um DWG/DXF sem `PROVENANCE.md`; a linha DWG não está registada como «não verificado».                                              |
| G4  | A prova «sem rede / sem parser proprietário / sem upstream» só varria `src/files`; falta o varrimento de **todo** o código do app, das dependências e da superfície WebView (`originWhitelist`).                                         |
| G5  | Os casos obrigatórios de §7.3 estão dispersos em ficheiros; não há matriz de rastreabilidade verificável. Uma matriz num `.md` apodrece: fica em código (`TRACE`) e um teste confirma que cada teste referenciado existe.                |

## 3. Plano (commits)

1. Esta spec (docs-only).
2. `src/fixtures/PROVENANCE.md` + `src/fixtures/syntheticViewer.ts` (compatibilidade de teste: contrato §5.1 do lado web) + `src/contract/fixtureGate.node-test.ts` (G3/G4).
3. `src/contract/offlineContract.node-test.ts` — cenários ponta-a-ponta (G1), erros e §5.1 do viewer (G2), `TRACE` §7.3 (G5).
4. Reconciliação desta spec com números finais e gates («Evidência»).

Nenhuma alteração a código de produto (`BridgeClient`, `protocol`, `FileFlow`, reducers, ecrãs). A única edição fora de ficheiros de teste é no **viewer sintético** (fixture), para executar §5.1; não toca `src/contracts/**`.

## 4. Matriz §7.3 (ver `TRACE` em `offlineContract.node-test.ts`)

Caso obrigatório de §7.3 → teste que o prova (o teste `trace` verifica que cada título existe no ficheiro indicado):

| §7.3                                | Teste                                                     |
| ----------------------------------- | --------------------------------------------------------- |
| sem match                           | `syntheticViewer.node-test.ts` — «no match → total 0…»    |
| 1 match                             | `syntheticViewer.node-test.ts` — «one match, with…»       |
| multi-layout                        | `syntheticViewer.node-test.ts` — «multi-layout hits…»     |
| texto em bloco                      | `syntheticViewer.node-test.ts` — «text inside blocks…»    |
| `truncated`                         | `syntheticViewer.node-test.ts` — «truncated: maxResults…» |
| wrap next/prev, dois sentidos       | `syntheticViewer.node-test.ts` — «goto navigates…wrap…»   |
| `stale-find`                        | `syntheticViewer.node-test.ts` — «stale findId…»          |
| `layout-missing`                    | `syntheticViewer.node-test.ts` — «layout-missing is…»     |
| versão/type desconhecidos           | **novo** (G2) em `offlineContract.node-test.ts`           |
| extensão inválida                   | `syntheticViewer.node-test.ts` — «fails with explicit…»   |
| round-trip duplo stringify          | `protocol.node-test.ts` — «round-trips quotes, newlines…» |
| offline ponta-a-ponta               | **novo** (G1)                                             |
| fixtures sem DWG/DXF não autorizado | **novo** (G3)                                             |

## 5. Gates e limitações

Gates (em `apps/freedom-mobile` e raiz): `npm test`, `npm run typecheck`, `pnpm exec eslint` do app (via `heavy`), `prettier --check` no delta, `git diff --check origin/main...HEAD`, `expo export --platform android` (via `heavy`), `jest --listTests` da raiz sem `/apps/`, `detect_changes` (codebase-memory, `origin/main`), base-vs-HEAD e mutações de sanidade. Resultados na secção «Evidência», preenchida no último commit.

Limitações declaradas de antemão: (a) o T1 do **viewer real** (`packages/cad-mobile-viewer/__tests__/**`, dispatcher sobre `find-*.dxf`) não é executável: o pacote não existe (B2/I1); (b) nenhum DXF/DWG real é exercitado (sem parser; D-2/D-3) — a prova de formato é de T2/EXT-3; (c) sem G-man/emulador/dispositivo (sem JDK/AVD; iOS sem Xcode).

## 6. Evidência

Ponto de verificação dos gates: commit de código `408b519b` (o commit seguinte só toca este ficheiro). Resultados em `apps/freedom-mobile` e na raiz, worktree limpa:

| Gate                                                                      | Resultado                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test` (`node:test`)                                                  | **319/319** (293 pré-existentes + 26 novos: `fixtureGate` 12, `offlineContract` 14); 0 falhas                                                                                                                                                                                                                                       |
| `npm run typecheck` (strict)                                              | rc=0                                                                                                                                                                                                                                                                                                                                |
| `pnpm exec eslint apps/freedom-mobile/src App.tsx index.ts` (via `heavy`) | rc=0                                                                                                                                                                                                                                                                                                                                |
| `prettier --check` no delta (`src/contract`, `src/fixtures`, esta spec)   | verde                                                                                                                                                                                                                                                                                                                               |
| `git diff --check origin/main...HEAD`                                     | rc=0                                                                                                                                                                                                                                                                                                                                |
| `expo export --platform android` (Metro/Hermes, via `heavy`)              | OK (bundle `.hbc` 1.6 MB; saída apagada)                                                                                                                                                                                                                                                                                            |
| `jest --listTests` (raiz) em `/apps/`                                     | 0                                                                                                                                                                                                                                                                                                                                   |
| Mutações (sanidade dos testes)                                            | sem a guarda §5.1 no viewer sintético → 2 falham; `.dwg` plantado sem `PROVENANCE.md` → 2 falham; `fetch(` no código → 1; URL `https://example.com` → 1; `fetch` real num teste do cenário → falha (armadilha). Todas revertidas (`git status` limpo).                                                                              |
| `detect_changes` (codebase-memory, `origin/main`)                         | 51 ficheiros do branch, todos em `apps/freedom-mobile/**` e `docs/OBJ-0104-*`; 0 símbolos impactados fora do app. Contra `3b69358a` (delta deste card): 5 ficheiros, 23 símbolos semente, impacto = só os 2 módulos de teste novos (nenhum chamador de código de produto: a única edição de código é no viewer sintético, fixture). |

Fora das fronteiras: nenhum ficheiro tocado em `packages/**`, `jest.config.ts`, `pnpm-lock.yaml`, `apps/freedom-mobile/package.json`/`package-lock.json`, nem código de produto (`BridgeClient`, `contracts/**`, `files/**`, `state/**`, `screens/**`). Push só para `fork` (D-5).

Notas: o viewer sintético passou a responder `error{unsupported-version|unknown-type}` (§5.1) — é fixture de teste, não contrato novo. Sem DXF/DWG reais: DWG **não verificado (EXT-3)**; linha DXF = só sintética. Não executado: T1 do viewer real (`packages/cad-mobile-viewer`, inexistente), G-man/emulador/dispositivo (sem JDK/AVD; iOS sem Xcode).
