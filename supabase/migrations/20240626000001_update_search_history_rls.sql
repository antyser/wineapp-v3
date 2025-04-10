-- Drop existing policies if they exist (to make the migration idempotent)
DROP POLICY IF EXISTS insert_own_history ON public.search_history;
DROP POLICY IF EXISTS select_own_history ON public.search_history;
DROP POLICY IF EXISTS service_all_access ON public.search_history;

-- Enable Row Level Security on search_history table
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow any authenticated user to insert their own records
CREATE POLICY insert_own_history ON public.search_history
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = user_id::text);

-- Create policy to allow any authenticated user to select their own records
CREATE POLICY select_own_history ON public.search_history
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id::text);

-- Apply RLS even for owner/superuser
ALTER TABLE public.search_history FORCE ROW LEVEL SECURITY;

-- Create a separate policy for service role to have full access (for backend operations)
CREATE POLICY service_all_access ON public.search_history
    FOR ALL
    TO service_role
    USING (true);

-- Also create a policy for anon role for unauthenticated access if needed
CREATE POLICY anon_insert ON public.search_history
    FOR INSERT
    TO anon
    WITH CHECK (auth.uid()::text = user_id::text); 