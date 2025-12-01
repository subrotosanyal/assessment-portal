# ML Monitoring & Drift Detection

You are given a stream of model prediction events (JSON lines) with fields: `timestamp`, `prediction`, `feature_vector` (array), and optionally `label`.

Build a service that:

1. Accepts `POST /events` to ingest single or batch events.
2. Exposes `GET /metrics` returning JSON with at least:
   - `count_1h`, `count_24h`
   - `prediction_mean`, `prediction_std`
   - `kl_divergence` (or similar) vs. a provided reference distribution (see `assets/reference_stats.json`)
   - `feature_drift_pvalue` using a statistical test (e.g., KS on each feature; report min p-value)
   - `latency_ms_p50/p95/p99` based on event timestamps vs. receipt time
   - If labels present: `accuracy`, `f1` (macro)
3. Exposes `GET /alerts` returning any triggered alerts (e.g., drift p-value < 0.01 or traffic drop > 50% vs. 24h mean).

Constraints:
- Keep state in-memory; no external DB is required.
- Provide OpenAPI/Swagger JSON at `/openapi.json`.
- Include a short README on how to run and an example curl sequence.
- Language/runtime: Node.js (TypeScript) or Python (FastAPI/Flask). Containerize with `Dockerfile`. Provide unit tests for metric calculations.

Deliverables:
- `server` folder with source, tests, and package config.
- `Dockerfile` that starts the server on port 8000.
- `README.md` with setup, run, and test instructions.

Evaluation highlights:
- Correct metrics math and alert logic.
- Reasonable performance on ~50k events in a single batch.
- Clear API and tests.

Assets available:
- `assets/reference_stats.json`: reference mean/std and a histogram or quantiles for predictions/features.
- `assets/sample_events.jsonl`: sample stream you can replay in tests.
