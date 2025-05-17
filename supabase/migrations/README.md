# Supabase Migrations

## Consolidated Migrations

Starting from version 20240629, we have consolidated our migrations to make them more maintainable:

1. **20240629000000_consolidated_rls_policies.sql**: All row-level security policies in one place
2. **20240629000002_consolidated_schema_changes.sql**: Schema changes for notes, interactions, etc.
3. **20240629000003_search_history_rls_cleanup.sql**: Search history RLS consolidation
4. **20240705000000_add_performance_indexes.sql**: Performance optimization indexes

## Handling Migration Conflicts

Our migrations now use a defensive approach:

1. **For RLS policies**:
   - First drop existing policies with `DROP POLICY IF EXISTS`
   - Then create new policies (PostgreSQL doesn't support `CREATE POLICY IF NOT EXISTS`)

2. **For table creation**:
   - Use DO blocks with `IF NOT EXISTS` checks
   - Create tables and add constraints separately

3. **For indexes**:
   - Use `CREATE INDEX IF NOT EXISTS`

## Running Migrations

- For a fresh setup: `supabase db reset`
- For existing databases: `supabase db push`

## Common Issues

If you encounter errors:

1. **Duplicate constraint errors**: The migration might be trying to add a constraint that already exists. Check if the constraint is in another migration.

2. **Table already exists**: The structure might differ from what's expected. Consider using ALTER TABLE to modify an existing table.

3. **Object doesn't exist errors**: The migration might be trying to drop something that doesn't exist. Check the order of operations. 