-- Per-take "Notes for the AI": optional free-text context the student supplies
-- about a recording (e.g. "sight-reading", "piano runs flat", "phone mic").
-- Threaded into the Gemini + Claude analysis prompts.
ALTER TABLE takes ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '';
