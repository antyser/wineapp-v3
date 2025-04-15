FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH="/app" \
    PORT=8000 \
    UV_SYSTEM_PYTHON=1

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install uv

# Copy project definition files for dependency installation
COPY pyproject.toml* uv.lock* .python-version* ./

# Install dependencies without installing the project itself
# This creates a layer that can be cached
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-install-project --frozen

# Ensure pydantic-ai is installed
RUN pip install pydantic-ai>=0.0.49

# Copy application code
COPY . .

# Now install the project itself
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen

# Expose port for FastAPI
EXPOSE 8000

# Start the FastAPI application with hot-reload for development
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"] 