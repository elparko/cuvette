ALTER TABLE accounts ADD COLUMN allowance_window_start INTEGER;
UPDATE accounts SET allowance_window_start = CAST(strftime('%s', allowance_resets_at / 1000, 'unixepoch', '-1 month') AS INTEGER) * 1000 WHERE allowance_resets_at IS NOT NULL;
