# Ideia Geral — Personal Leveling

## Visão

Transformar produtividade pessoal/profissional/acadêmica em uma jornada envolvente, mensurável e competitiva, usando mecânicas inspiradas em RPGs modernos para manter motivação contínua.

## Objetivos

- Tornar o gerenciamento de tempo e hábitos mais atraente por meio de gamificação.
- Permitir o registro simples e preciso do uso do tempo.
- Oferecer métricas claras (progresso/regresso) para tomada de decisões.
- Criar senso de progressão (níveis, estatísticas, conquistas) e competição saudável (comparação de progresso).
- Manter o usuário engajado a longo prazo com loops de feedback positivos (missões, streaks, combates).

## Descrição

Aplicação web estática (HTML/CSS/JS) que roda no navegador. Dados locais via `localStorage` (com possibilidade futura de sincronização/remoto). O usuário planeja, executa e registra atividades; o sistema converte essas ações em progresso de personagem (níveis, atributos) e desbloqueios. A experiência visual busca referências de estética high-tech/neon, inspirado em "Solo Leveling", com UI responsiva e fluida.

## Público-alvo

- Estudantes, profissionais, autodidatas e pessoas buscando estruturar rotinas e metas.
- Usuários motivados por progressão visível, recompensas e comparação de desempenho.

## Métricas de Sucesso (indicativas)

- Retenção semanal/mensal (DAU/WAU/MAU — em estágio local, proxys: streaks, número de sessões).
- Taxa de conclusão de missões diárias/semanais.
- Evolução de tempo útil registrado vs. total planejado.
- Progressão de nível/atributos ao longo do tempo.

## Funcionalidades Principais (fase inicial)

- Registro de tempo e atividades (manual e por presets).
- Planejamento simples (tarefas/missões diárias e semanais).
- Feedback visual de progresso (lista, cartões, barras, badges).
- Sistema de níveis e XP atrelado a metas e hábitos.
- Estatísticas básicas (tempo por categoria, histórico de execução).

## Funcionalidades de Gamificação (progressivas)

- Atributos (FOR, INT, VIT, AGI, WIS — nomes a definir) mapeando áreas de desempenho.
- Conquistas e títulos (milestones, streaks, metas específicas).
- Missões:
  - Diárias (habituais), semanais, repetitivas (infinite repeatables com cooldown).
- Combate motivacional:
  - PvE contra "mobs" internos que escalam em dificuldade conforme vitórias.
  - Opcional PvP assíncrono baseado em índices (comparações de performance).
- Rank/Leaderboard (futuro, quando houver sincronização entre usuários).

## Modelo de Dados (alto nível – rascunho)
- `User` (perfil, preferências, tema)
- `Activity` (id, título, categoria, duração, timestamp)
- `Task` (id, tipo: diária/semanal/repetitiva, status, recompensa XP)
- `Stats` (atributos, XP atual, nível atual, modificadores)
  - Atributos revisados (ver seção abaixo): `vitalidade`, `clareza`, `conhecimento`, `habilidade`, `entrega`, `financas`, `relacoes`, `resiliencia`, `disciplina`, `criatividade`.
- `Achievements` (id, nome, descrição, data desbloqueio)
- `Combat` (inimigo atual, nível do mob, multiplicadores, histórico)

> Detalhes serão definidos por feature com `docs/templates/FEATURE_GUIDE.md`.

## Atributos (modelo revisado para desenvolvimento pessoal)

Objetivo: medir progresso cumulativo, com reforço leve de gamificação, permitindo impactos positivos e negativos. Cada atributo evolui a partir de atividades registradas e pode sofrer redução por atividades nocivas ou pela falta de consistência (quando aplicável).

- __Vitalidade__
  - Definição: energia física e saúde geral (sono, nutrição, movimento).
  - Exemplos (+): treino, caminhada/corrida, sono adequado, refeições balanceadas.
  - Exemplos (–): sedentarismo prolongado, noites mal dormidas, junk food excessivo.
  - Notas: pode usar submétricas (minutos de atividade física, passos, horas de sono) como base de pontuação.

