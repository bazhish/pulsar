test:
	pytest tests/ -v --cov=app --cov-report=term-missing

test-unit:
	pytest tests/unit/ -v

test-integration:
	pytest tests/integration/ -v

lint:
	ruff check app/ tests/

format:
	ruff format app/ tests/

run-dev:
	uvicorn main:app --reload --port 8000
