-- Baseline marker for the legacy idempotent schema in migrate.py.
-- The existing schema is still applied before this marker to preserve old deployments.
SELECT 1;
