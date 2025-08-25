# Documentação do Projeto

Este diretório centraliza a documentação do projeto.

## Conteúdo

- Arquitetura e fluxos gerais
- Guias de features
- Decisões e trade-offs

## Arquitetura Geral

- UI: HTML semântico com estilos em `assets/styles/main.css`.
- Lógica: `assets/scripts/main.js` expõe `App` (módulos `db`, `ui`, `init`).
- Armazenamento: `localStorage` namespaced, seed opcional em `data/seed.json`.

## Fluxo de Inicialização

1. Ao carregar a página, `App.init()` é chamado.
2. `App.db.applySeedIfEmpty()` tenta popular dados via seed inline ou `data/seed.json`.
3. `App.ui.bind()` conecta eventos de UI.
4. `App.ui.renderList()` desenha a lista inicial.

## Padrões de Documentação

- Cada feature deve possuir um documento baseado em `templates/FEATURE_GUIDE.md` descrevendo:
  - Objetivo e escopo
  - Modelo de dados (`App.db`) afetado
  - Eventos/ações e fluxo de estados
  - Pontos de extensão (hooks, funções auxiliares)
  - Considerações de UI/UX e acessibilidade

## Convenções

- Comentários no código devem explicar o "porquê" da decisão.
- Atualize este diretório sempre que uma decisão arquitetural relevante for tomada.
