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
  
  -- Insert user directly with proper confirmation
  INSERT INTO auth.users (
    id, 
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    test_uid,
    test_email,
    crypt(test_password, gen_salt('bf')),
    NOW(),
    '',
    NOW(),
    '',
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Test User"}',
    NOW(),
    NOW()
  );
  
  -- Ensure the user is confirmed and has a valid email verification
  UPDATE auth.users 
  SET 
    is_confirmed = true,
    email_confirmed_at = NOW(),
    email_change_token_current = '',
    email_change = ''
  WHERE id = test_uid;
  
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
INSERT INTO public.notes (id, user_id, wine_id, tasting_date, note_text, rating_5)
VALUES
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', '2023-03-15', 'Excellent red wine with strong tannins', 4.5)
ON CONFLICT (id) DO NOTHING;

-- Add test user_wines
INSERT INTO public.user_wines (id, user_id, wine_id, wishlist)
VALUES
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', true)
ON CONFLICT (id) DO NOTHING;
