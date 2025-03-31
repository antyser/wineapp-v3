.PHONY: run test format lint install dev-install clean

# Default target
all: format lint test

# Run the application
run:
	python run.py

# Install production dependencies
install:
	pip install -e .

# Install development dependencies
dev-install:
	pip install -e ".[dev]"

# Run tests
test:
	python -m pytest

# Run tests with specific file
test-file:
	python -m pytest $(file) -v

# Run formatting
format:
	@echo "Note: temporarily skipping black due to Python 3.12.5 compatibility issue"
	@echo "Please upgrade to Python 3.12.6 or downgrade to 3.12.4 to use black"
	# black .
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
	@echo "  run          - Run the application"
	@echo "  test         - Run tests"
	@echo "  test-file    - Run tests for a specific file (usage: make test-file file=path/to/test.py)"
	@echo "  format       - Format code using ruff (black temporarily disabled)"
	@echo "  lint         - Run linter to check code quality"
	@echo "  install      - Install production dependencies"
	@echo "  dev-install  - Install development dependencies"
	@echo "  clean        - Remove cache files"
	@echo "  all          - Run format, lint, and test (default)"
	@echo "  help         - Show this help message" 