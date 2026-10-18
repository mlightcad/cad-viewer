---
title: Betik Özelliği Açıklaması
---

# Betik Özelliği Açıklaması

Betik özelliği, teknik resim üzerinde özel JavaScript kodları çalıştırarak sorgulama, istatistik, toplu düzenleme ve seçim vurgulama gibi işlemleri gerçekleştirmenizi sağlar. Betikler, `cad` nesnesi aracılığıyla teknik resimle etkileşim kurar; harici model bağlantısı veya API Key yapılandırması gerekmez.

Betik özelliği, `@mlightcad/cad-script-plugin` eklentisi tarafından sağlanır. Betik paneli yalnızca bu eklenti uygulamanıza yüklendikten sonra kullanılabilir.

## Betik Panelini Açma

- Komut satırına `cadscript` yazın ve Enter'a basın
- veya araç panelindeki "Betik" sekmesine tıklayın

Betik paneli şunları içerir:
- **Betik Düzenleyici**: JavaScript işlev gövdesi yazma alanı
- **Çalıştır Düğmesi**: Betiği çalıştırır (kısayol `Ctrl+Enter`)
- **Yardım**: Bu açıklamayı geçerli dilde açar
- **Sonuç Alanı**: Dönüş değerini katlanabilir bir JSON ağacı olarak gösterir; günlükleri, hataları ve varlık değişikliklerini de listeler. Yüksekliği ayarlamak için düzenleyici ile bu alan arasındaki ayırıcıyı sürükleyin.

## Betik Çalıştırma Modu

Betikler katı modda (strict mode) çalışır ve otomatik olarak bir işlev içine sarılır:

```javascript
function __cadScript(cad) {
  // Kodunuzu buraya yazın
}
```

İşlevin tek parametresi `cad`'dir; teknik resim verilerine erişim ve işlemler bu parametre üzerinden yapılır.

## Kısıtlamalar

- Betiklerin çalışma süresi ve adım sayısı sınırlıdır; zaman aşımı veya adım sınırı aşılırsa otomatik olarak durdurulur
- Sayfa genel nesnelerine erişim yasaktır (`window`, `document`, `fetch` vb.)
- `import` / `export` / `this` gibi sözdizimleri kullanılamaz
- Dönüş değeri JSON ile serileştirilebilir veri olmalıdır
- Düzenleme işlemleri `cad.edit.transaction` içinde gerçekleştirilmeli ve teknik resim düzenlenebilir durumda olmalıdır

## Taslak Kaydetme

Düzenleyici içeriği otomatik olarak tarayıcının yerel depolamasına kaydedilir; sayfa yenilendikten sonra son düzenlenen betik geri yüklenir.
