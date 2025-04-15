-- Enable Row Level Security on search_history table
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to insert their own records if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'search_history' AND policyname = 'insert_own_history'
    ) THEN
        EXECUTE 'CREATE POLICY insert_own_history ON search_history
                 FOR INSERT
                 WITH CHECK (auth.uid()::text = user_id::text)';
    END IF;
END $$;

-- Create policy to allow users to select their own records if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'search_history' AND policyname = 'select_own_history'
    ) THEN
        EXECUTE 'CREATE POLICY select_own_history ON search_history
                 FOR SELECT
                 USING (auth.uid()::text = user_id::text)';
    END IF;
END $$;

-- Allow service role to bypass RLS for our backend operations
-- Create a policy that allows service role to access all rows
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'search_history' AND policyname = 'service_role_all'
    ) THEN
        EXECUTE 'CREATE POLICY service_role_all ON search_history
                 FOR ALL
                 USING (auth.role() = ''service_role'')
                 WITH CHECK (auth.role() = ''service_role'')';
    END IF;
END $$; 