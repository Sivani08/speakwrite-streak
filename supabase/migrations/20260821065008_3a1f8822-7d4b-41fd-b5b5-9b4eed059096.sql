UPDATE public.streaks s
SET current_streak = c.cnt,
    longest_streak = GREATEST(s.longest_streak, c.cnt),
    updated_at = now()
FROM (
  SELECT user_id, COUNT(*)::int AS cnt
  FROM public.daily_challenges
  WHERE status = 'completed'
  GROUP BY user_id
) c
WHERE c.user_id = s.user_id;