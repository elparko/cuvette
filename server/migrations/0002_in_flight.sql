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
