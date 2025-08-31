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

-- 8) Seed: example Activities per user (idempotent)
-- Uses deterministic IDs with md5(user_id || ':' || title)
-- Categories and Attributes are the ones seeded in 001_init.sql and 002_attributes.sql

-- Helper comments: category ids
-- Movimento        -> md5(u.id || ':Movimento')
-- Descanso         -> md5(u.id || ':Descanso')
-- Foco             -> md5(u.id || ':Foco')
-- Estudo           -> md5(u.id || ':Estudo')
-- Prática          -> md5(u.id || ':Prática')
-- Entrega          -> md5(u.id || ':Entrega')
-- Finanças         -> md5(u.id || ':Finanças')
-- Relações         -> md5(u.id || ':Relações')
-- Lazer            -> md5(u.id || ':Lazer')

-- Helper comments: attribute ids
-- Vitalidade       -> md5(u.id || ':Vitalidade')
-- Clareza          -> md5(u.id || ':Clareza')
-- Conhecimento     -> md5(u.id || ':Conhecimento')
-- Habilidade       -> md5(u.id || ':Habilidade')
-- Entrega (attr)   -> md5(u.id || ':Entrega')
-- Finanças (attr)  -> md5(u.id || ':Finanças')
-- Relações (attr)  -> md5(u.id || ':Relações')
-- Resiliência      -> md5(u.id || ':Resiliência')
-- Disciplina       -> md5(u.id || ':Disciplina')

-- Activity 1: Corrida
INSERT INTO activities (id, user_id, title, short_description, category_id, polarity)
SELECT md5(u.id || ':Corrida'), u.id, 'Corrida', 'Corrida ao ar livre ou esteira', md5(u.id || ':Movimento'), 'positive'
FROM users u
ON CONFLICT (user_id, title) DO NOTHING;

-- Measures
INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals)
SELECT md5(u.id || ':Corrida:distance'), md5(u.id || ':Corrida'), 'distance', 'Distância', 'km', 2 FROM users u
ON CONFLICT DO NOTHING;
INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals)
SELECT md5(u.id || ':Corrida:time'), md5(u.id || ':Corrida'), 'time', 'Tempo', 'min', 0 FROM users u
ON CONFLICT DO NOTHING;

-- Scoring (linear: 1*distance + 0.05*time)
INSERT INTO activity_scoring (activity_id, mode, rounding, precision, allow_negative, base_points)
SELECT md5(u.id || ':Corrida'), 'linear', 'none', 0, TRUE, NULL FROM users u
ON CONFLICT (activity_id) DO NOTHING;
INSERT INTO activity_scoring_linear_terms (id, activity_id, measure_ref, points_per_unit, cap_units)
SELECT md5(u.id || ':Corrida:term:distance'), md5(u.id || ':Corrida'), 'distance', 1.0, NULL FROM users u
ON CONFLICT DO NOTHING;
INSERT INTO activity_scoring_linear_terms (id, activity_id, measure_ref, points_per_unit, cap_units)
SELECT md5(u.id || ':Corrida:term:time'), md5(u.id || ':Corrida'), 'time', 0.05, NULL FROM users u
ON CONFLICT DO NOTHING;

-- Attribute distribution (percent)
INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
SELECT md5(u.id || ':Corrida:Vitalidade'), md5(u.id || ':Corrida'), md5(u.id || ':Vitalidade'), 70, 'positive', 'percent' FROM users u
ON CONFLICT DO NOTHING;
INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
SELECT md5(u.id || ':Corrida:Disciplina'), md5(u.id || ':Corrida'), md5(u.id || ':Disciplina'), 30, 'positive', 'percent' FROM users u
ON CONFLICT DO NOTHING;

-- Activity 2: Caminhada
INSERT INTO activities (id, user_id, title, short_description, category_id, polarity)
SELECT md5(u.id || ':Caminhada'), u.id, 'Caminhada', 'Passos/quilometragem leve', md5(u.id || ':Movimento'), 'positive'
FROM users u
ON CONFLICT (user_id, title) DO NOTHING;
INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals)
SELECT md5(u.id || ':Caminhada:distance'), md5(u.id || ':Caminhada'), 'distance', 'Distância', 'km', 2 FROM users u
ON CONFLICT DO NOTHING;
INSERT INTO activity_scoring (activity_id, mode, rounding, precision, allow_negative, base_points)
SELECT md5(u.id || ':Caminhada'), 'simple', 'none', 0, TRUE, NULL FROM users u
ON CONFLICT (activity_id) DO NOTHING;
INSERT INTO activity_scoring_simple (activity_id, measure_ref, points_per_unit)
SELECT md5(u.id || ':Caminhada'), 'distance', 0.6 FROM users u
ON CONFLICT (activity_id) DO NOTHING;
INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
SELECT md5(u.id || ':Caminhada:Vitalidade'), md5(u.id || ':Caminhada'), md5(u.id || ':Vitalidade'), 60, 'positive', 'percent' FROM users u
ON CONFLICT DO NOTHING;
INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
SELECT md5(u.id || ':Caminhada:Resiliencia'), md5(u.id || ':Caminhada'), md5(u.id || ':Resiliência'), 40, 'positive', 'percent' FROM users u
ON CONFLICT DO NOTHING;

