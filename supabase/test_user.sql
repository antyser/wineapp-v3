-- Script to create a test user with a known password
-- This is for development purposes only

-- Delete user if exists (to ensure clean creation)
DELETE FROM auth.users WHERE email = 'test@example.com';

-- Insert user with proper fields
INSERT INTO auth.users (
  instance_id,
  id, 
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Test User"}',
  NOW(),
  NOW()
);

-- Insert identity record (required for auth to work properly)
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000000'::text, 'test@example.com')::jsonb,
  'email',
  'test@example.com',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (id) DO 
  UPDATE SET
    last_sign_in_at = NOW(),
    updated_at = NOW(); 