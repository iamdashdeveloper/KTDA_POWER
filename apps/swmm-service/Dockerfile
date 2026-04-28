FROM python:3.11-slim

# Install system dependencies for SWMM math engine
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy everything from apps/swmm-service/ into /app/
COPY . .

EXPOSE 8000

# FIX: Remove "apps.swmm-service" from the path. 
# Inside the container, main.py is in the current directory.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]