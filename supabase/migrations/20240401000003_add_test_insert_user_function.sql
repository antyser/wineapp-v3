-- Add test_insert_user function for testing purposes
-- This function will be used to insert test users directly into auth.users table
CREATE OR REPLACE FUNCTION public.test_insert_user(user_id text, user_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO auth.users (
        id,
        email,
        raw_user_meta_data,
        role,
        created_at
    )
    VALUES (
        user_id::uuid,
        user_email,
        jsonb_build_object('test_user', true),
        'authenticated',
        now()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN jsonb_build_object('id', user_id);
END;
$$;
