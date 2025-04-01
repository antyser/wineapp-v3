-- Create tables for our wine app
-- This will be executed in Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Wine table to store wine information
CREATE TABLE IF NOT EXISTS wines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    vintage INTEGER NOT NULL,
    region TEXT NOT NULL,
    country TEXT NOT NULL,
    description TEXT,
    grapes TEXT[], -- Array of grape varieties
    alcohol_content DECIMAL(4,2),
    price DECIMAL(10,2),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Cellar table to organize wines
CREATE TABLE IF NOT EXISTS cellars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, name)
);

-- Wine Cellar Entries to track wines in cellars
CREATE TABLE IF NOT EXISTS wine_cellar_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wine_id UUID NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cellar_id UUID NOT NULL REFERENCES cellars(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    purchase_price DECIMAL(10,2),
    purchase_date DATE,
    drink_by_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Tasting Notes
CREATE TABLE IF NOT EXISTS tasting_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wine_id UUID NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating DECIMAL(3,1) CHECK (rating >= 0 AND rating <= 5),
    appearance TEXT,
    nose TEXT,
    palate TEXT,
    finish TEXT,
    overall_notes TEXT,
    tasting_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Wishlist
CREATE TABLE IF NOT EXISTS wishlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wine_id UUID NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, wine_id)
);

-- Create RLS policies for secure access

-- Enable Row Level Security
ALTER TABLE wines ENABLE ROW LEVEL SECURITY;
ALTER TABLE cellars ENABLE ROW LEVEL SECURITY;
ALTER TABLE wine_cellar_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- Wines are publicly readable but only admins can create/update
CREATE POLICY wines_select_policy ON wines
    FOR SELECT USING (true);

-- Cellars are only visible to their owners
CREATE POLICY cellars_select_policy ON cellars
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY cellars_insert_policy ON cellars
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY cellars_update_policy ON cellars
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY cellars_delete_policy ON cellars
    FOR DELETE USING (auth.uid() = user_id);

-- Wine cellar entries are only visible to their owners
CREATE POLICY wine_cellar_entries_select_policy ON wine_cellar_entries
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY wine_cellar_entries_insert_policy ON wine_cellar_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY wine_cellar_entries_update_policy ON wine_cellar_entries
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY wine_cellar_entries_delete_policy ON wine_cellar_entries
    FOR DELETE USING (auth.uid() = user_id);

-- Tasting notes are only visible to their owners
CREATE POLICY tasting_notes_select_policy ON tasting_notes
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY tasting_notes_insert_policy ON tasting_notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY tasting_notes_update_policy ON tasting_notes
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY tasting_notes_delete_policy ON tasting_notes
    FOR DELETE USING (auth.uid() = user_id);

-- Wishlist items are only visible to their owners
CREATE POLICY wishlist_select_policy ON wishlist
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY wishlist_insert_policy ON wishlist
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY wishlist_update_policy ON wishlist
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY wishlist_delete_policy ON wishlist
    FOR DELETE USING (auth.uid() = user_id);
