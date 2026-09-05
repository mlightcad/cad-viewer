---
title: Büyüteç (Mobil)
---

# Büyüteç (Mobil)

Dokunmatik ekranda bir noktayı kesin olarak seçerken parmak hedef konumu örter. Büyüteç bir görsel yardım sağlar: ekranın sol üst köşesinde kare bir büyüteç HUD görüntüleyerek giriş noktası yakınındaki içeriği büyütür ve yoğun çizimlerde küçük nesneleri kesin olarak seçmenize yardımcı olur.

<MagnifierAnimation />

## Çalışma şekli

- Komut bir nokta belirtmenizi istediğinde, ekrana **yaklaşık 1 saniye** basılı tutun ve sol üst köşede otomatik olarak kare bir büyüteç HUD görüntülenir.
- Büyütülen alan geçerli giriş noktasını izler: büyüteç, parmak tarafından engellenmeden giriş noktası yakınındaki kesin konumu görmenize yardımcı olur.
- Büyüteç yalnızca görsel yardım sağlar ve giriş konumunu değiştirmez.

## Sanal fare ile ilişkisi

Büyüteç uzun basımdan sonra her zaman görüntülenir; sanal fare açma/kapama düğmesi yalnızca büyütecin **hangi konumu** büyütdüğünü etkiler:

- **Sanal fare açık (varsayılan)**: giriş noktası parmağın yaklaşık 52px üstündeki çapraz imleç konumuna kaydırılır ve büyüteç çapraz imleç yakınındaki bölgeyi büyütür.
- **Sanal fare kapalı**: giriş noktası parmağın dokunma noktasıdır ve büyüteç parmağın dokunma noktası yakınındaki bölgeyi büyütür.

Sanal fare bir açma/kapama düğmesidir ve **Ayarlar**'dan veya çizim sırasında istediği zaman değiştirilebilir.
