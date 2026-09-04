---
title: Alan Ölçümü
---

# Alan Ölçümü

Bir dizi noktayla çevrelenen çokgenin alanını ölçer.

## Etkileşim Adımları

1. İlk noktayı tıkla
2. Sonraki köşeleri sırayla tıkla — yarı saydam dolgu + kesikli çizgi dış hattı gerçek zamanlı olarak önizlenir
3. **Enter** veya **Esc** ile bitir, veya ilk köşeye yakın bir yere tıklayarak otomatik kapat

## Kapatma Koşulları (Otomatik Kapatma)

- Başlangıç noktasına yaklaşık 14 px mesafede tıklama
- Geçerli son köşeye çok yakın bir tıklama
- Yeni çizgi parçası var olan bir çizgi parçasını kesiyor (kendiyle kesişme oluşturduğunda otomatik kapatır)

## Alan Hesaplaması

Bağ (Shoelace Formula) kullanılır.

## Görüntüleme

Alan rozeti çokgenin ağırlık merkezi konumunda bulunur.

## Oluşturulduktan Sonra

Tüm köşelerin grip noktası vardır; herhangi bir köşeyi sürükleyince alan gerçek zamanlı olarak yeniden hesaplanır.
