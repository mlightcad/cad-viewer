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
  clear: 'Vymazat',
  close: 'Zavřít',
  provider: 'Poskytovatel',
  providerDeepseek: 'DeepSeek',
  providerDeepseekVl: 'DeepSeek VL (vizuální)',
  providerDeepseekVlHint:
    'Používá vizuální endpoint kompatibilní s OpenAI (výchozí: SiliconFlow). Pro vlastní vLLM nastavte Základní URL na svůj server, např. http://127.0.0.1:8000/v1.',
  providerOpenai: 'OpenAI',
  providerAnthropic: 'Anthropic',
  providerOpenaiCompatible: 'Kompatibilní s OpenAI',
  baseUrl: 'Základní URL',
  model: 'Model',
  visionModels: 'Vizuální modely',
  textModels: 'Pouze textové modely',
  customModel: 'Vlastní model…',
  customModelName: 'Název vlastního modelu',
  modelSupportsVision: 'Podporuje obrazový vstup',
  modelTextOnly: 'Pouze text — přílohy obrázků zakázány',
  apiKey: 'API klíč',
  saveSettings: 'Uložit nastavení',
  emptyHint:
    'Popište, co se má nakreslit, nebo přiložte referenční obrázek (skica, snímek obrazovky, půdorys).',
  toolPrefix: 'nástroj',
  inputPlaceholder: 'Popište geometrii, kterou chcete vytvořit…',
  attachImage: 'Přiložit obrázek',
  removeAttachment: 'Odebrat',
  imageAlt: 'Přiložený obrázek',
  errorTitle: 'Něco se pokazilo',
  dismissError: 'Zavřít',
  send: 'Odeslat',
  stop: 'Zastavit',
  working: 'Pracuji…',
  agentMode: 'Režim agenta',
  agentModeSimple: 'Jednoduchý',
  agentModeHighInference: 'Vysoká inference',
  agentModeSimpleHint: 'Rychlý — bez ověření snímkem obrazovky po nakreslení.',
  agentModeHighInferenceHint:
    'Ověří výkres snímkem obrazovky + vizuálním modelem (až 5 kol). Vyžaduje vizuální model.',
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
  missingApiKey: 'Před odesíláním zpráv nastavte v nastavení API klíč.'
} as const
