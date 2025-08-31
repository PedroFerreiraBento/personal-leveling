-- Lançamentos schema (entries logged by users)
-- This migration creates base tables for launches and their per-activity measures.
-- Designed for PostgreSQL. Idempotent where possible.

-- Main table: lancamentos
CREATE TABLE IF NOT EXISTS lancamentos (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id VARCHAR(255) REFERENCES activities(id) ON DELETE SET NULL,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at   TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_min INTEGER NOT NULL CHECK (duration_min >= 0),
  origin VARCHAR(16) NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual','timer','import')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- (FK to activities declared inline above)

-- Measures per lançamento (keyed by the activity's configured measures)
CREATE TABLE IF NOT EXISTS lancamento_measures (
  id VARCHAR(255) PRIMARY KEY,
  lancamento_id VARCHAR(255) NOT NULL REFERENCES lancamentos(id) ON DELETE CASCADE,
  activity_measure_id VARCHAR(255) NOT NULL REFERENCES activity_measures(id) ON DELETE RESTRICT,
  value NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_lancamento_measure UNIQUE (lancamento_id, activity_measure_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_lancamentos_user_created ON lancamentos(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lancamentos_user_start ON lancamentos(user_id, start_at DESC);
CREATE INDEX IF NOT EXISTS idx_lancamentos_activity ON lancamentos(activity_id);
CREATE INDEX IF NOT EXISTS idx_lancamento_measures_lancamento ON lancamento_measures(lancamento_id);
CREATE INDEX IF NOT EXISTS idx_lancamento_measures_measure ON lancamento_measures(activity_measure_id);