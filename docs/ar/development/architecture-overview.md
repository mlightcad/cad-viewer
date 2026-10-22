---
title: "نظرة عامة على البنية"
---

# نظرة عامة على البنية

يعمل CAD-Viewer بالكامل داخل المتصفح **دون أي اعتماد على خادم خلفي**. تُحلَّل ملفات DWG/DXF وتُعالَج محليًا باستخدام WebAssembly وJavaScript، مما يضمن:

- **عدم الحاجة إلى خادم** - انشره في أي مكان باستخدام استضافة الملفات الثابتة فقط
- **خصوصية كاملة للبيانات** - لا تغادر الملفات جهاز المستخدم أبدًا
- **دمج فوري** - لا حاجة إلى إعداد خلفي معقد أو تهيئة API
- **القدرة على العمل دون اتصال** - يعمل بدون اتصال بالإنترنت

يتوزّع CAD-Viewer على عدة حزم فرعية، كل منها مسؤولة عن جانب محدد من النظام:

- **cad-viewer**: مكوّن Vue 3 الرئيسي والتطبيق الواجهي، بما في ذلك مكوّنات واجهة المستخدم والحوارات وأشرطة الأدوات وإدارة الحالة والتكامل مع محركات العرض.
- **cad-simple-viewer**: المنطق الأساسي لإدارة المستندات ومعالجة الأوامر والتكامل بين واجهة المستخدم ومحركات العرض. مستقل عن أطر العمل وخالٍ من واجهة المستخدم (لوحة الرسم فقط).
- **svg-renderer**: يعرض كيانات DWG/DXF كرسومات SVG للتصدير والإخراج ثنائي الأبعاد القابل للتحجيم.
- **three-renderer**: يستخدم THREE.js لعرض كيانات DWG/DXF كرسومات تفاعلية ثنائية وثلاثية الأبعاد مع تصور متقدم وتظليل مخصص.

## نظرة عامة على البنية

**CAD-Viewer** هو عارض DWG/DXF عالي الأداء يعمل في المتصفح فقط، ويعتمد بنية وحدوية وقابلة للتوسعة لدعم تحميل صيغ بيانات CAD متعددة وتحليلها وعرضها والتفاعل معها. ينقسم النظام إلى الطبقات الأساسية التالية:

