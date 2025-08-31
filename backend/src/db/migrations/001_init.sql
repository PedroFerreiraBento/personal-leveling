-- Initial schema for Personal Leveling on PostgreSQL

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table (daily/weekly/repeatable)
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('daily', 'weekly', 'repeatable')),
  title VARCHAR(500) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'skipped')),
  reward_xp INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(48) NOT NULL,
  short_description VARCHAR(120),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_categories_user_name UNIQUE (user_id, name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_user_created ON categories(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_updated ON tasks(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_type_status ON tasks(user_id, type, status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Seeding for default data will be handled only for the bootstrap user below.

-- Add updated_at trigger for tasks (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Bootstrap: if database has no users, create a placeholder user and seed categories for it (idempotent)
DO $$
DECLARE
  bootstrap_id text := md5('bootstrap_user_v1');
BEGIN
  -- Create placeholder user
  -- Password for development: 'adminpassword'
  INSERT INTO users (id, email, password_hash, created_at)
  VALUES (bootstrap_id, 'bootstrap@local', 'YWRtaW5wYXNzd29yZA==', CURRENT_TIMESTAMP)
  ON CONFLICT (id) DO UPDATE SET
    id = bootstrap_id,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash;

  -- Ensure default categories exist for this user
  INSERT INTO categories (id, user_id, name, short_description)
  VALUES (md5(bootstrap_id || ':Movimento'), bootstrap_id, 'Movimento', 'Atividades físicas e condicionamento.')
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO categories (id, user_id, name, short_description)
  VALUES (md5(bootstrap_id || ':Descanso'), bootstrap_id, 'Descanso', 'Sono, pausas e recuperação.')
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO categories (id, user_id, name, short_description)
  VALUES (md5(bootstrap_id || ':Nutrição'), bootstrap_id, 'Nutrição', 'Alimentação e hidratação.')
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO categories (id, user_id, name, short_description)
  VALUES (md5(bootstrap_id || ':Saúde'), bootstrap_id, 'Saúde', 'Cuidados médicos, terapias e prevenção.')
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO categories (id, user_id, name, short_description)
  VALUES (md5(bootstrap_id || ':Foco'), bootstrap_id, 'Foco', 'Blocos de concentração sem distrações.')
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO categories (id, user_id, name, short_description)
  VALUES (md5(bootstrap_id || ':Planejamento'), bootstrap_id, 'Planejamento', 'Prioridades, agenda e organização do dia.')
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO categories (id, user_id, name, short_description)
  VALUES (md5(bootstrap_id || ':Estudo'), bootstrap_id, 'Estudo', 'Aprendizado teórico, cursos e leituras.')
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO categories (id, user_id, name, short_description)
  VALUES (md5(bootstrap_id || ':Prática'), bootstrap_id, 'Prática', 'Treino técnico e exercícios aplicados.')
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO categories (id, user_id, name, short_description)
  VALUES (md5(bootstrap_id || ':Entrega'), bootstrap_id, 'Entrega', 'Conclusões, publicações e resultados.')
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO categories (id, user_id, name, short_description)
  VALUES (md5(bootstrap_id || ':Finanças'), bootstrap_id, 'Finanças', 'Ganhos, gastos, dívidas e investimentos.')
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO categories (id, user_id, name, short_description)
  VALUES (md5(bootstrap_id || ':Relações'), bootstrap_id, 'Relações', 'Família, amigos, networking e mentoria.')
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO categories (id, user_id, name, short_description)
  VALUES (md5(bootstrap_id || ':Resiliência'), bootstrap_id, 'Resiliência', 'Gestão emocional e autocuidado.')
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO categories (id, user_id, name, short_description)
  VALUES (md5(bootstrap_id || ':Disciplina'), bootstrap_id, 'Disciplina', 'Rotinas, hábitos e consistência.')
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO categories (id, user_id, name, short_description)
  VALUES (md5(bootstrap_id || ':Criatividade'), bootstrap_id, 'Criatividade', 'Ideação, design e expressão criativa.')
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO categories (id, user_id, name, short_description)
  VALUES (md5(bootstrap_id || ':Lazer'), bootstrap_id, 'Lazer', 'Recreação intencional e hobbies.')
  ON CONFLICT (user_id, name) DO NOTHING;

  INSERT INTO categories (id, user_id, name, short_description)
  VALUES (md5(bootstrap_id || ':Ambiente'), bootstrap_id, 'Ambiente', 'Organização do espaço e manutenção de sistemas.')
  ON CONFLICT (user_id, name) DO NOTHING;
END $$;
