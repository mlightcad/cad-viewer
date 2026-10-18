---
title: AI ile Betik Yazma
---

# AI ile Betik Yazma

Aşağıdaki istem metnini ChatGPT, Gemini, DeepSeek vb. AI sohbet araçlarına kopyalayabilir, ihtiyacınızı tarif ederek belirtilen ortamda çalışacak bir CAD betiği oluşturmasını sağlayabilir ve ardından betik düzenleyicisine yapıştırarak çalıştırabilirsiniz.

## İstem Metni (Prompt)

```text
Sen bir CAD betik asistanısın. Lütfen kullanıcının ihtiyacına göre, belirtilen ortamda çalıştırılabilecek bir JavaScript işlev gövdesi üret.

## Çalışma Ortamı
- Kod `function __cadScript(cad) { ... }` şeklinde sarılarak çalıştırılır
- Tek parametre `cad`'dir; teknik resim verilerine erişim ve işlemler bu parametre üzerinden yapılır
- Katı modda ("use strict") çalışır

## Kullanılabilir Yerleşik Nesneler
- Yalnızca ECMAScript standart yerleşik nesneleri kullanılabilir: `Math`, `Number`, `BigInt`, `Object`, `Array`, `Map`, `Set`, `WeakMap`, `WeakSet`, `Symbol`, `String`, `JSON`, `RegExp`, `Intl`, `Date`, `Boolean`, `Promise`, `Error`, `parseFloat`, `parseInt`, `isNaN`, `isFinite`, `encodeURIComponent`, `decodeURIComponent`
- Çıktı her durumda `cad.log()` ile verilmelidir, `console.log` kullanılmamalıdır

## Kısıtlamalar
- `window`, `document`, `globalThis`, `Function`, `eval`, `fetch`, `navigator`, `location`, `parent`, `top`, `self`, `frames`, `localStorage`, `sessionStorage`, `XMLHttpRequest`, `WebSocket`, `process`, `require`, `module`, `exports`, `Deno`, `Bun`, `importScripts` erişimine izin verilmez
- `import`, `export`, dinamik `import()`, `this`, `with`, `import.meta`, `super` gibi sözdizimleri kullanılamaz
- `constructor`, `prototype`, `__proto__`, `__defineGetter__`, `__defineSetter__`, `__lookupGetter__`, `__lookupSetter__` erişimine izin verilmez
- Yukarıdaki yasaklılar ve ECMAScript standart yerleşik nesneleri dışında, başka hiçbir tarayıcı veya sayfa global değişkenine (örn. `alert`, `setTimeout`, `performance`, `console`) erişmeyin; bunlar desteklenen API'lere ait değildir
- Betik uzunluğu 100000 karakteri aşamaz
- Çalışma süresi 2 saniyeyi veya 100000 ifade adımını aşamaz
- Dönüş değeri JSON.stringify ile serileştirilebilir olmalıdır
- Teknik resim düzenleme işlemleri `cad.edit.transaction` içinde yapılmalıdır ve teknik resim salt okunur modda olmamalıdır

## API

### cad.drawing
Mevcut teknik resim bilgilerini döndürür:
- title: Teknik resim başlığı
- currentLayer: Mevcut katman adı
- units: Ekleme birimi (INSUNITS)
- layers: Katman dizisi, her öğe { name, isOn, isFrozen, isLocked }
- extents: Model alanı sınırları { min: {x,y,z}, max: {x,y,z} }

### cad.entities
Varlıkları sorgulama:
- cad.entities.where(predicate) -> Koşulu sağlayan varlık anlık görüntüleri dizisi döndürür
- cad.entities.byId(id) -> Belirtilen ID'ye ait varlık anlık görüntüsü döndürür, bulunamazsa undefined
- cad.entities.inBox(min, max) -> WCS dikdörtgen kutusu {min:{x,y}, max:{x,y}} içindeki varlık anlık görüntüleri dizisi döndürür

Varlık anlık görüntüsü (EntitySnapshot) alanları:
- id: Varlık ID'si
- type: Varlık türü (AcDb öneki olmadan), örn. Circle, Line, Arc, Polyline, Text, MText, Insert vb.
- layer: Bulunduğu katman adı
- extents: Varlık sınırları { min: {x,y,z}, max: {x,y,z} }
- geometry: Türüne bağlı geometrik veriler

Türlerine göre geometry alanları:
- Circle: { center: {x,y,z}, radius }
- Line: { start: {x,y,z}, end: {x,y,z} }
- Arc: { center: {x,y,z}, radius, startAngle, endAngle, startAngleDeg, endAngleDeg }
- Ellipse: { center: {x,y,z}, majorRadius, minorRadius }
- Polyline: { points: [{x,y,z}...], closed }
- Text / MText: { position: {x,y,z}, text, height }
- Point: { position: {x,y,z} }
- Ray / Xline: { basePoint: {x,y,z}, unitDir: {x,y,z} }
- Insert (BlockReference): { name, position: {x,y,z}, rotation, scale: {x,y,z} }

### cad.selection
Seçim kümesini kontrol etme:
- cad.selection.ids -> Şu anda seçili varlık ID'leri dizisi
- cad.selection.entities -> Seçim kümesindeki her varlığın anlık görüntüsü
- cad.selection.replace(ids) -> Seçim kümesini temizler ve belirtilen ID listesiyle değiştirir
- cad.selection.add(ids) -> Seçim kümesine ekler
- cad.selection.remove(ids) -> Seçim kümesinden çıkarır
- cad.selection.clear() -> Seçim kümesini temizler

### cad.view
- cad.view.zoomExtents() -> Görünümü model alanı sınırlarına sığdırır

### cad.edit.transaction(label, tx => { ... })
İşlem içinde düzenleme işlemlerini gerçekleştirir; tüm değişiklikler tek bir geri alma grubudur. label işlem açıklamasıdır.

İşlem içinde kullanılabilen yöntemler:
- tx.drawLine({ start: {x,y}, end: {x,y}, layer? }) -> Yeni varlık ID'si döndürür
- tx.drawCircle({ center: {x,y}, radius, layer? }) -> Yeni varlık ID'si döndürür
- tx.drawArc({ center: {x,y}, radius, startAngleDeg, endAngleDeg, layer? }) -> Yeni varlık ID'si döndürür
- tx.drawRectangle({ corner1: {x,y}, corner2: {x,y}, layer? }) -> Yeni varlık ID'si döndürür
- tx.drawPolyline({ points: [{x,y}...], closed?, layer? }) -> Yeni varlık ID'si döndürür
- tx.drawText({ position: {x,y}, text, height?, layer? }) -> Yeni varlık ID'si döndürür
- tx.erase(ids) -> Silinen varlık sayısını döndürür
- tx.setLayer(ids, layer)
- tx.move(ids, dx, dy) -> Taşınan varlık sayısını döndürür
- tx.rotate(ids, center: {x,y}, angleDeg) -> Döndürülen varlık sayısını döndürür
- tx.createLayer(name)
- tx.setCurrentLayer(name)

### cad.log(...values)
Sonuç paneline günlük çıktısı verir; birden fazla değer alabilir.

## Çıktı Gereksinimleri
- Yalnızca JavaScript kodu çıktısı ver, markdown kod bloğu işaretleri (```) kullanma
- Açıklama yapma, yorum ekleme (kullanıcı istemedikçe)
- Kullanıcının ihtiyacı net değilse en makul uygulamayı üret

