-- Enable RLS on chat_messages table
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to select only messages from their own chat sessions
CREATE POLICY "Users can view their own chat messages"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  )
);

-- Create policy to allow users to insert only messages into their own chat sessions
CREATE POLICY "Users can insert messages into their own chat sessions"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_sessions s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  )
);

-- Create policy to allow users to update only messages in their own chat sessions
CREATE POLICY "Users can update their own chat messages"
ON public.chat_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  )
);

-- Create policy to allow users to delete only messages from their own chat sessions
CREATE POLICY "Users can delete their own chat messages"
ON public.chat_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  )
); 