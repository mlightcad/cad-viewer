---
title: "Yerleşik Eklentiler"
---

# Yerleşik Eklentiler

MLightCAD, bir dizi resmi eklenti ile birlikte gelir. Her eklenti tek bir alana odaklanır — arayüz bileşenleri, bir yapay zekâ asistanı, dışa/içe aktarma hatları veya bulut veri kaynakları — ve ihtiyaca göre birleştirilebilir.

Eklenti mekanizmasının kendisi için (`AcApPlugin`, eklenti yöneticisi, tembel yükleme ve kendi eklentinizi nasıl yazacağınız), [Eklenti Sistemi](./plugin-system) sayfasına bakın. Kurulum, kayıt ve tüm API ayrıntıları her paketin README dosyasında yer alır — aşağıdaki bağlantılara bakın.

## Eklentilere genel bakış

| Paket | Rol | Komutlar / yetenekler |
|---------|------|-------------------------|
| [`@mlightcad/cad-simple-ui-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-ui-plugin) | `cad-simple-viewer` için **araç çubuğu, katman yöneticisi ve inceleme paleti arayüzü** (saf DOM, Vue/React yok) | `layer`, `markuppanel`, varsayılan araç çubuğu (görünüm, ölçüm, dışa aktarma, inceleme, tema, yerel ayar) |
| [`@mlightcad/cad-agent-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-agent-plugin) | **Doğal dil CAD ajanı** (yapay zekâ sohbet paneli + çizim araç çağrıları) | `agent` |
| [`@mlightcad/cad-script-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-plugin) | **Manuel CAD betik konsolu** (çizime karşı denetlenmiş betikler çalıştırır, LLM / API anahtarı gerekmez) | `cadscript` |
| [`@mlightcad/cad-html-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-html-plugin) | Çizimleri **bağımsız çevrimdışı HTML** olarak dışa aktarma | `chtml` (`cad-viewer` içinde iletişim kutusu), `-chtml` (komut satırı) |
| [`@mlightcad/cad-pdf-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-pdf-plugin) | **PDF dışa aktarma ve içe aktarma** (vektör hattı) | `cpdf`, `ipdf` |
| [`@mlightcad/cad-svg-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-svg-plugin) | **SVG dışa aktarma** ve paylaşılan vektör işleyici (PDF dışa aktarma tarafından da kullanılır) | `csvg` |
| [`@mlightcad/cad-onedrive-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-onedrive-plugin) | **OneDrive veri kaynağı** — OneDrive / SharePoint üzerinden DWG/DXF açma | `AcApDataSource` kaydeder (`onedrive`); iki adımlı Oturum aç → Aç (açılır pencere engelleyiciye uyumlu) |
| [`@mlightcad/cad-google-drive-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-google-drive-plugin) | **Google Drive veri kaynağı** — Google Drive üzerinden DWG/DXF açma | `AcApDataSource` kaydeder (`googledrive`); iki adımlı Oturum aç → Aç (açılır pencere engelleyiciye uyumlu) |

Komutla tetiklenen tüm eklentiler **tembel yüklenir**: başlangıçta küçük bir kayıt saptaması kaydedilir ve ağır paket yalnızca kullanıcı tetikleme komutunu çalıştırdığında indirilir. Kayıt API'si için [Eklenti Sistemi — Eklentileri kaydetme](./plugin-system#eklentileri-kaydetme) bölümüne bakın.

---

## Arayüz eklentileri

### `@mlightcad/cad-simple-ui-plugin` — Basit görüntüleyici için arayüz bileşenleri

[`cad-simple-viewer`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-viewer) kasıtlı olarak **uygulama arayüzü olmadan** gelir — yalnızca tuval ve CAD çekirdeği. Basit görüntüleyiciyi kendi web uygulamanıza gömerken tam Vue tabanlı [`cad-viewer`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-editor) kabuğunu benimsemeden hazır arayüz bileşenleri istiyorsanız, **`cad-simple-ui-plugin` amaçlanan arayüz katmanıdır**.

Şunları sağlar:

- Yapılandırılabilir bir **araç çubuğu** (herhangi bir kenara yerleştirme, varsayılan CAD komutları, iç içe menüler, özel öğeler)
- **Katman yöneticisi** sekmesi (katman aç/kapat, ACI renk seçici, çift tıklamada katmana yakınlaştırma) ve **inceleme paleti** sekmesi (işaretleme listesi, durum, yorumlar) içeren bir **dock paneli**
- Ana öğenizdeki `COLORTHEME` sistem değişkeni ve `--ml-ui-*` CSS belirteçleriyle **tema eşitleme**
- `AcApI18n` ile **yerel ayar eşitleme** (İngilizce / Çince / Çekçe / Türkçe)

