ALTER TABLE public.vocabulary_words
  ADD COLUMN IF NOT EXISTS prefix_meaning text,
  ADD COLUMN IF NOT EXISTS prefix_example_word text,
  ADD COLUMN IF NOT EXISTS prefix_example_meaning text;

ALTER TABLE public.daily_challenges
  ADD COLUMN IF NOT EXISTS prefix_word text,
  ADD COLUMN IF NOT EXISTS prefix_word_meaning text;