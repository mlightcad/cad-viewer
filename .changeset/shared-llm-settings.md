---
'@mlightcad/cad-llm-plugin': minor
'@mlightcad/cad-agent-plugin': minor
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-pdf-plugin': minor
'@mlightcad/cad-editor': minor
---

feat(llm): share one AI model configuration between the CAD Agent and PDF OCR

The LLM provider settings move from `@mlightcad/cad-agent-plugin` into the new
`@mlightcad/cad-llm-plugin`, which adds the `llmsettings` command and a
framework-free settings dialog (model in use, built-in and custom providers,
model catalogs). `@mlightcad/cad-simple-viewer` adds `AcApLlmSettingsService`
so features can open the dialog or check whether a vision model is configured
without depending on the plugin. `pdftext` now hints once per session when no
image-capable model is configured, and OCR falls back to the first
image-capable configured model when the model in use is text-only.
`@mlightcad/cad-editor` registers the plugin when installed and adds an
AI → Model Settings ribbon button. The agent panel's gear button opens the
shared dialog. Saved settings carry over unchanged. See the upgrade guide for
host migration.
