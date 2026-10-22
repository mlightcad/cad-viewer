---
title: "Uživatelský vstup"
---

# Uživatelský vstup

Tato stránka vysvětluje, jak AcEditor shromažďuje uživatelské vstupy, včetně dostupných metod vstupu, společných vzorů možností výzev (zprávy, klíčová slova, jigy a chování gumové pásky), pravidel porovnávání klíčových slov a způsobu interpretace výsledků výzev. Rovněž objasňuje zamýšlené použití: vstup by měl být získáván prostřednictvím API AcEditor, nikoli ručními posluchači myši/klávesnice na plátně.

**Účel**

AcEditor zrcadlí strukturu a záměr vstupních API editoru AutoCADu. Poskytuje vysokou úroveň konzistentního způsobu získávání uživatelského vstupu při koordinaci dynamických výzev, klíčových slov a náhledových jigů. Zpracování vstupu je záměrně centralizované: parsování klíčových slov a interakce myší jsou abstrahovány a musí být přístupné prostřednictvím metod AcEditor. Ačkoli technicky můžete poslouchat události klávesnice nebo myši přímo na `AcEdBaseView.canvas`, považuje se to za nesprávné použití, které obchází životní cyklus vstupu editoru, zpracování klíčových slov a konvence výsledků výzev.

**Metody vstupu**

| Metoda | Typ možností | Typ výsledku | Typické použití |
| --- | --- | --- | --- |
| `getPoint` | `AcEdPromptPointOptions` | `AcEdPromptPointResult` | Získání bodu |
| `getDistance` | `AcEdPromptDistanceOptions` | `AcEdPromptDoubleResult` | Zadání vzdálenosti s volitelným základním bodem |
| `getAngle` | `AcEdPromptAngleOptions` | `AcEdPromptDoubleResult` | Zadání úhlu s volitelným základním bodem |
| `getDouble` | `AcEdPromptDoubleOptions` | `AcEdPromptDoubleResult` | Číselný vstup (desetinné číslo) |
| `getString` | `AcEdPromptStringOptions` | `AcEdPromptResult` | Vstup volného textu |
| `getKeywords` | `AcEdPromptKeywordOptions` | `string` | Vstup pouze pomocí klíčového slova (vrací globální klíčové slovo) |
| `getEntity` | `AcEdPromptEntityOptions` | `AcEdPromptEntityResult` | Výběr jedné entity |
| `getSelection` | `AcEdPromptSelectionOptions` | `AcEdPromptSelectionResult` | Výběr více entit |
| `getBox` | `AcEdPromptBoxOptions` | `AcEdPromptBoxResult` | Výběr dvou rohů pro definování rámečku |

**Společné možnosti výzev**

Všechny typy možností výzev dědí z `AcEdPromptOptions<T>` a sdílejí tyto vlastnosti:

- `message`: Text výzvy zobrazený uživateli.
- `keywords`: Kolekce `AcEdKeywordCollection` obsahující platná klíčová slova.
- `appendKeywordsToMessage`: Pokud je true, klíčová slova se připojí k textu výzvy pro zobrazení.
- `jig`: Připojí `AcEdPreviewJig<T>` pro povolení živého náhledu během zadávání.
- `setMessageAndKeywords(messageAndKeywords, globalKeywords)`: Parsuje složenou zprávu, například `"Pick point [Yes/No]"`, a přiřadí globální klíčová slova ze seznamu odděleného mezerami.

**Nastavení gumové pásky a základního bodu**

Několik možností výzvy podporuje chování gumové pásky nebo základního bodu:

- `AcEdPromptPointOptions`: `basePoint`, `useBasePoint`, `useDashedLine`, `allowNone`.
- `AcEdPromptDistanceOptions`: `basePoint`, `useBasePoint`, `useDashedLine`, `only2d`.
- `AcEdPromptAngleOptions`: `basePoint`, `useBasePoint`, `useDashedLine`, `useAngleBase`.
- `AcEdPromptBoxOptions`: `useBasePoint`, `useDashedLine` a samostatné `firstCornerMessage` / `secondCornerMessage`.

Pokud je `useBasePoint` true, editor kreslí čáru gumové pásky ze základního bodu ke kurzoru. `useDashedLine` řídí, zda je tato čára čárkovaná.

**Pravidla a formáty klíčových slov**

Klíčová slova jsou definována pomocí `AcEdKeywordCollection` a porovnávají se bez rozlišování velkých a malých písmen. Výsledná hodnota je vždy **globální název** klíčového slova.

- Každé klíčové slovo má `displayName` (UI), `globalName` (interní) a `localName` (uživatelský vstup).
- Uživatelé mohou zadat `localName`, `globalName`, zobrazovaný text nebo odvozený alias; všechny se porovnávají bez rozlišování velkých a malých písmen.
- Alias se odvozuje z velkých písmen v globálním názvu, například `Yes → Y`, `sAve → A`, `eXit → X`.
- Prefix `_` před vstupem vynutí porovnání s globálním klíčovým slovem.

Klíčová slova můžete definovat dvěma běžnými způsoby:

- Použití API: `options.keywords.add(displayName, globalName, localName)`.
- Seznam řetězců ve stylu ObjectARX (pro konstruktor `AcEdKeywordCollection`): lokální a globální části oddělené `_`, volitelná zkratka oddělená čárkou a velká písmena definují alias.

Příklady:

```ts
const opts = new AcEdPromptPointOptions('Pick point')
opts.keywords.add('Yes', 'Yes', 'Y')
opts.keywords.add('No', 'No', 'N')
```

```ts
const keywords = new AcEdKeywordCollection('Ja Nein _ Yes No')
```

**Výsledky výzev**

Většina metod vstupu vrací objekt ve stylu `PromptResult`, který obsahuje:

- `status`: Kód `AcEdPromptStatus`, například `OK`, `Cancel` nebo `Keyword`.
- `stringResult`: Pokud je `status === Keyword`, obsahuje **globální klíčové slovo**, které bylo porovnáno.

Třídy výsledků specifické pro typ poskytují typovanou hodnotu `value`, pokud je `status === OK`:

| Typ výsledku | Pole hodnoty | Poznámky |
| --- | --- | --- |
| `AcEdPromptPointResult` | `value: AcGePoint3dLike` | Bod při OK |
| `AcEdPromptDoubleResult` | `value: number` | Desetinné číslo při OK |
| `AcEdPromptEntityResult` | `objectId: AcDbObjectId` | ID vybrané entity |
| `AcEdPromptSelectionResult` | `value: AcEdSelectionSet` | Sada výběru |
| `AcEdPromptBoxResult` | `value: AcGeBox2d` | Ohraničující rámeček |

Poznámka: `getKeywords` vrací přímo řetězec klíčového slova namísto objektu `PromptResult`.

**Příklad: Bod s klíčovými slovy**

```ts
const opts = new AcEdPromptPointOptions('Pick point or [Yes/No]:')
opts.keywords.add('Yes', 'Yes', 'Y')
opts.keywords.add('No', 'No', 'N')

const result = await editor.getPoint(opts)
if (result.status === AcEdPromptStatus.Keyword) {
  console.log('Keyword:', result.stringResult)
} else if (result.status === AcEdPromptStatus.OK) {
  console.log('Point:', result.value)
}
```
