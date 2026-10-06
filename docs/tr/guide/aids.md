---
title: Yardımcı Görüntüleme
---

# Yardımcı Görüntüleme

Yardımcı görüntüleme, noktaları, yönleri ve nesneleri daha kesin bir şekilde konumlamanıza yardımcı olur.

## Nesne Yakalama (OSNAP)

Nesne yakalama, imleç yakalanabilir bir konuma yaklaştığında otomatik olarak o noktaya yapışır ve bir yakalama işareti gösterir.

Desteklenen yakalama modları:

| Mod | İşaret | Açıklama |
|---|---|---|
| EndPoint | Dikdörtgen | Çizgi parçası uç noktası |
| MidPoint | Üçgen | Çizgi parçası orta noktası |
| Center | Daire | Çember/yay/elips merkezi |
| Quadrant | Baklava dilimi | Çemberin dört kadran noktası |
| Nearest | Çapraz | İmlece en yakın nokta |
| Intersection | × | İki çizginin kesişim noktası |

OSNAP, durum çubuğundan hızlıca açılıp kapatılabilir; tıklayarak ayrıntılı yapılandırma paneline girip etkinleştirilecek yakalama modlarını seçebilirsiniz.

## Dik Mod (ORTHO)

Açıldığında, bir sonraki çizginin yalnızca yatay veya dikey yönde çizilmesi kısıtlanır. Eksen hizalı dikdörtgenler, eşkenar üçgenler vb. çizmek için uygundur.

- Kısayol: `F8` (destekleniyorsa)
- Durum çubuğundan anahtarı değiştir

## Kutupsal İzleme (POLAR)

Açıldığında, imleç ayarlanan açı artışı yönünde otomatik hizalanır. Varsayılan açı artışı 90°'dir; 5°, 10°, 15°, 18°, 22,5°, 30°, 45° veya 90° seçilebilir.

Kutupsal izleme ve dik mod karşılıklıdır: dik mod açıldığında kutupsal izleme otomatik kapanır, tersi de geçerlidir.

## Dinamik Girdi (DYN)

İmlecin yakınında yüzen bir giriş kutusu görüntülenir. Komut yürütülürken, komut satırını kullanmadan doğrudan giriş kutusuna değerler (mesafe, açı vb.) yazılabilir.

## Lastik Bant Önizleme

Neredeyse tüm çizim komutları, imleci hareket ettirdiğinizde "önceki nokta" ile "geçerli imleç" arasında geçici bir önizleme çizgi parçası (lastik bant) gösterir; bu, yön ve uzunluğu değerlendirmenize yardımcı olur.
