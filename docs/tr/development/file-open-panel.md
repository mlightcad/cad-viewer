---
title: "Dosya Açma Paneli (Açılış UI)"
---

# Dosya Açma Paneli (Açılış UI)

Bu sayfa, **`/file-open-panel`** alt yolu ile **`@mlightcad/cad-simple-viewer`** paketini kritik yoldan çıkararak bir **açılış sayfası dosya seçici** oluşturmayı açıklar.

**DocManager ana bilgisayarları için [`acuiCreateFileOpenSession`](#quick-start-recommended) tercih edin** — açılış UI’sını mount eder, görüntüleyiciyi tembel oluşturur, bulut kaynaklarını ekler ve çizimi açar. Açmayı kendiniz yönettiğinizde (ör. Vue `MlCadViewer` props) [`AcUiFileOpenLanding`](#acuifileopenlanding-custom-open) kullanın. Yalnızca özel menü bağlantısı için düşük seviye [`AcUiFileOpenPanel`](#low-level-acuifileopenpanel) kullanın.

Bulut kökenlerini (OneDrive, Google Drive, özel kaynaklar) uygulamak için [Veri Kaynağı Eklentisi](./data-source-plugin) bölümüne bakın.

---

## Neden ayrı giriş?

Dosya açma UI’sını **ana** `@mlightcad/cad-simple-viewer` paketinden içe aktarmak, ana / yükleme ekranının ilk boyamasına `AcApDocManager`, three.js ve komut/görünüm yığınını çekiyordu.

**1.8.0**’dan itibaren DocManager’sız alt yolu kullanın:

```ts
import { acuiCreateFileOpenSession } from '@mlightcad/cad-simple-viewer/file-open-panel'
```

session, kullanıcı bir şey açtığında `createDocManager` çağırır — genelde ana paketin dinamik import’u ile.

Referans uygulamalar:

- `packages/cad-simple-viewer-demo` — `acuiCreateFileOpenSession` + gecikmeli `AcApDocManager.createInstance`
- `packages/cad-editor-demo` — `AcUiFileOpenLanding` + `defineAsyncComponent(MlCadViewer)`

---

## Hızlı başlangıç (önerilen) {#quick-start-recommended}

```ts
import { acuiCreateFileOpenSession } from '@mlightcad/cad-simple-viewer/file-open-panel'

const session = acuiCreateFileOpenSession({
  host: document.getElementById('file-open-host')!,
  theme: 'dark',
  showNewDrawing: true,
  createDocManager: async () => {
    const { AcApDocManager, AcApSettingManager } = await import(
      '@mlightcad/cad-simple-viewer'
    )
    AcApSettingManager.configure({ storageKey: 'my-app.settings' })
    if (!AcApDocManager.tryGetInstance()) {
      AcApDocManager.createInstance({ container: viewerEl /* … */ })
    }
    return AcApDocManager.instance
  },
  getOpenOptions: () => ({ mode: /* … */ })
})

// İsteğe bağlı bulut kaynakları (dinamik import SDK’ları ilk boyamadan uzak tutar):
const oneDriveEnv = /* … */
if (oneDriveEnv) {
  const { AcApOneDriveDataSource } = await import(
    '@mlightcad/cad-onedrive-plugin'
  )
  const source = new AcApOneDriveDataSource(oneDriveEnv, session.manager)
  session.registerSource(source)
  await source.restoreSession()
}
```

Her açılışta session:

1. `createDocManager`’ı **bir kez** çağırır (sonrasında önbelleklenir)
2. MSAL / GIS istemcilerini yeniden kullanmak için `attachSourcesTo(docManager.dataSourceManager)`
3. `openDocument` / `openUrl` / `newDocument` çalıştırır

İsteğe bağlı kancalar: `onBeforeOpen`, `onPrepareOpen` (DocManager hazır olduktan sonra), `onAfterOpen`.

Açılış ekranını kaldırırken `session.dispose()` çağırın. Programatik açma: `session.open({ kind: 'file' | 'url' | 'new', … })`.

---

## Session seçenekleri

| Seçenek | Açıklama |
|--------|-------------|
| `host` | Panel kökünü alan öğe |
| `createDocManager` | DocManager benzeri nesne döndürür (`dataSourceManager` + açma API’leri) |
| `getOpenOptions?` | openDocument / openUrl / newDocument’a iletilir |
| `onBeforeOpen?` / `onPrepareOpen?` / `onAfterOpen?` | Yaşam döngüsü kancaları |
| `theme?` / `cardSize?` / `showUrl?` / `showNewDrawing?` / `manager?` / … | landing cephesi ile aynı chrome seçenekleri |

Yararlı API: `landing`, `manager`, `registerSource()`, `open()`, `ensureDocManager()`, `dispose()`.

---

## `AcUiFileOpenLanding` (özel açma) {#acuifileopenlanding-custom-open}

Ana bilgisayar çizimleri kendisi açtığında (Vue store + `MlCadViewer`, özel ilerleme UI, …):

```ts
import {
  AcUiFileOpenLanding,
  acuiAttachDataSources,
  type AcUiFileOpenRequest
} from '@mlightcad/cad-simple-viewer/file-open-panel'

const landing = new AcUiFileOpenLanding({
  host,
  showNewDrawing: true,
  onOpen: (request: AcUiFileOpenRequest) => {
    void openWithViewer(request) // sizin kodunuz
  }
})

// DocManager / görüntüleyici varken:
landing.attachSourcesTo(AcApDocManager.instance.dataSourceManager)
// veya: acuiAttachDataSources(landing.manager, …)
```

`AcUiFileOpenRequest`: `{ kind: 'file'; file }` | `{ kind: 'url'; url }` | `{ kind: 'new' }`.

---

## Panel UI ne yapar

session ve landing `AcUiFileOpenPanel` mount eder:

| Yüzey | Davranış |
|---------|----------|
| Kart gövdesi | Yerel bırakma alanı, URL satırı veya bulut «Dosya seç» / hesap chrome’u |
| Alt chevron | **Yerel**, **URL** ve kayıtlı bulut kaynakları |
| İsteğe bağlı | **Yeni Çizim** düğmesi |

Panel **asla** `AcApDocManager`’a doğrudan erişmez.

---

## Tembel yükleme notları

1. landing / session kodu yalnızca `@mlightcad/cad-simple-viewer/file-open-panel` import eder.
2. `createDocManager` (veya `onOpen` işleyiciniz) ana paketi dinamik import eder.
3. Dışa aktarma eklentilerini / OneDrive `/register` **createInstance sonrası** kaydedin; bulut eklentileri landing kaydından zaten eklenmiş kaynağı yeniden kullanabilir.

Açılış sayfasında düzenleyici mount etmeden Vue i18n için `@mlightcad/cad-editor/locale` tercih edin.

---

## Düşük seviye `AcUiFileOpenPanel` {#low-level-acuifileopenpanel}

Özel `onDataSourceAction` / `onResult` bağlantısı gereken gelişmiş ana bilgisayarlar `AcUiFileOpenPanel`’i doğrudan kullanabilir. Yeni entegrasyonlarda session veya landing cephesini tercih edin.

---

## Kontrol listesi

- [ ] Açılış `/file-open-panel` import eder, ana paket değil
- [ ] DocManager ana bilgisayarları `acuiCreateFileOpenSession` tercih eder
- [ ] Özel açma ana bilgisayarları `AcUiFileOpenLanding` + `attachSourcesTo` kullanır
- [ ] Bulut eklenti paketleri dinamik import edilir
- [ ] Oturum açma ve seçim ayrı kullanıcı jestleri olarak kalır

---

## İlgili dokümantasyon

- [Veri Kaynağı Eklentisi](./data-source-plugin) — `AcApDataSource`, menü yardımcıları, bulut eklentisi yazma
- [Simple Viewer Entegrasyonu](./integrate-simple-cad-viewer) — açılış sayfasından sonra `AcApDocManager`
- [Vue Bileşeni Entegrasyonu](./integrate-cad-viewer-component) — `MlCadViewer`
- [Yerleşik Eklentiler](./built-in-plugins) — OneDrive / Google Drive paketleri
- [Yerelleştirme](./localization) — `main.dataSource.*` dizeleri
- [Yükseltme](./upgrade-guide) — 1.8.0’daki `/file-open-panel` ve `/locale` alt yolları
