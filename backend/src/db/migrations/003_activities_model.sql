-- Activities domain revamp: normalized schema to support full form structure
-- This migration replaces the old simplistic activities table from 001_init.sql
-- Safe to run multiple times due to IF EXISTS/IF NOT EXISTS guards

-- 1) Drop legacy artifacts from 001_init.sql
DROP INDEX IF EXISTS idx_activities_user_timestamp;
DROP TABLE IF EXISTS activities CASCADE;

-- 2) Base entity: activity definitions (templates/configs)
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

-- 3) Attributes distribution configuration
-- One row per activity describing the model (weights or percent)
CREATE TABLE IF NOT EXISTS activity_attributes (
  activity_id   VARCHAR(255) PRIMARY KEY REFERENCES activities(id) ON DELETE CASCADE,
  model         VARCHAR(16) NOT NULL CHECK (model IN ('weights','percent')),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Attribute entries: key-value list
CREATE TABLE IF NOT EXISTS activity_attribute_entries (
  id           VARCHAR(255) PRIMARY KEY,
  activity_id  VARCHAR(255) NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  key          VARCHAR(64) NOT NULL,
  value        NUMERIC,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_attr_entry UNIQUE (activity_id, key)
);
CREATE INDEX IF NOT EXISTS idx_attr_entries_activity ON activity_attribute_entries(activity_id);

-- 4) Measures (base inputs recorded for the activity)
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
