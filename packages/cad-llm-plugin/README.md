# @mlightcad/cad-llm-plugin

Shared AI model (LLM) settings for [cad-viewer](https://github.com/mlightcad/cad-viewer).

Several features rely on an LLM: the CAD Agent chat
([`@mlightcad/cad-agent-plugin`](../cad-agent-plugin/README.md)) and text
recognition (OCR) in `pdftext`
([`@mlightcad/cad-pdf-plugin`](../cad-pdf-plugin/README.md)). This package owns
the one configuration they share and the UI to edit it. The UI is plain DOM
(no Vue / React), so it works in `@mlightcad/cad-editor` and in
framework-free hosts such as `cad-simple-viewer-demo` alike.

## Features

- `llmsettings` command: opens `AcUiLlmSettingsDialog`, built on
  `AcUiDialog` from `@mlightcad/cad-simple-viewer`
  - picks the model in use (chat, and OCR when it accepts images)
  - built-in providers (DeepSeek, DeepSeek VL, OpenAI, Anthropic) that only
    need an API key, plus custom OpenAI / Anthropic compatible endpoints
  - model catalogs, filled by hand or from the provider's model listing
- Config store in `localStorage` with encrypted API keys
  (`acapLlmLoadConfig` / `acapLlmSaveConfig`), and `acapLlmOnConfigChange` so
  every view of the config stays in sync
- `acapLlmCreateModel`: AI SDK model for the resolved settings
- Text recognizer for `pdftext`, registered as `cad-llm` in
  `AcApTextRecognitionService`. It uses the model in use when it accepts
  images, otherwise the first image-capable configured model, and returns
  nothing when there is none, so `pdftext` falls back to manual input
- `AcApLlmSettingsService` provider (from `@mlightcad/cad-simple-viewer`), so
  any feature can open the dialog or check whether a vision model is
  configured without depending on this package

The settings are stored under the `localStorage` key
`cad-agent-plugin.llm-config`, the key the agent plugin used before this
package existed, so saved settings carry over.

## Usage

```typescript
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { registerLazyLlmPlugin } from '@mlightcad/cad-llm-plugin/register'

registerLazyLlmPlugin(AcApDocManager.instance.pluginManager)
```

The `/register` entry is small: the main bundle, which includes the AI SDK,
loads on the first `llmsettings`, OCR request or status check.

In a Vue host, also merge the strings into vue-i18n so the command line
shows the `llmsettings` description:

```typescript
import { mergeLlmI18nIntoVueI18n } from '@mlightcad/cad-llm-plugin/register'

mergeLlmI18nIntoVueI18n((locale, messages) =>
  i18n.global.mergeLocaleMessage(locale, messages)
)
```

`@mlightcad/cad-editor` does both automatically when this package is
installed and adds an **AI → Model Settings** ribbon button.

From another feature, open the settings or check them through the viewer
service instead of importing this package:

```typescript
import { AcApLlmSettingsService } from '@mlightcad/cad-simple-viewer'

const status = await AcApLlmSettingsService.getStatus()
if (status && !status.vision) await AcApLlmSettingsService.open()
```
