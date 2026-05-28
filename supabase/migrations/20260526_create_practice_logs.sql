CREATE TABLE IF NOT EXISTS practice_logs (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID          REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date       DATE          NOT NULL,
  hours      NUMERIC(4,2)  NOT NULL DEFAULT 0,
  note       TEXT          NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ   DEFAULT NOW()
);
