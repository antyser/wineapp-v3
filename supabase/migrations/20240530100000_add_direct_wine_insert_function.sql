-- Function to directly insert a wine for testing the constraint
CREATE OR REPLACE FUNCTION public.direct_wine_insert(wine_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_row jsonb;
BEGIN
  INSERT INTO public.wines (
    id,
    name,
    wine_searcher_id,
    vintage,
    region,
    country,
    producer,
    wine_type,
    grape_variety,
    image_url,
    average_price,
    description,
    created_at,
    updated_at
  )
  VALUES (
    (wine_data->>'id')::uuid,
    wine_data->>'name',
    wine_data->>'wine_searcher_id',
    wine_data->>'vintage',
    wine_data->>'region',
    wine_data->>'country',
    wine_data->>'producer',
    wine_data->>'wine_type',
    wine_data->>'grape_variety',
    wine_data->>'image_url',
    (wine_data->>'average_price')::numeric,
    wine_data->>'description',
    COALESCE((wine_data->>'created_at')::timestamptz, now()),
    COALESCE((wine_data->>'updated_at')::timestamptz, now())
  )
  RETURNING to_jsonb(wines) INTO inserted_row;
  
  RETURN inserted_row;
END;
$$; 