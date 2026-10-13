# OBJ-0104 · M1 S1 — Spec e plano: seleção, zoom e FIND exercitados com fixtures sintéticas

Card `t_57f3463a` (milestone M1-S1). Fonte vinculativa: `docs/OBJ-0104-architecture.md` §§5–7, §11 e D-4. **Sem parser, sem conversor DWG/DXF, sem ponte de ficheiros, sem servidor local, sem publicação/licença/upstream.** As fixtures são dados sintéticos (texto + layouts), não DXF/DWG: nada aqui prova suporte de formato (isso é I2/I3, S1 de arquitectura e T2).

## 1. Desvios de caminho e de fronteira (a registar)

| Tema        | Pedido no card                                          | Realidade verificada                                                                                                           | Decisão                                                                                                                                                                                                                                                                        |
| ----------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Caminhos    | `apps/viewer/**`, `packages/viewer/**`                  | não existem; D-9/§3.1 fixam `apps/freedom-mobile/` (já usado por B1 e M1-B2) e `packages/cad-mobile-viewer/` (B2, inexistente) | tudo em `apps/freedom-mobile/src/**` + `docs/OBJ-0104-*`. Nada em `packages/**`, `jest.config.ts` nem `pnpm-lock.yaml`.                                                                                                                                                        |
| Remote      | «push para origin»                                      | `origin` = upstream `mlightcad/cad-viewer`; D-5 proíbe qualquer acção upstream                                                 | push só para `fork` (como no M1-B2). Nada é enviado a `origin`.                                                                                                                                                                                                                |
| Viewer real | «viewer contract tests»                                 | o lado web (`handleBridgeMessage`, adapters) pertence a `packages/cad-mobile-viewer` (B2/I1), fora das fronteiras              | o «viewer» destes testes é um **viewer sintético** (`src/fixtures/syntheticViewer.ts`) que implementa o lado web do contrato §5.2/§5.5 sobre dados sintéticos. Serve de executável do contrato; **não** substitui nem valida o `handleBridgeMessage` real (continua pendente). |
| UI          | «revisão UI desktop/mobile, alvos ≥44px onde aplicável» | a UI de FIND/zoom é I3/I4 (§11); este card não acrescenta controlos                                                            | só texto de estado em `ViewerScreen` (sem novos alvos de toque). Revisão visual em emulador/desktop **não executada** (sem JDK/emulador; ver §6).                                                                                                                              |

## 2. O que já existia (inspeccionado em `f848e0e9`, não repetido)

`contracts/protocol.ts` (validação fail-closed dos dois sentidos), `bridge/BridgeClient.ts` (fila pré-`ready`, correlação `replyTo`, `stale-reply`, `goto` automático, timeouts), `state/{document,find,session,describe}.ts` (loading/erro de `open`, FIND `idle|searching|results|empty|error`, `zoom` mínimo `lastOp/error`). **Faltava**: (a) um viewer executável que responda ao contrato com dados sintéticos; (b) estado de **seleção** próprio (o realce no viewer só existia implícito em `find.activeIndex`; `clearHighlight` não tinha efeito no estado); (c) estado de **zoom** que não sobreviva a um documento novo; (d) a prova nomeada de D-4.

## 3. Contrato exercitado

### 3.1 Seleção (`state/selection.ts`, novo)

Seleção = o hit realçado no viewer (`acapNavigateToFindHit` faz `selectionSet.clear()+add`; `clearHighlight` limpa). Estado explícito, derivado só de eventos da ponte e do estado de FIND já reduzido:

| `status`      | Significado                                                                             | Entra quando                                                                                                             |
| ------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `none`        | nada realçado                                                                           | início; `find` novo; `opened`; `process-gone`; `find-cleared`; `clearHighlight` **enviado**; `find-active` `no-document` |
| `pending`     | navegação (`goto`/`findNext`/`findPrev`) enviada; a seleção anterior mantém-se visível  | `command-sent` de navegação                                                                                              |
| `selected`    | `findActive{outcome:'navigated'}` com índice válido; guarda o `FindHit`                 | resposta válida                                                                                                          |
| `unavailable` | navegação falhou (layout indisponível, `invalid-index`, erro do viewer, rejeição local) | resposta não-`navigated`/inválida; `find-navigation-failed`; `viewer-error`/`command-rejected` de navegação              |

Regras: `stale` descarta a navegação e **mantém** a seleção anterior (como `find.ts`); `clearHighlight` **rejeitado** ou com erro do viewer **não** limpa a seleção (o realce continua no viewer — fail-closed, o erro vai para `issue`); zoom nunca altera a seleção.

