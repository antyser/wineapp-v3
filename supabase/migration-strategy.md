# Migration Strategy for Wine App

## Handling Migration Files

### For New Development Environments

For new development environments or fresh installations, all migrations will be applied in order by their timestamp prefix, which ensures the consolidated migrations will be executed after any individual migrations they replace.

The easiest approach is to run:
```sh
supabase db reset
```

This command will:
1. Reset the database to a clean state
2. Apply all migrations in order
3. Run the seed script

### For Existing Databases

If you're working with an existing database that already has some migrations applied, you need to be more careful:

1. First check which migrations have already been applied:
```sh
supabase migration list
```

2. If the individual migrations (like `20240628000001_create_interactions_rls.sql`) have already been applied but the consolidated ones haven't, you have two options:

   a. **Safe option**: Apply only the new migrations:
   ```sh
   supabase db push
   ```
   
   b. **Clean slate option**: Reset the database and apply all migrations fresh:
   ```sh
   supabase db reset
   ```
   (Only do this if you're okay with losing existing data or have a backup)

### For Production Deployment

For production, since we can't use `db reset` because it would delete production data:

1. Always use `supabase db push` to apply only new migrations
2. Never delete old migration files, even if they've been consolidated
3. Make sure all new RLS policies use `CREATE POLICY IF NOT EXISTS` to avoid conflicts

## Adding New Tables or Features

When adding new functionality:

1. **For new tables**:
   - Create a new migration file with a timestamp higher than the consolidated files
   - Add RLS policies directly in the new migration file
   - Later, consider consolidating again if the number of migration files grows too large

2. **For modifying existing tables**:
   - Create a new migration file for the schema changes
   - Update RLS policies in a separate migration if needed

## Troubleshooting

If you encounter conflicts:

1. For errors about duplicate policies:
   - PostgreSQL doesn't support `CREATE POLICY IF NOT EXISTS` syntax in many versions
   - Instead, use `DROP POLICY IF EXISTS "Policy Name" ON table_name;` before creating new policies
   - Our consolidated migrations now follow this pattern to avoid conflicts

2. For errors about indexes already existing:
   - Use `CREATE INDEX IF NOT EXISTS index_name ON table_name (column_name);` 
   - This prevents errors when running migrations multiple times

3. For errors with constraint creation:
   - PostgreSQL doesn't support `IF NOT EXISTS` for constraints within `CREATE TABLE`
   - For tables that might already exist, consider using ALTER TABLE to add constraints separately
   - Use `ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS ...` when possible

4. For errors in the seed file:
   - Check the current database schema with `\d table_name` in the Supabase SQL editor
   - Adjust the seed file to match the current schema

## Guidelines for Future Development

1. Prefer fewer, more organized migrations over many small ones
2. Document all breaking changes
3. Test migrations thoroughly on a staging environment before production
4. Keep consolidated files updated when adding new tables or policies 