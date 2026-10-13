# Proveniência das fixtures (OBJ-0104)

Registo exigido por `docs/OBJ-0104-architecture.md` §10.2 e pelas decisões D-2…D-5. Aplica-se a tudo o que está em `src/fixtures/` e ao cenário `src/contract/`.

| Campo                    | Valor                                                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Natureza                 | **Sintética**: objectos TypeScript (`syntheticDocuments.ts`), não ficheiros DXF/DWG. Nenhum binário de desenho existe nesta árvore.            |
| Origem                   | Criada pela equipa (Equipa Aitra) para o card OBJ-0104; não copiada nem derivada de `e2e/fixtures`, de DWG/DXF de terceiros ou de clientes.    |
| Licença / redistribuição | Código do app: `GPL-3.0-or-later` (D-6). Sem material de terceiros; nada a atribuir.                                                           |
| Datas                    | M1-S1 (2026-10), M2-I1 (2026-10), M2-T1 (2026-10-13).                                                                                          |
| Ferramenta               | Escrita à mão; nenhuma ferramenta/parser/conversor gerou conteúdo (D-2: sem parser proprietário).                                              |
| Versão DWG (`AC10xx`)    | Não aplicável — não há DWG.                                                                                                                    |
| Dados pessoais/clientes  | Nenhum. Textos de obra genéricos («Parede norte», «Obra 42», «Cobertura»…).                                                                    |
| Rede / compra / contacto | Nenhuma: as fixtures não implicam compra de licenças, contacto com titulares nem alteração ao upstream `mlightcad` (D-2, D-5).                 |
| Estado DWG               | **DWG: não verificado (EXT-3 — fixture em falta).** `ready{dwg:'ok'}` do viewer sintético prova só a capacidade anunciada, nunca um parse DWG. |

## Documentos sintéticos

Nomes usados como identificadores no viewer sintético (o conteúdo é só layouts + textos pesquisáveis):

| Nome                    | Conteúdo esperado para FIND                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `synthetic-layouts.dxf` | 3 layouts (`Model`, `Planta`, `Alçados`); «Parede» em todos, «Cobertura» só em `Alçados`, «PAREDE (caixa alta)». |
| `synthetic-blocks.dxf`  | atributos do bloco `CARIMBO`: `OBRA`=«Obra 42», `ESCALA`=«Escala 1:50» (layout `Model`).                         |
| `synthetic-empty.dxf`   | nenhum texto (pesquisa vazia ≠ erro).                                                                            |
| `synthetic-many.dxf`    | gerado por `syntheticManyDoc(n)`: `n` textos «Cota i» para `truncated`/`maxResults`.                             |

## Regra de entrada de artefactos reais

Um `.dwg`/`.dxf` só entra em `apps/freedom-mobile/` com um `PROVENANCE.md` (na mesma pasta) que indique, para esse ficheiro: origem, autorização de redistribuição, data, ferramenta e versão, versão DWG (se aplicável), tamanho em bytes, `sha256`, conteúdo esperado para FIND e ausência de dados pessoais. `src/contract/fixtureGate.node-test.ts` falha se um destes ficheiros existir sem registo completo. A equipa não descarrega nem gera DWGs de terceiros (decisão do Kevin, §10.2).
