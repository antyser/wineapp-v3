-- Function to create a test user for testing purposes
CREATE OR REPLACE FUNCTION public.create_test_user(uid uuid, email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- First check if user already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = uid) THEN
    RETURN json_build_object('status', 'exists', 'id', uid);
  END IF;
  
  -- Insert into auth.users table
  INSERT INTO auth.users (
    id,
    email,
    role,
    created_at,
    updated_at,
    is_sso_user,
    email_confirmed_at
  )
  VALUES (
    uid,
    email,
    'authenticated', -- default role
    now(),
    now(),
    false,
    now() -- email already confirmed
  )
  RETURNING id, email INTO result;
  
  RETURN result;
END;
$$;

-- Function to delete a test user
CREATE OR REPLACE FUNCTION public.delete_test_user(uid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
  result json;
BEGIN
  -- Delete user from auth.users
  DELETE FROM auth.users WHERE id = uid;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Return result
  IF deleted_count > 0 THEN
    result := json_build_object('status', 'deleted', 'count', deleted_count);
  ELSE
    result := json_build_object('status', 'not_found');
  END IF;
  
  RETURN result;
END;
$$;

-- Grant execution permission to authenticated users for testing
GRANT EXECUTE ON FUNCTION public.create_test_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_test_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_test_user TO anon;
GRANT EXECUTE ON FUNCTION public.delete_test_user TO anon; 