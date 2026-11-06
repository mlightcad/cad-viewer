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
  provider: 'Poskytovatel',
  providerDeepseek: 'DeepSeek',
  providerDeepseekVl: 'DeepSeek VL (vizuální)',
  providerDeepseekVlHint:
    'Používá vizuální endpoint kompatibilní s OpenAI (výchozí: SiliconFlow). Pro vlastní vLLM nastavte Základní URL na svůj server, např. http://127.0.0.1:8000/v1.',
  providerOpenai: 'OpenAI',
  providerAnthropic: 'Anthropic',
  baseUrl: 'Základní URL',
  baseUrlHint:
    'U většiny bran musí obsahovat /v1, např. https://ai-api.example.com/v1. Pouze hostitel se doplní automaticky.',
  model: 'Model',
  apiKey: 'API klíč',
  emptyHint:
    'Popište, co se má nakreslit, nebo přiložte referenční obrázek (skica, snímek obrazovky, půdorys).',
  toolPrefix: 'nástroj',
  copyTool: 'Kopírovat volání nástroje (vstup a výstup)',
  toolCopied: 'Zkopírováno',
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
    'Výchozí. Rychlý — pouze sebekontrola přes měřicí API; bez snímků a vizuálního ověření.',
  agentModeHighInferenceHint:
    'Volitelné pro složité úlohy. Povolí snímky a ověří výkres snímkem + vizuálním modelem (až 5 kol). Vyžaduje vizuální model.',
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
  unsavedSettings: 'Před odesíláním zpráv uložte nastavení.',
  missingApiKey: 'Před odesíláním zpráv nastavte v nastavení API klíč.',
  tabBuiltin: 'Poskytovatelé třetích stran',
  tabCustom: 'Vlastní API modelu',
  builtinIntro:
    'Vyberte vestavěného poskytovatele, např. DeepSeek, OpenAI nebo Anthropic, a zadejte jeho API klíč.',
  customIntro:
    'Připojte relay, vlastní službu nebo jiný koncový bod kompatibilní s OpenAI / Anthropic. Zadejte URL API, protokol a modely.',
  providerConfigured: 'nastaveno',
  apiKeyPlaceholder: 'Zadejte API klíč',
  apiKeyRequired:
    'API klíč zatím chybí. Zadejte ho, abyste mohli s tímto poskytovatelem odesílat zprávy.',
  advancedSettings: 'Vlastní nastavení',
  baseUrlDefault: 'Ponechte prázdné pro výchozí adresu: {url}',
  baseUrlInvalid: 'URL API musí začínat http:// nebo https://.',
  customProvider: 'Vlastní poskytovatel',
  newCustomProvider: '+ Nové vlastní API',
  providerId: 'ID poskytovatele',
  providerIdHint:
    'Identifikátor malými písmeny začínající písmenem (písmena, číslice a pomlčky). Po vytvoření jej nelze změnit.',
  providerIdInvalid:
    'ID poskytovatele musí začínat malým písmenem a obsahovat pouze malá písmena, číslice a pomlčky.',
  providerIdTaken: 'Toto ID poskytovatele se již používá.',
  displayName: 'Zobrazovaný název',
  protocol: 'Protokol API',
  protocolOpenaiChat: 'OpenAI Chat Completions',
  protocolOpenaiResponses: 'OpenAI Responses',
  protocolAnthropicMessages: 'Anthropic Messages',
  models: 'Katalog modelů',
  modelsDefault: 'Používají se vestavěné výchozí modely',
  modelsCustomized: 'Upraveno',
  resetModels: 'Obnovit výchozí',
  modelsEmpty:
    'Zatím žádné modely. Klikněte na „Načíst dostupné modely“ nebo přidejte ID modelu ručně.',
  modelId: 'ID modelu',
  modelVision: 'Obrázky',
  modelVisionHint: 'Podporuje obrazový vstup',
  removeModel: 'Odebrat model',
  addModel: 'Přidat model',
  fetchModels: 'Načíst dostupné modely',
  fetching: 'Načítání…',
  fetchNeedsKey: 'Nejprve zadejte API klíč',
  fetchNeedsBaseUrl: 'Nejprve zadejte URL API',
  fetchTitle: 'Vyberte modely',
  fetchSearch: 'Hledat modely',
  fetchSelectAll: 'Vybrat vše',
  fetchDeselectAll: 'Zrušit výběr',
  fetchNoMatches: 'Žádné odpovídající modely',
  fetchAdopt: 'Použít',
  fetchKeepOne: 'Ponechte alespoň jeden model',
  fetchEmpty: 'Koncový bod nevrátil žádné modely. Přidejte je ručně.',
  fetchFailedNetwork:
    'Nelze se připojit k {url}. Může jít o problém se sítí nebo koncový bod nepovoluje požadavky z prohlížeče (CORS). Přidejte modely ručně.',
  fetchFailedHttp:
    'Načtení modelů selhalo: koncový bod vrátil HTTP {status}. Zkontrolujte API klíč a URL.',
  fetchFailedFormat:
    'Seznam modelů vrácený koncovým bodem nebyl rozpoznán. Přidejte modely ručně.',
  needsProviderId: 'Zadejte ID poskytovatele.',
  needsBaseUrl: 'Zadejte URL API.',
  needsModels: 'Přidejte alespoň jeden model.',
  cancel: 'Zrušit',
  save: 'Uložit',
  createProvider: 'Vytvořit poskytovatele',
  deleteProvider: 'Smazat poskytovatele',
  deleteProviderConfirm: 'Smazat poskytovatele „{id}“ a jeho API klíč?',
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
