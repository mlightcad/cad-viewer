# OBJ-0104 · M2 I2 — Spec e plano: camada de importação/conversão LibreDWG (DWG+DXF)

Card `t_81af5694` (milestone M2-I2). Fonte vinculativa: `docs/OBJ-0104-architecture.md` D-2, D-3, D-5, §§3.2–4, §5.2 (`open`/`opened`/`openFailed`), §6.2, §6.4 e §11. **Fora de âmbito**: servidor local (I5), UI/ecrã de licenças, publicação, qualquer alteração ou contacto com o upstream `mlightcad`, credenciais externas, `AcApDocManager`/UI/FIND (I1/I3), bundle Vite/assets/`MANIFEST.json` (B2).

## 1. Desvios e interpretação (a registar)

| Tema        | Pedido no card                                    | Realidade verificada                                                                                                                                                                                              | Decisão                                                                                                                                                                                                                                                                                              |
| ----------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Onde vive   | «módulos de integração/conversão» da arquitectura | §3.1/§11 colocam registo DWG e adaptadores em `packages/cad-mobile-viewer/` (B2), que **ainda não existe**; as dependências `@mlightcad/*` não são (nem devem ser) dependências do app RN (`apps/freedom-mobile`) | cria-se **só o esqueleto mínimo** do pacote (`package.json`, `tsconfig.json`, `src/import/**`, `__tests__/**`): sem Vite, sem `main.ts`, sem bundle, sem assets (isso continua a ser B2). `pnpm-lock.yaml` ganha **apenas** a entrada do importador novo com versões já presentes (§3.2): +9 linhas. |
| Remote      | «push para origin»                                | `origin` = upstream `mlightcad/cad-viewer`; D-5 proíbe qualquer acção upstream                                                                                                                                    | push só para `fork` (como M1-B2…M2-T1). Nada é enviado a `origin`.                                                                                                                                                                                                                                   |
| DWG fixture | «fixtures autorizadas/sintéticas»                 | não há DWG autorizado (EXT-3); um DWG não se escreve à mão                                                                                                                                                        | DXF: texto sintético gerado em teste (`__tests__/helpers`). DWG: **só cabeçalhos/bytes sintéticos inválidos** (caminhos de erro e registo reais); o parse positivo de um DWG fica **«não verificado (EXT-3)»** — nunca «passou».                                                                     |
| Wasm/worker | «integrar libredwg-web/converter»                 | `AcDbLibreDwgConverter` **só corre em Web Worker** (`'dwg converter can run in web worker only!'`); jest/node não tem `Worker`; o worker+wasm são assets do bundle (B2)                                           | a integração faz o **registo** do conversor real (`registerDwg`), a **política** (formato, tamanho, cabeçalho, estado), o **mapeamento de erros** e o **formato intermédio**; a execução do worker+wasm num WebView é S1/B2/T2.                                                                      |

## 2. Factos medidos (spike em jest/node contra as bibliotecas reais `@mlightcad/data-model@1.15.7` e `@mlightcad/libredwg-converter@3.15.7`)

