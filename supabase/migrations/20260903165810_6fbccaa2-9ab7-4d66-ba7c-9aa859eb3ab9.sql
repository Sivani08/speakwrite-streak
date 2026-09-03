ALTER TABLE public.vocabulary_words
  ADD COLUMN IF NOT EXISTS suffix_meaning text,
  ADD COLUMN IF NOT EXISTS suffix_example_word text,
  ADD COLUMN IF NOT EXISTS suffix_example_meaning text;