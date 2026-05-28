FROM python:3.12-slim AS deps

WORKDIR /deps
COPY requirements*.txt ./
RUN if [ -f requirements-lock.txt ]; then \
      pip install --no-cache-dir --user -r requirements-lock.txt; \
    else \
      pip install --no-cache-dir --user -r requirements.txt; \
    fi

FROM python:3.12-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl libpq5 \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser

WORKDIR /app
COPY --from=deps /root/.local /home/appuser/.local
COPY --chown=appuser:appuser . .
RUN mkdir -p data && chown appuser:appuser data

USER appuser
ENV PATH="/home/appuser/.local/bin:$PATH"
ENV PORT=8000
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

EXPOSE $PORT

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health || exit 1

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 2"]
