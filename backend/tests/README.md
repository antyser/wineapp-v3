# Testing the Wine App Backend

This directory contains tests for the Wine App backend. Follow the instructions below to run the tests.

## Auth Tests

The authentication tests verify the functionality of the JWT token validation and user extraction.

### Running the Auth Tests

The tests can be run with or without real Supabase credentials:

```bash
# Run all tests (mock and real if credentials provided)
pytest tests/auth/

# Run only mock tests (no real Supabase connection)
pytest tests/auth/test_auth.py

# Run only integration tests (requires real Supabase credentials)
pytest tests/auth/test_supabase_integration.py
```

### Setting Up for Real Supabase Auth Tests

To run the integration tests with a real Supabase connection, you need to provide the following environment variables:

1. Create a `.env` file in the root of the backend directory with:

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_TEST_EMAIL=test_user_email
SUPABASE_TEST_PASSWORD=test_user_password
```

You need to create a test user in your Supabase project with the email and password you specify.

### Test Structure

The auth tests are divided into two files:

1. `test_auth.py`: Contains unit tests that mock JWT verification to test the functionality without real Supabase connections.

2. `test_supabase_integration.py`: Contains integration tests that use real Supabase credentials to test end-to-end authentication.

## Other Tests

More test categories will be added as the application grows.

## Coverage

To run tests with coverage:

```bash
# Run tests with coverage report
pytest --cov=src tests/

# Generate HTML coverage report
pytest --cov=src --cov-report=html tests/
```

The HTML report will be generated in the `htmlcov` directory. 