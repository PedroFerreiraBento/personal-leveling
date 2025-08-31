-- Improvement Requests table
-- PostgreSQL migration 005

CREATE TABLE IF NOT EXISTS improvement_requests (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','rejected')),
  title VARCHAR(120) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_improvement_requests_user_created
  ON improvement_requests(user_id, created_at DESC);

-- Index to speed up queries filtering/sorting by status
CREATE INDEX IF NOT EXISTS idx_improvement_requests_status
  ON improvement_requests(status);
