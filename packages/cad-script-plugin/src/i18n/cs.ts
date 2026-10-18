/**
 * Czech UI strings for the CAD script console.
 */
export const scriptCs = {
  scriptTab: 'Skript',
  scriptTitle: 'CAD skript',
  scriptRun: 'Spustit',
  scriptRunning: 'Spouští se…',
  scriptHelp: 'Nápověda ke skriptu',
  scriptResize: 'Změnit výšku panelu výsledků',
  scriptPlaceholder: 'Napište tělo funkce. Jediný argument je cad.',
  scriptHint: 'Ctrl+Enter spustí skript. Jediný argument je cad.',
  scriptSuccess: 'Úspěch',
  scriptFailed: 'Selhalo',
  scriptReturnValue: 'Návratová hodnota',
  scriptNoReturn: 'Skript nevrátil žádnou hodnotu.',
  scriptLog: 'Protokol',
  scriptHighlighted: 'Zvýrazněné',
  scriptCreated: 'Vytvořené',
  scriptEmptyResult:
    'Spusťte skript, aby se zobrazila návratová hodnota, protokol a chyby.',
  scriptNoDocument: 'Nejprve otevřete nebo vytvořte výkres.',
  scriptReadOnly: 'Výkres je otevřen jen pro čtení.',
  scriptNoView: 'Pohled výkresu není k dispozici.',
  scriptTimeout: 'Skript překročil limit času nebo kroků a byl zastaven.',
  scriptNotJson: 'Návratová hodnota není JSON.',
  scriptEmptyCode: 'Skript je prázdný.',
  scriptTooLarge: 'Skript je příliš dlouhý.',
  scriptDynamicAccess: 'Vypočtený přístup k cad není povolen.',
  scriptForbiddenSyntax: 'Zakázaná syntaxe',
  scriptForbiddenIdentifier: 'Zakázaný identifikátor',
  scriptForbiddenMember: 'Zakázaný člen',
  scriptUnknownApi: 'Neznámé cad API'
} as const
