CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  balance_usd REAL NOT NULL DEFAULT 0,
  in_flight INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  session_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  amount_usd REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  model TEXT NOT NULL,
  status TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_5m_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_1h_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL,
  at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS usage_account_at ON usage(account_id, at);

CREATE TABLE IF NOT EXISTS signups (
  ip_hash TEXT NOT NULL,
  hour INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (ip_hash, hour)
);

ALTER TABLE accounts DROP COLUMN in_flight;

CREATE TABLE IF NOT EXISTS in_flight (
  request_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  started_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS in_flight_account_started ON in_flight(account_id, started_at);

CREATE TABLE IF NOT EXISTS count_tokens_calls (
  account_id TEXT NOT NULL REFERENCES accounts(id),
  minute INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (account_id, minute)
);