-- Activity 3: Foco Profundo
INSERT INTO activities (id, user_id, title, short_description, category_id, polarity)
SELECT md5(u.id || ':Foco Profundo'), u.id, 'Foco Profundo', 'Sessão de concentração sem distrações', md5(u.id || ':Foco'), 'positive'
FROM users u
ON CONFLICT (user_id, title) DO NOTHING;
INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals)
SELECT md5(u.id || ':Foco Profundo:minutes'), md5(u.id || ':Foco Profundo'), 'minutes', 'Minutos', 'min', 0 FROM users u
ON CONFLICT DO NOTHING;
INSERT INTO activity_scoring (activity_id, mode, rounding, precision, allow_negative, base_points)
SELECT md5(u.id || ':Foco Profundo'), 'simple', 'none', 0, TRUE, NULL FROM users u
ON CONFLICT (activity_id) DO NOTHING;
INSERT INTO activity_scoring_simple (activity_id, measure_ref, points_per_unit)
SELECT md5(u.id || ':Foco Profundo'), 'minutes', 0.02 FROM users u
ON CONFLICT (activity_id) DO NOTHING;
INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
SELECT md5(u.id || ':Foco Profundo:Clareza'), md5(u.id || ':Foco Profundo'), md5(u.id || ':Clareza'), 70, 'positive', 'percent' FROM users u
ON CONFLICT DO NOTHING;
INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
SELECT md5(u.id || ':Foco Profundo:Disciplina'), md5(u.id || ':Foco Profundo'), md5(u.id || ':Disciplina'), 30, 'positive', 'percent' FROM users u
ON CONFLICT DO NOTHING;

-- Activity 4: Meditação
INSERT INTO activities (id, user_id, title, short_description, category_id, polarity)
SELECT md5(u.id || ':Meditação'), u.id, 'Meditação', 'Respiração/atenção plena', md5(u.id || ':Descanso'), 'positive'
FROM users u
ON CONFLICT (user_id, title) DO NOTHING;
INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals)
SELECT md5(u.id || ':Meditação:minutes'), md5(u.id || ':Meditação'), 'minutes', 'Minutos', 'min', 0 FROM users u
ON CONFLICT DO NOTHING;
INSERT INTO activity_scoring (activity_id, mode, rounding, precision, allow_negative, base_points)
SELECT md5(u.id || ':Meditação'), 'simple', 'none', 0, TRUE, NULL FROM users u
ON CONFLICT (activity_id) DO NOTHING;
INSERT INTO activity_scoring_simple (activity_id, measure_ref, points_per_unit)
SELECT md5(u.id || ':Meditação'), 'minutes', 0.03 FROM users u
ON CONFLICT (activity_id) DO NOTHING;
INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
SELECT md5(u.id || ':Meditação:Resiliencia'), md5(u.id || ':Meditação'), md5(u.id || ':Resiliência'), 60, 'positive', 'percent' FROM users u
ON CONFLICT DO NOTHING;
INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
SELECT md5(u.id || ':Meditação:Clareza'), md5(u.id || ':Meditação'), md5(u.id || ':Clareza'), 40, 'positive', 'percent' FROM users u
ON CONFLICT DO NOTHING;

