CREATE TABLE public.ai_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Новый разговор',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_threads_user_updated ON public.ai_threads(user_id, updated_at DESC);

ALTER TABLE public.ai_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own ai_threads" ON public.ai_threads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ai_threads" ON public.ai_threads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own ai_threads" ON public.ai_threads
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own ai_threads" ON public.ai_threads
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_ai_threads_updated_at
  BEFORE UPDATE ON public.ai_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.ai_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_messages_thread_created ON public.ai_messages(thread_id, created_at ASC);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own ai_messages" ON public.ai_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ai_messages" ON public.ai_messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.ai_threads t WHERE t.id = thread_id AND t.user_id = auth.uid())
  );
CREATE POLICY "Users delete own ai_messages" ON public.ai_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
