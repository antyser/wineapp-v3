-- Enable Row Level Security on search_history table
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to insert their own records
CREATE POLICY insert_own_history ON search_history
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

-- Create policy to allow users to select their own records
CREATE POLICY select_own_history ON search_history
    FOR SELECT
    USING (auth.uid()::text = user_id::text);

-- Allow service role to bypass RLS (for our backend operations)
-- Uncomment if you want the service role to bypass RLS 