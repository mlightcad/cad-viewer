# MLightCAD (Español)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md)

[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-simple-viewer.svg?label=cad-simple-viewer)](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer)
[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-viewer.svg?label=cad-viewer)](https://www.npmjs.com/package/@mlightcad/cad-viewer)

<a href="https://trendshift.io/repositories/16129?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-16129" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/16129/daily?language=TypeScript" alt="mlightcad%2Fcad-viewer | Trendshift" width="250" height="55"/></a>

MLightCAD es `el primer visor y editor web de DXF/DWG del mundo que funciona completamente en el navegador, sin depender de ningún servicio backend`.
Al realizar el análisis de DWG/DXF, el procesamiento geométrico y el renderizado directamente en el navegador, MLightCAD permite una visualización y edición CAD verdaderamente sin servidor, ideal para aplicaciones en la nube, uso sin conexión y flujos de trabajo sensibles a la privacidad.

También ofrece algo que rara vez encontrará en otros visores CAD: **exportación con un solo clic a un único archivo HTML autocontenido**. El `.html` descargado incorpora la instantánea del dibujo y un visor ligero en tiempo de ejecución, de modo que los destinatarios pueden abrir, desplazar, hacer zoom, alternar capas y medir distancias en cualquier navegador moderno **sin aplicación CAD, sin servidor y sin instalación**. La mayoría de los visores CAD de escritorio y web solo permiten ver dentro de su propio producto; MLightCAD convierte un dibujo activo en un artefacto portable y sin conexión que puede enviar por correo, archivar o alojar en un servidor de archivos estático, ideal para compartir con clientes, archivos de cumplimiento normativo y flujos de trabajo en entornos aislados. El visor sin conexión también utiliza mucha menos memoria que las herramientas de escritorio tradicionales al abrir el mismo dibujo (consulte la [comparación de memoria](#uso-de-memoria-del-html-autocontenido) más abajo).

- [**🌐 Página de inicio**](https://mlightcad.com/)
- **🌐 Demo en vivo**: [Netlify](https://mlightcad.netlify.app/) · [GitHub Pages](https://mlightcad.github.io/cad-viewer/)
- **🌐 Documentación de la API**: [Read the Docs](https://cad-viewer.readthedocs.io/en/latest/) (versionada) · [Servidor MCP](https://gitmcp.io/mlightcad/cad-viewer)
- [**🌐 Wiki**](https://github.com/mlightcad/cad-viewer/wiki)
- X (Twitter): [@mlightcad](https://x.com/mlightcad)
- YouTube: [@mlightcad](https://www.youtube.com/@mlightcad)
- Medium: [@mlightcad](https://medium.com/@mlightcad)
- DEV.to: [@mlightcad](https://dev.to/mlightcad)
- Juejin(稀土掘金): [@mlightcad](https://juejin.cn/column/7501992214283501579)

### Aplicaciones creadas con MLightCAD

El equipo de [Thingraph](https://cad.thingraph.site/) construye visores DWG/DXF de producción e integraciones de plataforma sobre MLightCAD, atendiendo a decenas de miles de usuarios en todo el mundo:

- [DWG Viewer Web App](https://cad.thingraph.site/dwg-viewer) — Visor DWG/DXF basado en navegador utilizado por equipos de ingeniería de todo el mundo para un acceso rápido y sin servidor a los dibujos. Instálelo para su plataforma:
  - [Google Drive](https://workspace.google.com/marketplace/app/dwg_viewer/641533811831) — abra DWG/DXF desde Drive con **Abrir con**
  - [VS Code](https://marketplace.visualstudio.com/items?itemName=thingraph.dwg-viewer) — editor personalizado de solo lectura para `.dwg` / `.dxf`
  - [Cursor](https://open-vsx.org/extension/thingraph/dwg-viewer) — la misma extensión a través de Open VSX
  - [Confluence](https://marketplace.atlassian.com/apps/2890472615/dwg-viewer-for-confluence) — incruste vistas previas de DWG/DXF en las páginas
  - [Windows Explorer](https://cad.thingraph.site/install/windows) — miniatura y vista previa en el Explorador de archivos

Aplicaciones e integraciones de la comunidad:

- [flyfish-dev/cad-viewer](https://github.com/flyfish-dev/cad-viewer) — Visor CAD en navegador orientado a producción para DWG, DXF, DWF, DWFx y XPS ([demo en vivo](https://cad-viewer-iys.pages.dev))
- [Nextcloud CAD Viewer](https://github.com/ashcoft/nextcloud-cad-viewer) — Aplicación nativa de Nextcloud para ver DWG/DXF en el navegador ([App Store](https://apps.nextcloud.com/apps/cad_viewer))

Paquetes de escritorio Linux de la comunidad:

- [CAD Viewer AppImage](https://github.com/pass-wind/cad-viewer-appimage) — AppImage basada en Electron para Linux (~114 MB), probada en Fedora
- [cad-viewer (AUR)](https://aur.archlinux.org/packages/cad-viewer) — Paquete fuente de Arch Linux que utiliza Electron del sistema (~5,4 MB)
- [cad-viewer-bin (AUR)](https://aur.archlinux.org/packages/cad-viewer-bin) — Paquete binario de Arch Linux con fuentes/plantillas incluidas para abrir dibujos completamente sin conexión

### Aplicaciones de demostración (Demo Apps)

Aplicaciones de ejemplo oficiales que muestran cómo integrar MLightCAD en su propio producto:

- [cad-simple-viewer-demo](https://github.com/mlightcad/cad-simple-viewer-example) — Host mínimo en TypeScript vanilla para [`@mlightcad/cad-simple-viewer`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer): abra DXF/DWG locales o desde CDN, ejecute comandos desde una barra de herramientas compacta y cargue de forma diferida plugins de exportación HTML/PDF/SVG sin la UI Vue completa.
- [cad-editor-demo](https://github.com/mlightcad/cad-viewer-example) — Aplicación Vue 3 completa basada en [`@mlightcad/cad-viewer`](https://www.npmjs.com/package/@mlightcad/cad-viewer) con menús, cintas, diálogos, línea de comandos y barra de estado ([demo en vivo](https://mlightcad.github.io/cad-viewer-example/)).
- [cad-viewer-nextjs-demo](https://github.com/mlightcad/cad-viewer-nextjs-demo) — Demo tipo «unidad CAD» en Next.js: carga reanudable por fragmentos de DWG/DXF, lista de archivos con SQLite y miniaturas de vista previa, y apertura con **análisis en vivo en el navegador** (`cad-simple-viewer`) o **prerenderizado ACEX en el servidor** (carga más rápida, menos memoria).

![Demostración rápida de MLightCAD](./assets/cad-viewer.gif)

## Características

- Visualización **de alto rendimiento** de archivos DWG/DXF grandes con renderizado fluido a más de 60 FPS
- **No requiere backend** — Los archivos se analizan y procesan completamente en el navegador
- **Mayor seguridad de los datos** — Los archivos nunca abandonan su dispositivo, garantizando privacidad total
- **Integración sencilla** — No se necesita configuración de servidor ni infraestructura backend
- Arquitectura modular para una integración fluida con terceros
- **Sistema de plugins** — Arquitectura de plugins extensible con plugins oficiales para UI, asistente de IA y exportación a HTML/PDF/SVG; consulte la [guía del sistema de plugins](https://mlightcad.com/cad-viewer/docs/development/plugin-system.html)
- **Diseño móvil y gestos táctiles** — Interfaz responsive para teléfono/tableta y gestos táctiles (pellizcar para zoom, arrastrar con un dedo, tocar para seleccionar) integrados en `@mlightcad/cad-simple-viewer`, sin necesidad de una app móvil aparte
- **Exportación a HTML sin conexión** — Exporte el dibujo actual como un único archivo `.html` autocontenido con un visor integrado (desplazamiento/zoom, zoom a extensión, capas, medición de distancias, interfaz EN/ZH). Se abre sin conexión en cualquier navegador; no requiere instancia de MLightCAD ni backend.
- Flujos de trabajo de edición sin conexión y en línea
- Motores de renderizado 3D THREE.js con técnicas avanzadas de optimización
- Diseñado para extensibilidad e integración con plataformas como CMS, Notion y WeChat

## Incruste DWG/DXF con una línea de código

Añada visualización DWG/DXF a cualquier sitio con un solo `<iframe>`: sin backend CAD ni subir planos a la nube de un tercero. El archivo se obtiene desde **su** URL y se analiza por completo en el navegador del visitante, con herramientas de revisión (desplazamiento, zoom, medición, anotación) listas de inmediato.

```html
<iframe
  src="https://mlightcad.com/embed.html?url=https://example.com/plans/floor.dwg&mode=review&toolbar=1
  style="width:100%;height:600px;border:0"
  allowfullscreen>
</iframe>
```

Guía y demostración en vivo: [Embed DWG/DXF on Your Website Without Uploading a Single Byte](https://medium.com/@mlightcad/embed-dwg-dxf-on-your-website-without-uploading-a-single-byte-cf5f6ad484c4).

## Primeros pasos

### Requisitos previos

- [Node.js](https://nodejs.org/) >= 24
- [pnpm](https://pnpm.io/) >= 10

### Instalación

```bash
git clone https://github.com/mlightcad/cad-viewer.git
cd cad-viewer
pnpm install
```

### Desarrollo

```bash
# Iniciar el visor completo (cad-viewer)
pnpm dev

# O iniciar el visor simple
pnpm dev:simple
```

### Compilación

```bash
pnpm build
```

### Vista previa

```bash
# Vista previa del visor completo
pnpm preview

# Vista previa del visor simple
pnpm preview:simple
```

## Cómo usar

¿Es nuevo en MLightCAD? La **[guía de usuario](https://mlightcad.com/cad-viewer/docs/)** ofrece instrucciones paso a paso sobre la interfaz del visor, las operaciones en escritorio y táctiles, y las herramientas de marcas y medición.

### Operaciones en navegador de escritorio
- **Seleccionar**: Clic izquierdo en las entidades
- **Acercar/alejar**: Rueda del ratón hacia arriba/abajo
- **Desplazar**: Mantenga pulsado el botón central del ratón y arrastre
- **Borrar**: Seleccione entidades y pulse la tecla `Del`

### Operaciones en navegador de tableta/móvil
- **Seleccionar**: Toque las entidades
- **Zoom**: Pellizco con dos dedos
- **Desplazar**: Arrastre con un dedo

## Rendimiento

MLightCAD está diseñado para un **rendimiento excepcional** y puede manejar archivos DXF/DWG muy grandes manteniendo altas tasas de fotogramas. Emplea múltiples tecnologías avanzadas de renderizado para optimizar el rendimiento:

- **Materiales de shader personalizados**: Utiliza materiales de shader acelerados por GPU para renderizar tipos de línea complejos y patrones de sombreado de forma eficiente
- **Agrupación de geometría**: Fusiona puntos, líneas y áreas con el mismo material para reducir drásticamente las draw calls
- **Renderizado instanciado**: Optimiza el renderizado de geometrías repetidas mediante técnicas de instanciación
- **Optimización de geometría en búfer**: Gestión eficiente de memoria y fusión de geometría para reducir la sobrecarga de GPU
- **Caché de materiales**: Reutiliza materiales entre entidades similares para minimizar los cambios de estado
- **Optimización WebGL**: Aprovecha las funciones modernas de WebGL para renderizado acelerado por hardware

Estas optimizaciones permiten que MLightCAD renderice sin problemas dibujos CAD complejos con miles de entidades manteniendo interacciones de usuario fluidas.

#### Uso de memoria del HTML autocontenido

Al abrir el dibujo de ejemplo [`canteen.dwg`](https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/data/canteen.dwg), el consumo de memoria es aproximadamente:

| Visor | Consumo de memoria |
|--------|-------------|
| AutoCAD 2020 | 320 MB |
| GstarCAD Viewer (浩辰看图王) | 246 MB |
| HTML autocontenido (modo medición) | 56 MB |
| HTML autocontenido (modo vista) | 33 MB |

El visor HTML sin conexión utiliza aproximadamente un **83 % menos de memoria que AutoCAD 2020** y aproximadamente un **77 % menos que GstarCAD Viewer** en modo vista, manteniendo soporte para desplazamiento/zoom, alternancia de capas y medición de distancias (modo medición).

## Problemas conocidos

La ruta DWG de código abierto predeterminada se basa en [LibreDWG](https://github.com/LibreDWG/libredwg) a través del paquete opcional `@mlightcad/libredwg-converter`. Funciona bien para muchos dibujos, pero su cobertura de entidades sigue siendo limitada, el paquete WASM es mucho más grande, el arranque es más lento, el uso de memoria es alto y los archivos DWG muy grandes pueden provocar errores de falta de memoria. También introduce consideraciones de licencia GPL para productos comerciales de código cerrado. `@mlightcad/cad-simple-viewer` **no** depende de ni registra ese convertidor de forma predeterminada: las aplicaciones host (véanse los paquetes de ejemplo) se adhieren de forma explícita.

Si necesita mejor compatibilidad, menor uso de memoria, soporte para archivos grandes o una historia de licencias comerciales más limpia, consulte nuestro [**analizador DWG propietario**](./PROPRIETARY-PARSER.md).

| Elemento | Analizador basado en LibreDWG | Analizador DWG propietario |
|------|------------------------|------------------------|
| Entidades compatibles | Cobertura limitada | Cobertura más amplia |
| Tamaño del paquete | ~13 MB | ~437 KB |
| Velocidad de carga | Arranque más lento | Arranque mucho más rápido |
| Uso de memoria | Mayor | Menor |
| Archivos DWG grandes | Puede quedarse sin memoria en archivos grandes | Sin ese problema |
| Licencia | Riesgo de propagación GPL | Sin problema de propagación GPL |

## Hoja de ruta

El objetivo de este proyecto es crear un **sistema 2D similar a AutoCAD en el navegador** (visor + editor), con arquitectura modular e integración independiente del framework.

Leyenda:
- [x] Completado
- [ ] Planificado
- [ ] ⏳ En progreso

### Capa central de archivos y datos

#### Soporte de archivos

* [x] Carga de DXF
* [x] Carga de DWG
* [x] Exportación a HTML sin conexión autocontenido (visor integrado)
* [x] Transmisión de archivos grandes / carga incremental
* [ ] ⏳ Compatibilidad de versiones de archivo (R12–Latest)

#### Modelo de datos

* [x] Modelo de datos de entidades unificado
* [x] Soporte de tabla de capas
* [x] Estructura de bloques / inserciones
* [ ] ⏳ Gestión de handle e ID de objeto: actualmente objectId es igual al handle y se representa como una cadena en lugar de bigint (int64).
* [ ] ⏳ Soporte de XData / diccionario de extensiones
* [ ] Manejo de entidades proxy

### Renderizado y rendimiento

#### Motor de renderizado

* [x] Renderizado basado en WebGL (Three.js)
* [x] Canal optimizado solo para 2D
* [x] Organización de escena por capas
* [x] Renderizado de layout / espacio papel
* [ ] Soporte de entidades viewport

#### Optimización de rendimiento

* [x] Fusión y agrupación de geometría
* [x] Indexación espacial (básica)
* [x] Índice espacial avanzado (R-tree / BVH)
* [ ] Renderizado con nivel de detalle (LOD)
* [ ] Multi-lienzo / renderizado en mosaico para dibujos muy grandes

### Visualización y navegación

#### Controles de vista

* [x] Desplazamiento
* [x] Zoom (rueda / zoom por ventana)
* [x] Ajustar a vista / extensión
* [ ] Vistas con nombre
* [ ] Historial de vistas (deshacer / rehacer cambios de vista)

#### Controles de visualización

* [x] Visibilidad de capas activa/inactiva
* [x] Congelar / bloquear capas
* [x] Visualización de grosor de línea
* [ ] Escalado de tipo de línea
* [x] Cambio de fondo / tema

### Selección e interacción

#### Selección

* [x] Selección de entidad única
* [x] Resaltar entidades seleccionadas
* [x] Selección por ventana
* [x] Selección por cruce
* [x] Filtros de selección (por tipo / capa)
* [x] Ciclo de selección

#### Ajuste (OSNAP)

* [x] Punto final
* [x] Punto medio
* [x] Centro
* [x] Intersección
* [ ] Perpendicular / tangente
* [x] Más cercano
* [ ] Seguimiento de ajuste


### Edición y modificación

#### Edición básica

* [x] Marco de edición de entidades
* [x] Mover
* [x] Copiar
* [x] Rotar
* [ ] Escalar
* [x] Eliminar
* [x] Deshacer / rehacer

#### Edición de geometría

* [x] Puntos de agarre
* [ ] Estirar
* [ ] Recortar
* [ ] Extender
* [x] Desfase
* [ ] Explotar
* [ ] Unir / filete / chaflán (2D)

### Herramientas de dibujo y creación

#### Entidades básicas

* [x] Línea
* [x] Polilínea
* [x] Spline
* [x] Círculo
* [x] Arco
* [x] Elipse
* [x] Rectángulo / polígono

#### Entidades avanzadas

* [x] Sombreado
* [ ] Texto (una línea / multilínea)
* [ ] Cotas (lineal, alineada, angular)
* [ ] Creación e inserción de bloques

### Medición

* [x] Distancia
* [x] Longitud de arco
* [x] Área
* [x] Ángulo
* [ ] Coordenada
* [ ] Estadísticas de entidades (longitud, área, recuento)

### Cota

* [x] Cota lineal
* [ ] Cota angular
* [ ] Coordenada

### Propiedades y paneles de interfaz

#### Paleta de propiedades

* [x] Propiedades de entidad seleccionada
* [ ] Edición de capa, color, tipo de línea
* [x] Actualización en vivo al cambiar

#### Paneles e interfaz

* [x] Administrador de capas
* [ ] Administrador de bloques
* [x] Historial de comandos / consola
* [x] Barra de estado (ajuste, ortogonal, cuadrícula)

#### Sistema de comandos

* [x] Registro de comandos
* [x] Alias de comandos
* [x] Indicaciones de comandos (estilo AutoCAD)

### Integración y extensibilidad

#### Integración con frameworks

* [x] Núcleo independiente del framework
* [ ] Ejemplo de integración con React
* [x] Ejemplo de integración con Vue
* [ ] Integración con OpenLayers / Map
* [ ] Incrustación en CMS / Notion

#### Sistema de plugins

* [x] API de plugins
* [ ] Soporte de entidades personalizadas
* [x] Comando personalizado

### Edición sin conexión y en línea

#### Editor sin conexión

* [x] Edición local en el navegador
* [x] Guardar en DXF
* [ ] Guardar conjunto de cambios / diff
* [ ] Persistencia en IndexedDB

#### Editor en línea

* [ ] Diseño de API backend
* [ ] Autenticación de usuarios
* [ ] Control de versiones de archivos
* [ ] Control de acceso multiusuario
* [ ] Colaboración en tiempo real (futuro)

### Plataformas objetivo

* [x] Integración con Google Drive (origen de datos Picker; Drive “Open with” como seguimiento opcional)
* [ ] Visor de Mini Program de WeChat
* [x] Soporte de navegador móvil (diseño responsive y gestos táctiles)

### Documentación y comunidad

* [x] Documentación de arquitectura
* [x] Referencia de API
* [ ] Guía de contribución
* [x] Proyectos de ejemplo
* [x] Mantenimiento de hoja de ruta y registro de cambios

Esta hoja de ruta es intencionalmente detallada para que los colaboradores puedan ver claramente **qué existe**, **qué falta** y **dónde se necesita ayuda**.

## Contribuir

¡Las contribuciones son bienvenidas! Abra issues o pull requests para correcciones de errores, nuevas funciones o sugerencias. Para informes de errores, proporcionar un enlace al dibujo problemático ayudará a reproducir y corregir el problema.

## Licencia

El monorepo MLightCAD está principalmente bajo licencia [MIT](LICENSE).

La carga de DXF utiliza el analizador MIT integrado en `@mlightcad/data-model`. La carga de DWG es **opt-in**: `@mlightcad/cad-simple-viewer` no depende de paquetes GPL de LibreDWG. Las aplicaciones host que deseen soporte DWG de código abierto añaden `@mlightcad/libredwg-converter` (GPL-3.0) ellas mismas, despliegan su worker + wasm y registran el convertidor. Si distribuye un producto de código cerrado y no puede distribuir código GPL a sus clientes, utilice el [**analizador DWG propietario**](./PROPRIETARY-PARSER.md) en su lugar.

→ **Analizador comercial:** [PROPRIETARY-PARSER.md](./PROPRIETARY-PARSER.md) (alcance, licencias, precios, integración, cumplimiento GPL, soporte)