### 3.2 Zoom (`state/session.ts`)

`ZoomState = {lastOp, error}` mantém-se; novo: `opened`/`process-gone` repõem o estado inicial (documento novo = vista de extensão; o `lastOp` do documento anterior não é verdade). Resultado do zoom é fire-and-forget (§5.2 não define resposta): só um `error` do viewer ou uma rejeição local o falham, sempre visíveis em `zoom.error`. Semântica do viewer sintético = §5.5: `extents` → caixa do desenho; `in`/`out` → centro mantido, meia-largura/altura divididas por `factor` (por omissão `in=2`, `out=0.5`). **[H]** `out` com `factor` explícito: o contrato literal divide por `factor` (logo `out`/`factor:2` aproxima); a ambiguidade fica para I1 e está num teste que fixa o comportamento literal.

### 3.3 FIND no viewer sintético

`find` (drawing|layout, `matchCase`, `maxResults`≤500) → `findResult` com `findId` crescente, hits por `tabOrder` e ordem do documento, `truncated` quando `total>maxResults` (`hits.length === total` e `hits[i].index === i`), `layoutCount` = layouts com ≥1 hit [H]. `goto`/`findNext`/`findPrev` com `findId` diferente do actual → `error{code:'stale-find', replyTo}` (sem navegar); `findNext/Prev`: `(i + (back ? n-1 : 1)) % n`, de `-1` vai a `0` nos dois sentidos, com 0 hits → `findActive{index:-1, outcome:'stale'}`; layout marcado como em falta → `findActive{outcome:'layout-missing', index:-1}`; sem documento → `error{code:'no-document'}`. **[H]** `find` limpa o realce no viewer (alinha com `activeIndex=-1` de §5.2); a decisão final é do dispatcher real (I1).

## 4. D-4 — «FIND é prioridade» como propriedades testáveis

Prova nomeada: `describe('FIND priority (D-4)')` em `src/state/findPriority.node-test.ts`. Sem fallback silencioso significa: quando o FIND não pode correr, o estado é `error` (ou `unavailable`) com a causa — nunca `empty`, nunca lista antiga apresentada como actual, nunca reenvio automático.

| ID  | Propriedade                                                                                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Tráfego de zoom/`clearHighlight`/`setInsets` (mesmo em enxurrada acima de `MAX_TRACKED`) não desloca a resposta do `find` em curso nem a da navegação.                                                                                                     |
| P2  | Falhas de zoom (`error` do viewer, rejeição local) nunca alteram `find` nem `selection`; ficam em `zoom.error`.                                                                                                                                            |
| P3  | `find` sem `ready` → `status:'error'` (`not-ready`); viewer falhado → `error` (`viewer-unavailable`); sem documento → `error` (`no-document`); `inject` a falhar → `error` (`send-failed`). Nenhum vira `empty`; nada é enfileirado (só `open` o é, §5.1). |
| P4  | `find` novo supersede o anterior: a resposta tardia do antigo é `stale-reply` visível e não substitui os resultados; a seleção anterior cai.                                                                                                               |
| P5  | Sem hits **não** há `goto`/seleção: `empty` ≠ `error` ≠ `results` e as mensagens (`describeFind`) são distintas.                                                                                                                                           |

## 5. Plano (commits)

1. Esta spec (docs-only).
2. `src/fixtures/{syntheticDocuments,syntheticViewer,harness}.ts` + `syntheticViewer.node-test.ts`: viewer e harness determinísticos (respostas só entregues em `flush()`, relógio falso).
3. `state/selection.ts` (+ teste), integração em `session.ts`/`describe.ts`, reposição do zoom, texto no `ViewerScreen`.
4. `state/findFlow.node-test.ts` (seleção/zoom/FIND, loading/erro) e `state/findPriority.node-test.ts` (D-4).
5. Reconciliação desta spec com os números finais + gates.

## 6. Gates e limitações

Gates (em `apps/freedom-mobile` e raiz): `npm test` (`node:test`), `npm run typecheck`, `pnpm exec eslint` do app, `prettier --check` exacto no delta, `git diff --check origin/main...HEAD`, `detect_changes` (codebase-memory). Resultados na secção «Evidência» no fim deste ficheiro, preenchida no último commit.

Limitações conhecidas: sem viewer real nem DXF/DWG (fixtures sintéticas); sem G-man (sem emulador/JDK; iOS sem Xcode); `layoutCount`, «`find` limpa o realce» e `zoom out`+`factor` são [H] a fechar em I1; `ViewerScreen` não envia comandos (I3/I4).
