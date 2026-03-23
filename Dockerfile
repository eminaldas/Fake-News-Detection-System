FROM python:3.11-slim

WORKDIR /workspace

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Torch CPU-only kurulumu — GPU versiyonu ~1.8GB, CPU ~300MB
# sentence-transformers torch'u bağımlılık olarak çeker;
# önce CPU versiyonunu kurarak GPU versiyonunun indirilmesini engelliyoruz.
RUN pip install --no-cache-dir \
    torch \
    --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=1000 -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
