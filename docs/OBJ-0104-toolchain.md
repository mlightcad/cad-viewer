# OBJ-0104 — Validação da toolchain Expo/Android (M0-E0)

Documento de verificação, **apenas documentação**. Nenhum código, configuração, dependência, lockfile ou CI foi alterado; nada foi instalado (global ou local); nenhum ficheiro do Hermes de produção foi tocado. Fonte vinculativa: `docs/OBJ-0104-architecture.md` §§3.2–4, §§10–11 e decisões D-2 a D-5.

## 0. Método e convenções

- Só comandos de detecção de versão e listagem, de leitura. Sem `pnpm install`, `npm install`, `sdkmanager`, `npx expo`, nem criação de AVDs.
- Cada linha regista o **código de saída (rc)** observado. `rc=127` = comando não encontrado.
- Caminhos de máquina não são publicados: `<WIN_SDK>` designa o Android SDK instalado no lado Windows do host (acedido via interop do WSL2) e `~` o *home* do utilizador.
- Marcadores: **[OK]** verificado e utilizável · **[AUSENTE]** não existe neste ambiente · **[BLOQUEIO]** impede executar um gate · **[N/V]** não verificado.
- Data da verificação: 2026-10-13. Base do código: `33bee23a` (ramo do card; árvore limpa à entrada).
- Ambiente: Linux 6.18 sobre WSL2 (x86_64), `/dev/kvm` presente.

## 1. Pré-requisitos de implementação (toolchain)

Separados dos gates de produto (§2): aqui só se responde "o ambiente consegue construir/correr?".

### 1.1 Lado Linux/WSL

| Ferramenta | Comando | Resultado | rc | Estado |
|---|---|---|---|---|
| Node | `node --version` | `v26.10.0` (o repo exige `engines.node >=24`) | 0 | [OK] |
| npm | `npm --version` | `12.2.0` (gestor previsto para `apps/freedom-mobile/`, §3.1) | 0 | [OK] |
| npx | `npx --version` | `12.2.0` | 0 | [OK] |
| pnpm | `pnpm --version` | `10.33.4` (igual a `packageManager: pnpm@10.33.4`; `engines.pnpm >=10`) | 0 | [OK] |
| corepack | `corepack --version` | comando não encontrado | 127 | [AUSENTE] (não necessário: pnpm já está na versão fixada) |
| yarn | `yarn --version` | comando não encontrado | 127 | [AUSENTE] (não usado) |
| git | `git --version` | `2.34.1` | 0 | [OK] |
| Python / uv | `python3 --version`; `uv --version` | `3.11.16`; `0.12.19` | 0 / 0 | [OK] (não relevantes para o MVP) |
| Java (JRE/JDK) | `java -version`; `javac -version` | comando não encontrado | 127 / 127 | [AUSENTE]; `/usr/lib/jvm` não existe; `JAVA_HOME` não definido |
| Android SDK Linux | `adb version`; `sdkmanager --version`; `emulator -version`; `avdmanager list avd` | comando não encontrado | 127 ×4 | [AUSENTE]; `ANDROID_HOME`/`ANDROID_SDK_ROOT` não definidos; nenhum dos directórios habituais (`~/Android/Sdk`, `~/android-sdk`, `/opt/android-sdk`, `/usr/lib/android-sdk`) existe |
| Expo CLI global | `expo --version`; `eas --version` | comando não encontrado | 127 / 127 | [AUSENTE] (esperado: o Expo vem como dependência local do app em B1, §3.1) |
| watchman | `watchman --version` | comando não encontrado | 127 | [AUSENTE] (opcional) |
| `tsc` no PATH | `tsc --version` | `Version 6.0.3` | 0 | **Atenção:** o binário vem de uma instalação externa ao repo (outro projecto), **não** do `node_modules` deste repo — não conta como G-tsc |

### 1.2 Lado Windows (SDK instalado no host, acessível via interop)

| Item | Comando | Resultado | rc | Estado |
|---|---|---|---|---|
| Android SDK | `ls <WIN_SDK>` | `build-tools`, `cmdline-tools/latest`, `emulator`, `platform-tools`, `platforms`, `system-images`, `licenses`, … | 0 | [OK] presente |
| Plataformas | `ls <WIN_SDK>/platforms` | `android-31`, `android-33`, `android-34` | 0 | [OK] |
| ADB | `<WIN_SDK>/platform-tools/adb.exe version` | `Android Debug Bridge 1.0.41`, `Version 34.0.5-10900879` | 0 | [OK] (só via caminho completo; `adb.exe` **não** está no PATH do WSL) |
| Emulador | `<WIN_SDK>/emulator/emulator.exe -version` | `Android emulator 33.1.24.0` | 0 | [OK] |
| AVD | `<WIN_SDK>/emulator/emulator.exe -list-avds` | 1 AVD: `Pixel_3a_API_34_extension_level_7_x86_64` (imagem `android-34/google_apis`, x86_64) | 0 | [OK] existe; **não foi arrancado** nesta verificação |
| Dispositivos | `<WIN_SDK>/platform-tools/adb.exe devices` | lista vazia (nenhum emulador/dispositivo ligado) | 0 | [N/V] |
| Java no lado Windows | `java.exe` no PATH; `jbr` do Android Studio em `Program Files` | não encontrado | — | [AUSENTE] |