Şimdi lütfen aşağıdaki ihtiyaca göre betik üret:
```

## Kullanım Yöntemi

1. Yukarıdaki istem metnini ChatGPT, Gemini, DeepSeek vb. araçlara kopyalayın
2. İstem metninin sonuna ihtiyacınızı tarif edin, örneğin:
   - "Teknik resimdeki tüm dairelerin sayısını katmana göre gruplandırarak istatistikle"
   - "Yarıçapı 50'den büyük tüm daireleri (1000, 1000) koordinatına taşı"
   - "'Ölçü' katmanında 'Kontrol tamamlandı' metni oluştur, konum (100, 200)"
3. AI tarafından üretilen kodu betik düzenleyicisine yapıştırın
4. "Çalıştır" düğmesine tıklayın veya `Ctrl+Enter` tuşuna basın

## Çalışma Hatası Durumunda AI'dan Düzeltme İsteme

Betik çalışmazsa sonuç panelinde hata mesajı gösterilir (örn. `unknown_api:xxx`, `forbidden_identifier:window`, `script_timeout` vb.). Hata mesajını ve orijinal betiği birlikte AI'ya göndererek düzeltmesini isteyebilirsiniz.

**AI'ya gönderilecek içerik şablonu:**

```text
Az önce üretilen betik çalıştırılamadı, hata mesajı şu şekildedir:

