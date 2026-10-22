---
title: "Základy CAD Viewer"
---

# Základy CAD Viewer

Tento projekt nabízí uživatelům dva prohlížeče: `cad-viewer` a `cad-simple-viewer`. Který prohlížeč zvolit, závisí na požadavcích vašeho projektu a požadované míře integrace:

## Použijte **cad-viewer**, pokud:

- Chcete **komponentu Vue 3 připravenou k použití** s moderním UI, dialogy, panely nástrojů a správou stavu.
- Potřebujete rychle vložit vysoce výkonný prohlížeč/editor CAD do své aplikace Vue s minimálním nastavením.
- Preferujete řešení, které zvládá načítání souborů, vykreslování, správu hladin/entit a uživatelské interakce ihned po instalaci.
- Chcete bezproblémovou integraci s optimalizovanými renderery SVG a THREE.js, internacionalizací a motivy.
- **Nechcete** vytvářet vlastní UI od nuly.

**Doporučeno pro:** většinu webových aplikací, dashboardů nebo platforem, které potřebují zobrazovat CAD soubory s propracovaným uživatelským rozhraním.

## Použijte **cad-simple-viewer**, pokud:

- Potřebujete **pouze základní CAD logiku** (správu dokumentů, zásobník příkazů, integraci vykreslovacího enginu) bez závislosti na UI frameworku.
- Chcete vytvořit **vlastní UI** nebo integrovat CAD funkce do prostředí, které není založeno na Vue ani na webu.
- Požadujete maximální flexibilitu a výkon pro práci s velkými CAD soubory a plánujete připojit logiku k vlastní vykreslovací nebo UI vrstvě.
- Chcete řešení nezávislé na frameworku, které poskytuje pouze nezbytné CAD operace a vykreslování na plátno.

**Doporučeno pro:** vlastní integrace, headless zpracování CAD nebo pokročilé uživatele vytvářející vysoce přizpůsobená CAD řešení.

**Souhrnná tabulka:**

| Balíček             | Poskytuje UI | Framework | Použití                                      |
|---------------------|-------------|-----------|-----------------------------------------------|
| `cad-viewer`        | Ano         | Vue 3     | Kompletní prohlížeč/editor CAD s moderním UI       |
| `cad-simple-viewer` | Ne          | Žádný      | Základní CAD logika pro vlastní nebo headless použití      |

Další podrobnosti najdete v částech [**Integrace Simple CAD Viewer**](./integrate-simple-cad-viewer) a [**Integrace komponenty CAD Viewer**](./integrate-cad-viewer-component).

## Příklady

- [`cad-simple-viewer-example`](https://github.com/mlightcad/cad-simple-viewer-example): Ukázková aplikace předvádějící použití komponenty `cad-simple-viewer` v reálném projektu.
- [`cad-viewer-example`](https://github.com/mlightcad/cad-viewer-example): Ukázková aplikace předvádějící použití komponenty `cad-viewer` v reálném projektu.

