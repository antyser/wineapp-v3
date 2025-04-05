-- Add wine search function with text search ranking
CREATE OR REPLACE FUNCTION wine_search_ranked(
  search_terms_param TEXT,
  vintage_param TEXT,
  use_vintage BOOLEAN
)
RETURNS SETOF wines
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF use_vintage THEN
    RETURN QUERY
    SELECT w.*
    FROM wines w
    WHERE 
      to_tsvector(w.name) @@ to_tsquery(search_terms_param) 
      AND w.vintage = vintage_param
    ORDER BY ts_rank_cd(to_tsvector(w.name), to_tsquery(search_terms_param)) DESC
    LIMIT 1;
  ELSE
    RETURN QUERY
    SELECT w.*
    FROM wines w
    WHERE to_tsvector(w.name) @@ to_tsquery(search_terms_param)
    ORDER BY ts_rank_cd(to_tsvector(w.name), to_tsquery(search_terms_param)) DESC
    LIMIT 1;
  END IF;
END;
$$; 