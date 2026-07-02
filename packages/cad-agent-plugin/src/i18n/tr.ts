/**
 * Turkish UI strings for the CAD Agent panel.
 *
 * Flat keys under `main.toolPalette.agent` (merged into {@link AcApI18n}).
 * Keys must stay in sync with {@link agentEn}.
 */
export const agentTr = {
  tab: 'Ajan',
  title: 'CAD Ajanı',
  settings: 'Ayarlar',
  clear: 'Temizle',
  close: 'Kapat',
  provider: 'Sağlayıcı',
  providerDeepseek: 'DeepSeek',
  providerDeepseekVl: 'DeepSeek VL (görsel)',
  providerDeepseekVlHint:
    'OpenAI uyumlu bir görsel uç nokta kullanır (varsayılan: SiliconFlow). Kendi barındırdığınız vLLM için Taban URL alanını sunucunuza ayarlayın, ör. http://127.0.0.1:8000/v1.',
  providerOpenai: 'OpenAI',
  providerAnthropic: 'Anthropic',
  providerOpenaiCompatible: 'OpenAI Uyumlu',
  baseUrl: 'Taban URL',
  model: 'Model',
  visionModels: 'Görsel modeller',
  textModels: 'Yalnızca metin modelleri',
  customModel: 'Özel model…',
  customModelName: 'Özel model adı',
  modelSupportsVision: 'Görsel girişi destekler',
  modelTextOnly: 'Yalnızca metin — görsel ekleri devre dışı',
  apiKey: 'API Anahtarı',
  saveSettings: 'Ayarları kaydet',
  emptyHint:
    'Çizilecek şeyi tanımlayın veya bir referans görsel ekleyin (kroki, ekran görüntüsü, kat planı).',
  toolPrefix: 'araç',
  inputPlaceholder: 'Oluşturulacak geometriyi tanımlayın…',
  attachImage: 'Görsel ekle',
  removeAttachment: 'Kaldır',
  imageAlt: 'Eklenen görsel',
  errorTitle: 'Bir şeyler ters gitti',
  dismissError: 'Kapat',
  send: 'Gönder',
  working: 'Çalışıyor…',
  unsavedSettings: 'Mesaj göndermeden önce ayarları kaydedin.',
  missingApiKey: 'Mesaj göndermeden önce ayarlardan bir API anahtarı yapılandırın.'
} as const