| #   | Facto                                                                                                                                                                                                               | Consequência                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | DXF ASCII sintético (`AC1015`, 1 `TEXT`) é lido pelo parser MIT; `db.objects.layout` lista `Model` (`tabOrder 0`, `blockTableRecordId '14'`); `modelSpace` tem 1 entidade                                           | o DXF é verificável ponta-a-ponta com a biblioteca real, sem binários                                                                                       |
| F2  | **Texto que não é DXF (`'not a dxf at all'`) é aceite sem excepção** (a base de dados fica com defaults)                                                                                                            | o viewer não pode confiar na excepção para rejeitar: é preciso **validação explícita de cabeçalho DXF** antes de converter (senão abre-se um desenho vazio) |
| F3  | `AcDbDatabase.read(..., DWG)` sem conversor registado lança `Error` **sem `code`**: «Database converter for file type 'dwg' isn't registered…»                                                                      | o estado DWG tem de ser conhecido **antes** (`registerDwg` → `dwg: ok\|unavailable`) e mapeado para `dwg-unavailable`                                       |
| F4  | Com o conversor LibreDWG real registado mas sem `Worker`, `read` lança `AcDbOpenDatabaseError` com `code:'worker_error'`, `stage:'PARSE'`, mensagem «Failed to parse drawing due to error: 'Worker is not defined'» | `worker_error` é ambíguo (worker indisponível vs DWG corrupto): distingue-se por padrões de mensagem **[H]** e, na dúvida, é `parse`                        |
| F5  | O nome da classe do erro é minificado (`Ft`) no pacote publicado                                                                                                                                                    | classificar por `code` (duck-typing) e `instanceof AcDbOpenDatabaseError`, **nunca** por `constructor.name`                                                 |
| F6  | `AcApDocument.openDocument` trata qualquer extensão ≠ `dwg` como DXF (`AcApDocument.ts:154`)                                                                                                                        | a extensão valida-se **antes** (`unsupported-ext`), sem default silencioso para DXF                                                                         |

## 3. Modelo

```
OpenPayload (§5.2) ──► readOpenSource(source, size)         base64 estrito | url loopback (porta injectada, sem fetch global)
        │                    └─ falha → read-failed / too-large
        ▼
 ImportRequest{name, bytes, declaredSize?}
        │ detectImportFormat(name)          dwg|dxf, senão unsupported-ext
        │ limites sobre bytes REAIS         0 < n ≤ MAX[format]; ≠ declaredSize → read-failed
        │ sniff de cabeçalho                DXF ASCII (`0/SECTION`, comentários 999) | DWG `AC10xx` + versão
        │ estado do conversor               .dwg com `dwg:'unavailable'` → dwg-unavailable (sem tentar)
        ▼
 loader (injectável; por omissão AcDbDatabase.read com os conversores registados) com timeout
        │ excepção → mapOpenError → ImportFailure{code, message PT-PT, stage, detail redigido}
        ▼
 inspecção: layouts (tabOrder), activeLayoutId; sem layouts → parse
        ▼
 ImportedDocument  ─►  toOpenedPayload()      ┐ formas EXACTAS de OpenedPayload /
 ImportFailure     ─►  toOpenFailedPayload()  ┘ OpenFailedPayload (src/contracts/protocol.ts)
```

### 3.1 Formato intermédio consumido pelo viewer

- `ImportedDocument {name, format, dwgVersion?, byteLength, layouts: ImportLayout[], activeLayoutId, database}` — `database` é o `AcDbDatabase` convertido (o viewer/dispatcher I1 usa-o para FIND e para `view`); o resto é metadado serializável. `ImportLayout` = `{name, btrId, tabOrder}` (igual a `LayoutInfo` do app e a `acapListFindLayouts`; teste de deriva contra as duas).
- `ImportOutcome = {ok: true, document} | {ok: false, failure}`; **nunca lança** para falhas esperadas (entrada inválida, conversor, timeout).
- `ImportFailure {code, message, stage, detail?}`: `code ∈ OPEN_FAILED_CODES` (igual ao protocolo; teste de deriva contra `apps/freedom-mobile/src/contracts/protocol.ts`), `message` = texto PT-PT **fixo por código** (nunca texto cru da excepção), `stage ∈ source|validate|sniff|convert|inspect`, `detail` = excepção redigida (sem URLs/caminhos, ≤ 200 chars) só para o canal `log`.
- Substituição do loader: o dispatcher (I1) pode passar um loader que chame `AcApDocManager.openDocument` e devolva a base de dados do documento; a política/erros/formato intermédio mantêm-se.

### 3.2 Mapeamento de erros (explícito, sem fallback silencioso)

