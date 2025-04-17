-- ==========================================================
-- Consolidated RLS policies for all user-related tables
-- ==========================================================

-- ------------------------------------------------------------
-- Enable RLS on all tables
-- ------------------------------------------------------------
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cellars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cellar_wines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- Drop existing policies to avoid conflicts
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;

DROP POLICY IF EXISTS "Users can view their own interactions" ON public.interactions;
DROP POLICY IF EXISTS "Users can insert their own interactions" ON public.interactions;
DROP POLICY IF EXISTS "Users can update their own interactions" ON public.interactions;
DROP POLICY IF EXISTS "Users can delete their own interactions" ON public.interactions;

DROP POLICY IF EXISTS "Users can view their own cellars" ON public.cellars;
DROP POLICY IF EXISTS "Users can insert their own cellars" ON public.cellars;
DROP POLICY IF EXISTS "Users can update their own cellars" ON public.cellars;
DROP POLICY IF EXISTS "Users can delete their own cellars" ON public.cellars;

DROP POLICY IF EXISTS "Users can view their own cellar wines" ON public.cellar_wines;
DROP POLICY IF EXISTS "Users can insert wines into their own cellars" ON public.cellar_wines;
DROP POLICY IF EXISTS "Users can update their own cellar wines" ON public.cellar_wines;
DROP POLICY IF EXISTS "Users can delete their own cellar wines" ON public.cellar_wines;

DROP POLICY IF EXISTS "Users can view their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can insert their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can delete their own chat sessions" ON public.chat_sessions;

DROP POLICY IF EXISTS "Users can view their own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages into their own chat sessions" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update their own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete their own chat messages" ON public.chat_messages;

-- ------------------------------------------------------------
-- Notes table policies
-- ------------------------------------------------------------
CREATE POLICY "Users can view their own notes"
ON public.notes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
ON public.notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
ON public.notes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
ON public.notes
FOR DELETE
USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Interactions table policies
-- ------------------------------------------------------------
CREATE POLICY "Users can view their own interactions"
ON public.interactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interactions"
ON public.interactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interactions"
ON public.interactions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interactions"
ON public.interactions
FOR DELETE
USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Cellars table policies
-- ------------------------------------------------------------
CREATE POLICY "Users can view their own cellars"
ON public.cellars
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cellars"
ON public.cellars
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cellars"
ON public.cellars
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cellars"
ON public.cellars
FOR DELETE
USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Cellar_wines table policies
-- ------------------------------------------------------------
CREATE POLICY "Users can view their own cellar wines"
ON public.cellar_wines
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cellars c
    WHERE c.id = cellar_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert wines into their own cellars"
ON public.cellar_wines
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cellars c
    WHERE c.id = cellar_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own cellar wines"
ON public.cellar_wines
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.cellars c
    WHERE c.id = cellar_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own cellar wines"
ON public.cellar_wines
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.cellars c
    WHERE c.id = cellar_id AND c.user_id = auth.uid()
  )
);

-- ------------------------------------------------------------
-- Chat_sessions table policies
-- ------------------------------------------------------------
CREATE POLICY "Users can view their own chat sessions"
ON public.chat_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat sessions"
ON public.chat_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions"
ON public.chat_sessions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions"
ON public.chat_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Chat_messages table policies
-- ------------------------------------------------------------
CREATE POLICY "Users can view their own chat messages"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert messages into their own chat sessions"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_sessions s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own chat messages"
ON public.chat_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own chat messages"
ON public.chat_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  )
); 