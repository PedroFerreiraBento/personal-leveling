# Guia de Feature — `<NOME-DA-FEATURE>`

## Objetivo

Descreva brevemente o problema que a feature resolve e o impacto esperado.

## Escopo

- O que está incluído
- O que está explícita e temporariamente excluído

## Modelo de Dados

- Estrutura no `App.db` afetada por esta feature (chaves, tipos, exemplo de JSON).

## Fluxo

- Eventos (cliques, atalhos, timers) -> mudanças de estado -> renderizações.
- Desenhe um diagrama simples ou liste os passos:
  1. Usuário clica em X
  2. Chamamos `App.db.algumaFuncao()`
  3. Estado Y é atualizado
  4. `App.ui.renderAlgo()` reflete a mudança

## UI/UX

- Layout, componentes, responsividade, acessibilidade.
- Mensagens de erro/feedback ao usuário.

## Pontos de Extensão

- Hooks, funções auxiliares ou módulos a serem criados/estendidos.

## Testes Manuais

- Casos mínimos a validar após implementar.

## Riscos e Trade-offs

- O que pode dar errado, planos de mitigação.

## Notas de Implementação

- Decisões específicas ("por que assim e não assado").
