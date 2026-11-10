/**
 * Czech UI strings for the CAD Agent panel.
 *
 * Flat keys under `main.toolPalette.agent` (merged into {@link AcApI18n}).
 * Keys must stay in sync with {@link agentEn}.
 */
export const agentCs = {
  tab: 'Agent',
  title: 'CAD Agent',
  settings: 'Nastavení',
  clear: 'Nový chat',
  close: 'Zavřít',
  model: 'Model',
  emptyHint:
    'Popište, co se má nakreslit, nebo přiložte referenční obrázek (skica, snímek obrazovky, půdorys).',
  toolPrefix: 'nástroj',
  copyTool: 'Kopírovat volání nástroje (vstup a výstup)',
  toolCopied: 'Zkopírováno',
  copyMessage: 'Kopírovat zprávu',
  messageCopied: 'Zkopírováno',
  editMessage: 'Upravit zprávu',
  cancelEdit: 'Zrušit',
  resendMessage: 'Odeslat',
  relativeTimeJustNow: 'právě teď',
  relativeTimeSeconds: 'před {n} s',
  relativeTimeMinutes: 'před {n} min',
  relativeTimeHours: 'před {n} h',
  relativeTimeDays: 'před {n} d',
  queuedSendNow: 'Odeslat ihned',
  queuedEdit: 'Upravit',
  queuedDelete: 'Smazat',
  inputPlaceholder: 'Popište svůj požadavek…',
  attachImage: 'Přiložit obrázek',
  showContextUsage: 'Zobrazit využití kontextu',
  contextUsage: 'Využití kontextu',
  contextUsageDetail: '{percent}% · {used} / {limit}',
  contextUsageFull: '{percent}% zaplněno',
  contextUsageTokens: '~{used} / {limit} tokenů',
  contextUsageSystemPrompt: 'Systémový prompt',
  contextUsageToolDefinitions: 'Definice nástrojů',
  contextUsageImages: 'Obrázky',
  contextUsageConversation: 'Konverzace',
  removeAttachment: 'Odebrat',
  imageAlt: 'Přiložený obrázek',
  imageOnlyRequest:
    'Prosím analyzujte přiložený referenční obrázek (nebo obrázky) a pomozte mi jej nakreslit v CADu.',
  prepareImageFailed:
    'Přípravu přiloženého obrázku se nepodařilo dokončit. Zkuste menší PNG nebo JPEG.',
  errorTitle: 'Něco se pokazilo',
  dismissError: 'Zavřít',
  send: 'Odeslat',
  stop: 'Zastavit',
  working: 'Pracuji…',
  agentMode: 'Režim agenta',
  agentModeSimple: 'Jednoduchý',
  agentModeHighInference: 'Vysoká inference',
  agentModeSimpleHint:
    'Výchozí. Rychlý — preferuje sebekontrolu přes měřicí API; volitelné snímky jsou v pořádku. Bez automatického vizuálního ověření.',
  agentModeHighInferenceHint:
    'Volitelné pro složité úlohy. Po kreslení ověří výkres snímkem + vizuálním modelem (až 5 kol). Vyžaduje vizuální model.',
  highInferenceRequiresVision:
    'Režim vysoké inference vyžaduje model s podporou obrazu.',
  verificationTitle: 'Ověření výkresu',
  verifying:
    'Porovnávám snímek výkresu s vaším požadavkem a referenčními obrázky…',
  verificationPassed: 'Ověření prošlo — výkres odpovídá požadavku.',
  verificationFailed: 'Ověření selhalo — nalezené problémy:',
  verificationSkipped: 'Ověření přeskočeno',
  verificationError: 'Chyba ověření',
  verificationContinuing: 'Pokračuji v optimalizaci výkresu…',
  verificationMaxAttempts: 'Ověření neprošlo v rámci maximálního počtu pokusů.',
  referenceImages: 'Referenční obrázek(y)',
  drawingScreenshot: 'Snímek aktuálního výkresu',
  missingApiKey: 'Před odesíláním zpráv nastavte v nastavení API klíč.',
  toolsSummary: 'Volání nástrojů: {count}',
  toolsRunning: 'Probíhá volání nástrojů ({count})…',
  toolsFailed: 'Selhalo: {count}',
  taskPrompts: 'Navrhované úlohy',
  taskPromptsTitle: 'Časté úlohy',
  taskCategoryExtract: 'Extrakce',
  taskCategoryStats: 'Statistiky',
  taskCategoryModify: 'Úpravy',
  taskCategoryCreate: 'Tvorba',
  taskCategoryReview: 'Kontrola',
  taskDrawingOverviewTitle: 'Přehled výkresu',
  taskDrawingOverviewPrompt:
    'Shrň otevřený výkres: extents, rozpoznatelný systém jednotek, seznam hladin a krátký popis obsahu. Dotazuj výkres — nekresli znovu.',
  taskExtractTextTitle: 'Extrahovat text a razítko',
  taskExtractTextPrompt:
    'Extrahuj veškerý čitelný text z otevřeného výkresu včetně polí razítka, pokud existují. Podle potřeby seskup podle hladiny nebo oblasti a hodnoty přehledně vypiš.',
  taskListDimensionsTitle: 'Vypsat kóty',
  taskListDimensionsPrompt:
    'Najdi kótovací entity v otevřeném výkresu a vypiš naměřené hodnoty, související text a přibližné umístění. Shrň zjevně chybějící nebo nekonzistentní kóty.',
  taskEntityStatsTitle: 'Počty entit',
  taskEntityStatsPrompt:
    'Spočítej entity v otevřeném výkresu podle typu a hladiny. Preferuj souhrnné dotazy před výpisem všech entit. Ukaž kompaktní tabulku nebo odrážky.',
  taskLayerReportTitle: 'Přehled hladin',
  taskLayerReportPrompt:
    'Proveď report hladin otevřeného výkresu: název, zapnutí/vypnutí, zmrazení, barva, typ čáry a přibližný počet entit. Označ prázdné, nepoužívané nebo podivně pojmenované hladiny.',
  taskOrganizeLayersTitle: 'Uspořádat do hladin',
  taskOrganizeLayersPrompt:
    'Navrhni a aplikuj smysluplné uspořádání hladin otevřeného výkresu (např. stěny, dveře, text, kóty, nábytek). Přesuň entity ze špatných hladin a případně vytvoř chybějící. Vysvětli změny.',
  taskCleanupDrawingTitle: 'Vyčistit výkres',
  taskCleanupDrawingPrompt:
    'Zkontroluj otevřený výkres kvůli běžným problémům (nulová délka, detekovatelné duplicity, prázdný text, nepoužívané hladiny) a bezpečné věci oprav. Shrň provedené kroky a co vyžaduje ruční kontrolu.',
  taskDrawDimensionedRectTitle: 'Nakreslit kótovaný obdélník',
  taskDrawDimensionedRectPrompt:
    'Nakresli uzavřený obdélník 1000 × 600 (jednotky výkresu) s levým dolním rohem v (0, 0). Přidej vodorovnou a svislou kótu šířky a výšky. Použij přehledné hladiny pro geometrii a kóty.',
  taskCreateTitleBlockTitle: 'Vytvořit razítko',
  taskCreateTitleBlockPrompt:
    'Vytvoř jednoduché razítko ve stylu A3 v modelovém prostoru (nebo ve výkresovém prostoru, pokud je připraven): vnější rám, název, číslo výkresu, měřítko, datum a pole autor s placeholdery. Geometrii dej na samostatnou hladinu.',
  taskFromReferenceTitle: 'Kreslit podle reference',
  taskFromReferencePrompt:
    'Připojím referenční obrázek (skicu, snímek nebo plán). Pečlivě ho analyzuj a zrekonstruuj zamýšlenou 2D CAD geometrii se správnými proporcemi, hladinami a viditelnými kótami. Ptej se jen když je kritický rozměr nejasný.',
  taskDraftingReviewTitle: 'Kontrola kvality kreslení',
  taskDraftingReviewPrompt:
    'Zkontroluj otevřený výkres z hlediska kvality: nekonzistentní výšky textu, kóty které nemusí sedět s geometrií, překrývající se poznámky, entity na hladině 0, neúplné pohledy. Seřaď nálezy podle závažnosti; oprav jen jasné a bezpečné problémy, pokud nepožádám jinak.',
  taskLayerStandardsTitle: 'Kontrola názvů hladin',
  taskLayerStandardsPrompt:
    'Zkontroluj názvy hladin, barvy a použití podle běžných CAD konvencí. Navrhni srozumitelnější pojmenování a po shrnutí navrhovaných změn případně přejmenuj/přebarvi hladiny.'
} as const
