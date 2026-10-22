---
title: "Nesne Yakalama (OSNAP)"
---

# Nesne Yakalama (OSNAP)

Bu sayfa, **cad-viewer** içinde **realdwg-web** verileriyle OSNAP'in nasıl çalıştığını açıklar.

## Arka Plan

AutoCAD/ObjectARX'te her varlık, belirli bir yakalama modu için aday yakalama noktaları döndürmek üzere `getOsnapPoints(...)` metodunu geçersiz kılabilir.

`realdwg-web` içinde, her varlık sınıfında `subGetOsnapPoints(...)` ile benzer bir desen kullanıyoruz.  
`cad-viewer`, arayüzde yakalama gerçekleştirmek için döndürülen bu noktaları tüketir.

Başvuru:
- AutoCAD ObjectARX `getOsnapPoints`: https://help.autodesk.com/view/OARX/2024/ENU/?guid=OARX-RefGuide-__OVERLOADED_getOsnapPoints_AcDbEntity

## realdwg-web içindeki Temel API

Temel tanım:
- `AcDbEntity.subGetOsnapPoints(osnapMode, pickPoint, lastPoint, snapPoints, gsMark?)`

Parametreler:

- `osnapMode`: her çağrıda tek mod
- `pickPoint`: geçerli imleç dünya noktası
- `lastPoint`: komut akışında önceden onaylanmış nokta
- `snapPoints`: aday noktaların ekleneceği çıktı dizisi
- `gsMark` (isteğe bağlı): alt varlık kimliği; şu anda `INSERT` (`AcDbBlockReference`) alt varlık yakalaması için önemlidir

## Desteklenen OSNAP modları

`AcDbOsnapMode` içinde tanımlıdır:
- `EndPoint = 1`
- `MidPoint = 2`
- `Center = 3`
- `Node = 4`
- `Quadrant = 5`
- `Insertion = 7`
- `Perpendicular = 8`
- `Tangent = 9`
- `Nearest = 10`
- `Centroid = 11`

Önemli:

- Bu değerler bit bayrağı değil, sıralı kimliklerdir.
- Maske dönüşümü için `acdbOsnapModesToMask(...)` ve `acdbMaskToOsnapModes(...)` kullanın.

## cad-viewer Arayüzünde Mevcut Sunum

Durum çubuğu (`MlOsnapButton.vue`) şu anda şunları sunar:

- EndPoint
- MidPoint
- Center
- Node
- Quadrant
- Insertion

Henüz arayüzde sunulmayanlar (yorum satırına alınmış):

- Perpendicular
- Tangent
- Nearest
- Centroid

Ayarlardaki varsayılan etkin maske (`AcApSettingManager`):

- EndPoint + MidPoint + Center

## cad-simple-viewer içindeki Çalışma Zamanı Akışı

1. `AcEdFloatingInput.getPosition()` çağrısı `getOsnapPoint()` metodunu çağırır.
2. `getOsnapPoint()` çağrısı `getOsnapPoints()` metodunu çağırır.
3. `getOsnapPoints()` çağrısı `view.pick(point, hitRadius)` çalıştırır.
4. Seçilen her öğe için:
- model alanı varlığını `item.id` ile çözümleyin
- `item.children` varsa, varlık osnap'ini `gsMark = child.id` ile çağırın
- aksi halde varlık osnap'ini `gsMark` olmadan çağırın
5. Geçerli maskedeki her etkin mod için `entity.subGetOsnapPoints(...)` çağırın.
6. İmlece en yakın döndürülen noktayı seçin.
7. Ekran `hitRadius` değerinden (varsayılan 20 px) dönüştürülen dünya mesafesi eşiğini uygulayın.
8. Kabul edilirse imleci yakalayın ve işaretçiyi gösterin.

## Varlık Uygulaması Özeti (realdwg-web kodundan)

