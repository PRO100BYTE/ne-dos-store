CREATE TABLE IF NOT EXISTS command_reviews (
  id UUID PRIMARY KEY,
  command_slug TEXT NOT NULL,
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_command_reviews_slug ON command_reviews(command_slug);

CREATE TABLE IF NOT EXISTS install_history (
  id UUID PRIMARY KEY,
  command_slug TEXT NOT NULL,
  origin TEXT NOT NULL,
  installer_fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_install_history_slug ON install_history(command_slug);

CREATE TABLE IF NOT EXISTS command_submissions (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  source_url TEXT,
  sha256 TEXT,
  moderation_note TEXT,
  script_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_command_submissions_status ON command_submissions(status);