-- Activity 5: Leitura Técnica
INSERT INTO activities (id, user_id, title, short_description, category_id, polarity)
SELECT md5(u.id || ':Leitura Técnica'), u.id, 'Leitura Técnica', 'Estudos e leituras estruturadas', md5(u.id || ':Estudo'), 'positive'
FROM users u
ON CONFLICT (user_id, title) DO NOTHING;
INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals)
SELECT md5(u.id || ':Leitura Técnica:pages'), md5(u.id || ':Leitura Técnica'), 'pages', 'Páginas', 'pg', 0 FROM users u
ON CONFLICT DO NOTHING;
INSERT INTO activity_scoring (activity_id, mode, rounding, precision, allow_negative, base_points)
SELECT md5(u.id || ':Leitura Técnica'), 'simple', 'none', 0, TRUE, NULL FROM users u
ON CONFLICT (activity_id) DO NOTHING;
INSERT INTO activity_scoring_simple (activity_id, measure_ref, points_per_unit)
SELECT md5(u.id || ':Leitura Técnica'), 'pages', 0.2 FROM users u
ON CONFLICT (activity_id) DO NOTHING;
INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
SELECT md5(u.id || ':Leitura Técnica:Conhecimento'), md5(u.id || ':Leitura Técnica'), md5(u.id || ':Conhecimento'), 80, 'positive', 'percent' FROM users u
ON CONFLICT DO NOTHING;
INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
SELECT md5(u.id || ':Leitura Técnica:Clareza'), md5(u.id || ':Leitura Técnica'), md5(u.id || ':Clareza'), 20, 'positive', 'percent' FROM users u
ON CONFLICT DO NOTHING;

-- Activity 6: Projeto Prático
INSERT INTO activities (id, user_id, title, short_description, category_id, polarity)
SELECT md5(u.id || ':Projeto Prático'), u.id, 'Projeto Prático', 'Execução prática/protótipos', md5(u.id || ':Prática'), 'positive'
FROM users u
ON CONFLICT (user_id, title) DO NOTHING;
INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals)
SELECT md5(u.id || ':Projeto Prático:sessions'), md5(u.id || ':Projeto Prático'), 'sessions', 'Sessões', 'x', 0 FROM users u
ON CONFLICT DO NOTHING;
INSERT INTO activity_scoring (activity_id, mode, rounding, precision, allow_negative, base_points)
SELECT md5(u.id || ':Projeto Prático'), 'simple', 'none', 0, TRUE, NULL FROM users u
ON CONFLICT (activity_id) DO NOTHING;
INSERT INTO activity_scoring_simple (activity_id, measure_ref, points_per_unit)
SELECT md5(u.id || ':Projeto Prático'), 'sessions', 2.0 FROM users u
ON CONFLICT (activity_id) DO NOTHING;
INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
SELECT md5(u.id || ':Projeto Prático:Habilidade'), md5(u.id || ':Projeto Prático'), md5(u.id || ':Habilidade'), 70, 'positive', 'percent' FROM users u
ON CONFLICT DO NOTHING;
INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
SELECT md5(u.id || ':Projeto Prático:Entrega'), md5(u.id || ':Projeto Prático'), md5(u.id || ':Entrega'), 30, 'positive', 'percent' FROM users u
ON CONFLICT DO NOTHING;

-- Activity 7: Publicar Artigo
INSERT INTO activities (id, user_id, title, short_description, category_id, polarity)
SELECT md5(u.id || ':Publicar Artigo'), u.id, 'Publicar Artigo', 'Post/artigo publicado', md5(u.id || ':Entrega'), 'positive'
FROM users u
ON CONFLICT (user_id, title) DO NOTHING;
INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals)
SELECT md5(u.id || ':Publicar Artigo:items'), md5(u.id || ':Publicar Artigo'), 'items', 'Itens', 'x', 0 FROM users u
ON CONFLICT DO NOTHING;
INSERT INTO activity_scoring (activity_id, mode, rounding, precision, allow_negative, base_points)
SELECT md5(u.id || ':Publicar Artigo'), 'simple', 'none', 0, TRUE, 2.0 FROM users u
ON CONFLICT (activity_id) DO NOTHING;
INSERT INTO activity_scoring_simple (activity_id, measure_ref, points_per_unit)
SELECT md5(u.id || ':Publicar Artigo'), 'items', 5.0 FROM users u
ON CONFLICT (activity_id) DO NOTHING;
INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
SELECT md5(u.id || ':Publicar Artigo:Entrega'), md5(u.id || ':Publicar Artigo'), md5(u.id || ':Entrega'), 70, 'positive', 'percent' FROM users u
ON CONFLICT DO NOTHING;
INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
SELECT md5(u.id || ':Publicar Artigo:Conhecimento'), md5(u.id || ':Publicar Artigo'), md5(u.id || ':Conhecimento'), 30, 'positive', 'percent' FROM users u
ON CONFLICT DO NOTHING;