![نظرة عامة على البنية](https://github.com/mlightcad/cad-viewer/blob/main/assets/arch-en.jpg?raw=true)

تضمن هذه البنية الطبقية أن يحافظ **CAD-Viewer** على أداء عالٍ وزمن استجابة منخفض وقابلية توسع قوية عند التعامل مع أحجام بيانات ومتطلبات عرض وبيئات نشر مختلفة.

### **طبقة النموذج**

- تعرّف **نموذج بيانات** موحّدًا لوصف بيانات CAD المحلَّلة (بما في ذلك الكيانات الهندسية ومعلومات الطبقات ومعاملات العرض وغيرها) عبر وحدة [`@mlightcad/data-model`](https://github.com/mlightcad/realdwg-web) في [`realdwg-web`](https://github.com/mlightcad/realdwg-web).
- تنفّذ واجهة موحّدة لتحويل ملفات CAD عبر [`AcDbDatabaseConverter`](https://github.com/mlightcad/realdwg-web/blob/main/packages/data-model/src/database/AcDbDatabaseConverter.ts)، مما يتيح للمحوّلات المختلفة تحويل بيانات CAD إلى نموذج البيانات الموحّد.
- توفّر قدرات تحليل DWG عبر وحدة [`@mlightcad/libredwg-converter`](https://github.com/mlightcad/realdwg-web) في `realdwg-web`، بتحويل ملفات DWG إلى نموذج البيانات الموحّد.
- توفّر قدرات تحليل DXF عبر وحدة [`@mlightcad/dxf-json`](https://github.com/mlightcad/dxf-json)، بتحويل ملفات DXF إلى نموذج البيانات الموحّد.
- تتيح محركًا هندسيًا عبر وحدة [`@mlightcad/geometry-engine`](https://github.com/mlightcad/realdwg-web) في `realdwg-web`، يدعم حسابات هندسية متنوعة (النقاط والخطوط والخطوط المتعددة والخطوط الحرة والدوائر والأقواس والقطوع الناقصة والأقواس الناقصة) بالإضافة إلى العمليات الرياضية (المتجهات والمصفوفات وغيرها).

ملاحظة سريعة حول سبب تعريف واجهة `AcDbDatabaseConverter`: غالبًا ما تكون أدوات قراءة وكتابة وتحويل DXF/DWG الموجودة في السوق غير مكتملة. لقد نفّذت `@mlightcad/libredwg-converter` و`@mlightcad/dxf-json` استنادًا إلى بعض الشيفرة مفتوحة المصدر. ومع ذلك، فإن أفضل أداة متاحة لتحليل DWG/DXF وتحويله هي في الواقع [ODA](https://www.opendesign.com/products/drawings). لاستخدامها يجب شراء ترخيص للوصول إلى شيفرتها المصدرية، ومنها يمكن بناء وحدة WebAssembly تحوّل DXF/DWG إلى نموذج البيانات الموحّد المعرَّف في `@mlightcad/data-model`. وإذا صادف أن شاركني أحدهم شيفرة ODA المصدرية، فسأتمكن أيضًا من تنفيذ محوّل قائم عليها.

### **طبقة العرض**

- تعرّف واجهة عرض موحّدة عبر وحدة [`@mlightcad/graphic-interface`](https://github.com/mlightcad/realdwg-web) في `realdwg-web` لعرض أنواع مختلفة من كيانات CAD.
- تنفّذ واجهة العرض في وحدة [`@mlightcad/three-renderer`](https://github.com/mlightcad/cad-viewer) في `cad-viewer`، باستخدام Three.js لعرض جميع أنواع الكيانات.
- تنفّذ واجهة العرض في وحدة [`@mlightcad/svg-renderer`](https://github.com/mlightcad/cad-viewer) في `cad-viewer`، بعرض الرسومات بصيغة SVG.

### **طبقة العرض المرئي**

- توفّر وحدة [`@mlightcad/cad-simple-viewer`](https://github.com/mlightcad/cad-viewer) في `cad-viewer` منطق العرض الأساسي لملفات CAD، مثل إدارة المستندات ومعالجة الأوامر والتنسيق بين واجهة المستخدم ومحرك العرض. لا تعتمد على أي إطار عمل واجهة مستخدم ولا توفّر عناصر واجهة غير لوحة الرسم.
- تبني وحدة [`@mlightcad/cad-viewer`](https://github.com/mlightcad/cad-viewer) على `@mlightcad/cad-simple-viewer` لتوفير واجهة مستخدم قائمة على Vue 3 مع القوائم وأشرطة الأدوات وسطر الأوامر وشريط الحالة والسمتين الداكنة والفاتحة. وهي تغلّف جميع الميزات الأساسية في مكوّن Vue 3 لسهولة الدمج.

## محرك العرض

يطرح عرض ملفات DXF/DWG عدة تحديات:

- عرض عالي الأداء للرسومات التي تحتوي على عدد كبير من الكيانات.
- إعادة إنتاج تأثيرات عرض النصوص في AutoCAD.
- دعم أنماط الخطوط وأنماط التهشير.

### العرض عالي الأداء

للحصول على عرض عالي الأداء للرسومات الكبيرة، يكمن المفتاح في دمج النقاط والخطوط والأوجه لتقليل **Draw Calls**. يوفّر THREE.js حلًا جزئيًا عبر فئة [BatchedMesh](https://threejs.org/docs/index.html?q=Mesh#api/en/objects/BatchedMesh) لدمج الشبكات المثلثية. ومع ذلك، فهي لا تدعم دمج النقاط والخطوط، وحتى دمج الأوجه فيها لا يلبي احتياجاتنا بالكامل. لذلك نفّذنا عدة فئات مستوحاة من `BatchedMesh` لدمج النقاط والخطوط والأوجه. يمكنك الاطلاع على [الشيفرة هنا](https://github.com/mlightcad/cad-viewer/tree/main/packages/three-renderer/src/batch).

### عرض النصوص

يستخدم AutoCAD صيغة [`MText`](https://ezdxf.mozman.at/docs/dxfinternals/entities/mtext.html) للنصوص الغنية وخط [SHX](https://help.autodesk.com/view/OARX/2023/ENU/?guid=GUID-DE941DB5-7044-433C-AA68-2A9AE98A5713) خاصًا (خط قائم على الخطوط يُرسم بالخطوط فقط) لعرض أسرع. تتمثل التحديات الرئيسية في:

- **تحليل MText** – منفَّذ باستخدام حزمة [`@mlightcad/mtext-parser`](https://github.com/mlightcad/mtext-parser).
- **تحليل خطوط SHX** – منفَّذ باستخدام حزمة [`@mlightcad/shx-parser`](https://github.com/mlightcad/shx-parser).
- **عرض MText** – منفَّذ باستخدام حزمة [`@mlightcad/mtext-renderer`](https://github.com/mlightcad/mtext-renderer). من أجل الأداء، تُخزَّن ملفات الخطوط المحلَّلة في IndexedDB الخاص بالمتصفح، بحيث يصبح العرض اللاحق أسرع بعد التنزيل والتحليل مرة واحدة.

لتصحيح أخطاء عرض النصوص، بنينا محرر نصوص غنية قائمًا على THREE.js باسم [mtext-editor](https://github.com/mlightcad/mtext-editor). لا يوجد حاليًا محرر نصوص غنية آخر مفتوح المصدر قائم على THREE.js، لذا يمكن إعادة استخدام هذا المحرر كفاتح نصوص لأي محرك عرض.

### أنماط الخطوط وأنماط التهشير

يدعم AutoCAD أنواع خطوط وأنماط تهشير مخصصة. لقد نفّذنا بعضًا منها (أنواع الخطوط التي تحتوي على نصوص غير مدعومة بعد). تُنفَّذ جميع أنماط الخطوط وتأثيرات التهشير باستخدام `ShaderMaterial` من THREE.js. يمكنك الاطلاع على [الشيفرة هنا](https://github.com/mlightcad/cad-viewer/tree/main/packages/three-renderer/src/style).
