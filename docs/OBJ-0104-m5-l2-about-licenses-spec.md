# OBJ-0104 M5-L2 — Ecrã Acerca/Licenças: especificação e plano

Fontes: `docs/OBJ-0104-architecture.md` D-1, D-6, D-7, §8.2; conteúdo de `docs/OBJ-0104-licenses.md` (inventário L1). **Não é parecer jurídico.**

## Âmbito
- Ecrã nativo `AboutLicenses` (React Native) acessível a partir do ecrã principal, offline, em PT-PT.
- Conteúdo em módulo puro `src/about/aboutContent.ts`, transcrito do inventário L1 (atribuições aprovadas); sem rede.
- Fora de âmbito: parser/bridge, `third-party.json` gerado e GPL-3.0.txt (L2 completo da arquitectura / itens L1 §6 pendentes), publicação, contacto upstream, decisão jurídica.
- Nota de fronteira: o cartão cita `apps/viewer/**`; no repositório a app é `apps/freedom-mobile/**` (único local do ecrã nativo, arquitectura §3). Web/API intactos.

## Decisões
1. **Não bloqueia fluxos (D-1):** o ecrã é um overlay; `ViewerScreen` fica montado (sessão, servidor e WebView não são reiniciados). Fechar devolve ao estado anterior.
2. **Sem aconselhamento jurídico:** aviso explícito no ecrã; itens [H] do L1 aparecem como "por confirmar", nunca como afirmação.
3. **Pendentes visíveis:** `SOURCE_URL_PENDING` e titular de copyright `Equipa Aitra` marcados como por decidir (EXT-1).
4. **Acessibilidade:** botões `accessibilityRole="button"` com etiqueta, cabeçalhos `accessibilityRole="header"`, alvos >= 44 px, botão Voltar; scroll para conteúdo longo (390 px).

## Plano
1. Este documento (commit).
2. `aboutContent.ts` + testes (`aboutContent.node-test.ts`): secções §8.2, licenças esperadas, avisos, ausência de caminhos absolutos/e-mails, alvos 44 px na folha de estilos.
3. `AboutLicenses.tsx`, ligação em `App.tsx` (botão "Acerca" + overlay).
4. Gates: `tsc --noEmit`, `npm test`, eslint/prettier no delta, `git diff --check`, prova em browser (desktop/390 px) com react-native-web se disponível, senão registar limitação.
