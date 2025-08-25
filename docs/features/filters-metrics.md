# Feature — Filtros, Métricas e Streak Semanal

Este documento consolida o planejamento detalhado da Sprint 2, extraído de `PLAN.md`, mantendo o plano principal enxuto (apenas checklists e referências).

## Escopo

- Categorias/Tags e filtros de atividades/missões (UI + persistência simples).
- Streaks semanais (cálculo, reset controlado, destaque no dashboard).
- Métricas adicionais (visões semanais e gráficos simples onde aplicável).
- Polimento UI/UX: alinhamento/tamanho de Material Symbols, estados de foco/hover, responsividade.
- Acessibilidade: revisão ARIA, navegação por teclado, contraste.

## DoD (Critérios de Pronto)

- Filtros por categoria aplicáveis em lista de atividades e missões, persistidos em preferências (`prefs` via `App.db`).
- Filtro por intervalo (atividades: hoje/semana) aplicável e persistido em preferências (`prefs` via `App.db`).
- Streak semanal aparece no dashboard com contagem correta e texto i18n.
- Métricas semanais renderizam sem erro e degradam com dados ausentes.
- UI limpa em mobile/desktop; foco visível; botões com labels e títulos adequados.
- Documentação atualizada (README e DESIGN_GUIDE) sobre novas métricas e filtros.

## DoD por Tarefa

- Filtros de atividades — categoria:
  - UI: `<select id="activitiesFilterCategory">` populado dinamicamente.
  - Persistência: `App.db` em `prefs.filters.activities.category`.
  - Aplicação: filtro encadeado em `App.ui.renderList()`.
- Filtros de atividades — intervalo (hoje/semana/todas):
  - UI: `<select id="activitiesFilterInterval">` com opções `all/today/week`.
  - Persistência: `prefs.filters.activities.interval` (normalizado para `all` se inválido).
  - Aplicação: filtro por data (dia atual e início da semana ISO).
- Filtros de missões — status e tipo:
  - UI: selects/controles para status e tipo.
  - Persistência simples em `prefs`.
  - Aplicação: lista de missões reflete seleção.
- Streak semanal:
  - Cálculo confiável com reset controlado.
  - Render no dashboard (texto i18n PT/EN).
- Métricas semanais:
  - Totais por categoria na semana + evolução 7 dias.
  - Degradação sem dados; sem erros no console.
- UI/UX e A11y:
  - Estados de foco/hover consistentes; tokens e componentes atualizados.
  - ARIA e navegação por teclado revisadas.
- Documentação:
  - README/DESIGN_GUIDE atualizados com novas seções e exemplos curtos.

## Preferências relevantes (prefs)

- Tema/densidade/idioma: `state.prefs.{theme,density,language}`.
- Filtros de atividades: `state.prefs.filters.activities.{category,interval}`.
  - `category`: string; default `all`.
  - `interval`: `today | week | all`; default `all` (normalização quando inválido).
- Filtros de missões (planejado): `state.prefs.filters.missions.{status,type}`.
  - `status`: `pending | done | all`.
  - `type`: `daily | weekly | all`.

## Janelas temporais e fórmulas

- Hoje: comparar apenas data local (YYYY-MM-DD) do timestamp ISO do item.
- Semana (ISO): início na segunda-feira 00:00 local; incluir até o momento atual.
- Totais semanais: somatório de duração/XP por categoria sobre janela semanal.
- Streak semanal: número de semanas consecutivas com pelo menos uma atividade na janela ISO; reset quando uma semana tem zero atividades.

## Pontos de integração no código

- `assets/scripts/main.js`:
  - `App.db.getState()`: normaliza `prefs` e filtros permitidos.
  - `App.db.setState()`: persiste alterações de `prefs`.
  - `App.ui.applyPrefs()`: aplica preferências (tema, densidade, idioma e filtros).
  - `App.ui.renderActivityFilters()`: popula categorias e define valores atuais dos selects `#activitiesFilterCategory` e `#activitiesFilterInterval`.
  - `App.ui.bind()`: listeners `change` dos filtros; atualiza `prefs` e chama `renderList()`.
  - `App.ui.renderList()`: aplica filtros encadeados (categoria + intervalo) antes de renderizar.
  - Seletores relevantes: `#activitiesFilterCategory`, `#activitiesFilterInterval`, `#itemsList`.

## Casos de borda

- Mudança de dia enquanto app aberto: filtro `today` deve se atualizar após reload; opcional hot-refresh.
- Virada de semana ISO: itens de domingo vs. segunda (respeitar segunda 00:00 local).
- DST/fusos: usar datas locais (YYYY-MM-DD) para `today`; semana baseada em início local.
- Itens sem timestamp/inválidos: ignorar com log discreto; não quebrar UI.
- Categorias futuras/sem itens: aparecer na lista de filtros? decidir por ocultar até existir item.
- Prefs ausentes/corrompidas: normalizar para `all`.
- LocalStorage cheio: fallback para memória, alert discreto (não bloquear fluxo).

## Plano de teste rápido (smoke)

- Criar 3 atividades (2 hoje, 1 com data de dias atrás) em categorias distintas.
- Verificar `category=all` e alternar categorias: lista e contagens mudam sem erros.
- Alternar `interval=today|week|all`: itens exibidos condizem com o período.
- Recarregar a página: filtros restaurados de `prefs` e UI sincronizada.
- Remover/editar item: filtros permanecem selecionados e métricas não quebram.

## Riscos e mitigações

- Cálculo de semana inconsistente: padronizar ISO (segunda) e cobrir com testes manuais.
- Timestamps mal formatados: validar/normalizar na inserção.
- Crescimento de itens degrada UI: limitar render, usar fragment/virtualização futura.
- Preferências quebradas após refactors: centralizar normalização em `db.getState()`.

## Critérios de aceite — resumo

- Filtros (categoria/intervalo) funcionam, persistem e restauram sem erros.
- QA de Missões/Streak/Métricas conforme checklists passa em ambiente local.
- Plano documentado com prefs, janelas temporais e pontos de integração atualizado.
- Zero states e degradação sem dados sem exceções no console.
