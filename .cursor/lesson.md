# Lessons Learned

## FastAPI and Supabase Authentication

1. **Auth Dependency Return Type**: When using the `get_current_user` dependency in FastAPI with Supabase, it returns a UUID object directly, not a user object with an `id` attribute. 

2. **UUID Serialization**: UUID objects are not JSON serializable by default. They need to be converted to strings before being sent to the Supabase database.

3. **Model Inheritance**: When dealing with UUIDs in Pydantic models, it's best to inherit from the `DBBaseModel` which provides automatic UUID serialization through field serializers, rather than writing custom `dict()` methods.

4. **Error Debugging**: What may appear as a CORS error in the frontend can sometimes be a different error on the backend (like a UUID serialization issue). Always check both frontend and backend logs.

5. **Consistent Type Handling**: When working with UUIDs, we need to be consistent about when we're working with UUID objects versus string representations.

## Model Design Best Practices

1. **Use Base Models**: Create a base model with common serialization logic (like `DBBaseModel` in this project) that handles UUID conversions.

2. **Field Serializers**: Utilize Pydantic's field serializers for type conversions rather than overriding methods like `dict()`.

3. **Model Hierarchy**: Create a clear hierarchy of models (Base → Create/Update → Full) to maintain consistency and avoid code duplication.

## API Error Handling

1. **Error Specificity**: Use specific, descriptive error messages that explain the exact issue.

2. **Validation Chain**: Validate data at multiple levels - input validation with Pydantic models, business logic validation in services, and data integrity checks at the DB level.
