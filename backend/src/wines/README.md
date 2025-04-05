# Wine Service

## wine_searcher_id Uniqueness

The `wine_searcher_id` field in the `wines` table is designed to be unique (when not NULL) to ensure that we don't duplicate wines when importing from Wine Searcher.

### Implementation

The uniqueness of `wine_searcher_id` is enforced at two levels:

1. **Application Logic**: The `create_wine` function in `service.py` checks if a wine with the same `wine_searcher_id` already exists:

   - If a wine with the same `wine_searcher_id` exists, it updates that wine with the new data
   - If no matching wine exists or the `wine_searcher_id` is NULL, it creates a new wine

   This ensures that when we import the same wine from Wine Searcher multiple times, we update the existing record rather than creating duplicates.

2. **Database Constraint** (When Applied): A unique constraint is added to the `wines` table to ensure that `wine_searcher_id` values are unique at the database level:

   ```sql
   ALTER TABLE public.wines 
   ADD CONSTRAINT unique_wine_searcher_id UNIQUE NULLS NOT DISTINCT (wine_searcher_id);
   ```

   This constraint allows multiple NULL values (for wines without a Wine Searcher ID) but enforces uniqueness for non-NULL values.

   **Note**: The database constraint provides an additional layer of protection at the database level, but even without it, the application logic ensures uniqueness.

### Testing

Both unit tests and integration tests verify that this functionality works correctly:

- When creating a wine with a new `wine_searcher_id`, a new wine is created
- When creating a wine with an existing `wine_searcher_id`, the existing wine is updated
- Multiple wines with NULL `wine_searcher_id` values can be created (user-created wines without Wine Searcher data)

### Usage

When creating a wine with Wine Searcher data:

```python
wine_data = WineCreate(
    name="Example Wine",
    wine_searcher_id="123456",
    # other fields...
)
wine = await create_wine(wine_data)
```

If a wine with `wine_searcher_id` "123456" already exists, it will be updated with the new data. If not, a new wine will be created.

### Migration Notes

The unique constraint is applied in two places:

1. In the initial table creation migration (`20240401000000_create_tables.sql`)
2. As a separate migration (`20240530000000_add_wine_searcher_id_unique_constraint.sql`) that adds the constraint if it doesn't already exist

This ensures that the constraint is applied on both new installations and existing databases.

### Schema Compatibility Notes

The Wine model in the code uses the following field mappings to align with the actual database schema:

- `varietal` in the database (not `grape_variety`)
- `type` in the database (not `wine_type`)
- `winery` in the database (not `producer`) 