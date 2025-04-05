.PHONY: run run-dev run-prod test test-file test-v test-vv format lint install dev-install clean setup-test schema-only

# Default target
all: format lint test

# Run the application (default)
run:
	python run.py

# Run in development mode
run-dev:
	ENV=dev python run.py

# Run in production mode
run-prod:
	ENV=prod python run.py

# Install production dependencies
install:
	pip install -e .

# Install development dependencies
dev-install:
	pip install -e ".[dev]"

# Set up test schema (without running tests)
setup-test:
	ENV=dev SUPABASE_SCHEMA=test python -c "from src.core.supabase import get_supabase_admin_client; \
	client = get_supabase_admin_client(); \
	client.rpc('execute_sql', {'query': 'CREATE SCHEMA IF NOT EXISTS test;'}).execute(); \
	client.rpc('execute_sql', {'query': 'GRANT ALL ON SCHEMA test TO postgres, anon, authenticated, service_role;'}).execute(); \
	print('Test schema created and configured');"

# Run tests (without resetting the database)
test:
	ENV=dev SUPABASE_SCHEMA=test python -m pytest

# Run tests with specific file
test-file:
	ENV=dev SUPABASE_SCHEMA=test python -m pytest $(file) -v

# Run tests with verbose output
test-v:
	ENV=dev SUPABASE_SCHEMA=test python -m pytest -v

# Run specific test with very verbose output
test-vv:
	ENV=dev SUPABASE_SCHEMA=test python -m pytest -vv $(file)

# Run formatting
format:
	black .
	ruff check --fix .
	ruff format .

# Run linting
lint:
	ruff check .

# Clean up cache files
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +

# Help command
help:
	@echo "Available targets:"
	@echo "  run          - Run the application (development mode)"
	@echo "  run-dev      - Run the application in development mode"
	@echo "  run-prod     - Run the application in production mode"
	@echo "  setup-test   - Set up the test schema without running tests"
	@echo "  test         - Run tests using test schema"
	@echo "  test-v       - Run tests with verbose output"
	@echo "  test-file    - Run tests for a specific file (usage: make test-file file=path/to/test.py)"
	@echo "  test-vv      - Run specific test with very verbose output (usage: make test-vv file=path/to/test.py)"
	@echo "  format       - Format code using black and ruff"
	@echo "  lint         - Run linter to check code quality"
	@echo "  install      - Install production dependencies"
	@echo "  dev-install  - Install development dependencies"
	@echo "  clean        - Remove cache files"
	@echo "  all          - Run format, lint, and test (default)"
	@echo "  help         - Show this help message"
