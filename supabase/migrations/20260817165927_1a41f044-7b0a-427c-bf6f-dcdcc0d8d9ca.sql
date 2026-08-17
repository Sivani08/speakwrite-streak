CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  theme TEXT NOT NULL DEFAULT 'light',
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.vocabulary_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL UNIQUE,
  pronunciation TEXT,
  part_of_speech TEXT,
  simple_meaning TEXT,
  detailed_meaning TEXT,
  prefix TEXT,
  root TEXT,
  suffix TEXT,
  breakdown_available BOOLEAN NOT NULL DEFAULT false,
  example TEXT,
  synonyms JSONB NOT NULL DEFAULT '[]'::jsonb,
  antonyms JSONB NOT NULL DEFAULT '[]'::jsonb,
  difficulty TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.vocabulary_words TO authenticated;
GRANT ALL ON public.vocabulary_words TO service_role;
ALTER TABLE public.vocabulary_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "words readable" ON public.vocabulary_words FOR SELECT TO authenticated USING (true);
CREATE POLICY "words insertable" ON public.vocabulary_words FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  vocabulary_word_id UUID REFERENCES public.vocabulary_words ON DELETE SET NULL,
  word TEXT NOT NULL,
  challenge_date DATE NOT NULL,
  stage TEXT NOT NULL DEFAULT 'learn',
  status TEXT NOT NULL DEFAULT 'in_progress',
  writing_score INTEGER,
  speaking_score INTEGER,
  recall_score INTEGER,
  overall_score INTEGER,
  streak_awarded BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_date)
);
CREATE INDEX daily_challenges_user_date_idx ON public.daily_challenges (user_id, challenge_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_challenges TO authenticated;
GRANT ALL ON public.daily_challenges TO service_role;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own challenges" ON public.daily_challenges FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.sentence_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.daily_challenges ON DELETE CASCADE,
  sentence_number INTEGER NOT NULL,
  sentence_text TEXT NOT NULL,
  typing_duration INTEGER,
  score INTEGER,
  feedback TEXT,
  passed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sentence_submissions_challenge_idx ON public.sentence_submissions (challenge_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sentence_submissions TO authenticated;
GRANT ALL ON public.sentence_submissions TO service_role;
ALTER TABLE public.sentence_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sentences" ON public.sentence_submissions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.speech_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.daily_challenges ON DELETE CASCADE,
  transcript TEXT,
  target_word_detected BOOLEAN NOT NULL DEFAULT false,
  pronunciation_score INTEGER,
  grammar_score INTEGER,
  usage_score INTEGER,
  fluency_score INTEGER,
  overall_score INTEGER,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX speech_submissions_challenge_idx ON public.speech_submissions (challenge_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.speech_submissions TO authenticated;
GRANT ALL ON public.speech_submissions TO service_role;
ALTER TABLE public.speech_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own speech" ON public.speech_submissions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.recall_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.daily_challenges ON DELETE CASCADE,
  synonym TEXT,
  antonym TEXT,
  synonym_correct BOOLEAN NOT NULL DEFAULT false,
  antonym_correct BOOLEAN NOT NULL DEFAULT false,
  score INTEGER,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX recall_submissions_challenge_idx ON public.recall_submissions (challenge_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recall_submissions TO authenticated;
GRANT ALL ON public.recall_submissions TO service_role;
ALTER TABLE public.recall_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recall" ON public.recall_submissions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completed_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.streaks TO authenticated;
GRANT ALL ON public.streaks TO service_role;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own streak" ON public.streaks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏅',
  criteria_type TEXT NOT NULL,
  criteria_value INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements readable" ON public.achievements FOR SELECT TO authenticated USING (true);

CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user achievements" ON public.user_achievements FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.revision_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  vocabulary_word_id UUID NOT NULL REFERENCES public.vocabulary_words ON DELETE CASCADE,
  word TEXT NOT NULL,
  next_review_date DATE NOT NULL DEFAULT (now()::date + 3),
  review_count INTEGER NOT NULL DEFAULT 0,
  mastery_status TEXT NOT NULL DEFAULT 'learning',
  last_score INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, vocabulary_word_id)
);
CREATE INDEX revision_items_user_due_idx ON public.revision_items (user_id, next_review_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revision_items TO authenticated;
GRANT ALL ON public.revision_items TO service_role;
ALTER TABLE public.revision_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own revision" ON public.revision_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.streaks (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.achievements (code, name, description, icon, criteria_type, criteria_value, sort_order) VALUES
('first_step', 'First Step', 'Complete your first challenge.', '🔥', 'challenges_completed', 1, 1),
('week_warrior', 'Week Warrior', 'Reach a 7-day streak.', '🔥', 'streak', 7, 2),
('two_weeks_strong', 'Two Weeks Strong', 'Reach a 14-day streak.', '🔥', 'streak', 14, 3),
('monthly_master', 'Monthly Master', 'Reach a 30-day streak.', '🔥', 'streak', 30, 4),
('word_collector', 'Word Collector', 'Learn 25 words.', '📚', 'words_learned', 25, 5),
('vocabulary_builder', 'Vocabulary Builder', 'Learn 50 words.', '📚', 'words_learned', 50, 6),
('speaking_star', 'Speaking Star', 'Average speaking score above 90%.', '🎙', 'avg_speaking', 90, 7),
('writing_master', 'Writing Master', 'Average writing score above 90%.', '✍️', 'avg_writing', 90, 8),
('vocabulary_master', 'Vocabulary Master', 'Master 50 words.', '⭐', 'words_mastered', 50, 9);