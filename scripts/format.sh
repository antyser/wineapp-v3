#!/bin/bash

# Format Python code using black and ruff

set -e

# Run black on the entire backend directory
echo "Running black..."
cd "$(dirname "$0")/.."
black backend/

# Run ruff to fix formatting and imports
echo "Running ruff..."
ruff check --fix backend/
ruff format backend/

echo "Formatting complete!"
