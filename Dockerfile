# AI Data Analyst - Root Dockerfile for Railway
# ============================================
# This Dockerfile sits at the repository root and builds the backend service.

FROM python:3.11-slim

# Show Python print/log output immediatelyin cloud provider logs (Render/Railway)
ENV PYTHONUNBUFFERED=1

# Set working directory inside the container
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements first for caching
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir psycopg2-binary bcrypt

# Copy the backend source code into /app
COPY backend/ .

# Create required directories
RUN mkdir -p uploads reports

# Expose port
EXPOSE 8000

# Run the application
CMD if [ -n "$WEB_CONCURRENCY" ]; then exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers "$WEB_CONCURRENCY"; else exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1; fi
