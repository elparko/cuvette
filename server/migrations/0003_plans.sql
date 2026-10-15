DROP TABLE IF EXISTS usage;
DROP TABLE IF EXISTS in_flight;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS signups;
DROP TABLE IF EXISTS count_tokens_calls;
DROP TABLE IF EXISTS accounts;

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'none',
  plan_interval TEXT,
  sub_status TEXT NOT NULL DEFAULT 'none',
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  allowance_remaining_usd REAL NOT NULL DEFAULT 0,
  allowance_granted_usd REAL NOT NULL DEFAULT 0,
  allowance_resets_at INTEGER,
  period_end INTEGER,
  suspended INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  token_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT
);

CREATE INDEX devices_account ON devices(account_id);

CREATE TABLE identities (
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  email TEXT,
  PRIMARY KEY (provider, subject)
);

CREATE INDEX identities_account ON identities(account_id);

CREATE TABLE topups (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  remaining_usd REAL NOT NULL,
  expires_at INTEGER NOT NULL,
  stripe_payment_intent TEXT
);

CREATE INDEX topups_account_expires ON topups(account_id, expires_at);
CREATE UNIQUE INDEX topups_payment_intent ON topups(stripe_payment_intent) WHERE stripe_payment_intent IS NOT NULL;

CREATE TABLE holds (
  request_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  amount_usd REAL NOT NULL,
  started_at INTEGER NOT NULL,
  model TEXT NOT NULL,
  session_id TEXT
);

CREATE INDEX holds_account_started ON holds(account_id, started_at);

CREATE TABLE usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  session_id TEXT,
  model TEXT NOT NULL,
  status TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_5m_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_1h_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL,
  topup_cost_usd REAL NOT NULL DEFAULT 0,
  at TEXT NOT NULL
);

CREATE INDEX usage_account_at ON usage(account_id, at);

CREATE TABLE count_tokens_calls (
  account_id TEXT NOT NULL REFERENCES accounts(id),
  minute INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (account_id, minute)
);

CREATE TABLE stripe_events (
  event_id TEXT PRIMARY KEY
);

CREATE TABLE card_trials (
  fingerprint TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id)
);

CREATE TABLE auth_states (
  state_hash TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  port TEXT NOT NULL,
  challenge TEXT NOT NULL,
  app_state TEXT NOT NULL,
  nonce TEXT NOT NULL,
  provider_verifier TEXT,
  link_account_id TEXT,
  expires_at INTEGER NOT NULL
);

CREATE TABLE auth_codes (
  code_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  challenge TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE auth_links (
  link_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  expires_at INTEGER NOT NULL
);

CREATE TABLE auth_token_calls (
  ip_hash TEXT NOT NULL,
  minute INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (ip_hash, minute)
);
