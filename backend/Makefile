.PHONY: setup test lint format run clean

# Set Python interpreter
PYTHON = python

# Set virtual environment directory
VENV = .venv

setup:
	@echo "Installing dependencies..."
	uv pip install -e .
	uv pip install -e ".[dev]"

test:
	@echo "Running tests..."
	$(PYTHON) run_tests.py

lint:
	@echo "Running linters..."
	ruff check .
	black --check .

format:
	@echo "Formatting code..."
	ruff check --fix .
	black .

run:
	@echo "Starting the API server..."
	uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

clean:
	@echo "Cleaning up..."
	rm -rf __pycache__
	rm -rf .pytest_cache
	rm -rf .coverage
	rm -rf htmlcov

help:
	@echo "Available commands:"
	@echo "  setup   - Install dependencies"
	@echo "  test    - Run tests"
	@echo "  lint    - Run linters"
	@echo "  format  - Format code"
	@echo "  run     - Start the API server"
	@echo "  clean   - Clean up temporary files" 