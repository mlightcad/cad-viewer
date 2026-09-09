---
title: Panel relace (mobilní)
---

# Panel relace (mobilní)

Na plocha umožňuje plovoucí rámeček **Dynamický vstup (DYN)** poblíž kurzoru zadávat hodnoty vzdálenosti/úhlu přímo a stisknout **Enter** pro potvrzení nebo **Esc** pro zrušení. V mobilním prostředí — kde není fyzická klávesnice — potřebuje tato interakce jiný způsob.

**Panel relace** je mobilní obdobou dynamického vstupu + klávesnice. Dokuje v dolní části obrazovky, automaticky se zobrazí během aktivního příkazu, zobrazuje aktuální výzvu a živé hodnoty měření a poskytuje tlačítka **Potvrdit** (✓) a **Zrušit** (×) na obrazovce — mobilní protějšky **Enter** a **Esc**.

## Náhled

Níže je skutečný panel relace tak, jak je vykreslen v dokumentaci:

<MobileSessionPanel />

## Struktura panelu

V rozbaleném režimu je panel rozdělen shora dolů do následujících oblastí:

### Příslušenství / Řádek titulu

Levá strana prvního řádku zobrazuje **Příslušenství relace**, které namontuje aktivní příkaz. Různé příkazy montují různá příslušenství — příkazy měření a poznámek montují **Příslušenství relace stylu kresby** (barva + výška textu), zatímco jiné příkazy (PLine, Text atd.) mohou namontovat vlastní specializované ovládací prvky. Pokud aktivní příkaz **namontuje žádné příslušenství relace vůbec**, zobrazí se na levé straně prvního řádku přímo text výzvy příkazu (a níže popsaný řádek výzvy se neobjeví).

Níže uvedená ukázka zobrazuje scénář měření / poznámek, kde je namontováno příslušenství stylu kresby:

| Ovládací prvek | Ikona | Účel |
|---|---|---|
| Tlačítko barvy | <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#1a8cff;border:1px solid #555;"></span> | Otevře ACI paletu / dialog barev pro nastavení aktivní barvy kresby |
| Tlačítko výšky textu | <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" style="vertical-align:middle"><text x="2" y="18" font-family="Georgia, Times New Roman, serif" font-size="16" font-weight="600" fill="#e8eaed">A</text><g stroke="#2dd4bf" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M18 4v16"/><path d="M15.5 6.5 18 4l2.5 2.5"/><path d="M15.5 17.5 18 20l2.5-2.5"/></g></svg> | Otevře dialog výšky textu pro nastavení velikosti textu |

Na pravé straně řádku jsou dvě kruhová ikonová tlačítka:

| Tlačítko | Ikona | Účel |
|---|---|---|
| Nápověda | ? | Otevře celoobrazovkový panel nápovědy |
| Sbalit / Rozbalit | ▼ / ▲ | Přepíná mezi kompaktním a rozbaleným režimem |

### Řádek výzvy

Druhý řádek se zobrazí **pouze pokud aktivní příkaz namontoval příslušenství relace**. Zobrazuje **text výzvy** příkazu (např. "Zadejte první bod") a, pokud příkaz poskytuje volitelné argumenty, odpovídající **čipy klíčových slov** (např. `[Zpět(U)/Pokračovat(C)]`). Výzva je zarovnána doleva a automaticky lokalizována.

Pokud aktivní příkaz namontuje žádné příslušenství relace, přesune se text výzvy přímo na levou stranu prvního řádku (nahradí místo příslušenství) a žádný samostatný druhý řádek se nezobrazí.

Ťuknutí na čip klíčového slova je mobilní obdobou zadání klíčového slova na příkazovém řádku plochy.

### Měření

Panel se aktualizuje v reálném čase, když uživatel táhne prstem. Zobrazené hodnoty závisí na stavu příkazu:

| Stav | Zobrazené hodnoty | Význam |
|---|---|---|
| Před zadáním prvního bodu | **X** / **Y** | Absolutní souřadnice aktuální polohy kurzoru |
| Po zadání prvního bodu (relativní režim) | **Délka** / **Úhel** | Vzdálenost a úhel od prvního bodu k aktuální poloze |
| Po zadání prvního bodu (relativní režim) | **ΔX** / **ΔY** | Delta X a Y od prvního bodu k aktuální poloze |

Rozložení na telefonu a tabletu se liší: na telefonu dostane každá hodnota měření vlastní řádek s tlačítkem Zrušit/Potvrdit vloženým vpravo; na tabletu jsou hodnoty měření vedle sebe a tlačítka Zrušit/Potvrdit jsou seskupena v sdílené oblasti úplně vpravo.

### Tlačítka Potvrdit / Zrušit

| Tlačítko | Ikona | Protějšek na ploše | Účel |
|---|---|---|---|
| **Potvrdit** | ✓ (modrý kruh) | `Enter` / prázdný návrat | Přijmout aktuální vstup nebo použít výchozí hodnotu |
| **Zrušit** | × (šedý kruh) | `Esc` | Přerušit aktuální příkaz |

Když příkaz nepřijímá prázdný návrat (uživatel musí zadat hodnotu), tlačítko **Potvrdit** je zakázáno (ztmavěno).

## Kompaktní režim

Ťukněte na tlačítko ▼ v řádku titulu pro přepnutí do **Kompaktního režimu**. Panel se z několika řádků sbalí do jednoho řádku; řádek výzvy, měření a čipy klíčových slov jsou všechny skryté. Zobrazí se pouze následující:

- **Příslušenství relace** (pokud je namontováno)
- Tlačítko **Rozbalit** (▲, směr šipky obrácen)
- Tlačítka **Zrušit** (×) / **Potvrdit** (✓)

Kompaktní režim udržuje plátno co nejviditelnější během provádění příkazu a zároveň zachovává základní operace. Ťukněte na tlačítko **Rozbalit** pro návrat do rozbaleného režimu.

Níže je kompaktní stav s namontovaným příslušenstvím relace:

<MobileSessionPanel initialCompact />

## Telefon vs Tablet

Panel relace se automaticky přizpůsobí šířce viewportu:

| Vlastnost | Telefon (≤ 600px) | Tablet (> 600px) |
|---|---|---|
| Šířka panelu | Plná šířka obrazovky | Centrovaný, pevná 480px se zaoblenými rohy a stínem |
| Rozložení měření | Svisle skládané, jeden řádek na měření | Vedle sebe, dvě skupiny měření paralelně |
| Umístění tlačítek | Zrušit / Potvrdit vloženy v různých řádcích měření | Zrušit / Potvrdit seskupeny v sdílené oblasti vpravo |
| Kompaktní styl | Jednorádek plné šířky | Centrovaný jednorádek pevné šířky |

## Protějšek na ploše

| Akce na ploše | Protějšek mobilního panelu relace |
|---|---|
| Dynamický vstup (DYN) zobrazující vzdálenost / úhel | Živá měření zobrazující Délku, Úhel, ΔX, ΔY |
| Zadávání voleb klíčových slov na příkazovém řádku | Ťuknutí na čipy klíčových slov |
| `Enter` / prázdný návrat pro přijetí výchozího | Tlačítko **Potvrdit** (✓) |
| `Esc` pro zrušení příkazu | Tlačítko **Zrušit** (×) |
| Výzva příkazového řádku `Zadejte první bod:` | Řádek výzvy zobrazující stejný text |
