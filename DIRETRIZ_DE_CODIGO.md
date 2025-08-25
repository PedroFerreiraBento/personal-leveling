# Diretriz de Código e Trabalho do Agente de IA

Este documento estabelece como o "agente" de IA deve trabalhar na construção do código e na compreensão do contexto do projeto.

## Princípios

1. Contexto primeiro: Antes de alterar qualquer código, ler os documentos relevantes em `docs/` e os comentários no código.
2. Menor surpresa: Manter APIs internas simples, coesas e previsíveis. Não introduzir dependências desnecessárias.
3. Código autoexplicativo: Preferir nomes claros e comentários sucintos. Documentar decisões arquiteturais em `docs/`.
4. Reprodutibilidade: Garantir que o projeto funcione abrindo `index.html` e, preferencialmente, via um servidor estático simples.
5. Evolução incremental: Para mudanças grandes, fatiar em PRs/commits pequenos com escopo claro.

## Processo do Agente

- Ler `README.md` (raiz) e `docs/README.md` para visão geral.
- Para uma feature:
  - Verificar se existe pasta e documentação específica em `docs/<feature>` ou um documento em `docs/features`.
  - Se não houver, usar o template `docs/templates/FEATURE_GUIDE.md` para criar documentação inicial e só então codificar.
- Antes de editar arquivos:
  - Identificar pontos de extensão em `index.html`, `assets/scripts/main.js` e `assets/styles/main.css`.
  - Procurar comentários com `// TODO` e `/* TODO */`.
- Testar localmente abrindo `index.html`. Se a feature depender de `fetch` a arquivos locais, usar um servidor estático.

## Deploy e Publicação (Netlify)

- Credenciais/conta: tratadas pelo Netlify CLI (login local). Não se coloca conta no `netlify.toml`.
- URL publicada: <https://personal-leveling-rpg.netlify.app>
- Comandos principais:

```bash
# Status da conta/site atual
npx --yes netlify-cli@latest status

# Criar e vincular um novo site (interativo) OU vincular a um existente
npx --yes netlify-cli@latest init
# ou
npx --yes netlify-cli@latest link

# Deploy de produção (usa netlify.toml)
npx --yes netlify-cli@latest deploy --dir . --prod --message "Deploy"
```

- O vínculo local fica em `.netlify/state.json` (diretório já ignorado no `.gitignore`).

## Padrões de Código

- HTML: Semântico. Classes utilitárias moderadas. Evitar inline styles.
- CSS: Variáveis CSS em `:root`. Organização por camadas: base, layout, componentes, utilitários.
- JS: ES6+. Modular por funções puras onde possível. Evitar poluir o escopo global; expor um único namespace `App`.
- Armazenamento: Usar `App.db` (wrapper de `localStorage`). Chaves namespaced: `app:<nome>`.
- Erros: Tratar exceções com mensagens claras no console e feedback visual quando necessário.

### CSS Modular por Componentes

Para maximizar reuso e clareza, os estilos foram modularizados em arquivos de componentes dentro de `assets/styles/components/`:

- `components/buttons.css`: botões genéricos (`.btn`, `.btn-primary`, `.btn-ghost`, tamanhos `.-sm`/`.-lg`) e botões de ícone (`.btn-icon`, `.icon-btn`).
- `components/sidebar.css`: sidebar overlay (`.sidebar`), lista de navegação (`.nav-list`) e backdrop (`.sidebar-backdrop`).
- `components/layout.css`: utilitários de grid (`.grid`, `.grid-3`), container e espaçamentos (`.mt-*`).

O arquivo `assets/styles/main.css` importa os componentes nesta ordem:

1. `tokens.css`
2. `components/buttons.css`
3. `components/sidebar.css`
4. `components/layout.css`

Diretrizes para adicionar um novo componente CSS:

1. Criar arquivo em `assets/styles/components/<componente>.css`.
2. Manter variáveis e tokens em `tokens.css` sempre que possível.
3. Importar o novo arquivo em `assets/styles/main.css` após `tokens.css`.
4. Documentar o componente (intenção, classes públicas, estados) em `docs/DESIGN_GUIDE.md` na seção de Componentes.
5. Evitar dependências cíclicas entre componentes; componentes devem ser independentes.

## Documentação

- Cada diretório que contenha lógica relevante deve ter um `README.md` com:
  - Objetivo
  - Principais arquivos
  - Fluxos (quando aplicável)
  - Decisões e trade-offs
