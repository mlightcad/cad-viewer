# OBJ-0104 — Inventário de licenças e proposta de NOTICE (M5-L1)

Card `t_764a4478`. Fontes: `docs/OBJ-0104-architecture.md` D-1, D-2, D-5, D-6, §8–§10; manifestos `apps/freedom-mobile/package.json`, `packages/cad-mobile-viewer/package.json`, `pnpm-lock.yaml`, `apps/freedom-mobile/package-lock.json`; `LICENSE` (MIT, mlightcad).

**Este documento não é parecer jurídico** (EXT-2). **Não é gate técnico** (D-1): nenhum card I*/T* depende dele; condiciona apenas _distribuição_ (L3). Legenda: **[F]** facto verificado nos manifestos/lockfiles/`node_modules` instalado; **[H]** hipótese, a confirmar no tarball ou por pessoa competente; **[EXT]** depende de acção externa (§10 da arquitectura).

## 1. Licença do código desta app

| Componente                                                       | Licença declarada                     | Estado                                    |
| ---------------------------------------------------------------- | ------------------------------------- | ----------------------------------------- |
| `apps/freedom-mobile` (`license`)                                | `GPL-3.0-or-later`                    | [F] campo presente                        |
| `packages/cad-mobile-viewer` (`license`)                         | `GPL-3.0-or-later`                    | [F] campo presente                        |
| Restante monorepo (15 pacotes `@mlightcad/*`, `LICENSE` na raiz) | `MIT`, "Copyright (c) 2026 mlightcad" | [F]                                       |
| Texto `GPL-3.0` em `apps/freedom-mobile/assets/licenses/`        | previsto em §8.2 (L2)                 | [F] ainda inexistente; ver pendentes (§6) |

MIT é compatível com GPL-3.0: código MIT pode ser incorporado numa obra combinada GPL-3.0 desde que os avisos de copyright e o texto MIT sejam preservados (D-6). O `LICENSE` da raiz **não é alterado** (fora de âmbito).

## 2. Dependências que entram no artefacto distribuído

### 2.1 App Expo (`apps/freedom-mobile`) — directas

| Pacote                           | Versão (lock) | Licença [F] | Obrigação                            |
| -------------------------------- | ------------- | ----------- | ------------------------------------ |
| `expo`                           | 57.0.28       | MIT         | manter aviso + texto MIT             |
| `expo-crypto`                    | 57.0.4        | MIT         | idem                                 |
| `react`                          | 19.2.3        | MIT         | idem                                 |
| `react-native`                   | 0.86.3        | MIT         | idem                                 |
| `react-native-safe-area-context` | 5.7.0         | MIT         | idem                                 |
| `react-native-tcp-socket`        | 6.4.3         | MIT         | idem                                 |
| `react-native-webview`           | 13.16.1       | MIT         | idem                                 |
| `typescript` (dev)               | 6.0.3         | Apache-2.0  | não distribuído (só desenvolvimento) |

`package-lock.json` da app: 492 pacotes transitivos; distribuição por SPDX [F]: MIT 415, ISC 29, Apache-2.0 10, MPL-2.0 12, BlueOak-1.0.0 6, BSD-3-Clause 7, BSD-2-Clause 3, Unlicense 2, `(MIT OR CC0-1.0)` 2, `(MIT OR Apache-2.0)` 1, `(BSD-3-Clause OR GPL-2.0)` 1, 0BSD 1, Python-2.0 1, CC-BY-4.0 1. A lista exacta de ferramentas de _build_ (não incluídas no binário) vs. runtime **não foi separada** [H]: o L2 deve gerar o inventário final só a partir do que o bundle/binário contém.

Pontos a registar [F]:

- **MPL-2.0** (`lightningcss*`, opcional, ferramenta de build do Metro/Expo): copyleft por ficheiro; só relevante se for redistribuído em binário — [H] não entra no APK. Confirmar em L2.
- **`node-forge` `(BSD-3-Clause OR GPL-2.0)`**: licenciamento duplo; escolher-se BSD-3-Clause — [H] pacote de build/CLI, não runtime.
- **CC-BY-4.0** (`caniuse-lite`): dados de browserslist, só build; atribuição exigida se redistribuído.
- **Apache-2.0** (várias): exige preservar `LICENSE`/`NOTICE` do pacote se redistribuído.

### 2.2 Bundle do viewer (`packages/cad-mobile-viewer`)

| Pacote                                            | Versão (lock)  | Licença                                                  | Estado                                                                 |
| ------------------------------------------------- | -------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| `@mlightcad/data-model`                           | 1.15.7         | MIT (família `@mlightcad/*` do monorepo)                 | [F] versão no lock; [H] licença do tarball publicado, confirmar em L2  |
| `@mlightcad/libredwg-converter`                   | 3.15.7         | GPL-3.0 segundo scoping §9 / arquitectura §8.2           | [H] campo SPDX do tarball não verificável (não instalado nesta árvore) |
| `@mlightcad/libredwg-web` (wasm LibreDWG)         | 0.8.0          | GPL-3.0 (LibreDWG); `-only` vs `-or-later` por confirmar | [H]                                                                    |
| `@mlightcad/geometry-engine`, `graphic-interface` | 3.15.7         | [H] MIT                                                  | transitivos de `data-model`                                            |
| `@mlightcad/mtext-renderer`, `mtext-parser`       | 0.13.4 / 1.5.5 | [H] MIT                                                  | só se efectivamente no bundle                                          |
| `three`                                           | 0.172.0        | MIT                                                      | [H] confirmar no tarball                                               |

