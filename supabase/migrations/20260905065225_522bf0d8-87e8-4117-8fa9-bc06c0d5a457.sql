BEGIN;

-- Version two adds conservative root teaching and persists the second task's
-- result without removing or repurposing historical speech/recall data.
ALTER TABLE public.vocabulary_words
  ADD COLUMN IF NOT EXISTS root_meaning TEXT,
  ADD COLUMN IF NOT EXISTS root_example_word TEXT,
  ADD COLUMN IF NOT EXISTS root_example_meaning TEXT,
  ADD COLUMN IF NOT EXISTS analysis_version SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE public.vocabulary_words
  ALTER COLUMN analysis_version SET DEFAULT 2;

ALTER TABLE public.daily_challenges
  ADD COLUMN IF NOT EXISTS created_word TEXT,
  ADD COLUMN IF NOT EXISTS created_word_meaning TEXT,
  ADD COLUMN IF NOT EXISTS created_word_part_type TEXT,
  ADD COLUMN IF NOT EXISTS created_word_part TEXT,
  ADD COLUMN IF NOT EXISTS word_creation_score INTEGER,
  ADD COLUMN IF NOT EXISTS word_creation_result JSONB;

ALTER TABLE public.vocabulary_words
  ADD CONSTRAINT vocabulary_words_analysis_version_check
    CHECK (analysis_version IN (1, 2)) NOT VALID;

ALTER TABLE public.daily_challenges
  ADD CONSTRAINT daily_challenges_created_word_part_type_check
    CHECK (created_word_part_type IS NULL OR created_word_part_type IN ('prefix', 'root', 'suffix')) NOT VALID,
  ADD CONSTRAINT daily_challenges_word_creation_score_check
    CHECK (word_creation_score IS NULL OR word_creation_score BETWEEN 0 AND 100) NOT VALID;

COMMIT;