- Features complexas devem descrever o fluxo (eventos, estados, renderização) e o modelo de dados usado no `App.db`.

### Como escrever Status Updates (`docs/status-updates.md`)

- Formato de data: `YYYY-MM-DD` (ex.: `2025-08-23`).
- Cada dia deve ter listas categorizadas (usar apenas o que se aplica):

```
## 2025-08-23

- Added:
  - ...
- Changed:
  - ...
- Moved:
  - ...
- Docs:
  - ...
- Deployed:
  - Produção (Netlify): [personal-leveling-rpg.netlify.app](https://personal-leveling-rpg.netlify.app)
```

- Dicas:
  - Seja conciso; mova detalhes para `docs/features/<feature>.md`.
  - Linke arquivos/rotas relevantes entre crases (ex.: `app.html`, `assets/scripts/main.js`).

### Componentes HTML (parciais) e Loader

- Parciais HTML vivem em `assets/components/` (`header.html`, `sidebar.html`, `footer.html`).
- Páginas usam placeholders com `data-component`:
  - Ex.: `<div data-component="header"></div>`, `<div data-component="sidebar"></div>`, `<div data-component="footer"></div>`
- O loader em `assets/scripts/main.js` (`loadComponents()`) faz `fetch` das parciais e injeta antes de `ui.bind()`.
- Importante: para funcionar, abrir o site via servidor HTTP (ex.: `http://127.0.0.1:8080/`), pois `fetch` de arquivos locais não funciona com `file://`.
- Para adicionar novo componente HTML:
  1. Criar `assets/components/<nome>.html`.
  2. Adicionar mapeamento no objeto `mapper` de `loadComponents()`.
  3. Inserir `<div data-component="<nome>"></div>` na página.

## Revisão e Qualidade

- Mantener comentários atualizados quando refatorar.
- Validar HTML/CSS (W3C validators) e checar acessibilidade básica (semântica, contrastes, foco).
- Testar em pelo menos dois navegadores modernos.

## Mapa de Arquivos (o que ler e quando)

- `README.md` (raiz)
  - Visão rápida do projeto, estrutura de pastas e como rodar localmente.
- `PLAN.md` (raiz)
  - Fonte da verdade do planejamento e progresso. Consulte antes de iniciar uma tarefa para saber prioridade e estado atual. Atualize ao concluir etapas.
- `DIRETRIZ_DE_CODIGO.md` (raiz)
  - Este documento. Ponto de partida para entender processos, padrões e onde buscar informação.
- `index.html`
  - Estrutura semântica da página e pontos de montagem da UI. Ver comentários para ganchos de renderização.
- `assets/styles/main.css`
  - Importa tokens e os CSS de componentes. Ajuste aqui apenas a ordem de import e estilos base/globais.
- `assets/styles/components/`
  - Diretório com estilos modulares por componente (`buttons.css`, `sidebar.css`, `layout.css`, ...).
- `assets/scripts/main.js`
  - Namespace `App` (db/ui/init). Ponto principal para lógica de UI e persistência local.
- `data/seed.json`
  - Dados iniciais de exemplo. Útil para testes e resets do ambiente local.
- `docs/README.md`
  - Arquitetura geral e fluxo de inicialização.
- `docs/IDEIA_GERAL.md`
  - Objetivos, visão, funcionalidades e escopo do produto.
- `docs/DESIGN_GUIDE.md`
  - Diretrizes de design (tokens, layout, componentes, acessibilidade, estética). Use como referência visual ao construir UI.
- `docs/templates/FEATURE_GUIDE.md`
  - Template para documentar qualquer nova feature. Sempre criar a doc antes de implementar.

## Plano de Projeto (uso do PLAN.md)

- O `PLAN.md` mantém o estado atual do projeto (tarefas, notas, meta vigente).
- Antes de começar:
  - Leia a seção "Current Goal" para alinhar foco.
  - Verifique a "Task List" e marque apenas o que foi realmente concluído no código/documentos.
- Ao finalizar uma tarefa:
  - Atualize a "Task List" (marque como [x]).
  - Se a tarefa gerou decisões relevantes, adicione um resumo em `docs/` (no arquivo da feature ou em `docs/README.md`).
- Mudanças de direção:
  - Registre no `PLAN.md` e referencie documentos afetados (ex.: `docs/DESIGN_GUIDE.md`).
- Boas práticas:
  - Mantenha commits/etapas pequenas e coerentes com itens do `PLAN.md`.
  - Revise o `PLAN.md` quando abrir uma nova frente de trabalho (ex.: nova feature).