`node_modules` da raiz pnpm **não contém** `@mlightcad/*` nesta árvore, pelo que a licença de cada tarball ainda não foi lida: é a verificação central de L2 (`license`/`LICENSE`/`AUTHORS` de cada pacote, incluindo a linha de copyright FSF do LibreDWG).

### 2.3 Fora do artefacto (D-2, D-5)

`@mlightcad/dwg-converter` e `tools/use-dwg-converter.mjs` (parser proprietário, `PROPRIETARY-PARSER.md`): **não usados**; sem contacto com o titular. Não aparecem em NOTICE.

## 3. Obrigações e compatibilidade (resumo, não parecer)

1. **GPL-3.0 (LibreDWG + código novo)**: o artefacto com o wasm é tratado como obra combinada GPL-3.0 (D-6): oferta de código-fonte correspondente, texto da licença, aviso "sem garantia", cabeçalho SPDX nos ficheiros novos. [F] decisão do Kevin; [EXT] URL público da fonte (EXT-1).
2. **MIT**: preservar copyright e texto da licença em NOTICE/ecrã Acerca. Compatível com GPL-3.0.
3. **Apache-2.0, ISC, BSD, BlueOak, 0BSD, Unlicense**: obrigações de aviso apenas (Apache-2.0: preservar NOTICE do pacote). Apache-2.0 é compatível com GPL-3.0 [H] (não com GPL-2.0-only).
4. **MPL-2.0 / CC-BY-4.0**: ver §2.1; relevantes só se redistribuídos.
5. **Lojas (App Store/Play) × GPL-3.0**: conflito conhecido nos termos das lojas — **[EXT] EXT-2, requer parecer jurídico**; não resolvido aqui.
6. Fontes empacotadas (§6.3 da arquitectura): licença de cada fonte [H B2/L1]; sem licença conhecida, não entram no bundle.

## 4. Proposta de NOTICE (rascunho para L2/L3)

Não é criado `NOTICE` na raiz neste card (não foi pedido explicitamente); o texto abaixo é a proposta, a materializar em `apps/freedom-mobile/assets/licenses/` por L2 (gerado de `third-party.json`, §8.2).

```text
Freedom DWG/CAD Viewer
Copyright (C) 2026 Equipa Aitra

This program is free software: you can redistribute it and/or modify it
under the terms of the GNU General Public License as published by the
Free Software Foundation, either version 3 of the License, or (at your
option) any later version. It is distributed WITHOUT ANY WARRANTY.
Corresponding source: SOURCE_URL_PENDING

Third-party components (licence texts reproduced in third-party.json):

- mlightcad/cad-viewer packages (@mlightcad/*) - MIT
  Copyright (c) 2026 mlightcad
- LibreDWG, via @mlightcad/libredwg-web / libredwg-converter - GPL-3.0
  Copyright (C) Free Software Foundation, Inc. [confirm exact line in L2]
- three.js - MIT; React, React Native, Expo, react-native-webview,
  react-native-tcp-socket, react-native-safe-area-context, expo-crypto - MIT
- Remaining runtime dependencies: per generated inventory (L2).

"DWG" is a file format; this app is not affiliated with Autodesk or mlightcad.
```

Titular do copyright da app (`Equipa Aitra`) e `SOURCE_URL_PENDING` são **decisões do Kevin** [EXT-1]; nenhum URL interno foi incluído.

## 5. Higiene (arquitectura §9)

Este documento não contém segredos, e-mails pessoais, URLs internos nem caminhos absolutos de máquina. O contacto comercial do parser proprietário não é reproduzido.

## 6. Pendentes e passagem para L2

| #   | Item                                                                                                | Tipo          |
| --- | --------------------------------------------------------------------------------------------------- | ------------- |
| 1   | Ler `license`/`LICENSE` dos tarballs `@mlightcad/*` e `three` (instalar na raiz)                    | L2, técnico   |
| 2   | Confirmar `GPL-3.0-only` vs `-or-later` e linha de copyright de `libredwg-web`                      | L2            |
| 3   | Separar runtime vs build nos 492 pacotes da app; gerar `third-party.json`                           | L2            |
| 4   | Criar `assets/licenses/GPL-3.0.txt` e ecrã "Acerca/Licenças" (§8.2)                                 | L2            |
| 5   | Titular de copyright e URL público da fonte                                                         | Kevin / EXT-1 |
| 6   | Parecer GPL × lojas                                                                                 | EXT-2         |
| 7   | Cabeçalhos SPDX nos ficheiros novos de `apps/freedom-mobile` e `cad-mobile-viewer` (não verificado) | L2/L3         |

Nenhum item acima bloqueia desenvolvimento (D-1).