| Origem                                                                                                                                 | `code` do protocolo | Notas                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| extensão ≠ `.dwg`/`.dxf` (ou sem extensão, ou só `.dwg`)                                                                               | `unsupported-ext`   | nunca tratado como DXF (F6)                                                                                                   |
| bytes reais > `MAX_DOCUMENT_BYTES[format]` (20 MB DXF / 10 MB DWG [H]); base64 > 8 MB                                                  | `too-large`         |                                                                                                                               |
| 0 bytes; tamanho real ≠ declarado; base64 inválido; URL não-loopback; falha do porto de fetch                                          | `read-failed`       |                                                                                                                               |
| cabeçalho DXF/DWG inválido; DXF binário (não suportado em v1); sem layouts; `parse_failed`/`unknown`/`font_load_failed`                | `parse`             | `font_load_failed`: não esperado em `read`; documentado como `parse` para não alargar o vocabulário do protocolo              |
| `.dwg` com estado `unavailable`; conversor não registado (F3); `worker_error` com padrão de worker/wasm indisponível (F4); `license_*` | `dwg-unavailable`   | `license_*` só existiria no conversor proprietário, **que não é usado** (D-2): mapeia-se por segurança, sem nomear fornecedor |
| `worker_error` sem esse padrão (DWG corrupto)                                                                                          | `parse`             | [H] a confirmar com worker real (S1/T2)                                                                                       |
| `worker_oom`; `RangeError`; mensagens de memória (`out of memory`, `Array buffer allocation`…)                                         | `oom`               |                                                                                                                               |
| `worker_timeout`; `AbortError`/`TimeoutError`; timeout do loader (`timeoutMs`, 120 s [H])                                              | `timeout`           |                                                                                                                               |
| `fetch_failed`                                                                                                                         | `read-failed`       |                                                                                                                               |

### 3.3 Registo do conversor (`registerDwg`, §6.2/§6.4)

Réplica de `registerLibreDwgConverter` (`packages/cad-viewer-example/src/registerLibreDwg.ts:12-19`) com `convertByEntityType:false, useWorker:true, parserWorkerUrl`, mais: URL do worker **local** (relativo, `/…` ou loopback; `http(s)` externo → recusado); `Worker` ausente → `unavailable` sem registar; excepção ao construir/registar → `unavailable` e desregisto; devolve `{status: 'ok'|'unavailable', reason?}` (o `reason` vai para `log`, não para o utilizador). Nunca importa `@mlightcad/dwg-converter` nem `tools/use-dwg-converter.mjs` (guarda estática em teste).

## 4. Plano (commits)

1. Esta spec (docs-only).
2. Esqueleto do pacote + `src/import/{types,format,limits,errors}.ts` + testes de formato/limites/mapeamento de erros.
3. `src/import/{source,registerDwg,importer}.ts` + `__tests__/helpers/syntheticDxf.ts` + testes com as bibliotecas reais (DXF real; registo real; DWG só caminhos de erro) + guardas D-2/D-5 e proveniência.
4. Reconciliação desta spec com números finais, gates e **handoff para I3** («Evidência»).

## 5. Gates e limitações

Gates (raiz + `apps/freedom-mobile`): `pnpm exec jest packages/cad-mobile-viewer`, `pnpm --filter @mlightcad/cad-mobile-viewer exec tsc --noEmit`, `pnpm exec eslint packages/cad-mobile-viewer`, `prettier --check` no delta (sem saída gerada), `git diff --check origin/main...HEAD`, `apps/freedom-mobile`: `npm test` (319 intactos) + `npm run typecheck`, `jest --listTests` global (sem testes novos fora do pacote; sem `/apps/`), `detect_changes` (codebase-memory), base-vs-HEAD e mutações de sanidade. Resultados na secção «Evidência», preenchida no último commit.

Limitações declaradas de antemão: (a) **nenhum DWG real é convertido** (sem fixture autorizada, EXT-3): a linha DWG fica «não verificado»; o worker+wasm não corre em jest/node; (b) padrões de mensagem para `worker_error` são **[H]** (F4) até haver worker real; (c) limites de tamanho continuam [H] (S2); (d) o loader por omissão usa `AcDbDatabase.read` directamente — a ligação a `AcApDocManager.openDocument`/view é I1; (e) sem G-man/emulador (sem JDK/AVD; iOS sem Xcode).