- `AcDbLine`: EndPoint, MidPoint, Nearest, Perpendicular (`Tangent` dalı vardır ancak nokta yok)
- `AcDbArc`: EndPoint, MidPoint, Nearest, Tangent (`Perpendicular` dalı vardır ancak nokta yok)
- `AcDbCircle`: Center, Centroid, Quadrant, Nearest, Tangent
- `AcDbEllipse`: EndPoint (yalnızca açık yay), MidPoint (yalnızca açık yay), Quadrant (yalnızca kapalı elips)
- `AcDbPolyline`: EndPoint
- `AcDb2dPolyline`: EndPoint
- `AcDb3dPolyline`: EndPoint
- `AcDbPoint`: Node
- `AcDbText`: Insertion
- `AcDbMText`: Insertion
- `AcDbBlockReference` (`INSERT`): Insertion + `gsMark` üzerinden devredilen alt varlık yakalama
- Sınırlı desteğe sahip ek varlıklar:
- `AcDbRay`: EndPoint (temel nokta)
- `AcDbFace`: EndPoint (köşe noktaları)
- `AcDbTrace`: EndPoint (köşe noktaları)
- `AcDbSpline`: EndPoint

## INSERT (`AcDbBlockReference`) OSNAP Mantığı

`subGetOsnapPoints` iki yola sahiptir:

1. `Insertion` modu:
- doğrudan blok referansı ekleme noktasını (`this._position`) ekler

2. Diğer modlar:
- yalnızca `gsMark` sağlandığında çalışır
- `subEntityGetOsnapPoints(...)` metoduna devreder

Devretme akışı (`subEntityGetOsnapPoints`):

1. Koruma: `gsMark === this.objectId` ise dön (özyinelemeyi önle)
2. Varlığı `blockTable.getEntityById(gsMark)` ile çözümle
3. O alt varlığın `subGetOsnapPoints(...)` metodunu çağır
4. Döndürülen noktaları bu blok referansının `blockTransform` değeriyle dönüştür
5. Dönüştürülen noktaları çıktıya ekle

## INSERT yakalaması neden başarısız olabilir (mevcut davranış)

1. `gsMark` yok:
- `Insertion` dışındaki modlarda, `gsMark` eksikse `AcDbBlockReference` hiçbir şey döndürmez.

2. `gsMark` modeli basitleştirilmiştir:
- Mevcut `gsMark`, uzamsal alt isabetlerden gelen alt varlık nesne kimliğidir; tam AutoCAD GS işaretçi semantiği değildir.

3. INSERT için katman gruplu işleme:
- İşleme, bir INSERT'i aynı üst nesne kimliğine sahip birden fazla katman tabanlı işleme grubuna bölebilir.
- Seçim, alt varlık kimliklerini kurtarmak için hiyerarşik alt kutulara dayanır.

4. Karmaşık/iç içe/kenar dönüşümler:
- Devretme, geçerli INSERT'in `blockTransform` değerini uygular.
- Kenar durumları (örneğin iç içe blok senaryoları veya varsayılan dışı normal/ekstrüzyon durumları) yine de yanlış veya eksik yakalama noktaları üretebilir.

Bu, `README.md` içindeki bilinen yol haritası notuyla uyumludur:
- INSERT için uç nokta yakalama henüz tamamen güvenilir değildir.

## Bilinen Sınırlamalar / TODO

- OSNAP kapsamı varlığa bağlıdır; birçok mod/varlık kombinasyonu kasıtlı olarak henüz uygulanmamıştır.
- INSERT'in ekleme dışı yakalaması, doğru alt isabet -> `gsMark` yayılımına bağlıdır.
- Mevcut işaretçi mekanizması nesne kimliği tabanlıdır ve tam AutoCAD GS işaretçi davranışı değildir.
- INSERT için, özellikle iç içe bloklar ve dönüştürülmüş bloklar için daha fazla regresyon testi gereklidir.

## Önerilen Katkı Yönü

- INSERT için alt isabetten `gsMark` eşlemesinin sağlamlığını iyileştirin.
- EndPoint/MidPoint/Center/Nearest/Tangent durumları için iç içe blok regresyon testleri ekleyin.
- Varlık başına mod kapsamını kademeli olarak genişletin.
- Mümkün olduğunda işaretçi modelini AutoCAD GS işaretçi semantiğine daha da yaklaştırın.