Efeito colateral registado: o primeiro `adb.exe devices` arrancou o daemon ADB (`tcp:5037`); foi terminado a seguir com `adb.exe kill-server` (rc=0). Nada mais ficou em execução.

### 1.3 Registo npm (leitura, sem instalar)

| Comando | Resultado | rc |
|---|---|---|
| `npm view expo version` | `57.0.28` (informativo, em 2026-10-13) | 0 |
| `npm view react-native-webview version` | `14.0.1` (informativo) | 0 |

A escolha do SDK Expo alvo continua a ser P-3 (decidida em B1, §10.3): "o SDK estável mais recente suportado por `react-native-webview` no momento de B1". Estes números **não fixam** versão nenhuma.

### 1.4 Estado do repositório para os gates

| Verificação | Resultado | Estado |
|---|---|---|
| `node_modules/` na raiz | não existe (`ls node_modules` → erro) | [BLOQUEIO] para G-tsc/G-lint/G-unit locais |
| `pnpm exec jest --version` | `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL … "jest" not found`, rc=254 | [BLOQUEIO] (consequência da linha anterior) |
| `pnpm-lock.yaml` | presente | [OK] |
| Store pnpm | `~/.local/share/pnpm/store/v10` | informativo |
| `apps/` | não existe (B1 ainda não executado) | esperado |
| `pnpm-workspace.yaml` | `packages: ['packages/*']` (inalterado; §2.6, A.2) | [OK] |

## 2. Gates de produto (§11) — o que a toolchain actual permite executar

Estes são os critérios de aceitação dos cards; não se confundem com os pré-requisitos acima.

| Gate (§11) | Depende de | Executável hoje? | Razão / o que falta |
|---|---|---|---|
| **G-git** (`git diff --check` + `git status --short` + fronteiras) | git | **Sim** | Só git; usado neste card (§4) |
| **G-tsc** viewer (`pnpm --filter @mlightcad/cad-mobile-viewer exec tsc --noEmit`) | `node_modules` + pacote B2 | **Não** | Sem `node_modules`; o pacote `cad-mobile-viewer` ainda não existe (B2). Necessita de `pnpm install --frozen-lockfile` (acção que **não** foi feita aqui) |
| **G-tsc** app (`npx tsc --noEmit` em `apps/freedom-mobile`) | B1 | **Não** | `apps/` não existe |
| **G-lint** | `node_modules` | **Não** | idem |
| **G-unit** (`pnpm exec jest <paths>`) | `node_modules` | **Não** | idem (rc=254 acima) |
| **G-man** Android (B1/S1/I2–I5/S2/T2) | Android SDK + AVD/dispositivo + build de desenvolvimento Expo | **Parcial** | ADB/emulador/AVD existem no host Windows (§1.2). **Falta Java (JDK)** em Linux e Windows, necessário para compilar/executar o *development build* Android (Gradle); sem o JDK, B1 não consegue gerar a APK nesta máquina. Alternativa fora deste card: EAS Build ou JDK instalado por decisão do Kevin |
| **G-man** iOS | macOS + Xcode | **Não** | WSL sem Xcode; R-8: iOS fica "não verificável neste ambiente", **nunca** "ok" |
| Rede bloqueada / zero pedidos externos (B2, T2) | browser desktop + DevTools / proxy | [N/V] | não testado neste card |

### 2.1 Lista de pré-requisitos em falta (para decisão do Kevin; **nada foi instalado**)

1. **JDK** (versão exigida pelo Gradle/AGP do SDK Expo escolhido em P-3; confirmar em B1 na documentação do SDK) — [BLOQUEIO] para G-man Android.
2. **`pnpm install --frozen-lockfile`** na raiz (escreve apenas `node_modules/`, ignorado pelo git) — [BLOQUEIO] para G-tsc/G-lint/G-unit. É uma acção local e reversível, mas fora do âmbito deste card (proibido instalar).
3. **Ponte WSL→ADB do Windows** (o `adb.exe` do host não está no PATH do WSL; usa-se o caminho completo) e confirmação de que o emulador do Windows é alcançável a partir do Metro/WSL — [N/V], a validar em B1/S1.
4. **macOS/Xcode** para iOS — fora do âmbito deste ambiente.

