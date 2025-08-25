# Feature — PWA e i18n (PT/EN)

Este documento concentra as verificações de QA e notas de implementação para PWA e internacionalização (i18n), extraídos do `PLAN.md`.

## Escopo

- PWA: manifesto, service worker, instalação, offline básico.
- i18n: alternância PT/EN, aplicação em rótulos e textos dinâmicos.

## QA Checklist (PWA/i18n)

- PWA: `npx serve -l 5500` → abrir `http://127.0.0.1:5500/` → DevTools > Application > Service Workers → `/sw.js` “activated”.
- Instalação: Chrome/Edge → Install app → abrir app instalado.
- Offline: desativar rede → recarregar → app abre do cache.
- i18n: `#languageToggle` alterna PT/EN e atualiza streak, missões, botões.
- Conquistas/Atributos: registrar atividades variadas e verificar render dinâmico.

## Observações

- Ícones PNG do PWA (180/192/512) pendentes não bloqueiam funcionalidades essenciais.
- Garantir que textos de UI possuam chaves de i18n e atualização reativa após alternância.