- __Clareza__
  - Definição: atenção, foco e presença (mindfulness/concentração).
  - Exemplos (+): sessões de foco profundo, meditação, planejamento claro do dia.
  - Exemplos (–): multitarefa caótica prolongada, ruminação, distrações excessivas.
  - Notas: útil para relacionar a sessões cronometreadas de foco (ex.: Pomodoro).

- __Conhecimento__
  - Definição: aquisição de teoria/informação estruturada (estudo/leitura/cursos).
  - Exemplos (+): leitura técnica, aulas/cursos, estudos dirigidos, anotações.
  - Exemplos (–): consumo raso e disperso sem retenção (scrolling improdutivo).
  - Notas: pontuar por tempo e/ou módulos concluídos, com bônus por revisão/recall.

- __Habilidade__
  - Definição: prática aplicada e domínio operacional (projetos, exercícios práticos).
  - Exemplos (+): construir projetos, praticar exercícios aplicados, protótipos.
  - Exemplos (–): evitar prática essencial por longos períodos.
  - Notas: diferenciar de Conhecimento pelo “fazer”. Pode usar entregas/commits como proxy.

- __Entrega__
  - Definição: geração de valor tangível (trabalho concluído, resultados, vendas, publicações).
  - Exemplos (+): fechar tarefa/feature, publicar artigo, realizar venda.
  - Exemplos (–): procrastinação crítica que posterga entregas-chave.
  - Notas: pontuar por marcos/outputs, não apenas tempo. Possível peso extra por impacto.

- __Finanças__
  - Definição: saúde financeira (hábitos, reservas, investimentos, dívida).
  - Exemplos (+): poupança do mês, aporte em investimento, quitar dívida.
  - Exemplos (–): gastos impulsivos, romper orçamento, contrair dívidas ruins.
  - Notas: aceitar valores absolutos ou percentuais, com penalidades para excessos.

- __Relações__
  - Definição: qualidade/amplitude de vínculos (família, amigos, networking, romântico).
  - Exemplos (+): encontros significativos, ajuda/mentoria, networking intencional.
  - Exemplos (–): isolamento prolongado, conflitos recorrentes não tratados.
  - Notas: priorizar qualidade/consistência vs. quantidade pura.

- __Resiliência__
  - Definição: regulação emocional e capacidade de recuperação frente a estresse.
  - Exemplos (+): práticas de autocuidado, terapia, diários/reflexões, esportes leves.
  - Exemplos (–): explosões emocionais frequentes, manejo inadequado de estresse.
  - Notas: complementar a Clareza; foca no “voltar ao baseline”.

- __Disciplina__
  - Definição: consistência de hábitos e aderência a rotinas/planos.
  - Exemplos (+): cumprir rotina, manter streaks, concluir hábitos-chave.
  - Exemplos (–): quebras recorrentes em hábitos críticos, atrasos crônicos.
  - Notas: aceita mecanismos de streak/decay (ver diretrizes de pontuação).

- __Criatividade__
  - Definição: ideação, experimentação e síntese original.
  - Exemplos (+): brainstorming, protótipos criativos, artes, soluções originais.
  - Exemplos (–): bloqueio criativo prolongado sem esforços de desbloqueio.
  - Notas: premiar variedade e finalização de experimentos (não só ideação).

### Diretrizes de mapeamento e pontuação

- __Mapeamento__: cada `Activity` pode afetar múltiplos atributos com pesos. Ex.: “Caminhada 30m” → Vitalidade (+1.0 por 30m) e Resiliência (+0.3).
- __Unidades__: usar tempo (minutos) ou eventos (concluído/não) e converter para pontos por atributo via função simples.
- __Bônus__: marcos (ex.: curso concluído, projeto publicado) podem dar bônus fixos à `Entrega`/`Habilidade`/`Conhecimento`.
- __Penalidades__: atividades negativas lançam valores negativos (ex.: “Gasto impulsivo alto” → Finanças –2.0; “Dormir tarde 2x” → Vitalidade –1.0; “Procrastinação crítica” → Entrega –1.5/Disciplina –1.0).
- __Decay (opcional)__: para atributos que dependem de consistência (Disciplina, Clareza, Vitalidade), aplicar decaimento leve por dia/semana sem atividade relevante.
- __Normalização__: manter escala comparável (ex.: –3 a +3 por evento; ou pontos por hora com teto diário). Evitar inflar indiscriminadamente.