Tüm bileşenler çerçeveden bağımsızdır (saf DOM). Tam Vue `cad-viewer` uygulamasının kendi Element Plus arayüzü vardır ve bu eklentiyi gerektirmez; doğrudan `cad-simple-viewer` üzerine geliştirme yapıyorsanız `cad-simple-ui-plugin` kullanın.

→ **Hızlı başlangıç, araç çubuğu özelleştirme ve seçenekler:** [packages/cad-simple-ui-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-ui-plugin/README.md)

### `@mlightcad/cad-agent-plugin` — Yapay zekâ çizim asistanı

[`cad-agent-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-agent-plugin), `cad-simple-viewer` tabanlı uygulamalara **doğal dil CAD ajanı** ekler. Kullanıcılar istediklerini sade bir dille anlatır; ajan, çizimi incelemek ve geometri oluşturmak veya değiştirmek için CAD araçlarını çağırır.

Şunları sağlar:

- Yapay zekâ paketinin kritik yolda olmaması için **tembel yüklenen** bir `AcApPlugin` (tetikleme komutu: `agent`)
- Vercel AI SDK (`Experimental_Agent` + `@ai-sdk/vue`) üzerine kurulu bir **Vue sohbet paneli** (`AgentChatPanel`)
- **Tarayıcı tarafı LLM yapılandırması** — OpenAI, Anthropic veya OpenAI uyumlu uç noktalar için API anahtarları istemcide kalır (`localStorage` içinde şifrelenir)
- **Aşama 1 CAD araçları** — `get_drawing_context`; `draw_line`, `draw_circle`, `draw_arc`, `draw_rectangle`, `draw_polyline`, `draw_text`; `set_current_layer`, `create_layer`, `zoom_extents`
- Eklenti i18n katmanı aracılığıyla **İngilizce / Çince / Türkçe / Çekçe** arayüz metinleri

Tam Vue `cad-viewer` uygulaması, paket kurulduğunda ajanı otomatik olarak kaydeder (palet sekmesi). `cad-simple-viewer-demo`, `cad-simple-ui-plugin` aracılığıyla bunu bir dock sekmesine bağlar. Ana uygulamalar, paneli istedikleri yere monte etmek için `registerLazyAgentPlugin` ve `setAgentPaletteOpener` çağırır.

→ **Kurulum, kayıt ve araç listesi:** [packages/cad-agent-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-agent-plugin/README.md)

### `@mlightcad/cad-script-plugin` — CAD betik konsolu

[`cad-script-plugin`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-plugin), `cad-simple-viewer` tabanlı uygulamalar için **manuel CAD betik konsolu** ekler. Ajan eklentisinin aksine bir modelle konuşmaz ve **API anahtarı gerektirmez**: konsol, `@mlightcad/cad-agent-core` paketinden gelen denetlenmiş betik sunucusunu çalıştırır ve her betik, tek bir `cad` bağımsız değişkenine sahip bir fonksiyon gövdesidir; bu, ajanın kullandığı aynı çizim araçlarına programatik erişim sağlar.

- Tembel yüklenen `AcApPlugin` (tetikleme komutu: `cadscript`)
- `@mlightcad/cad-agent-core` paketindeki CAD araçlarını yeniden kullanır; bu paket yalnızca paneli ve komutu ekler
- Ana uygulamalar `registerLazyCadScriptPlugin` çağırır ve `new CadScriptPanel().element` öğesini monte eder (`cad-simple-viewer-demo` içinde dock sekmesi, `cad-viewer` içinde araç paleti sekmesi); sekme kaldırıldığında `destroy()` çağırın

→ **Kullanım:** [packages/cad-script-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-plugin/README.md)

---

## Dışa / içe aktarma eklentileri (HTML / PDF / SVG)

Bu eklentiler, aynı eklenti yöneticisine dışa aktarma (ve PDF içe aktarma) komutları ekler. Başlangıç sayfası ağırlığının küçük kalması için **tembel yüklenir**. `cad-simple-viewer-demo` demosu, üç dışa aktarma eklentisini de artı arayüz/ajan/betik eklentilerini kaydeder; tam `cad-viewer` uygulaması, başlatma sırasında dışa aktarma eklentilerini ve ajan/betik eklentilerini (kurulmuşsa) kaydeder.

### HTML (`@mlightcad/cad-html-plugin`)

Paylaşım ve arşivleme için tek dosyalık **çevrimdışı görüntüleyici** — dışa aktarılan HTML, çizim verilerini ve bir çalışma zamanı görüntüleyicisini gömer, sunucu gerekmez.

| Öğe | Değer |
|------|-------|
| Komut | `chtml` (`cad-viewer` içinde iletişim kutusu), `-chtml` (`cad-simple-viewer-cli` üzerinden komut satırı) |
| Ek yapılandırma | `AcApDocManager.createInstance()` üzerinde `htmlViewerRuntimeUrl` — `viewer-runtime.iife.js` dosyasının URL'si (paketin `dist/` dizininden kopyalayın) |
| Genel API | `registerLazyHtmlPlugin`, `createHtmlPlugin`, `AcApHtmlConvertor`, `packHtml`, anlık görüntü tipleri |

→ **Derleme çıktısı ve entegrasyon:** [packages/cad-html-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-html-plugin/README.md)
→ **Aynı hattı kullanan headless CLI:** [packages/cad-simple-viewer-cli/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-simple-viewer-cli/README.md)

### PDF (`@mlightcad/cad-pdf-plugin`)

**Vektör PDF dışa aktarma ve PDF'ten CAD'e içe aktarma.**

| Öğe | Değer |
|------|-------|
| Komutlar | `cpdf` (dışa aktarma), `ipdf` (içe aktarma) |
| Genel API | `registerLazyPdfPlugin`, `createPdfPlugin`, dönüştürücüler |

→ **Derleme çıktısı ve entegrasyon:** [packages/cad-pdf-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-pdf-plugin/README.md)

### SVG (`@mlightcad/cad-svg-plugin`)

**Vektör SVG dışa aktarma** ve PDF dışa aktarma tarafından kullanılan paylaşılan vektör işleyici.

| Öğe | Değer |
|------|-------|
| Komut | `csvg` |
| Genel API | `registerLazySvgPlugin`, `createSvgPlugin`, `AcApSvgConvertor`, SVG işleyici yardımcıları |

→ **Derleme çıktısı ve entegrasyon:** [packages/cad-svg-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-svg-plugin/README.md)

---

## Veri kaynağı eklentileri (OneDrive / Google Drive)

Bu eklentiler komut kaydetmez — kullanıcıların DWG/DXF çizimlerini doğrudan bulut depolamadan açabilmesi için bir [`AcApDataSource`](./data-source-plugin) kaydeder. Her ikisi de açılır pencere engelleyiciye takılmayacak şekilde tasarlanmış **iki adımlı Oturum aç → Aç akışı** kullanır.

### `@mlightcad/cad-onedrive-plugin`

Microsoft File Picker v8 + MSAL üzerine kurulu **OneDrive / SharePoint veri kaynağı**. Bir Azure uygulama kaydı gerektirir (SPA, temsilci `User.Read` + `Files.Read.All` izinleri).

```typescript
import { registerOneDrivePlugin } from '@mlightcad/cad-onedrive-plugin/register'

await registerOneDrivePlugin(AcApDocManager.instance.pluginManager, {
  clientId: 'your-azure-app-client-id'
})
```

→ **Azure uygulama kurulumu ve tam entegrasyon:** [packages/cad-onedrive-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-onedrive-plugin/README.md) ve [Veri Kaynağı Eklentisi](./data-source-plugin)

### `@mlightcad/cad-google-drive-plugin`

Aynı `AcApDataSource` sözleşmesine sahip **Google Drive veri kaynağı**.

```typescript
import { registerGoogleDrivePlugin } from '@mlightcad/cad-google-drive-plugin/register'

await registerGoogleDrivePlugin(AcApDocManager.instance.pluginManager, {
  clientId: 'your-google-oauth-client-id'
})
```

→ **Google Cloud kurulumu ve tam entegrasyon:** [packages/cad-google-drive-plugin/README.md](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-google-drive-plugin/README.md)

---

## Her uygulama hangi eklentileri kaydeder?

| Uygulama | Kayıtlı eklentiler |
|-----|--------------------|
| `cad-simple-viewer` | Yok — yalnızca çekirdek, eklentiler isteğe bağlıdır |
| `cad-simple-viewer-demo` | Dışa aktarma eklentileri (HTML/PDF/SVG), `cad-simple-ui-plugin`, `cad-agent-plugin`, `cad-script-plugin` |
| `cad-viewer` (Vue) | Dışa aktarma eklentileri (HTML/PDF/SVG); ajan ve betik eklentileri, **kurulmuşsa** otomatik olarak kaydedilir (isteğe bağlı peer bağımlılıklar) |

---

## İlgili sayfalar

- [Eklenti Sistemi](./plugin-system) — `AcApPlugin` arayüzü, eklenti yöneticisi, tembel yükleme ve kendi eklentinizi yazma
- [Veri Kaynağı Eklentisi](./data-source-plugin) — OneDrive / Google Drive eklentilerinin kullandığı `AcApDataSource` mekanizması
- [Komut](./command) — komut yaşam döngüsü ve `AcEdCommand`
