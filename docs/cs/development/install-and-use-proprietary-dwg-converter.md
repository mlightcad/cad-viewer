---
title: "Instalace a použití proprietárního převodníku DWG"
---

# Instalace a použití proprietárního převodníku DWG

Tato příručka vysvětluje, jak **nainstalovat** a **zaregistrovat** proprietární balíček parseru DWG **`@mlightcad/dwg-converter`** v datovém modelu cad-viewer.

Informace o licencování, zkušebním přístupu, cenách a dodržování GPL naleznete v souboru [PROPRIETARY-PARSER.md](https://github.com/mlightcad/cad-viewer/blob/main/PROPRIETARY-PARSER.md) v hlavním repozitáři.

> **Předpoklad:** Váš účet GitHub již musí mít **přístup pro čtení** k soukromému balíčku (udělený po schválení zkušebního přístupu nebo nákupu).

## Přehled

- `@mlightcad/dwg-converter` je publikován v **GitHub Packages**.
- Ostatní balíčky `@mlightcad/*` (například `@mlightcad/data-model`, `@mlightcad/cad-viewer`) jsou publikovány ve veřejném **registru npm**.
- npm a pnpm podporují mapování registru pouze na **úrovni scope** – **neexistuje žádné oficiální mapování registru na úrovni balíčku** v rámci stejného scope.

To znamená, že **nemůžete** použít:

```ini
@mlightcad:registry=https://npm.pkg.github.com
```

k načtení pouze `@mlightcad/dwg-converter`. Takové nastavení by přesměrovalo **všechny** balíčky `@mlightcad/*` do GitHub Packages a rozbilo instalaci veřejných balíčků.

**Poznámka k verzi:** Nahraďte `1.2.3` (a jakýkoli hash tarballu) v níže uvedených příkladech **přesnou verzí, která vám byla dodána**.

## Vytvoření `GITHUB_TOKEN` s oprávněním `read:packages`

GitHub Packages v současnosti autentizuje pomocí **osobního přístupového tokenu (classic)**; jemně granulované tokeny nejsou pro registr npm podporovány.

1. Přihlaste se do GitHubu účtem, který má přístup k balíčku.
2. Otevřete **Settings → Developer settings → Personal access tokens → Tokens (classic)**  
   (přímý odkaz: [https://github.com/settings/tokens](https://github.com/settings/tokens)).
3. Klikněte na **Generate new token → Generate new token (classic)**.
4. Pojmenujte token (například `dwg-converter-install`) a nastavte expiraci, která odpovídá vaší bezpečnostní politice.
5. V části **Select scopes** povolte **`read:packages`**. Pro pouhé instalování nepotřebujete `write:packages` ani `delete:packages`.
6. Klikněte na **Generate token** a ihned jej zkopírujte (zobrazí se pouze jednou).
7. Zpřístupněte jej jako `GITHUB_TOKEN`:

   ```bash
   # macOS / Linux
   export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

   # Windows PowerShell
   $env:GITHUB_TOKEN = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

   # Windows CMD
   set GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

8. Pokud **klient** komunikuje s GitHub Packages přímo (možnost 2 níže), přidejte do `.npmrc` záznam autentizace na **úrovni hostitele**:

   ```ini
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```

   Tím se přihlašovací údaje připojí pouze pro `npm.pkg.github.com`. **Nepřemapuje** to scope `@mlightcad`. **Nepřidávejte** `@mlightcad:registry=https://npm.pkg.github.com`.

   `pnpm install` tento soubor čte. `npm view` jej nečte, pokud jej spustíte z balíčku v pracovním prostoru: od npm 8.5 CLI ignoruje `.npmrc` daného balíčku (`ignoring workspace config`) a požadavek je odeslán bez tokenu (`401 Unauthorized - authentication token not provided`), i když je `GITHUB_TOKEN` nastaven. Předejte token přímo v příkazu `npm view` – viz možnost 2.

   V monorepu umístěte tento soubor do **kořene pracovního prostoru**. Soubor `.npmrc`, který se nachází pouze uvnitř členského balíčku, je soubor, který npm přeskakuje.

   Pokud používáte možnost 1 (proxy soukromého registru), klienti obvykle **nepotřebují** tento řádek – vložte token místo toho do proxy.

**Bezpečnostní poznámky**

- Zacházejte s tokenem jako s heslem. **Nezapisujte** jej do gitu ani jej nevkládejte do veřejných issues.
- Upřednostněte proměnné prostředí (nebo váš CI secret store) před pevným zakódováním tokenu v `.npmrc`.
- V GitHub Actions namapujte tajný klíč repozitáře (například `GH_PACKAGES_TOKEN`) na `GITHUB_TOKEN` / `NODE_AUTH_TOKEN` pro úlohu instalace.

## Možnosti instalace

Vyberte **jednu** z níže uvedených možností.

### Možnost 1: Jednotný soukromý registr, který proxuje npm a GitHub Packages

Pokud provozujete (nebo již používáte) soukromý registr npm – Verdaccio, JFrog Artifactory, Sonatype Nexus nebo cloudový registr npm od některého poskytovatele – namiřte klienty na tento registr a nechte jej rozhodnout o upstreamu podle balíčku:

```text
                ┌── npmjs.org          (@mlightcad/data-model, …)
client ──→ private registry
                └── GitHub Packages    (@mlightcad/dwg-converter)
```

`.npmrc` klienta:

```ini
registry=https://npm.example.com/
```

Nakonfigurujte soukromý registr tak, aby:

| Balíček | Upstream |
|---------|----------|
| `@mlightcad/foo` (veřejné balíčky) | `https://registry.npmjs.org` |
| `@mlightcad/dwg-converter` | `https://npm.pkg.github.com` |

Poté nainstalujte běžným způsobem:

```bash
pnpm add @mlightcad/dwg-converter@1.2.3
```

Toto je nejčistší dlouhodobé nastavení, pokud již spravujete soukromý registr. Pro malý projekt, který potřebuje pouze jeden nebo dva balíčky z GitHub Packages, je obvykle lehčí možnost 2.

### Možnost 2: Připnutí `@mlightcad/dwg-converter` na adresu URL tarballu v GitHub Packages

Připněte balíček na jeho **adresu URL tarballu** v `package.json`, aby správce balíčků stáhl přímo tuto adresu URL namísto resolvování přes registr scope `@mlightcad`.

1. Autentizujte se v GitHub Packages (adresa URL tarballu **neobchází** autentizaci):

   ```ini
   # .npmrc
   registry=https://registry.npmjs.org/
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```

2. Zjistěte adresu URL tarballu pro verzi, kterou potřebujete.

   Pro tento příkaz se nespoléhejte na projektový `.npmrc`. `npm view` ignoruje `.npmrc` balíčku v pracovním prostoru, takže `${GITHUB_TOKEN}` z tohoto souboru se nikdy nepoužije. Předejte token v příkazovém řádku:

   ```bash
   # macOS / Linux
   npm view @mlightcad/dwg-converter@1.2.3 dist.tarball \
     --registry=https://npm.pkg.github.com \
     --//npm.pkg.github.com/:_authToken="${GITHUB_TOKEN}"
   ```

   ```powershell
   # Windows PowerShell
   npm view @mlightcad/dwg-converter@1.2.3 dist.tarball `
     --registry=https://npm.pkg.github.com `
     --//npm.pkg.github.com/:_authToken="$env:GITHUB_TOKEN"
   ```

   ```bat
   REM Windows CMD
   npm view @mlightcad/dwg-converter@1.2.3 dist.tarball --registry=https://npm.pkg.github.com --//npm.pkg.github.com/:_authToken=%GITHUB_TOKEN%
   ```

   Záznam v `.npmrc` z kroku 1 je stále vyžadován: `pnpm install` jej používá při stahování tarballu.

   Příklad výstupu:

   ```text
   https://npm.pkg.github.com/download/@mlightcad/dwg-converter/1.2.3/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. Vložte tuto adresu URL do `package.json` (použijte **svou** verzi a adresu URL tarballu):

   ```json
   {
     "dependencies": {
       "@mlightcad/data-model": "^1.0.0",
       "@mlightcad/dwg-converter": "https://npm.pkg.github.com/download/@mlightcad/dwg-converter/1.2.3/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
     }
   }
   ```

4. Nainstalujte:

   ```bash
   pnpm install
   ```

**Upozornění**

- Aktualizace vyžadují stažení nové adresy URL tarballu a aktualizaci `package.json` / lockfile.
- CI a místní instalace stále potřebují platný token GitHub s přístupem pro čtení.
- Ponechte záznam autentizace GitHub Packages v `.npmrc`.

Možnost 2 dobře funguje pro vyhodnocení a malé týmy. Pokud očekáváte časté aktualizace nebo mnoho soukromých balíčků, upřednostněte možnost 1 (nebo samostatný soukromý scope, například `@mlightcad-private/*`, mapovaný na GitHub Packages).

## Registrace převodníku

Proprietární parser je **registrovatelný převodník**, který se zapojuje do stejného pipeline jako open-source stack.

- Výstup odpovídá **`@mlightcad/data-model`** licencovanému pod MIT: `AcDbDatabase`, entity `AcDb*`, tabulky hladin, bloky a související struktury.
- Zaregistrujte jej pomocí **`AcDbDatabaseConverterManager`**, stejného mechanismu, který používá `AcDbLibreDwgConverter`.
- Po parsování funguje stávající renderovací, hladinový, výběrový a interakční pipeline pod MIT (`cad-simple-viewer`, `cad-viewer`, pluginy atd.) beze změny.

```typescript
import { AcDbDatabaseConverterManager, AcDbFileType } from '@mlightcad/data-model'
import { AcDbDwgConverter } from '@mlightcad/dwg-converter'

const converter = new AcDbDwgConverter({ /* options */ })
AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, converter)
```

Balíček **neposkytuje** samostatné API pro „parsování DWG“. Stejně jako open-source [`libredwg-converter`](https://github.com/mlightcad/realdwg-web/tree/main/packages/libredwg-converter) implementuje **`AcDbDatabaseConverter`**. Po konverzi pracujte s výsledným výkresem prostřednictvím `@mlightcad/data-model`.

**Neregistrujte** také `libredwg-converter` založený na GPL, pokud se pro účely dodržování licencí spoléháte na proprietární parser.

Kompletní funkční ukázku (autentizace, prostředky Worker, registrace a procházení databáze) naleznete v projektu [realdwg-web-example](https://github.com/mlightcad/realdwg-web-example).

## Související stránky

- [Konfigurace adres URL Worker](./configure-worker-urls) — nastavení adres URL Worker pro parsery DWG/DXF
- [PROPRIETARY-PARSER.md](https://github.com/mlightcad/cad-viewer/blob/main/PROPRIETARY-PARSER.md) — komerční licence, zkušební přístup a poznámky ke GPL
- [Vývojářská příručka](./) — přehled vývojářských témat