-- Activity 8: Poupança Mensal
INSERT INTO activities (id, user_id, title, short_description, category_id, polarity)
SELECT md5(u.id || ':Poupança Mensal'), u.id, 'Poupança Mensal', 'Aporte em poupança/investimento', md5(u.id || ':Finanças'), 'positive'
FROM users u
ON CONFLICT (user_id, title) DO NOTHING;
INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals)
SELECT md5(u.id || ':Poupança Mensal:amount'), md5(u.id || ':Poupança Mensal'), 'amount', 'Valor', 'BRL', 2 FROM users u
ON CONFLICT DO NOTHING;
INSERT INTO activity_scoring (activity_id, mode, rounding, precision, allow_negative, base_points)
SELECT md5(u.id || ':Poupança Mensal'), 'simple', 'nearest', 2, TRUE, NULL FROM users u
ON CONFLICT (activity_id) DO NOTHING;
INSERT INTO activity_scoring_simple (activity_id, measure_ref, points_per_unit)
SELECT md5(u.id || ':Poupança Mensal'), 'amount', 0.001 FROM users u
ON CONFLICT (activity_id) DO NOTHING;
INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
SELECT md5(u.id || ':Poupança Mensal:Finanças'), md5(u.id || ':Poupança Mensal'), md5(u.id || ':Finanças'), 100, 'positive', 'percent' FROM users u
ON CONFLICT DO NOTHING;

-- Activity 9: Encontro Significativo
INSERT INTO activities (id, user_id, title, short_description, category_id, polarity)
SELECT md5(u.id || ':Encontro Significativo'), u.id, 'Encontro Significativo', 'Tempo de qualidade com pessoas importantes', md5(u.id || ':Relações'), 'positive'
FROM users u
ON CONFLICT (user_id, title) DO NOTHING;
INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals)
SELECT md5(u.id || ':Encontro Significativo:sessions'), md5(u.id || ':Encontro Significativo'), 'sessions', 'Sessões', 'x', 0 FROM users u
ON CONFLICT DO NOTHING;
INSERT INTO activity_scoring (activity_id, mode, rounding, precision, allow_negative, base_points)
SELECT md5(u.id || ':Encontro Significativo'), 'simple', 'none', 0, TRUE, NULL FROM users u
ON CONFLICT (activity_id) DO NOTHING;
INSERT INTO activity_scoring_simple (activity_id, measure_ref, points_per_unit)
SELECT md5(u.id || ':Encontro Significativo'), 'sessions', 1.0 FROM users u
ON CONFLICT (activity_id) DO NOTHING;
INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
SELECT md5(u.id || ':Encontro Significativo:Relacoes'), md5(u.id || ':Encontro Significativo'), md5(u.id || ':Relações'), 100, 'positive', 'percent' FROM users u
ON CONFLICT DO NOTHING;

-- Activity 10: Scroll Madrugada (negativa)
INSERT INTO activities (id, user_id, title, short_description, category_id, polarity)
SELECT md5(u.id || ':Scroll Madrugada'), u.id, 'Scroll Madrugada', 'Uso improdutivo de redes à noite', md5(u.id || ':Lazer'), 'negative'
FROM users u
ON CONFLICT (user_id, title) DO NOTHING;
INSERT INTO activity_measures (id, activity_id, key, label, unit, decimals)
SELECT md5(u.id || ':Scroll Madrugada:sessions'), md5(u.id || ':Scroll Madrugada'), 'sessions', 'Sessões', 'x', 0 FROM users u
ON CONFLICT DO NOTHING;
INSERT INTO activity_scoring (activity_id, mode, rounding, precision, allow_negative, base_points)
SELECT md5(u.id || ':Scroll Madrugada'), 'simple', 'none', 0, TRUE, NULL FROM users u
ON CONFLICT (activity_id) DO NOTHING;
INSERT INTO activity_scoring_simple (activity_id, measure_ref, points_per_unit)
SELECT md5(u.id || ':Scroll Madrugada'), 'sessions', -1.0 FROM users u
ON CONFLICT (activity_id) DO NOTHING;
INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
SELECT md5(u.id || ':Scroll Madrugada:Disciplina'), md5(u.id || ':Scroll Madrugada'), md5(u.id || ':Disciplina'), 60, 'negative', 'percent' FROM users u
ON CONFLICT DO NOTHING;
INSERT INTO activity_attribute_entries (id, activity_id, attribute_id, value, polarity, model)
SELECT md5(u.id || ':Scroll Madrugada:Clareza'), md5(u.id || ':Scroll Madrugada'), md5(u.id || ':Clareza'), 40, 'negative', 'percent' FROM users u
ON CONFLICT DO NOTHING;