> Implementação: começar com pesos simples por categoria e duração, evoluindo para regras específicas por preset (ex.: cada preset define quais atributos afeta e com quais pesos). Documentar a regra da feature em `docs/features/`.

## Sistema de Progressão em Duas Camadas (Numérica + Categórica)

Objetivo: dar variedade e motivação contínua sem tornar o progresso infinito e entediante. Cada atributo tem:

- __Pontuação numérica local (0–10)__: barra de progresso dentro do nível atual.
- __Tier categórico com subtier__: sequência longa de categorias com subdivisões para trocas frequentes.

### Estrutura de Tiers (por atributo)

Sugestão (lista extensa para progresso de anos):

- Iniciado
- Aprendiz
- Neófito
- Adepto
- Discípulo
- Praticante
- Competente
- Proficiente
- Especialista
- Experiente
- Veterano
- Exímio
- Notável
- Distinto
- Eminente
- Virtuoso
- Mestre
- Grão‑Mestre
- Excelso
- Ilustre
- Magistral
- Soberano
- Guardião
- Campeão
- Vanguarda
- Ascendente
- Transcendente
- Mítico
- Lendário
- Épico
- Supremo
- Primordial
- Arcano
- Celestial
- Estelar
- Cósmico
- Eterno
- Ancestral
- Oracular
- Originário
- Arquiteto
- Forjador
- Dominador
- Conquistador
- Regente
- Imperador
- Suserano
- Monarca
- Sagrado
- Divino
- Semideus
- Deidade
- Deus
- Deus‑Rei
- Deus‑Imperador
- Deus Supremo
- Avatar
- Entidade
- Primogênito
- Alfa
- Ômega
- Exemplar
- Apoteótico
- Apogeu

> Observação: usar subtier (V, IV, III, II, I) aumenta a variedade. A lista pode ser ajustada por tema sem mudar o mecanismo.

### Métrica por trás da barra 0–10

- Cada tier `k` exige `Tk` pontos de ranking (RP) para ser concluído.
- A barra 0–10 representa `RP_atual / (Tk/10)` no tier atual.
- Ao encher 10/10, sobe para o próximo subtier/tier e a barra reinicia em 0/10.

### Cálculo de RP (Ranking Points)

- De cada `Activity`, obtemos pontos por atributo conforme mapeamento de pesos (ver seção de atributos).
- Converter pontos do atributo → RP com um multiplicador por atributo: `RP = base_points × peso_atributo × mod_streak × mod_dificuldade`.
- __Anti-grind universal (justo para todos)__:
  - Defina por atributo um __cap diário global__ em “unidades padrão” (ex.: minutos de foco, km caminhados, tarefas concluídas): `S_attr`.
  - Pontuação por dia (por atributo):
    - Até `S_attr`: 100% de crédito (×1.0).
    - De `S_attr` até `2×S_attr`: 50% de crédito (×0.5).
    - Acima de `2×S_attr`: 10% de crédito (×0.1).
  - __Cap semanal global__ (rolling 7 dias): crédito total equivalente limitado a `7×S_attr` com mesmas faixas (evita maratonas semanais).
  - Esses caps são __idênticos para todos os usuários__, garantindo comparabilidade e competitividade em leaderboards.
- __Negativos__: atividades nocivas geram `RP` negativo (podem reduzir a barra atual e, se exceder, provocar rebaixamento com proteção; ver abaixo).

### Curva de Progressão (pacing)

