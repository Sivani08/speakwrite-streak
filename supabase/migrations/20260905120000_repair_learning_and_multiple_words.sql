BEGIN;
-- Repair installations where code was published before the previous migration.
ALTER TABLE public.vocabulary_words
  ADD COLUMN IF NOT EXISTS root_meaning TEXT,
  ADD COLUMN IF NOT EXISTS root_example_word TEXT,
  ADD COLUMN IF NOT EXISTS root_example_meaning TEXT,
  ADD COLUMN IF NOT EXISTS analysis_version SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS dictionary_sources JSONB;
ALTER TABLE public.daily_challenges
  ADD COLUMN IF NOT EXISTS created_word TEXT,
  ADD COLUMN IF NOT EXISTS created_word_meaning TEXT,
  ADD COLUMN IF NOT EXISTS created_word_part_type TEXT,
  ADD COLUMN IF NOT EXISTS created_word_part TEXT,
  ADD COLUMN IF NOT EXISTS word_creation_score INTEGER,
  ADD COLUMN IF NOT EXISTS word_creation_result JSONB,
  ADD COLUMN IF NOT EXISTS writing_result JSONB,
  ADD COLUMN IF NOT EXISTS learning_result JSONB;
-- Multiple distinct words on the same day; existing challenges remain intact.
ALTER TABLE public.daily_challenges DROP CONSTRAINT IF EXISTS daily_challenges_user_id_challenge_date_key;
CREATE UNIQUE INDEX IF NOT EXISTS daily_challenges_user_word_date_unique
  ON public.daily_challenges(user_id, word, challenge_date);
NOTIFY pgrst, 'reload schema';
COMMIT;
