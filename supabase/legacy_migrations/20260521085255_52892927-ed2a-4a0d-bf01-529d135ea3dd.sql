ALTER TABLE public.ai_threads
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ai_threads_user_pinned_updated
  ON public.ai_threads (user_id, is_pinned DESC, updated_at DESC)
  WHERE NOT is_archived;