- __Meta estável__: ~7 dias por subtier para qualquer usuário que atinja o cap diário global médio.
- __Threshold fixo por subtier__ (`Tk`):
  - Defina um alvo diário global por atributo em RP: `D_attr = pontos_por_unidade × S_attr` (100% crédito da primeira faixa), padronizado para todos.
  - `Tk = clamp(D_attr × 7, Tmin, Tmax)` com valores sugeridos `Tmin = 80 RP`, `Tmax = 160 RP` (iguais para todos; podem variar por atributo, mas não por usuário).
- __Ramp-up suave por macro-faixa__:
  - A cada 8 tiers nominais, `Tk ← Tk × (1 + 0.08)`, cumulativo até +40% no máximo.
  - Mantém a sensação de progressão longa sem punir excessivamente.
- __Ritmo esperado__:
  - Subtier: ~1 semana se o usuário atinge ~`D_attr`/dia na primeira faixa do cap.
  - Tier (3 subtier): ~3 semanas.
  - 64 tiers × 3 subtier (exemplo): anos, com trocas frequentes.

> Competitividade: como `Tk`, `S_attr` e a função de crédito são iguais para todos, o delta de RP diário após caps é diretamente comparável entre usuários. Leaderboards podem usar RP semanal/mensal padronizado.

### Rebaixamento (Demotion) com Proteção

- __Proteção de recém‑promoção__: 7 dias sem rebaixar após subir de subtier/tier.
- Após proteção, `RP` negativo pode reduzir a barra. Se a barra ficar < 0, rebaixa para o subtier anterior com barra em 9/10.
- Opcional: `decay` leve por inatividade para atributos dependentes de consistência (Disciplina, Clareza, Vitalidade) – ex.: −0.5/10 por semana sem atividade relevante, sem passar 0 do subtier (não força demotion sozinho).

### Adaptação por Atributo

- __Vitalidade/Disciplina/Clareza__: limites diários menores, bônus de streak maiores; pequeno decay opcional.
- __Conhecimento/Habilidade__: peso maior para marcos (módulos/projetos concluídos) e menor para tempo bruto.
- __Entrega__: foco em outputs; maior `T0` para evitar inflar por micro‑entregas.
- __Finanças__: considerar magnitude da ação (percentual da renda, ticket), tetos para não desbalancear por eventos raros.
- __Relações/Resiliência/Criatividade__: premiar consistência + variedade; bônus por eventos significativos.

### UI/UX

- Exibição curta: `Disciplina: Prata II — 5/10` com barra e micro‑texto “+0.8 hoje”.
- Tooltip/detalhe: mostra `RP` atual do subtier (`ex.: 53/100 RP`), streak e últimos impactos positivos/negativos.
- Animações discretas ao subir subtier; destaque maior em mudanças de tier.

### Parâmetros (valores iniciais sugeridos)

- `T0 = 100 RP`, `r = 1.35` para subtier consecutivos.
- Limite diário suave por atributo: 2–3 “unidades padrão”/dia antes de redução.
- Proteção de promoção: 7 dias.
- Decay opcional (por atributo): até −0.5/10 por semana sem atividade relevante.

> Implementação v1: manter todos os atributos com os mesmos parâmetros, exceto limites diários. Em v2, calibrar por distribuição de uso real.

## Roadmap (indicativo)
1. MVP: registro de atividades, XP e níveis, missões diárias, estatísticas básicas.
2. Gamificação estendida: atributos, conquistas, streaks, missões semanais.
3. Combate PvE: mobs escalantes, recompensas especiais.
4. Socialização: comparação anônima/consentida, leaderboards (depende de backend/sync futuro).

## Riscos e Mitigações
- Complexidade crescente → modularidade por feature e entregas incrementais.
- Desmotivação por metas irreais → calibração de XP/níveis e missões gradativas.
- Privacidade de dados → por padrão local; social apenas com consentimento e dados mínimos.

## Não-Objetivos (por ora)
- Backend/autenticação multiusuário nativo.
- Integrações complexas de calendário/terceiros.
- Gamificação excessivamente punitiva (evitar frustração).
