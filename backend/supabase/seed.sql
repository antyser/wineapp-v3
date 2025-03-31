-- Seed data for Wine App testing

-- Insert sample wine data
INSERT INTO wines (id, name, winery, vintage, region, varietal, type, price, rating, notes, image_url)
VALUES
  ('1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', 'Cabernet Sauvignon Reserve', 'Oakridge Vineyards', 2018, 'Napa Valley', 'Cabernet Sauvignon', 'Red', 65.99, 92, 'Bold with black currant and cedar notes', 'https://example.com/wines/cabernet.jpg'),
  ('6ecd8c99-4036-403d-bf84-cf8400f67836', 'Chardonnay', 'Sunshine Winery', 2020, 'Sonoma', 'Chardonnay', 'White', 28.99, 89, 'Crisp apple and vanilla flavors', 'https://example.com/wines/chardonnay.jpg'),
  ('9f0a47c5-5b62-4a3e-9dcd-6b191ac47ce7', 'Pinot Noir', 'Foggy Hill Vineyard', 2019, 'Willamette Valley', 'Pinot Noir', 'Red', 42.50, 91, 'Elegant with cherry and spice notes', 'https://example.com/wines/pinot.jpg'),
  ('c1c3d5d7-4c5e-4b9f-b8a1-c2d3e4f5a6b7', 'Sauvignon Blanc', 'Green Valley Estate', 2021, 'Marlborough', 'Sauvignon Blanc', 'White', 19.99, 88, 'Zesty with grapefruit and tropical notes', 'https://example.com/wines/sauvblanc.jpg'),
  ('d3f4g5h6-j7k8-l9m1-n2o3-p4q5r6s7t8u9', 'Merlot', 'Rolling Hills', 2017, 'Columbia Valley', 'Merlot', 'Red', 32.99, 87, 'Smooth with plum and chocolate notes', 'https://example.com/wines/merlot.jpg');

-- Insert sample users
INSERT INTO users (id, email, first_name, last_name, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'Test', 'User', NOW()),
  ('00000000-0000-0000-0000-000000000002', 'wine@example.com', 'Wine', 'Lover', NOW());

-- Insert sample cellars
INSERT INTO cellars (id, user_id, name, description, created_at)
VALUES
  ('ce11ar00-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'My Collection', 'Personal wine collection', NOW()),
  ('ce11ar00-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Special Reserves', 'Wines for special occasions', NOW());

-- Insert sample cellar items
INSERT INTO cellar_items (id, cellar_id, wine_id, quantity, purchase_date, purchase_price, notes, drinking_window_start, drinking_window_end)
VALUES
  ('item0000-0000-0000-0000-000000000001', 'ce11ar00-0000-0000-0000-000000000001', '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', 2, '2023-03-15', 59.99, 'Birthday gift', 2023, 2030),
  ('item0000-0000-0000-0000-000000000002', 'ce11ar00-0000-0000-0000-000000000001', '9f0a47c5-5b62-4a3e-9dcd-6b191ac47ce7', 3, '2023-05-20', 39.99, 'Great deal at wine shop', 2023, 2026),
  ('item0000-0000-0000-0000-000000000003', 'ce11ar00-0000-0000-0000-000000000002', 'c1c3d5d7-4c5e-4b9f-b8a1-c2d3e4f5a6b7', 6, '2023-01-10', 18.99, 'Summer stock', 2023, 2024);

-- Insert sample tasting notes
INSERT INTO tasting_notes (id, user_id, wine_id, rating, tasting_date, appearance, nose, palate, finish, notes)
VALUES
  ('note0000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', 90, '2023-06-12', 'Deep ruby', 'Black fruit, cedar', 'Full-bodied, tannic', 'Long, dry', 'Excellent with steak'),
  ('note0000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '6ecd8c99-4036-403d-bf84-cf8400f67836', 87, '2023-07-04', 'Pale gold', 'Apple, pear, oak', 'Medium body, crisp acidity', 'Clean, refreshing', 'Great summer wine'); 