Nenhum destes pontos é bloqueio *de decisão*: são bloqueios *operacionais* de execução, registados como tal e não como sucesso.

## 3. A toolchain não altera a decisão DWG+DXF/LibreDWG nem introduz parser proprietário/upstream

Verificação contra as decisões vinculativas:

| Decisão | Conclusão desta verificação |
|---|---|
| **D-2** DWG via `@mlightcad/libredwg-converter` + `@mlightcad/libredwg-web`; sem parser proprietário | Nada na toolchain (Node, pnpm, npm, Expo, SDK Android, ADB, emulador) toca na escolha do conversor. Não foi instalado, executado nem avaliado nenhum parser DWG. `tools/use-dwg-converter.mjs` existe no repositório como ficheiro já versionado (`git ls-files`), **não foi executado, referenciado nem alterado**; `@mlightcad/dwg-converter` não é dependência de nenhum `packages/*/package.json` nem de `pnpm-workspace.yaml`. |
| **D-3** v1 = DWG + DXF (DXF-only só como modo degradado, §6.4) | Inalterado. A falta de JDK/`node_modules` não justifica reduzir para DXF-only; é um bloqueio operacional de ambiente, não de produto. |
| **D-4** FIND é prioridade | Inalterado; a sequência B0→…→L3 (§11) não é reordenada por esta validação. |
| **D-5** nenhuma acção sobre upstream `mlightcad` | Nenhum contacto, issue, PR, fork, e-mail ou pedido ao titular do parser proprietário. Os pedidos de rede feitos foram apenas leituras de metadados públicos do registo npm (`expo`, `react-native-webview`), sem credenciais nem dados do projecto. Os pacotes `@mlightcad/*` não foram modificados nem actualizados. |
| **§3.2 fronteiras** | A única alteração deste card é `docs/OBJ-0104-toolchain.md` (permitido: `docs/OBJ-0104-*.md`). Sem alterações a `packages/**`, `apps/**`, `jest.config.ts`, `.gitignore`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, CI ou configs. |
| **§4 âmbito DWG/DXF v1** | Não afectado. A cobertura real de versões DWG continua [H] e dependente de EXT-3 (DWG fixture), que a toolchain não resolve. |

## 4. Reprodução

Comandos para repetir esta verificação (todos de leitura; ajustar `<WIN_SDK>`):

```bash
node --version; npm --version; pnpm --version; git --version
java -version; javac -version                       # esperado hoje: rc=127
adb version; sdkmanager --version                   # esperado hoje: rc=127 (lado Linux)
"<WIN_SDK>/platform-tools/adb.exe" version
"<WIN_SDK>/emulator/emulator.exe" -version
"<WIN_SDK>/emulator/emulator.exe" -list-avds
"<WIN_SDK>/platform-tools/adb.exe" devices && "<WIN_SDK>/platform-tools/adb.exe" kill-server
ls node_modules; pnpm exec jest --version           # esperado hoje: erro / rc=254
npm view expo version; npm view react-native-webview version
git diff --check; git status --short
```

Higiene deste documento: sem segredos, tokens, e-mails ou caminhos absolutos de máquina (caminhos substituídos por `<WIN_SDK>` e `~`); alinhado com §9 de `docs/OBJ-0104-architecture.md`.

## 5. Limitações

- Verificação pontual (2026-10-13); versões podem mudar. Cada card B*/S* deve reconfirmar a sua parte da toolchain antes de executar.
- Nenhum build, teste ou emulador foi executado: este documento prova **presença e versão** de ferramentas, não que o *development build* Expo arranque.
- O emulador `Pixel_3a_API_34` existe mas não foi arrancado; a aceleração (`/dev/kvm` no WSL; HAXM/WHPX no Windows) não foi testada.
- Versões Expo/WebView do registo (§1.3) são informativas; a fixação é P-3/B1.
- iOS: não verificável neste ambiente (R-8).

## Excepção documentada: `prettier --check` em docs herdados (t_84c9845f)

`docs/OBJ-0104-architecture.md`, `docs/OBJ-0104-scoping.md` e este ficheiro **já falham** `prettier --check` em `origin/main` (d7e3e121; 297/192/110 linhas de diferença, só alinhamento de tabelas) e não são reformatados aqui para não gerar um diff estranho ao card. O gate objectivo é o delta: as linhas de prosa acrescentadas são estáveis no prettier; a linha I6 da §11 da arquitectura é uma linha de tabela cujo alinhamento depende da tabela herdada, e fica como está. Todos os restantes `docs/OBJ-0104-m*.md`, `apps/freedom-mobile/src` e `packages/cad-mobile-viewer` passam `prettier --check`.
