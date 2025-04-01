-- Test function to insert a user into auth.users for testing
-- This function should only be callable by the service role
create or replace function test_insert_user(user_id text, user_email text)
returns json
language plpgsql
security definer
as $$
begin
  insert into auth.users (id, email, raw_user_meta_data, role, created_at)
  values (
    user_id::uuid,
    user_email,
    '{"name": "Test User"}'::jsonb,
    'authenticated',
    now()
  )
  on conflict (id) do nothing
  returning id;

  return json_build_object('id', user_id);
end;
$$;
