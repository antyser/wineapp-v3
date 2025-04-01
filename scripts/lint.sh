#!/bin/bash

# Run linting checks on Python code using ruff

set -e

cd "$(dirname "$0")/.."

# Check code with ruff
echo "Running ruff linter..."
ruff check backend/

echo "Linting complete!"
