BEGIN;
-- Existing finished challenges and users already beyond writing are preserved.
ALTER TABLE public.daily_challenges ADD COLUMN IF NOT EXISTS pronunciation_required boolean NOT NULL DEFAULT false;
UPDATE public.daily_challenges SET pronunciation_required = true WHERE status = 'in_progress' AND stage IN ('learn', 'write', 'pronounce');
ALTER TABLE public.daily_challenges ALTER COLUMN pronunciation_required SET DEFAULT true;
ALTER TABLE public.speech_submissions ADD COLUMN IF NOT EXISTS sentence text;
ALTER TABLE public.speech_submissions ADD COLUMN IF NOT EXISTS assessment_provider text;
ALTER TABLE public.speech_submissions ADD COLUMN IF NOT EXISTS passed boolean NOT NULL DEFAULT false;

-- Only a trusted server can write provider assessments. Keep owners' SELECT RLS.
REVOKE INSERT, UPDATE, DELETE ON public.speech_submissions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_pronunciation_attempt(
  p_id uuid, p_user uuid, p_challenge uuid, p_sentence text,
  p_transcript text, p_detected boolean, p_score integer, p_feedback text, p_threshold integer
) RETURNS public.speech_submissions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.daily_challenges; a public.speech_submissions;
BEGIN
  SELECT * INTO c FROM public.daily_challenges WHERE id = p_challenge AND user_id = p_user FOR UPDATE;
  IF NOT FOUND OR c.stage <> 'pronounce' OR c.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Challenge is not ready for speaking';
  END IF;
  SELECT * INTO a FROM public.speech_submissions WHERE id = p_id;
  IF FOUND THEN
    IF a.user_id <> p_user OR a.challenge_id <> p_challenge THEN RAISE EXCEPTION 'Invalid attempt'; END IF;
    RETURN a;
  END IF;
  IF p_score IS NULL OR p_score < 0 OR p_score > 100 OR p_threshold IS NULL OR p_threshold < 1 OR p_threshold > 100 OR p_detected IS NULL THEN RAISE EXCEPTION 'Invalid assessment'; END IF;
  INSERT INTO public.speech_submissions(id, user_id, challenge_id, sentence, transcript, target_word_detected, pronunciation_score, overall_score, feedback, assessment_provider, passed)
  VALUES(p_id, p_user, p_challenge, p_sentence, p_transcript, p_detected, p_score, p_score, p_feedback, 'azure', p_detected AND p_score >= p_threshold)
  RETURNING * INTO a;
  IF a.passed THEN UPDATE public.daily_challenges SET speaking_score = p_score WHERE id = p_challenge; END IF;
  -- Deliberately never change stage: Continue is a separate action.
  RETURN a;
END $$;
REVOKE ALL ON FUNCTION public.record_pronunciation_attempt(uuid,uuid,uuid,text,text,boolean,integer,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_pronunciation_attempt(uuid,uuid,uuid,text,text,boolean,integer,text,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.guard_pronunciation_progress() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' OR auth.role() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.pronunciation_required := true;
    IF NEW.stage <> 'learn' OR NEW.status <> 'in_progress' THEN RAISE EXCEPTION 'Start with learning'; END IF;
  ELSE
    IF NEW.pronunciation_required IS DISTINCT FROM OLD.pronunciation_required THEN RAISE EXCEPTION 'Cannot change speaking requirement'; END IF;
    IF OLD.pronunciation_required AND (NEW.word IS DISTINCT FROM OLD.word OR NEW.vocabulary_word_id IS DISTINCT FROM OLD.vocabulary_word_id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.id IS DISTINCT FROM OLD.id) THEN RAISE EXCEPTION 'Cannot change assessed word'; END IF;
  END IF;
  IF NEW.pronunciation_required AND (NEW.stage IN ('speak', 'recall', 'complete') OR NEW.status = 'completed') AND NOT EXISTS (
    SELECT 1 FROM public.speech_submissions WHERE challenge_id = NEW.id AND user_id = NEW.user_id AND assessment_provider = 'azure' AND passed AND target_word_detected
  ) THEN RAISE EXCEPTION 'Pass pronunciation before continuing'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_pronunciation_progress ON public.daily_challenges;
CREATE TRIGGER guard_pronunciation_progress BEFORE INSERT OR UPDATE ON public.daily_challenges FOR EACH ROW EXECUTE FUNCTION public.guard_pronunciation_progress();
COMMIT;
