export default {
  document: {
    untitled: 'Bez názvu'
  },
  commandLine: {
    noLast: '(žádný předchozí příkaz)',
    unknownCommand: 'Neznámý příkaz',
    executed: 'Provedený příkaz',
    showHistory: 'Zobrazit historii příkazů',
    placeholder: 'Zadejte příkaz',
    showMessages: 'Zobrazit historii zpráv',
    canceled: '*Zrušeno*',
    noHistory: '(žádná historie)',
    invalidInput: 'Neplatný vstup.',
    close: 'Zavřít příkazový řádek'
  },
  mobileCommand: {
    length: 'Délka',
    angle: 'Úhel',
    dx: 'ΔX',
    dy: 'ΔY',
    x: 'X',
    y: 'Y',
    confirm: 'Potvrdit',
    cancel: 'Zrušit',
    help: 'Nápověda',
    back: 'Zpět',
    collapse: 'Sbalit',
    expand: 'Rozbalit'
  },
  inputManager: {
    firstCorner: 'Zadejte první roh nebo',
    secondCorner: 'Zadejte druhý roh nebo'
  },
  message: {
    fetchingDrawingFile: 'Načítám soubor…',
    exportingDxf: 'Exportuji DXF…',
    exportingEntityPreview: 'Exportuji obrázek…',
    collectingMemoryProfile: 'Analyzuji paměť…',
    fontCached: 'Font úspěšně uložen do mezipaměti',
    fontCacheFailed: 'Uložení fontu do mezipaměti selhalo',
    fontsNotFound: 'Fonty nenalezené v úložišti: {fonts}.',
    fontsNotLoaded: 'Nepodařilo se načíst fonty: {fonts}.',
    fontMissedInDrawing:
      'Font „{font}“ vyžaduje {count} textových objektů, ale není k dispozici. Zobrazuje se jako „{replacementFont}“.',
    fontMissedReplacement: '„{font}“ (zobrazeno fontem „{replacement}“)',
    failedToGetAvaiableFonts: 'Nepodařilo se získat fonty z „{url}“!',
    failedToOpenFile: 'Nepodařilo se otevřít soubor „{fileName}“!',
    failedToOpenFileWorkerOom:
      'Nepodařilo se otevřít „{fileName}“. Výkres je příliš velký pro dostupnou paměť.',
    failedToOpenFileWorkerTimeout:
      'Nepodařilo se otevřít „{fileName}“. Při načítání výkresu vypršel časový limit.',
    failedToOpenFileFontLoadFailed:
      'Nepodařilo se otevřít „{fileName}“. Potřebné fonty se nepodařilo načíst.',
    failedToOpenFileLicenseExpired:
      'Nepodařilo se otevřít „{fileName}“. Licence převodníku DWG vypršela.',
    failedToOpenFileLicenseInvalid:
      'Nepodařilo se otevřít „{fileName}“. Licence převodníku DWG chybí nebo je neplatná.',
    unknownEntities:
      'Tento výkres obsahuje {count} neznámých nebo nepodporovaných objektů! Tyto objekty nebudou zobrazeny.',
    tianzhengEntities:
      'Tento výkres obsahuje vlastní objekty TArch / Tianzheng (nebo podobné třetí strany) (asi {count}). V tomto prostředí je nelze plně zpracovat, takže se část obsahu nemusí zobrazit.',
    emptyProxyEntities:
      'Tento výkres obsahuje {count} vlastních objektů bez proxy grafiky! Tyto objekty nebudou zobrazeny.'
  },
  notification: {
    center: {
      title: 'Oznámení',
      clearAll: 'Vymazat vše',
      noNotifications: 'Žádná oznámení'
    },
    group: {
      fontMissed: 'Chybějící fonty',
      fontMissedSummary:
        '{count} zpráv o fontech. Kliknutím zobrazíte podrobnosti.',
      unsupportedEntities: 'Nepodporované objekty',
      unsupportedEntitiesSummary:
        '{count} zpráv o načítání. Kliknutím zobrazíte podrobnosti.',
      genericSummary: '{count} zpráv. Kliknutím zobrazíte podrobnosti.'
    },
    title: {
      failedToOpenFile: 'Nepodařilo se otevřít soubor',
      failedToOpenFileWorkerOom: 'Výkres je příliš velký',
      failedToOpenFileWorkerTimeout: 'Vypršel časový limit otevření',
      failedToOpenFileFontLoadFailed: 'Načtení fontu selhalo',
      failedToOpenFileLicenseExpired: 'Licence vypršela',
      failedToOpenFileLicenseInvalid: 'Neplatná licence',
      fontNotFound: 'Font nenalezen',
      fontNotLoaded: 'Font nenačten',
      parsingWarning: 'Problémy při načítání výkresu',
      systemMessage: 'Systémová zpráva',
      systemWarning: 'Systémové varování',
      systemError: 'Systémová chyba',
      systemInfo: 'Systémové informace'
    }
  },
  progress: {
    start: 'Zahajuji načítání souboru…',
    parse: 'Načítám soubor…',
    font: 'Stahuji fonty potřebné pro tento výkres…',
    ltype: 'Načítám typy čar…',
    style: 'Načítám textové styly…',
    dimstyle: 'Načítám kótovací styly…',
    layer: 'Načítám hladiny…',
    vport: 'Načítám výřezy…',
    blockrecord: 'Načítám záznamy bloků…',
    header: 'Načítám hlavičku…',
    block: 'Načítám bloky…',
    entity: 'Načítám objekty…',
    object: 'Načítám pojmenované slovníky…',
    rendering: 'Vykreslování výkresu ...',
    end: 'Hotovo!'
  },
  about: {
    title: 'O aplikaci',
    close: 'Zavřít',
    product: 'CAD Viewer',
    tagline: 'Vysokovýkonný webový CAD prohlížeč pro výkresy DWG a DXF.',
    website: 'Web',
    docs: 'Dokumentace',
    repository: 'GitHub',
    copyright: '© {year} mlightcad. Všechna práva vyhrazena.',
    ok: 'OK'
  },
  drawStyle: {
    color: 'Barva',
    fontSize: 'Výška textu'
  },
  shortCutToolbar: {
    more: 'Více',
    undo: 'Zpět',
    redo: 'Znovu',
    erase: 'Smazat',
    collapse: 'Sbalit panel nástrojů',
    expand: 'Rozbalit panel nástrojů'
  },
  textHeight: {
    title: 'Výška textu',
    close: 'Zavřít',
    ok: 'OK',
    cancel: 'Zrušit',
    adaptive: 'Přizpůsobit obrazovce',
    custom: 'Vlastní výška textu',
    customPlaceholder: 'Světová výška',
    fromScreen: 'Ze velikosti na obrazovce',
    fromScreenHint:
      'Zadejte, jak velký má text vypadat na obrazovce při aktuálním zoomu. Přepočítá se na pevnou světovou výšku, která se při pozdějším zoomování nemění.',
    screenPxPlaceholder: 'Velikost písma',
    screenUnit: 'px',
    convert: 'Přepočítat'
  },
  entityPick: {
    cancel: 'Zrušit výběr'
  },
  colorPicker: {
    title: 'Vybrat barvu',
    close: 'Zavřít',
    ok: 'OK',
    cancel: 'Zrušit',
    index: 'Index barvy: ',
    rgb: 'RGB: ',
    input: 'Barva',
    inputPlaceholder: '1-255 nebo #RRGGBB'
  },
  touchPointTutorial: {
    title: 'Jak přesně vybrat bod?',
    description:
      'Podržte prst na obrazovce asi 1 sekundu. Nad prstem se objeví kříž, který při pohybu sleduje prst a přichytává se k geometrii pro přesnější výběr.',
    snoozeToday: 'Dnes už nepřipomínat',
    hideForever: 'Už nepřipomínat',
    ok: 'Rozumím'
  }
}