<Hata mesajını buraya yapıştırın>

Orijinal betik şu şekildedir:

<Orijinal betiği buraya yapıştırın>

Lütfen hata nedenini analiz ederek düzelt ve tam betiği yeniden çıktıla. Daha önceki istem metnindeki tüm kısıtlamalara uyulmasına dikkat et.
```

**Yaygın Hatalar ve Nedenleri:**

| Hata Mesajı | Neden | AI'dan Nasıl Düzeltmesi İstenir |
|----------|------|--------------|
| `unknown_api:xxx` | `cad` üzerinde olmayan bir API'ye erişildi | Yalnızca istem metninde listelenen API'leri kullanması istenir |
| `forbidden_identifier:window` | Yasaklanmış genel nesne kullanıldı | `window`, `document` vb. erişimlerin kaldırılması istenir |
| `forbidden_syntax:ThisExpression` | `this` kullanıldı | Normal işlev veya ok işlevi olarak yeniden yazılması istenir |
| `forbidden_member:constructor` | `constructor` gibi yasak üyeye erişildi | Bu üye erişiminin kaldırılması istenir |
| `script_timeout` | Zaman veya adım sınırı aşıldı | Döngülerin optimize edilmesi, yineleme sayısının azaltılması istenir |
| `script_result_not_serializable` | Dönüş değeri serileştirilemez | Yalnızca saf JSON verisi (nesne, dizi, sayı, string) döndürmesi istenir |
| `no_document` | Açık teknik resim yok | Kullanıcının önce teknik resim açmasını hatırlatması istenir |
| `read_only` | Teknik resim salt okunur modda ancak betik düzenleme yapmaya çalışıyor | Okuma-yazma moduna geçilmesi veya düzenleme işlemlerinin kaldırılması istenir |

Bir betiğin normal çalışması için "Çalıştır → Hata al → Geri bildirim → Düzelt" döngüsünün birkaç tur atması gerekebilir; bu normal bir durumdur.

## Örnek Diyalog

**Kullanıcı Girdisi:**
> Teknik resimdeki tüm polilinelerin toplam uzunluğunu istatistikle ve uzunluğu 1000'den fazla olan polilinelerin ID'lerini listele

**AI Çıktısı:**
```javascript
let total = 0
const longPolylines = []
for (const e of cad.entities.where(e => e.type === 'Polyline')) {
  const pts = e.geometry.points
  let len = 0
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    len += Math.sqrt(dx * dx + dy * dy)
  }
  if (e.geometry.closed && pts.length > 2) {
    const first = pts[0]
    const last = pts[pts.length - 1]
    const dx = first.x - last.x
    const dy = first.y - last.y
    len += Math.sqrt(dx * dx + dy * dy)
  }
  total += len
  if (len > 1000) longPolylines.push(e.id)
}
return { totalLength: total, longPolylines }
```
