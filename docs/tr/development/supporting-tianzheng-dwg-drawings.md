---
title: "Tianzheng DWG Çizimlerini Destekleme"
---

# Tianzheng (天正) Varlıklarıyla DWG Çizimlerini Destekleme

Bu sayfa, **Tianzheng** yazılımıyla (天正建筑, TArch ve diğer Tianzheng dikey ürünleri) oluşturulan DWG çizimlerinin neden genel DWG ayrıştırıcıları tarafından tam olarak ayrıştırılamadığını açıklar ve sektör standardı geçici çözümü tanımlar: bu tür çizimleri ayrıştırma ve işlemeden önce **T3 biçimli DWG**'ye dönüştürmek.

## Arka Plan: Tianzheng Varlıkları Neden Doğrudan Ayrıştırılamaz

Sıradan DWG varlıklarının aksine, Tianzheng varlıkları (duvarlar, kapılar, pencereler, kolonlar, ölçülendirme açıklamaları ve diğer akıllı bina nesneleri) **Tianzheng yazılımı tarafından özel olarak tanımlanmış bir veri biçimi** kullanır. Yerel AutoCAD DWG standart biçiminin **bir parçası değildirler**.

DWG dosyalarında bu Tianzheng'e özgü nesneler [özel varlıklar](https://help.autodesk.com/view/OARX/2024/ENU/?guid=GUID-4E5C1B56-95C3-4D4F-8F1C-A9D34B1E1408) (proxy varlıklar) olarak saklanır. İç verileri yalnızca Tianzheng'in kendi ObjectARX çalışma zamanı için anlamlıdır. Sonuç olarak:

- Hiçbir genel amaçlı ticari DWG ayrıştırıcısı bu tescilli Tianzheng varlıklarını doğrudan ayrıştıramaz.
- Genel bir ayrıştırıcı (MLightCAD dahil), bu tür çizimlerde yalnızca standart AutoCAD varlıklarını işleyebilir; Tianzheng özel varlıkları atlanır veya proxy grafik olarak görüntülenir.

## Yaygın Sektör Çözümü: T3 Biçimine Dönüştürme

Sektördeki CAD görüntüleme yazılımı satıcıları bu sorunu benzer şekilde ele alır. Tipik iş akışı şöyle görünür:

```text
DWG with Tianzheng entities
        |
        |  (1) Run Tianzheng runtime / conversion tool on the server
        v
T3 format DWG
        |
        |  (2) Parse with a standard DWG parser
        v
Rendered drawing in the viewer
```

1. **Sunucu tarafında bir Tianzheng ortamı veya dönüştürme aracı çalıştırın.** Tianzheng tescilli varlıkları içeren çizim, Tianzheng veri biçimini anlayan yazılım tarafından işlenir.
2. **DWG'yi T3 biçimine dönüştürün.** T3 (Tianzheng 3), uyumluluk için tasarlanmış bir dışa aktarma biçimidir. Dönüştürme sırasında tüm Tianzheng'e özgü nesneler sıradan DWG varlıklarına ayrıştırılır ("patlatılır") — örneğin duvarlar çizgi/polilyon haline gelir, kapılar ve pencereler blok referanslarına dönüşür ve Tianzheng açıklamaları standart ölçülendirme/metin varlıkları olur.
3. **Dönüştürülen dosyayı standart bir DWG ayrıştırıcısıyla ayrıştırın.** Tianzheng tescilli nesneleri artık olmadığından ve yalnızca standart DWG varlıkları kaldığından, herhangi bir genel DWG ayrıştırıcısı çizimi artık doğru okuyup görüntüleyebilir.

Başka bir deyişle, T3 biçimine dönüştürmeden sonra çizimdeki Tianzheng'e özgü nesneler sıradan DWG varlıklarına dönüşür; böylece genel bir DWG ayrıştırıcısı ek yapılandırma olmadan çalışır.

## Açık Kaynak T3 Dönüştürme Aracı Başvurusu

Başvuru olarak, bu dönüşümü otomatikleştiren açık kaynaklı bir komut satırı aracı:

- [t3-conv](https://github.com/housyty/t3-conv) — Tianzheng DWG dosyalarını arayüz gerektirmeyen toplu bir iş akışıyla T3 DWG dosyalarına dönüştüren bir Windows komut satırı aracı.

Bu aracın arka planda gerçek bir Tianzheng çalışma zamanını çalıştırdığını unutmayın; bu nedenle dönüştürme makinesinde yine de Tianzheng TArch ve AutoCAD kurulu olmalıdır. Ayrıntılı gereksinimler, yapılandırma ve kullanım için projenin README dosyasına bakın.

## Öneri: Bir Ön İşleme Adımı Ekleyin

İş senaryonuz çok sayıda Tianzheng çizimi içeriyorsa, çizimler görüntüleme hattına girmeden önce bir **ön işleme adımı** eklemenizi öneririz:

```text
Upload / Import
      |
      v
Detect Tianzheng entities  ->  If present, convert to T3 DWG
      |
      v
Store converted DWG
      |
      v
MLightCAD parsing & rendering
```

- Gelen bir DWG'nin Tianzheng özel varlıkları içerip içermediğini belirleyin (örneğin, Tianzheng'e özgü proxy varlık sınıf adlarını veya uygulama imzalarını kontrol ederek).
- Varsa, T3 dönüştürmesini çalıştırın (ör. bir Windows sunucusunda `t3-conv` aracılığıyla) ve dönüştürülen dosyayı saklayın.
- Dönüştürülen T3 DWG'yi MLightCAD'a verin. Önceden görünmez olan tüm Tianzheng nesneleri artık standart varlıklar olarak işlenir.

Bu, görüntüleyicinin kendisini hafif ve ayrıştırıcıdan bağımsız tutarken Tianzheng çizimlerinin son kullanıcılar tarafından tam olarak görülebilmesini sağlar.
