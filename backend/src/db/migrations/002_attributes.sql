-- Attributes schema and seed
-- PostgreSQL migration 002

-- Table: attributes
CREATE TABLE IF NOT EXISTS attributes (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(48) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_attributes_user_name UNIQUE (user_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attributes_user_created ON attributes(user_id, created_at DESC);

-- Seed default attributes only for the bootstrap user (idempotent)
DO $do$
DECLARE
  bootstrap_id text := md5('bootstrap_user_v1');
BEGIN
  INSERT INTO attributes (id, user_id, name, description)
  VALUES (md5(bootstrap_id || ':Vitalidade'), bootstrap_id, 'Vitalidade', $$
  - Definição: energia física e saúde geral (sono, nutrição, movimento).
  - Exemplos (+): treino, caminhada/corrida, sono adequado, refeições balanceadas.
  - Exemplos (–): sedentarismo prolongado, noites mal dormidas, junk food excessivo.
  - Notas: pode usar submétricas (minutos de atividade física, passos, horas de sono) como base de pontuação.
  $$)
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO attributes (id, user_id, name, description)
  VALUES (md5(bootstrap_id || ':Clareza'), bootstrap_id, 'Clareza', $$
  - Definição: atenção, foco e presença (mindfulness/concentração).
  - Exemplos (+): sessões de foco profundo, meditação, planejamento claro do dia.
  - Exemplos (–): multitarefa caótica prolongada, ruminação, distrações excessivas.
  - Notas: útil para relacionar a sessões cronometreadas de foco (ex.: Pomodoro).
  $$)
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO attributes (id, user_id, name, description)
  VALUES (md5(bootstrap_id || ':Conhecimento'), bootstrap_id, 'Conhecimento', $$
  - Definição: aquisição de teoria/informação estruturada (estudo/leitura/cursos).
  - Exemplos (+): leitura técnica, aulas/cursos, estudos dirigidos, anotações.
  - Exemplos (–): consumo raso e disperso sem retenção (scrolling improdutivo).
  - Notas: pontuar por tempo e/ou módulos concluídos, com bônus por revisão/recall.
  $$)
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO attributes (id, user_id, name, description)
  VALUES (md5(bootstrap_id || ':Habilidade'), bootstrap_id, 'Habilidade', $$
  - Definição: prática aplicada e domínio operacional (projetos, exercícios práticos).
  - Exemplos (+): construir projetos, praticar exercícios aplicados, protótipos.
  - Exemplos (–): evitar prática essencial por longos períodos.
  - Notas: diferenciar de Conhecimento pelo “fazer”. Pode usar entregas/commits como proxy.
  $$)
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO attributes (id, user_id, name, description)
  VALUES (md5(bootstrap_id || ':Entrega'), bootstrap_id, 'Entrega', $$
  - Definição: geração de valor tangível (trabalho concluído, resultados, vendas, publicações).
  - Exemplos (+): fechar tarefa/feature, publicar artigo, realizar venda.
  - Exemplos (–): procrastinação crítica que posterga entregas-chave.
  - Notas: pontuar por marcos/outputs, não apenas tempo. Possível peso extra por impacto.
  $$)
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO attributes (id, user_id, name, description)
  VALUES (md5(bootstrap_id || ':Finanças'), bootstrap_id, 'Finanças', $$
  - Definição: saúde financeira (hábitos, reservas, investimentos, dívida).
  - Exemplos (+): poupança do mês, aporte em investimento, quitar dívida.
  - Exemplos (–): gastos impulsivos, romper orçamento, contrair dívidas ruins.
  - Notas: aceitar valores absolutos ou percentuais, com penalidades para excessos.
  $$)
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO attributes (id, user_id, name, description)
  VALUES (md5(bootstrap_id || ':Relações'), bootstrap_id, 'Relações', $$
  - Definição: qualidade/amplitude de vínculos (família, amigos, networking, romântico).
  - Exemplos (+): encontros significativos, ajuda/mentoria, networking intencional.
  - Exemplos (–): isolamento prolongado, conflitos recorrentes não tratados.
  - Notas: priorizar qualidade/consistência vs. quantidade pura.
  $$)
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO attributes (id, user_id, name, description)
  VALUES (md5(bootstrap_id || ':Resiliência'), bootstrap_id, 'Resiliência', $$
  - Definição: regulação emocional e capacidade de recuperação frente a estresse.
  - Exemplos (+): práticas de autocuidado, terapia, diários/reflexões, esportes leves.
  - Exemplos (–): explosões emocionais frequentes, manejo inadequado de estresse.
  - Notas: complementar a Clareza; foca no “voltar ao baseline”.
  $$)
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO attributes (id, user_id, name, description)
  VALUES (md5(bootstrap_id || ':Disciplina'), bootstrap_id, 'Disciplina', $$
  - Definição: consistência de hábitos e aderência a rotinas/planos.
  - Exemplos (+): cumprir rotina, manter streaks, concluir hábitos-chave.
  - Exemplos (–): quebras recorrentes em hábitos críticos, atrasos crônicos.
  - Notas: aceita mecanismos de streak/decay (ver diretrizes de pontuação).
  $$)
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO attributes (id, user_id, name, description)
  VALUES (md5(bootstrap_id || ':Criatividade'), bootstrap_id, 'Criatividade', $$
  - Definição: ideação, experimentação e síntese original.
  - Exemplos (+): brainstorming, protótipos criativos, artes, soluções originais.
  - Exemplos (–): bloqueio criativo prolongado sem esforços de desbloqueio.
  - Notas: premiar variedade e finalização de experimentos (não só ideação).
  $$)
  ON CONFLICT (user_id, name) DO NOTHING;

END $do$;
