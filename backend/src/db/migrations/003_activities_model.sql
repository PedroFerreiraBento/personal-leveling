-- Activities domain revamp: normalized schema to support full form structure
-- This migration replaces the old simplistic activities table from 001_init.sql
-- Safe to run multiple times due to IF EXISTS/IF NOT EXISTS guards

-- 1) Base entity: activity definitions (templates/configs)
CREATE TABLE IF NOT EXISTS activities (
  id              VARCHAR(255) PRIMARY KEY,
  user_id         VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           VARCHAR(500) NOT NULL,
  short_description VARCHAR(120),
  category_id     VARCHAR(255) REFERENCES categories(id) ON DELETE SET NULL,
  polarity        VARCHAR(16) NOT NULL CHECK (polarity IN ('positive','neutral','negative')),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_activities_user_title UNIQUE (user_id, title)
);
CREATE INDEX IF NOT EXISTS idx_activities_user_created ON activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category_id);

-- 2) Attributes distribution configuration
-- One row per activity describing the model (weights or percent)
CREATE TABLE IF NOT EXISTS activity_attribute_entries (
  id           VARCHAR(255) PRIMARY KEY,
  activity_id  VARCHAR(255) NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  attribute_id VARCHAR(255) NOT NULL REFERENCES attributes(id) ON DELETE RESTRICT,
  value        NUMERIC,
  polarity     VARCHAR(16) NOT NULL DEFAULT 'positive' CHECK (polarity IN ('positive','neutral','negative')),
  model        VARCHAR(16) NOT NULL CHECK (model IN ('weights','percent')),
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_attr_entry UNIQUE (activity_id, attribute_id)
);
CREATE INDEX IF NOT EXISTS idx_attr_entries_activity ON activity_attribute_entries(activity_id);
CREATE INDEX IF NOT EXISTS idx_attr_entries_attribute ON activity_attribute_entries(attribute_id);

-- 3) Measures (base inputs recorded for the activity)
CREATE TABLE IF NOT EXISTS activity_measures (
  id             VARCHAR(255) PRIMARY KEY,
  activity_id    VARCHAR(255) NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  key            VARCHAR(64) NOT NULL,
  label          VARCHAR(120) NOT NULL,
  unit           VARCHAR(32) NOT NULL DEFAULT 'custom',
  decimals       SMALLINT NOT NULL DEFAULT 0 CHECK (decimals BETWEEN 0 AND 3),
  min_per_entry  NUMERIC,
  max_per_entry  NUMERIC,
  step           NUMERIC,
  default_value  NUMERIC,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_measure_key UNIQUE (activity_id, key)
);
CREATE INDEX IF NOT EXISTS idx_measures_activity ON activity_measures(activity_id);

-- 5) Derived measures (computed from base/other derived measures)
CREATE TABLE IF NOT EXISTS activity_derived_measures (
  id           VARCHAR(255) PRIMARY KEY,
  activity_id  VARCHAR(255) NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  key          VARCHAR(64) NOT NULL,
  label        VARCHAR(120) NOT NULL,
  formula      TEXT NOT NULL,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_derived_key UNIQUE (activity_id, key)
);
CREATE INDEX IF NOT EXISTS idx_derived_measures_activity ON activity_derived_measures(activity_id);

-- 6) Scoring configuration (one per activity)
CREATE TABLE IF NOT EXISTS activity_scoring (
  activity_id    VARCHAR(255) PRIMARY KEY REFERENCES activities(id) ON DELETE CASCADE,
  mode           VARCHAR(16) NOT NULL CHECK (mode IN ('simple','linear','formula')),
  rounding       VARCHAR(16) NOT NULL DEFAULT 'none' CHECK (rounding IN ('none','floor','ceil','nearest')),
  precision      SMALLINT NOT NULL DEFAULT 0 CHECK (precision BETWEEN 0 AND 3),
  allow_negative BOOLEAN NOT NULL DEFAULT TRUE,
  base_points    NUMERIC
);

-- Simple mode extras
CREATE TABLE IF NOT EXISTS activity_scoring_simple (
  activity_id     VARCHAR(255) PRIMARY KEY REFERENCES activities(id) ON DELETE CASCADE,
  measure_ref     VARCHAR(64) NOT NULL,
  points_per_unit NUMERIC
);

-- Linear mode terms (many per activity)
CREATE TABLE IF NOT EXISTS activity_scoring_linear_terms (
  id             VARCHAR(255) PRIMARY KEY,
  activity_id    VARCHAR(255) NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  measure_ref    VARCHAR(64) NOT NULL,
  points_per_unit NUMERIC,
  cap_units      NUMERIC
);
CREATE INDEX IF NOT EXISTS idx_scoring_linear_activity ON activity_scoring_linear_terms(activity_id);

