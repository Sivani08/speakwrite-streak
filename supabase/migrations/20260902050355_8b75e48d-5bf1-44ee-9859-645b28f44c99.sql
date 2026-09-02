GRANT UPDATE ON public.vocabulary_words TO authenticated;
CREATE POLICY "words updatable" ON public.vocabulary_words FOR UPDATE TO authenticated USING (true) WITH CHECK (true);