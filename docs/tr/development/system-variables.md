---
title: "Sistem Değişkenleri"
---

# Sistem Değişkenleri

Bu sayfa, MLightCAD'da sistem değişkenlerinin nasıl çalıştığını, kullanıcıların bunları komut satırından nasıl değiştirebileceğini ve `AcDbSystemVariables` ile `AcDbSysVarManager` aracılığıyla nasıl uygulandığını açıklar.

## Sistem Değişkeni Nedir

Bir `system variable` (sistem değişkeni), CAD sisteminin belirli bölümlerinin nasıl davrandığını kontrol eden genel bir ayardır.

Komutlar genellikle bir eylem başlatır, geometri oluşturur veya bir iletişim kutusu açar. Sistem değişkenleri farklı bir şey yapar: komut davranışını, varsayılan değerleri, çizim durumunu veya kullanıcı arayüzü davranışını kontrol ederler.

Tipik örnekler şunları içerir:

- yeni varlıkların hangi katmanda oluşturulacağı
- hangi varsayılan rengin, çizgi kalınlığının veya çizgi tipi ölçeğinin kullanılacağı
- bir görüntüleme modunun etkin olup olmadığı
- düzenleyicinin veya görüntüleyicinin görsel olarak nasıl tepki vereceği

Bu, kasıtlı olarak AutoCAD'e benzer. MLightCAD'da, değişken adını ve ardından yeni değerini girerek bir sistem değişkenini doğrudan komut satırından ayarlayabilirsiniz.

Örneğin:

```text
Command: PICKBOX
New value for PICKBOX <3>: 5
```

Bu, komut satırının sistem değişkeni adının kendisini, o ayarı güncellemek için kullanılan komut olarak ele aldığı anlamına gelir.

MLightCAD bu modeli benimser; böylece çalışma zamanı ayarları komut mantığına gömülmek yerine tek ve tutarlı bir mekanizma üzerinden okunabilir, değiştirilebilir ve izlenebilir.

## Komut Satırından Sistem Değişkeni Ayarlama

Komut satırı iş akışı basittir:

1. Sistem değişkeni adını yazın.
2. Enter'a basın.
3. Yeni değeri girin.
4. Uygulamak için tekrar Enter'a basın.

Bu, birçok CAD kullanıcısının AutoCAD'den zaten bildiği aynı etkileşim düzenidir.

Örneğin, geçerli katmanı değiştirmek için:

```text
Command: CLAYER
New value for CLAYER <0>: Walls
```

Seçim kutusu boyutunu değiştirmek için:

```text
Command: PICKBOX
New value for PICKBOX <3>: 10
```

Başka bir deyişle, bir sistem değişkenine değer atamak ayrı bir `SETVAR` tarzı iş akışı gerektirmez. Sistem değişkeni adını doğrudan komut satırına girip ona yeni bir değer atayabilirsiniz.

## Sistem Değişkenleri Komut Olarak Nasıl Kaydedilir

MLightCAD'da sistem değişkenleri komut satırından kullanılabilir; çünkü uygulama başlatılırken normal komutlar olarak kaydedilirler.

Kayıt işlemi `AcApDocManager` içinde gerçekleşir. `AcDbSysVarManager` içindeki tüm sistem değişkeni tanımlayıcılarını yükler ve her değişken adını bir komut olarak kaydeder:

```ts
const sysVars = AcDbSysVarManager.instance().getAllDescriptors()
sysVars.forEach(sysVar => {
  register.addCommand(
    AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
    sysVar.name,
    sysVar.name,
    new AcApSysVarCmd()
  )
})
```

Bu şu anlama gelir:

- kaydedilen her sistem değişkeni otomatik olarak bir komut haline gelir
- komut adı, `CLAYER` veya `PICKBOX` gibi sistem değişkeni adının kendisidir
- bu komutların tümü aynı komut uygulamasını paylaşır: `AcApSysVarCmd`

`AcApSysVarCmd` belirli bir değişkeni sabit kodlamaz. Bunun yerine çalıştığında, eşleşen sistem değişkeni tanımlayıcısını bulmak için geçerli komut adını (`this.globalName`) kullanır, kullanıcıdan yeni bir değer ister ve ardından `setVar(...)` çağrısını yapar.

