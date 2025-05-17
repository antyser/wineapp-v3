-- Add performance indexes to improve query performance
-- Migration file: 20240705000000_add_performance_indexes.sql

-- Make sure gin_trgm_ops extension is available
CREATE EXTENSION IF NOT EXISTS pg_trgm; 

-- Indexes for wines table
CREATE INDEX IF NOT EXISTS idx_wines_name ON public.wines USING btree (name);
CREATE INDEX IF NOT EXISTS idx_wines_region ON public.wines USING btree (region);
CREATE INDEX IF NOT EXISTS idx_wines_country ON public.wines USING btree (country);
CREATE INDEX IF NOT EXISTS idx_wines_varietal ON public.wines USING btree (varietal);
CREATE INDEX IF NOT EXISTS idx_wines_type ON public.wines USING btree (type);
CREATE INDEX IF NOT EXISTS idx_wines_wine_searcher_id ON public.wines USING btree (wine_searcher_id);
CREATE INDEX IF NOT EXISTS idx_wines_created_at ON public.wines USING btree (created_at);

-- Indexes for cellars table
CREATE INDEX IF NOT EXISTS idx_cellars_user_id ON public.cellars USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_cellars_created_at ON public.cellars USING btree (created_at);

-- Indexes for cellar_wines table
CREATE INDEX IF NOT EXISTS idx_cellar_wines_cellar_id ON public.cellar_wines USING btree (cellar_id);
CREATE INDEX IF NOT EXISTS idx_cellar_wines_wine_id ON public.cellar_wines USING btree (wine_id);
CREATE INDEX IF NOT EXISTS idx_cellar_wines_status ON public.cellar_wines USING btree (status);
CREATE INDEX IF NOT EXISTS idx_cellar_wines_created_at ON public.cellar_wines USING btree (created_at);

-- Indexes for notes table
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_notes_wine_id ON public.notes USING btree (wine_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id_wine_id ON public.notes USING btree (user_id, wine_id);
CREATE INDEX IF NOT EXISTS idx_notes_tasting_date ON public.notes USING btree (tasting_date);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes USING btree (created_at);

-- Indexes for interactions table
CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON public.interactions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_wine_id ON public.interactions USING btree (wine_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user_id_wine_id ON public.interactions USING btree (user_id, wine_id);

-- Indexes for search_history table
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON public.search_history USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_search_type ON public.search_history USING btree (search_type);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON public.search_history USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_search_history_wine_ids ON public.search_history USING gin (result_wine_ids);

-- Indexes for offers table
CREATE INDEX IF NOT EXISTS idx_offers_wine_id ON public.offers USING btree (wine_id);
CREATE INDEX IF NOT EXISTS idx_offers_price ON public.offers USING btree (price);

-- Indexes for wine_searcher_wines table
CREATE INDEX IF NOT EXISTS idx_wine_searcher_wine_searcher_id ON public.wine_searcher_wines USING btree (wine_searcher_id);
CREATE INDEX IF NOT EXISTS idx_wine_searcher_vintage ON public.wine_searcher_wines USING btree (vintage);
CREATE INDEX IF NOT EXISTS idx_wine_searcher_origin ON public.wine_searcher_wines USING btree (origin);
CREATE INDEX IF NOT EXISTS idx_wine_searcher_wine_type ON public.wine_searcher_wines USING btree (wine_type);

-- Indexes for chat_sessions table
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON public.chat_sessions USING btree (updated_at);

-- Indexes for chat_messages table
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages USING btree (session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sent_at ON public.chat_messages USING btree (sent_at);

-- Full-text search indexes for better text searching
CREATE INDEX IF NOT EXISTS idx_wines_name_trgm ON public.wines USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_wines_winery_trgm ON public.wines USING gin (winery gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_wines_region_trgm ON public.wines USING gin (region gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_wines_varietal_trgm ON public.wines USING gin (varietal gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_wines_tasting_notes_trgm ON public.wines USING gin (tasting_notes gin_trgm_ops);