# Proveniência das fixtures (OBJ-0104 M2-I2)

Registo exigido por `docs/OBJ-0104-architecture.md` §10.2 e pelas decisões D-2…D-5. Aplica-se a tudo o que está em `packages/cad-mobile-viewer/`.

| Campo                    | Valor                                                                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Natureza                 | **Sintética e só em memória**: `__tests__/helpers/syntheticDxf.ts` gera texto DXF e bytes de cabeçalho em cada teste. Nenhum ficheiro DXF/DWG existe nesta árvore.                                      |
| Origem                   | Criada pela equipa (Equipa Aitra) para o card OBJ-0104 M2-I2; não copiada nem derivada de `e2e/fixtures`, de DWG/DXF de terceiros ou de clientes.                                                       |
| Licença / redistribuição | Código: `GPL-3.0-or-later` (D-6). Sem material de terceiros; nada a atribuir.                                                                                                                           |
| Data                     | M2-I2 (2026-10-13).                                                                                                                                                                                     |
| Ferramenta               | Escrita à mão; nenhuma ferramenta/parser/conversor gerou conteúdo (D-2: sem parser proprietário).                                                                                                       |
| Versão DWG (`AC10xx`)    | **Não aplicável**: `fakeDwgHeader()` produz só `AC10xx` + zeros (cabeçalho **inválido**, não é um DWG). Serve exclusivamente os caminhos de erro (sniff, conversor indisponível, conversor sem Worker). |
| Dados pessoais/clientes  | Nenhum. Textos de obra genéricos («Parede norte», «Cobertura», «Obra 42»).                                                                                                                              |
| Rede / compra / contacto | Nenhuma: nada aqui implica compra de licenças, contacto com titulares nem alteração ao upstream `mlightcad` (D-2, D-5).                                                                                 |
| Estado DWG               | **DWG: não verificado (EXT-3 — fixture em falta).** O parse positivo de um DWG (worker + wasm LibreDWG) não foi exercitado; os testes DWG só provam registo, política e mapeamento de erros.            |

## Regra de entrada de artefactos reais

Um `.dwg`/`.dxf`/`.dwf` só entra em `packages/cad-mobile-viewer/` com um `PROVENANCE.md` que indique, para esse ficheiro: origem, autorização de redistribuição, data, ferramenta e versão, versão DWG (se aplicável), tamanho em bytes, `sha256`, conteúdo esperado para FIND e ausência de dados pessoais. `__tests__/guards.test.ts` falha se um destes ficheiros existir sem registo. A equipa não descarrega nem gera DWGs de terceiros (decisão do Kevin, §10.2).
