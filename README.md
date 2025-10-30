# Assessment Portal

A self-hosted assessment portal for submitting and grading programming assignments. This repository contains a Node/Express backend and a Vite + React frontend (Chakra UI). It is configured to run in development with Docker Compose or locally for development and testing.

## Key features
- Timestamped submission and result storage (per-hour folders: `YYYY-MM-DD-HH`).
- Safe Markdown rendering for assignment instructions (react-markdown + rehype-sanitize).
- PDF export of rendered instructions from the assignment detail page (html2pdf.js).
- Static asset endpoints for assignment images and grader outputs:
  - `/assets/assignments` — serves assignment images and docs (long-cache, immutable)
  - `/assets/results` — serves grader outputs (no-store)
- Real-time grading logs and results via Socket.IO; grade responses include a public `resultPath`.

## Tech stack
- Backend: Node.js, Express, multer, Socket.IO
- Frontend: React, Vite, Chakra UI, react-markdown, rehype, highlight.js
- Containerization: Docker + docker-compose (optional)

## Quick start (Docker Compose)
From the repository root:

```zsh
# Build and start services using docker-compose
docker-compose up --build

# Follow logs
docker-compose logs -f
```

This starts backend and frontend services as configured in `docker-compose.yml`. If the frontend is running in a container, ensure environment variables are provided to allow the frontend to reach the backend (see Environment variables below).

## Local development (without Docker)

1. Backend

```zsh
cd portal/backend
npm install
# dev: either use nodemon or run the server directly
# example if package.json has a dev script:
npm run dev
# or
node server.mjs
```

2. Frontend

```zsh
cd portal/frontend
npm install
npm run dev
```

When running the frontend locally with Vite, the dev server may proxy `/assets` requests to the backend. Set the backend URL for the dev server using an environment variable (see below).

## Environment variables
- VITE_BACKEND_URL or VITE_APP_BACKEND_URL — (for frontend dev) full backend URL (e.g. `http://localhost:4000`) used by Vite dev server for proxying requests.
- BACKEND_URL — (for container / server) backend public URL used by services or for building a proxy target; adapt as needed in Docker Compose.

Notes
- If your frontend runs inside Docker, `localhost` refers to the container itself. In that case either:
  - Use the backend Docker service name (for example `http://backend:4000`) as the `VITE_BACKEND_URL` when starting the frontend container, or
  - Use `host.docker.internal` (if supported on your platform) as the host part for `VITE_BACKEND_URL` to reach the host machine's backend.

## File layout (important paths)

- `portal/backend` — backend server and data directories
  - `portal/backend/server.mjs` — main Express server (upload endpoints, grading orchestration)
  - `portal/backend/data/assignments` — assignment definitions and docs
  - `portal/backend/data/submissions` — submissions stored per-hour: `submissions/<YYYY-MM-DD-HH>/<submissionId>/...`
  - `portal/backend/data/results` — grader outputs stored per-hour: `results/<YYYY-MM-DD-HH>/<submissionId>/...`

- `portal/frontend` — React app (Vite)
  - `src/pages/AssignmentDetail.tsx` — assignment viewer, markdown rendering, PDF export button
  - `vite.config.ts` — dev server and optional proxy for `/assets`

## Important behavioral notes
- Submissions and grader results are written into per-hour directories to avoid name collisions and to make grouping easier; assignment files are static and live under `data/assignments/*`.
- The backend exposes static routes so assignment images referenced in Markdown can be requested from the browser at `/assets/assignments/...`.
- The grade API returns a `resultPath` (public URL under `/assets/results/...`) and socket emissions include this `resultPath` so the UI can link to grader outputs.

## Troubleshooting

- Vite dev proxy returning 404 for `/assets`:
  - Confirm `VITE_BACKEND_URL` is set to the backend origin that the dev server can reach.
  - If the frontend runs in Docker, set `VITE_BACKEND_URL` to the backend container hostname (service name) or to `http://host.docker.internal:4000`.
  - Use the browser devtools Network tab to inspect the request URL and response. If the request URL is `http://localhost:3000/assets/...` and proxy is configured, check the proxy `target` value.

- PDF download button not appearing or pdf generation failing:
  - Ensure `html2pdf.js` is installed in the environment where the frontend runs. The app uses dynamic import of the package, so missing module will cause runtime errors.
  - Check the browser console for errors related to dynamic imports or missing modules.

## Running tests

Backend unit tests (if available) live under assignment grader test folders. Run them from `portal/backend` with pytest or the appropriate test runner if Python or other languages are used by graders. For Node-based tests, run:

```zsh
cd portal/backend
npm test
```

Adjust the above if the graders or tests require additional runtimes (Python, docker) — see each assignment's `grader` directory for specifics.


## Where to look next
- `portal/backend/server.mjs` — changes for timestamped submissions/results and static asset routes.
- `portal/frontend/src/pages/AssignmentDetail.tsx` — markdown rendering, PDF export, and resultPath UI.

If anything in this README is out of date after you pull the latest changes, please update it and open a PR with the adjustments.
