# Plano Inicial do Projeto Web Estático

## Task List

- [x] Criar estrutura de diretórios do projeto (assets, data, docs, etc)
- [x] Criar arquivo index.html com esqueleto básico
- [x] Criar arquivo CSS principal em assets/styles/main.css
- [x] Criar arquivo JS principal em assets/scripts/main.js
- [x] Implementar camada de "banco local" usando localStorage e seed.json
- [x] Criar arquivo data/seed.json com dados iniciais
- [x] Criar documentação de arquitetura e template de features em docs/
- [x] Criar DIRETRIZ_DE_CODIGO.md na raiz do projeto
- [x] Criar arquivo .nojekyll para publicação estática
- [x] Criar arquivo de objetivos/descrição geral do projeto (docs/IDEIA_GERAL.md)
- [x] Criar diretrizes de design modernas inspiradas em RPG/anime (docs/DESIGN_GUIDE.md)
- [x] Mover e versionar plan.md dentro do projeto, referenciar seu uso em DIRETRIZ_DE_CODIGO.md

## Sprint 1 — Planejamento e Primeiras Entregas (MVP Base)

### Tarefas da Sprint

- [x] Revisar/ajustar `assets/styles/tokens.css` (cores, espaçamentos, tipografia) segundo `docs/DESIGN_GUIDE.md`.
- [x] Garantir importações e ordem em `assets/styles/main.css` e criar componentes necessários (buttons/layout/sidebar).
- [x] Validar `loadComponents()` em `assets/scripts/main.js` e mapear `header`, `sidebar`, `footer`.
- [x] Implementar `App.db` (namespace `app:`) com try/catch e logs claros (parcial já existente).
- [x] Criar módulo de `Activity` (funções em `App.ui`) para adicionar, editar e listar.
- [x] Implementar lógica simples de XP/nível (por atividade e por missão concluída).
- [x] Criar esqueleto de “Missões Diárias”: dados, render e mudança de status (slice inicial implementado).
- [x] Adicionar estatísticas básicas (placeholder funcional) no dashboard.
- [x] Criar doc inicial da feature “Missões Diárias” em `docs/features/` usando `docs/templates/FEATURE_GUIDE.md`.
- [x] Validação de acessibilidade mínima (semântica, foco, contraste).
- [x] Atualizar documentação impactada (`docs/DESIGN_GUIDE.md` seção Componentes e `docs/README.md` se aplicável).

### Backlog de Features Prioritárias (implementação direta)

- [ ] Streaks semanais (com resets controlados e highlight no dashboard). [parcial]: streak diário e heatmap mensal implementados.
- [x] Conquistas (trigger por contadores de atividades/missões, marcos de XP/nível).
- [x] Atributos/Status do personagem (força, mente, vitalidade) evoluindo com marcos.
- [ ] Categorias/Tags e filtros de missões. [parcial]: filtros de atividades por categoria implementados com persistência.
- [x] Edição/remoção de atividades (CRUD básico). Missões: pendente.
- [x] Importar/Exportar dados em JSON (backup/restauração local).
- [x] Preferências: tema e densidade (persistidas em `App.db`) e idioma (PT/EN) concluídos.
- [x] PWA básico (manifest + SW) concluído; pendente apenas PNGs 180/192/512.
- [ ] Métricas e estatísticas adicionais (parcial: tempo por categoria/dia e heatmap diário; pendente: gráficos adicionais/visões semanais).

### Próxima Sprint — Gamificação Básica e Polimento (atualizado)

- [x] Missões Semanais: estrutura simples (lista, status, recompensa XP) integrada a `App.db`.
- [x] Presets de Atividade: atalhos de registro rápido (ex.: 25m estudo, 10m leitura).
- [x] i18n/L10n: preferência de idioma (pt-BR/en), persistida em `state.prefs` e aplicada no UI.
- [x] Heatmap de Streak: visual diário no dashboard (calendário simples por mês).
- [x] Conquistas (MVP): desbloqueios básicos por contagem de atividades e streak.
- [x] Atributos (MVP): scaffold de atributos no `state.stats` e UI de leitura.
- [x] Documentação: atualizar `docs/DESIGN_GUIDE.md` (componentes), guias de atalhos e preferências.

Novos próximos passos desta sprint:

- [x] PWA: adicionar ícones PNG 180/192/512 nos caminhos esperados e validar instalabilidade (Android/iOS/desktop).
- [ ] UI: polimento de Material Symbols (tamanhos/align) e alternância visual inicial conforme preferências.
- [ ] QA: checklist de PWA/i18n/achievements/atributos completo em múltiplos navegadores.

### Deployment Checklist

- [ ] SW ativo no ambiente publicado (DevTools → Application → Service Workers)
- [ ] Manifest carrega sem erros (ícones PNG pendentes não bloqueiam)
- [ ] i18n alterna PT/EN corretamente
- [ ] Lista/filtros e métricas básicas sem erros no console


## Feature — Autenticação (Login/Cadastro)

Detalhes completos: ver `docs/features/auth.md`.

### Tarefas (checkboxes)

- [x] UI de autenticação em `index.html` (login/cadastro)
- [x] Mover app para `app.html` (raiz) e ajustar imports/paths
- [x] Módulo `App.auth` em `assets/scripts/auth.js` (hash/sessão/CRUD usuários)
- [x] Proteger `app.html` com `requireAuth()`
- [x] Logout via `#logoutBtn` no header
- [ ] i18n para labels/placeholders/mensagens (PT/EN)
- [x] Estilos dedicados `assets/styles/auth.css`
- [ ] README: limitações de segurança de auth client-side

## Sprint 2 — Foco em Polimento e Métricas (proposto)

Detalhes completos: ver `docs/features/filters-metrics.md`.

### Tarefas — Sprint 2 (atualizado)

- [x] Filtros de atividades: por categoria (persistência em prefs/App.db).
- [x] Filtros de atividades: intervalo (hoje/semana/todas) com persistência em prefs/App.db.
- [x] Filtros de missões: status (pendente/concluída) e tipo (diária/semanal).
- [x] Cálculo e render do streak semanal (novo contêiner no dashboard).
- [x] Métricas semanais: totais por categoria na semana; evolução 7 dias.
- [ ] UI/UX: revisão de ícones Material e estados de foco/hover (consistência com `buttons.css`).
- [ ] A11y: aria-label/pressed nos toggles, ordem de tab, revisão de contraste.
- [ ] Docs: adicionar seção curta de filtros/métricas e exemplos.
