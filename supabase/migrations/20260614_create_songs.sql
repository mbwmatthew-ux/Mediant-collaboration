-- Persistent song threads (one per song per user)
CREATE TABLE songs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title          TEXT        NOT NULL DEFAULT 'Untitled',
  composer       TEXT        NOT NULL DEFAULT 'Unknown',
  instrument     TEXT,
  chat_history   JSONB       NOT NULL DEFAULT '[]',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own songs"
  ON songs FOR ALL
  TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Link takes to songs
ALTER TABLE takes ADD COLUMN IF NOT EXISTS song_id UUID REFERENCES songs(id) ON DELETE SET NULL;

-- Index for fast thread lookups
CREATE INDEX IF NOT EXISTS idx_takes_song_id ON takes(song_id);
CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs(user_id);

-- Auto-update songs.updated_at when chat_history changes
CREATE OR REPLACE FUNCTION update_songs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER songs_updated_at
  BEFORE UPDATE ON songs
  FOR EACH ROW
  EXECUTE FUNCTION update_songs_updated_at();