Akışı özetle şöyledir:

`girilen sistem değişkeni adı` -> `AcApSysVarCmd.execute()` -> değer istemi -> `AcDbSysVarManager.setVar(...)`

Yani iki katman devrededir:

- `AcDbSysVarManager` çalışma zamanında hangi sistem değişkenlerinin var olduğuna karar verir
- `AcApDocManager` bu çalışma zamanı değişkenlerini komut satırı komutları olarak sunar

Bu nedenle yeni bir sistem değişkeni için destek eklemek genellikle tanımlayıcısını `AcDbSysVarManager` içinde kaydetmekle başlar. `getAllDescriptors()` içine dahil edildiğinde, komut yığınına da kaydedilebilir ve doğrudan komut satırından kullanılabilir.

## MLightCAD'da Nasıl Tasarlanmıştır

Mevcut uygulama iki dosya üzerine kuruludur:

- [AcDbSystemVariables](https://mlightcad.github.io/realdwg-web/variables/_mlightcad_data-model.AcDbSystemVariables.html)
- [AcDbSysVarManager](https://mlightcad.github.io/realdwg-web/classes/_mlightcad_data-model.AcDbSysVarManager.html)

Farklı amaçlara hizmet ederler.

### 1. `AcDbSystemVariables`

`AcDbSystemVariables`, sistem değişkeni adı sabitlerinin kanonik listesidir.

Başlıca rolleri şunlardır:

- değişken adları için tek bir doğruluk kaynağı sağlamak
- kod tabanında sabit kodlanmış metinlerden kaçınmak
- çağıranlara değişkenlere tip güvenli bir şekilde başvurma imkânı vermek
- `AcDbSystemVariableName` gibi türetilmiş tipleri desteklemek

Bunu, MLightCAD'daki sistem değişkeni adı kayıt defteri olarak anlamak en doğrusudur.

### 2. `AcDbSysVarManager`

`AcDbSysVarManager`, sistem değişkenleri için çalışma zamanı yöneticisidir. Şunlardan sorumludur:

- değişken tanımlayıcılarını kaydetmek
- tip ve varsayılan değer üst verilerini saklamak
- birleşik `getVar` ve `setVar` erişimi sunmak
- veritabanında yer almayan değişkenleri önbelleğe almak
- değişiklik olaylarını dağıtmak

Aslında sistem değişkenleri için kayıt defteri, erişim katmanı ve olay merkezidir.

## İki Tür Sistem Değişkeni

Mevcut tasarımda sistem değişkenleri iki kategoriye ayrılır.

### Veritabanında yer alan değişkenler

Bu değişkenler `AcDbDatabase` üzerinde yaşar. `AcDbSysVarManager`, değişken adını bir veritabanı alanına eşleyerek bunları okur ve yazar.

Şu anda kayıtlı örnekler şunlardır:

- `CECOLOR`
- `CELTSCALE`
- `CELWEIGHT`
- `CLAYER`
- `LWDISPLAY`

Bunlar çizim durumuna ve varsayılan çizim özelliklerine daha yakındır.

### Veritabanında yer almayan değişkenler

Bu değişkenler doğrudan `AcDbDatabase` üzerinde saklanmaz. `AcDbSysVarManager` içinde önbelleğe alınırlar.

Şu anda kayıtlı örnekler şunlardır:

- `COLORTHEME`
- `PICKBOX`
- `WHITEBKCOLOR`

Bunlar düzenleyici davranışına veya arayüz durumuna daha yakındır.

## Bu Ayrım Neden Önemlidir

İki tür değişkeni ayırmanın iki acil faydası vardır:

- çizimle ilgili ayarlar veritabanı modeline bağlı kalabilir
- ana uygulama veya arayüzle ilgili ayarların veritabanı katmanına zorlanması gerekmez

Bu, sistem değişkenlerinin hem veri modeline hem de düzenleyici katmanına temiz bir şekilde hizmet etmesini sağlar.

## Mevcut Uygulamadaki Temel Yetenekler

### Birleşik erişim

Çağıranların bir değişkenin veritabanında mı yoksa yöneticiye ait çalışma zamanı önbelleğinde mi saklandığını bilmesi gerekmez. Her iki durumda da aynı erişim API'sini kullanabilirler:

```ts
const sysVarManager = AcDbSysVarManager.instance()

const currentLayer = sysVarManager.getVar('CLAYER', db)
sysVarManager.setVar('CLAYER', 'Walls', db)
sysVarManager.setVar('PICKBOX', 12, db)
```

### Tip dönüşümü

`setVar`, kayıtlı tanımlayıcı tipine göre temel dönüşüm gerçekleştirir. Mevcut uygulama aşağıdaki gibi değerler için dönüşümü destekler:

- `number`
- `boolean`
- `color`

Bu, değerler komut satırı girdisinden, formlardan veya betiklerden geldiğinde ve başlangıçta metin olarak ulaştığında kullanışlıdır.

### Değişiklik bildirimi

`AcDbSysVarManager`, üst düzey modüllerin sistem değişkeni güncellemelerine tepki verebilmesi için bir `sysVarChanged` olayı sunar.

```ts
AcDbSysVarManager.instance().events.sysVarChanged.addEventListener(args => {
  console.log(args.name, args.oldVal, args.newVal)
})
```

Mevcut uygulamada bu olay öncelikle veritabanında yer almayan değişken değişiklikleri için dağıtılır; bu da onu özellikle düzenleyici ve arayüz senkronizasyonu için uygun hale getirir.

## Örnek: `PICKBOX`

`PICKBOX`, seçim kutusunun piksel cinsinden yarı boyutunu temsil eder. Veritabanında yer almayan bir değişkendir, ancak kullanıcı etkileşimi davranışını doğrudan etkiler.

`cad-viewer` içinde `AcEdCursorManager`, `PICKBOX` değişikliklerini dinler. Değer değiştiğinde, artı işareti imlecinin dikdörtgen kısmını yeniden oluşturur ve etkin imleci hemen yeniden uygular. Bu, bir sistem değişkeninin yalnızca depolanan yapılandırma verisi olmadığını; canlı arayüz davranışı için bir sürücü olarak da işlev görebileceğini gösterir.

Başvuru uygulaması:

- [AcEdCursorManager.ts](https://raw.githubusercontent.com/mlightcad/cad-viewer/main/packages/cad-simple-viewer/src/editor/input/AcEdCursorManager.ts)

Akış şöyledir:

`setVar('PICKBOX', ...)` -> `sysVarChanged` olayı -> imleç yöneticisi imleç görünümünü günceller

Bu, soyutlamanın neden kullanışlı olduğunun en açık örneklerinden biridir.

## Mevcut Kodda Önemli Bir Ayrıntı

`AcDbSystemVariables.ts`, tanınan değişken adlarının kanonik kümesini tanımlar, ancak `AcDbSysVarManager` şu anda bunların yalnızca bir alt kümesini kurucusunda kaydeder.

Başka bir deyişle:

- `AcDbSystemVariables` ad kataloğudur
- `AcDbSysVarManager.registry` çalışma zamanında hangi değişkenlerin gerçekten desteklendiğini belirler

Bu makul bir evrim yoludur: önce adları tanımlayın, ardından her değişken desteklendikçe tip üst verisini, varsayılanları, depolama stratejisini ve davranışı kademeli olarak ekleyin.

## Önerilen Genişletme Deseni

Gelecekte daha fazla sistem değişkeni eklerken önerilen iş akışı şudur:

1. Değişken adı sabitini `AcDbSystemVariables` içine ekleyin
2. Tanımlayıcıyı `AcDbSysVarManager` içinde kaydedin
3. Veritabanında mı yoksa yalnızca çalışma zamanında mı yer alacağına karar verin
4. Tipini, varsayılan değerini ve açıklamasını tanımlayın
5. Komutları veya arayüzü etkilemesi gerekiyorsa, iş mantığında sabit kodlanmış kontroller yerine olay tabanlı entegrasyonu tercih edin

## Yeni Bir Sistem Değişkeni Nasıl Eklenir

Yeni bir sistem değişkeni eklemek genellikle beş adım içerir.

### 1. Değişken adını `AcDbSystemVariables` içine ekleyin

Önce `AcDbSystemVariables` içine yeni bir kanonik ad sabiti ekleyin.

Bu, değişken adını merkezileştirir ve kod tabanına sabit kodlanmış metinlerin dağılmasını önler.

Örneğin:

```ts
export const MYNEWVAR = 'MYNEWVAR'
```

### 2. Tanımlayıcıyı `AcDbSysVarManager` içinde kaydedin

Ardından değişkeni `AcDbSysVarManager` içinde kaydedin. Değişkeni çalışma zamanında gerçekten desteklenir hale getiren adım budur.

Kaydederken şunları tanımlayın:

- adı
- tipi
- varsayılan değeri
- değerinin `AcDbDatabase` üzerinde mi yoksa yalnızca yönetici önbelleğinde mi saklandığı
- tanımlayıcı modelinin gerektirdiği açıklama veya üst veri

Bu en önemli adımdır. Bir değişken yalnızca `AcDbSystemVariables` içinde varsa ancak `AcDbSysVarManager` içinde kaydedilmemişse, yalnızca bir ad sabitidir; kullanılabilir bir sistem değişkeni değildir.

`AcApDocManager`, başlatma sırasında kayıtlı tüm sistem değişkenlerini otomatik olarak bir komut olarak kaydeder.

Bu, yeni eklenen bir değişkenin genellikle özel bir komut sınıfı yazmaya gerek kalmadan komut satırından kullanılabileceği anlamına gelir.

Komut satırı akışı şu hale gelir:

```text
Command: MYNEWVAR
New value for MYNEWVAR <default>: ...
```

### 3. Depolama modelini seçin

Ardından yeni değişkenin şu olup olmadığına karar vermelisiniz:

- çizim durumuna veya çizim varsayılanlarına aitse veritabanında yer alan
- düzenleyici davranışına, arayüz tercihlerine veya uygulama çalışma zamanı durumuna aitse veritabanında yer almayan

Veritabanında yer alıyorsa, `AcDbSysVarManager` bunu `AcDbDatabase` üzerindeki bir alana eşleyebilmelidir.

Veritabanında yer almıyorsa, `AcDbSysVarManager` bunu dahili çalışma zamanı önbelleğinde tutabilir.

Genel bir kural olarak:

- geçerli katman veya geçerli renk gibi şeyler için veritabanında yer alan değişkenleri kullanın
- seçim kutusu boyutu veya renk teması gibi şeyler için veritabanında yer almayan değişkenleri kullanın

### 4. Gerekirse davranışı bağlayın

Değişkenin değiştirilmesi arayüzü veya düzenleyici davranışını hemen etkilemeliyse, ilgili mantığı tüketici modüle ekleyin.

Tercih edilen desen, değişkeni birçok yerde manuel olarak kontrol etmek yerine `sysVarChanged` olayına tepki vermektir.

`PICKBOX` bu desenin iyi bir örneğidir:

- değişken `AcDbSysVarManager` içinde kaydedilir
- komut sistemi onu komut satırında sunar
- `AcEdCursorManager` değişiklikleri dinler ve imleci hemen günceller

Yani pratikte yeni bir değişken için asgari yol şudur:

1. Adını `AcDbSystemVariables` içinde tanımlayın
2. Tanımlayıcısını `AcDbSysVarManager` içinde kaydedin
3. Depolama stratejisine karar verin
4. İsteğe bağlı olarak değerine tepki veren dinleyicileri veya iş mantığını bağlayın

Bundan sonra, yerleşik sistem değişkenleriyle aynı birleşik `getVar` / `setVar` iş akışına katılabilir.

## Özet

MLightCAD'da sistem değişkenleri, gevşek bir ayar koleksiyonundan daha fazlasıdır. Uygulama durumu için birleşik bir soyutlama oluştururlar:

- aşağıya doğru, çizimle ilgili veritabanı durumuna eşlenirler
- yukarıya doğru, düzenleyici ve arayüz davranışını yönlendirirler
- ortada, merkezi erişim, tip kısıtlamaları ve değişiklik bildirimi sağlarlar

Bir komut "ne yapılacağını" yanıtlıyorsa, bir sistem değişkeni "hangi ayarlar veya mod altında yapılacağını" yanıtlar.
