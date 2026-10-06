---
title: Oturum Aksesuarı
---

# Oturum Aksesuarı

**Oturum Aksesuarı**, belirli anlarda kullanıcı arayüzüne dinamik olarak monte edilen ve kullanıcıya ek işlem giriş noktaları sağlayan küçük bir kontrol grubudur. En belirgin özelliği —— **yalnızca gerektiğinde görünmesi ve gereksiz hale geldiğinde otomatik olarak kaybolması**dır.

Oturum aksesuarları öncelikle iki durumda kullanılır:

- **Mobil cihazlarda**: Mobilde masaüstündeki gibi şerit (Ribbon) kullanıcı arayüzü yoktur, bu nedenle şeritteki birçok komut seçeneği doğrudan gösterilemez. Oturum aksesuarları, komut yürütme sırasında veya nesne seçiminde ilgili seçenekleri kullanıcının yanına getirir.
- **Şeritsiz çalışma ortamlarında**: Bazı gömülü veya hafif çalışma ortamları şerit bileşeniyle birlikte gelmez ve oturum aksesuarları bu ortamlarda da tamamlayıcı kullanıcı arayüzü olarak kullanılabilir.

İki tür oturum aksesuarı vardır —— **Komut oturum aksesuarı** ve **Seçim oturum aksesuarı**.

## Komut oturum aksesuarı

Komut oturum aksesuarı, **komut yürütülürken komut tarafından monte edilir** ve o komuta özgü ek kullanıcı arayüzü kontrollerini sağlar. Komut tamamlandığında veya iptal edildiğinde aksesuar otomatik olarak gizlenir.

Tipik bir örnek, ölçüm ve açıklama komutlarının monte ettiği **Çizim Stili Aksesuarı**'dır —— ölçüm yaparken veya açıklama eklerken, oturum panelinin ilk satırında renk ve metin yüksekliği düğmeleri görünür ve kullanıcı komutu kesintiye uğratıp şeridi aramak zorunda kalmadan görünümü anında ayarlayabilir.

Aşağıdaki demoda kırmızıyla vurgulanan alan komut oturum aksesuarıdır:

<MobileSessionPanel highlightAccessory />

> ⚠️ Her komut bir komut oturum aksesuarı monte etmez. Çizgi veya Daire gibi basit çizim komutlarının ortaya çıkaracak ek seçenekleri yoktur, bu nedenle aksesuar görünmez. Bu durumda panelin ilk satırının sol tarafında doğrudan komut istemi metni gösterilir.

## Seçim oturum aksesuarı

Seçim oturum aksesuarı **bir veya daha fazla grafik nesne seçildiğinde** görünür ve **Kısayol Araç Çubuğu**'nun (Shortcut Toolbar) sol tarafına eklenir; sağdaki hızlı eylem düğmelerinden dikey bir ayırıcı ile ayrılır. Seçim kaldırıldığında seçim oturum aksesuarı otomatik olarak kaybolur.

Seçim oturum aksesuarının rolü, komut oturum aksesuarına benzer —— seçilen nesneler için bağlama dayalı işlem giriş noktaları sağlamaktır. Örneğin bir açıklama metni seçildiğinde, seçim oturum aksesuarı renk ve metin yüksekliği ayarlama kontrollerini gösterebilir.

Aşağıdaki demoda kırmızıyla vurgulanan alan seçim oturum aksesuarıdır. Sağdaki ayırıcı ve dairesel düğme grubu, kısayol araç çubuğunun kendisine aittir:

<ShortcutToolbar highlightAccessory />

## İki oturum aksesuarı türünün karşılaştırması

| Özellik | Komut oturum aksesuarı | Seçim oturum aksesuarı |
|---|---|---|
| **Ne zaman görünür** | Komut yürütülürken | Bir veya daha fazla nesne seçildiğinde |
| **Nerede monte edilir** | Mobil: oturum panelinin ilk satırı<br/>şeritsiz ortam: komut kullanıcı arayüzü alanı | Kısayol araç çubuğunun sol tarafı |
| **Ne zaman kaybolur** | Komut tamamlanır veya iptal edilir | Seçim kaldırılır |
| **Tipik kontroller** | Renk, metin yüksekliği, diğer komuta özgü seçenekler | Renk, metin yüksekliği, nesne özellik düzenleyicisi |
| **Her zaman var mı?** | Hayır, komuta bağlıdır | Hayır, seçilen nesne türüne bağlıdır |

## Masaüstü şeridiyle ilişkisi

Masaüstünde komutla ilgili seçenekler genellikle şeritteki "bağlamsal sekmelerde" gruplanır —— bir komut aktif olduğunda şerit otomatik olarak o komuta karşılık gelen sekmeye geçer. Oturum aksesuarı özünde **mobil / şeritsiz senaryolarda bağlamsal sekmelerin hafif bir yerine** geçer:

| Masaüstü | Mobil / şeritsiz |
|---|---|
| Şerit bağlamsal sekmesi | Komut oturum aksesuarı (oturum paneli içinde) |
| Normal sekmedeki nesne özellik paneli | Seçim oturum aksesuarı (kısayol araç çubuğu içinde) |
