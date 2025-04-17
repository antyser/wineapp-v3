-- Add test wines
INSERT INTO public.wines (id, name, region, country, winery, vintage, type, varietal, average_price, description)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Test Red Wine', 'Bordeaux', 'France', 'Test Winery', '2018', 'Red', 'Cabernet Sauvignon', 29.99, 'A test red wine with bold flavors'),
    ('22222222-2222-2222-2222-222222222222', 'Test White Wine', 'Burgundy', 'France', 'Test Winery', '2020', 'White', 'Chardonnay', 24.99, 'A crisp test white wine'),
    ('33333333-3333-3333-3333-333333333333', 'Test Rosé', 'Provence', 'France', 'Test Winery', '2021', 'Rosé', 'Grenache', 19.99, 'A refreshing test rosé wine')
ON CONFLICT (id) DO NOTHING;

-- Create test user with a known password for frontend testing
DO $$
DECLARE
  test_uid UUID := '00000000-0000-0000-0000-000000000000';
  test_email VARCHAR := 'test@example.com';
  test_password VARCHAR := 'password123';
BEGIN
  -- Delete user if exists (to ensure clean creation)
  DELETE FROM auth.users WHERE id = test_uid OR email = test_email;
  
  -- Insert user with proper fields for local Supabase
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
    test_uid,
    'authenticated',
    'authenticated',
    test_email,
    crypt(test_password, gen_salt('bf')),
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
    test_uid,
    test_uid,
    format('{"sub":"%s","email":"%s"}', test_uid::text, test_email)::jsonb,
    'email',
    test_email,
    NOW(),
    NOW(),
    NOW()
  );
  
  RAISE NOTICE 'Test user created and confirmed: %', test_email;
END $$;

-- Add test cellar
INSERT INTO public.cellars (id, user_id, name, sections)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'Test Cellar', '["Main Rack", "Reserve Shelf"]')
ON CONFLICT (id) DO NOTHING;

-- Add test cellar wines
INSERT INTO public.cellar_wines (id, cellar_id, wine_id, purchase_date, purchase_price, quantity, section)
VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '2023-01-15', 32.99, 2, 'Main Rack'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', '2023-02-20', 27.99, 3, 'Reserve Shelf')
ON CONFLICT (id) DO NOTHING;

-- Add test notes
INSERT INTO public.notes (id, user_id, wine_id, tasting_date, note_text)
VALUES
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', '2023-03-15', 'Excellent red wine with strong tannins')
ON CONFLICT (id) DO NOTHING;

-- Add test interactions
INSERT INTO public.interactions (id, user_id, wine_id, liked, wishlist, rating, tasted)
VALUES
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', true, false, 4.5, true),
    ('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', false, true, null, false),
    ('88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', true, true, 3.5, true)
ON CONFLICT (id) DO NOTHING;
