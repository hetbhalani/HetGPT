# HetGPT Backend Dockerfile
# This Dockerfile containerizes the FastAPI backend with all AI/ML dependencies

# Use Python 3.11 slim image for smaller size
FROM python:3.11-slim

# Prevent Python from buffering stdout/stderr (important for logs)
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Set working directory inside container
WORKDIR /app

# Install system dependencies needed for some Python packages
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (Docker layer caching optimization)
# This layer is cached unless requirements.txt changes
COPY requirements.txt .

# Install Python dependencies
# --no-cache-dir reduces image size by not caching pip packages
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Copy the entire application code
COPY . .

# Expose the port FastAPI runs on
EXPOSE 8000

# Health check - ensures container is actually serving requests
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/docs || exit 1

# Run the application
# --host 0.0.0.0 is required to accept connections from outside the container
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
