# Guia de Feature — Missões Diárias

## Objetivo

Registrar e acompanhar hábitos/atividades diárias de forma simples e gamificada, fornecendo XP ao concluir cada missão e reforçando o loop de progressão (nível/atributos).

## Escopo

- Incluído
  - Criar missão diária (título, categoria opcional, recompensa XP).
  - Listar missões do dia com status (pendente/concluída).
  - Concluir missão e aplicar XP ao usuário.
  - Persistir no `localStorage` via `App.db`.
  - Render mínimo no dashboard: contagem (ex.: 3/5) e lista simples.
- Temporariamente excluído
  - Missões semanais/repetitivas com cooldown.
  - Edição avançada, reordenação, notas ricas.
  - Notificações/alarme, streaks por missão.

## Modelo de Dados

- Chave principal de estado: `app:personal-leveling`
- Estrutura proposta (parcial):

```json
{
  "items": [],
  "missions": {
    "daily": [
      { "id": 1, "title": "Estudar 25m", "category": "estudo", "xp": 50, "done": false, "date": "2025-08-22" },
      { "id": 2, "title": "Treino 30m", "category": "saude", "xp": 60, "done": true,  "date": "2025-08-22" }
    ]
  },
  "stats": { "level": 1, "xp": 0 }
}
```

- Observações
  - Campo `date` em formato `YYYY-MM-DD` para segregar o dia.
  - `stats.level/xp` serão atualizados ao concluir missão (regra simples inicial).

## Fluxo

1. Usuário clica em “Concluir” em uma missão.
2. `App.db.getState()` lê estado atual.
3. Encontrar missão pelo `id` para o dia corrente, marcar `done = true`.
4. Somar `mission.xp` em `state.stats.xp` e recalcular nível básico.
5. `App.db.setState(state)` persiste mudanças.
6. `App.ui.renderList()` e `App.ui.renderMissions()` refletem alterações (contador e lista).

## UI/UX

- Dashboard (em `index.html`): card “Missões de Hoje” com:
  - Título, contador `X/Y`, lista simples das 3–5 primeiras missões.
  - Ação “Ir para Missões” (por ora âncora que rola para a seção ou placeholder).
- Acessibilidade
  - Botões com `aria-pressed` para estado concluído (se aplicável).
  - Foco visível; contraste conforme tokens.
- Feedback
  - Ao concluir, breve highlight/anim de progresso/XP.

## Pontos de Extensão

- `App.ui.renderMissions()` — render da seção de missões do dia.
- Funções utilitárias:
  - `getToday()` → `YYYY-MM-DD`.
  - `getDailyMissions(state, date)`.
  - `completeDailyMission(state, id, date)`.
  - `applyXP(state, amount)` + `recalcLevel(state)` (regra simples inicial).

## Testes Manuais

- Adicionar 2–3 missões e recarregar a página (persistência OK).
- Concluir missão, verificar contador `X/Y` e XP/nível atualizados.
- Garantir que missões de outro dia não apareçam na listagem atual.
- Limpar dados via botão “Limpar Dados (demo)” e validar reset.

## Riscos e Trade-offs

- Crescimento do estado único em `localStorage` → manter funções puras e módulos simples.
- Regras de XP/nível arbitrárias → começar simples e documentar calibragens futuras.
- Fuso horário/data local → `getToday()` simples; avaliar Intl/UTC no futuro.

## Notas de Implementação

- Iterar de forma incremental: primeiro leitura/lista, depois concluir+XP, por fim polimento visual.
- Evitar dependências externas; manter no namespace `App` e funções utilitárias isoladas.