-- Formula mode extras
CREATE TABLE IF NOT EXISTS activity_scoring_formula (
  activity_id  VARCHAR(255) PRIMARY KEY REFERENCES activities(id) ON DELETE CASCADE,
  expression   TEXT NOT NULL,
  clamp_min    NUMERIC,
  clamp_max    NUMERIC
);

-- 7) Optional views or helpers can be added later for reporting


-- 8) Seed: example Activities only for the bootstrap user (idempotent)
-- Uses deterministic IDs with md5(user_id || ':' || title)
DO $$
DECLARE
  bootstrap_id text := md5('bootstrap_user_v1');
BEGIN
  -- Activity 1: Corrida
  INSERT INTO activities (id, user_id, title, short_description, category_id, polarity)
  VALUES (md5(bootstrap_id || ':Corrida'), bootstrap_id, 'Corrida', 'Corrida ao ar livre ou esteira', md5(bootstrap_id || ':Movimento'), 'positive')
  ON CONFLICT (user_id, title) DO NOTHING;

  -- Measures
  INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals)
  VALUES (md5(bootstrap_id || ':Corrida:distance'), md5(bootstrap_id || ':Corrida'), 'distance', 'Distância', 'km', 2)
  ON CONFLICT DO NOTHING;
  INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals)
  VALUES (md5(bootstrap_id || ':Corrida:time'), md5(bootstrap_id || ':Corrida'), 'time', 'Tempo', 'min', 0)
  ON CONFLICT DO NOTHING;

  -- Scoring (linear: 1*distance + 0.05*time)
  INSERT INTO activity_scoring (activity_id, mode, rounding, precision, allow_negative, base_points)
  VALUES (md5(bootstrap_id || ':Corrida'), 'linear', 'none', 0, TRUE, NULL)
  ON CONFLICT (activity_id) DO NOTHING;
  INSERT INTO activity_scoring_linear_terms (id, activity_id, measure_ref, points_per_unit, cap_units)
  VALUES (md5(bootstrap_id || ':Corrida:term:distance'), md5(bootstrap_id || ':Corrida'), 'distance', 1.0, NULL)
  ON CONFLICT DO NOTHING;
  INSERT INTO activity_scoring_linear_terms (id, activity_id, measure_ref, points_per_unit, cap_units)
  VALUES (md5(bootstrap_id || ':Corrida:term:time'), md5(bootstrap_id || ':Corrida'), 'time', 0.05, NULL)
  ON CONFLICT DO NOTHING;

  -- Attribute distribution (percent)
  INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
  VALUES (md5(bootstrap_id || ':Corrida:Vitalidade'), md5(bootstrap_id || ':Corrida'), md5(bootstrap_id || ':Vitalidade'), 70, 'positive', 'percent')
  ON CONFLICT DO NOTHING;
  INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
  VALUES (md5(bootstrap_id || ':Corrida:Disciplina'), md5(bootstrap_id || ':Corrida'), md5(bootstrap_id || ':Disciplina'), 30, 'positive', 'percent')
  ON CONFLICT DO NOTHING;

  -- Activity 2: Caminhada
  INSERT INTO activities (id, user_id, title, short_description, category_id, polarity)
  VALUES (md5(bootstrap_id || ':Caminhada'), bootstrap_id, 'Caminhada', 'Passos/quilometragem leve', md5(bootstrap_id || ':Movimento'), 'positive')
  ON CONFLICT (user_id, title) DO NOTHING;
  INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals)
  VALUES (md5(bootstrap_id || ':Caminhada:distance'), md5(bootstrap_id || ':Caminhada'), 'distance', 'Distância', 'km', 2)
  ON CONFLICT DO NOTHING;
  INSERT INTO activity_scoring (activity_id, mode, rounding, precision, allow_negative, base_points)
  VALUES (md5(bootstrap_id || ':Caminhada'), 'simple', 'none', 0, TRUE, NULL)
  ON CONFLICT (activity_id) DO NOTHING;
  INSERT INTO activity_scoring_simple (activity_id, measure_ref, points_per_unit)
  VALUES (md5(bootstrap_id || ':Caminhada'), 'distance', 0.6)
  ON CONFLICT (activity_id) DO NOTHING;
  INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
  VALUES (md5(bootstrap_id || ':Caminhada:Vitalidade'), md5(bootstrap_id || ':Caminhada'), md5(bootstrap_id || ':Vitalidade'), 60, 'positive', 'percent')
  ON CONFLICT DO NOTHING;
  INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
  VALUES (md5(bootstrap_id || ':Caminhada:Resiliencia'), md5(bootstrap_id || ':Caminhada'), md5(bootstrap_id || ':Resiliência'), 40, 'positive', 'percent')
  ON CONFLICT DO NOTHING;

  -- Activity 3: Foco Profundo
  INSERT INTO activities (id, user_id, title, short_description, category_id, polarity)
  VALUES (md5(bootstrap_id || ':Foco Profundo'), bootstrap_id, 'Foco Profundo', 'Sessão de concentração sem distrações', md5(bootstrap_id || ':Foco'), 'positive')
  ON CONFLICT (user_id, title) DO NOTHING;
  INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals)
  VALUES (md5(bootstrap_id || ':Foco Profundo:minutes'), md5(bootstrap_id || ':Foco Profundo'), 'minutes', 'Minutos', 'min', 0)
  ON CONFLICT DO NOTHING;
  INSERT INTO activity_scoring (activity_id, mode, rounding, precision, allow_negative, base_points)
  VALUES (md5(bootstrap_id || ':Foco Profundo'), 'simple', 'none', 0, TRUE, NULL)
  ON CONFLICT (activity_id) DO NOTHING;
  INSERT INTO activity_scoring_simple (activity_id, measure_ref, points_per_unit)
  VALUES (md5(bootstrap_id || ':Foco Profundo'), 'minutes', 0.02)
  ON CONFLICT (activity_id) DO NOTHING;
  INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
  VALUES (md5(bootstrap_id || ':Foco Profundo:Clareza'), md5(bootstrap_id || ':Foco Profundo'), md5(bootstrap_id || ':Clareza'), 70, 'positive', 'percent')
  ON CONFLICT DO NOTHING;
  INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
  VALUES (md5(bootstrap_id || ':Foco Profundo:Disciplina'), md5(bootstrap_id || ':Foco Profundo'), md5(bootstrap_id || ':Disciplina'), 30, 'positive', 'percent')
  ON CONFLICT DO NOTHING;

  -- Activity 4: Meditação
  INSERT INTO activities (id, user_id, title, short_description, category_id, polarity)
  VALUES (md5(bootstrap_id || ':Meditação'), bootstrap_id, 'Meditação', 'Respiração/atenção plena', md5(bootstrap_id || ':Descanso'), 'positive')
  ON CONFLICT (user_id, title) DO NOTHING;
  INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals)
  VALUES (md5(bootstrap_id || ':Meditação:minutes'), md5(bootstrap_id || ':Meditação'), 'minutes', 'Minutos', 'min', 0)
  ON CONFLICT DO NOTHING;
  INSERT INTO activity_scoring (activity_id, mode, rounding, precision, allow_negative, base_points)
  VALUES (md5(bootstrap_id || ':Meditação'), 'simple', 'none', 0, TRUE, NULL)
  ON CONFLICT (activity_id) DO NOTHING;
  INSERT INTO activity_scoring_simple (activity_id, measure_ref, points_per_unit)
  VALUES (md5(bootstrap_id || ':Meditação'), 'minutes', 0.03)
  ON CONFLICT (activity_id) DO NOTHING;
  INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
  VALUES (md5(bootstrap_id || ':Meditação:Resiliencia'), md5(bootstrap_id || ':Meditação'), md5(bootstrap_id || ':Resiliência'), 60, 'positive', 'percent')
  ON CONFLICT DO NOTHING;
  INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
  VALUES (md5(bootstrap_id || ':Meditação:Clareza'), md5(bootstrap_id || ':Meditação'), md5(bootstrap_id || ':Clareza'), 40, 'positive', 'percent')
  ON CONFLICT DO NOTHING;

  -- Activity 5: Leitura Técnica
  INSERT INTO activities (id, user_id, title, short_description, category_id, polarity)
  VALUES (md5(bootstrap_id || ':Leitura Técnica'), bootstrap_id, 'Leitura Técnica', 'Estudos e leituras estruturadas', md5(bootstrap_id || ':Estudo'), 'positive')
  ON CONFLICT (user_id, title) DO NOTHING;
  INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals)
  VALUES (md5(bootstrap_id || ':Leitura Técnica:pages'), md5(bootstrap_id || ':Leitura Técnica'), 'pages', 'Páginas', 'pg', 0)
  ON CONFLICT DO NOTHING;
  INSERT INTO activity_scoring (activity_id, mode, rounding, precision, allow_negative, base_points)
  VALUES (md5(bootstrap_id || ':Leitura Técnica'), 'simple', 'none', 0, TRUE, NULL)
  ON CONFLICT (activity_id) DO NOTHING;
  INSERT INTO activity_scoring_simple (activity_id, measure_ref, points_per_unit)
  VALUES (md5(bootstrap_id || ':Leitura Técnica'), 'pages', 0.2)
  ON CONFLICT (activity_id) DO NOTHING;
  INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
  VALUES (md5(bootstrap_id || ':Leitura Técnica:Conhecimento'), md5(bootstrap_id || ':Leitura Técnica'), md5(bootstrap_id || ':Conhecimento'), 80, 'positive', 'percent')
  ON CONFLICT DO NOTHING;
  INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
  VALUES (md5(bootstrap_id || ':Leitura Técnica:Clareza'), md5(bootstrap_id || ':Leitura Técnica'), md5(bootstrap_id || ':Clareza'), 20, 'positive', 'percent')
  ON CONFLICT DO NOTHING;

  -- Activity 6: Projeto Prático
  INSERT INTO activities (id, user_id, title, short_description, category_id, polarity)
  VALUES (md5(bootstrap_id || ':Projeto Prático'), bootstrap_id, 'Projeto Prático', 'Execução prática/protótipos', md5(bootstrap_id || ':Prática'), 'positive')
  ON CONFLICT (user_id, title) DO NOTHING;
  INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals)
  VALUES (md5(bootstrap_id || ':Projeto Prático:sessions'), md5(bootstrap_id || ':Projeto Prático'), 'sessions', 'Sessões', 'x', 0)
  ON CONFLICT DO NOTHING;
  INSERT INTO activity_scoring (activity_id, mode, rounding, precision, allow_negative, base_points)
  VALUES (md5(bootstrap_id || ':Projeto Prático'), 'simple', 'none', 0, TRUE, NULL)
  ON CONFLICT (activity_id) DO NOTHING;
  INSERT INTO activity_scoring_simple (activity_id, measure_ref, points_per_unit)
  VALUES (md5(bootstrap_id || ':Projeto Prático'), 'sessions', 2.0)
  ON CONFLICT (activity_id) DO NOTHING;
  INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
  VALUES (md5(bootstrap_id || ':Projeto Prático:Habilidade'), md5(bootstrap_id || ':Projeto Prático'), md5(bootstrap_id || ':Habilidade'), 70, 'positive', 'percent')
  ON CONFLICT DO NOTHING;
  INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
  VALUES (md5(bootstrap_id || ':Projeto Prático:Entrega'), md5(bootstrap_id || ':Projeto Prático'), md5(bootstrap_id || ':Entrega'), 30, 'positive', 'percent')
  ON CONFLICT DO NOTHING;

  -- Activity 7: Publicar Artigo
  INSERT INTO activities (id, user_id, title, short_description, category_id, polarity)
  VALUES (md5(bootstrap_id || ':Publicar Artigo'), bootstrap_id, 'Publicar Artigo', 'Post/artigo publicado', md5(bootstrap_id || ':Entrega'), 'positive')
  ON CONFLICT (user_id, title) DO NOTHING;
  INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals)
  VALUES (md5(bootstrap_id || ':Publicar Artigo:items'), md5(bootstrap_id || ':Publicar Artigo'), 'items', 'Itens', 'x', 0)
  ON CONFLICT DO NOTHING;
  INSERT INTO activity_scoring (activity_id, mode, rounding, precision, allow_negative, base_points)
  VALUES (md5(bootstrap_id || ':Publicar Artigo'), 'simple', 'none', 0, TRUE, 2.0)
  ON CONFLICT (activity_id) DO NOTHING;
  INSERT INTO activity_scoring_simple (activity_id, measure_ref, points_per_unit)
  VALUES (md5(bootstrap_id || ':Publicar Artigo'), 'items', 5.0)
  ON CONFLICT (activity_id) DO NOTHING;
  INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
  VALUES (md5(bootstrap_id || ':Publicar Artigo:Entrega'), md5(bootstrap_id || ':Publicar Artigo'), md5(bootstrap_id || ':Entrega'), 70, 'positive', 'percent')
  ON CONFLICT DO NOTHING;
  INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
  VALUES (md5(bootstrap_id || ':Publicar Artigo:Conhecimento'), md5(bootstrap_id || ':Publicar Artigo'), md5(bootstrap_id || ':Conhecimento'), 30, 'positive', 'percent')
  ON CONFLICT DO NOTHING;

  -- Activity 8: Poupança Mensal
  INSERT INTO activities (id, user_id, title, short_description, category_id, polarity)
  VALUES (md5(bootstrap_id || ':Poupança Mensal'), bootstrap_id, 'Poupança Mensal', 'Aporte em poupança/investimento', md5(bootstrap_id || ':Finanças'), 'positive')
  ON CONFLICT (user_id, title) DO NOTHING;
  INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals)
  VALUES (md5(bootstrap_id || ':Poupança Mensal:amount'), md5(bootstrap_id || ':Poupança Mensal'), 'amount', 'Valor', 'BRL', 2)
  ON CONFLICT DO NOTHING;
  INSERT INTO activity_scoring (activity_id, mode, rounding, precision, allow_negative, base_points)
  VALUES (md5(bootstrap_id || ':Poupança Mensal'), 'simple', 'nearest', 2, TRUE, NULL)
  ON CONFLICT (activity_id) DO NOTHING;
  INSERT INTO activity_scoring_simple (activity_id, measure_ref, points_per_unit)
  VALUES (md5(bootstrap_id || ':Poupança Mensal'), 'amount', 0.001)
  ON CONFLICT (activity_id) DO NOTHING;
  INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
  VALUES (md5(bootstrap_id || ':Poupança Mensal:Finanças'), md5(bootstrap_id || ':Poupança Mensal'), md5(bootstrap_id || ':Finanças'), 100, 'positive', 'percent')
  ON CONFLICT DO NOTHING;

  -- Activity 9: Encontro Significativo
  INSERT INTO activities (id, user_id, title, short_description, category_id, polarity)
  VALUES (md5(bootstrap_id || ':Encontro Significativo'), bootstrap_id, 'Encontro Significativo', 'Tempo de qualidade com pessoas importantes', md5(bootstrap_id || ':Relações'), 'positive')
  ON CONFLICT (user_id, title) DO NOTHING;
  INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals)
  VALUES (md5(bootstrap_id || ':Encontro Significativo:sessions'), md5(bootstrap_id || ':Encontro Significativo'), 'sessions', 'Sessões', 'x', 0)
  ON CONFLICT DO NOTHING;
  INSERT INTO activity_scoring (activity_id, mode, rounding, precision, allow_negative, base_points)
  VALUES (md5(bootstrap_id || ':Encontro Significativo'), 'simple', 'none', 0, TRUE, NULL)
  ON CONFLICT (activity_id) DO NOTHING;
  INSERT INTO activity_scoring_simple (activity_id, measure_ref, points_per_unit)
  VALUES (md5(bootstrap_id || ':Encontro Significativo'), 'sessions', 1.0)
  ON CONFLICT (activity_id) DO NOTHING;
  INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
  VALUES (md5(bootstrap_id || ':Encontro Significativo:Relacoes'), md5(bootstrap_id || ':Encontro Significativo'), md5(bootstrap_id || ':Relações'), 100, 'positive', 'percent')
  ON CONFLICT DO NOTHING;

  -- Activity 10: Scroll Madrugada (negativa)
  INSERT INTO activities (id, user_id, title, short_description, category_id, polarity)
  VALUES (md5(bootstrap_id || ':Scroll Madrugada'), bootstrap_id, 'Scroll Madrugada', 'Uso improdutivo de redes à noite', md5(bootstrap_id || ':Lazer'), 'negative')
  ON CONFLICT (user_id, title) DO NOTHING;
  INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals)
  VALUES (md5(bootstrap_id || ':Scroll Madrugada:sessions'), md5(bootstrap_id || ':Scroll Madrugada'), 'sessions', 'Sessões', 'x', 0)
  ON CONFLICT DO NOTHING;
  INSERT INTO activity_scoring (activity_id, mode, rounding, precision, allow_negative, base_points)
  VALUES (md5(bootstrap_id || ':Scroll Madrugada'), 'simple', 'none', 0, TRUE, NULL)
  ON CONFLICT (activity_id) DO NOTHING;
  INSERT INTO activity_scoring_simple (activity_id, measure_ref, points_per_unit)
  VALUES (md5(bootstrap_id || ':Scroll Madrugada'), 'sessions', -1.0)
  ON CONFLICT (activity_id) DO NOTHING;
  INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
  VALUES (md5(bootstrap_id || ':Scroll Madrugada:Disciplina'), md5(bootstrap_id || ':Scroll Madrugada'), md5(bootstrap_id || ':Disciplina'), 60, 'negative', 'percent')
  ON CONFLICT DO NOTHING;
  INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
  VALUES (md5(bootstrap_id || ':Scroll Madrugada:Clareza'), md5(bootstrap_id || ':Scroll Madrugada'), md5(bootstrap_id || ':Clareza'), 40, 'negative', 'percent')
  ON CONFLICT DO NOTHING;
END $$;
