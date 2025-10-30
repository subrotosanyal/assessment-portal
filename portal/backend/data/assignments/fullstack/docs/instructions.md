# Fullstack Engineer Assignment

## Problem
Build a small, containerized system with three Python FastAPI services.

### Services
- user-service provides user management.
- task-service provides task management.
- gateway-service exposes a unified API to the UI and proxies to the other services.

## Expected APIs (on gateway)
Base URL: http://localhost:8000

Method | Path | Body | Success response
----|----|----|----
GET | /api/users | none | 200, JSON list of users
POST | /api/users | { "name": string, "email": string } | 200, { "id": number, "name": string, "email": string }
GET | /api/tasks | none | 200, JSON list of tasks
POST | /api/tasks | { "title": string, "assignedTo": number } | 200, { "id": number, "title": string, "assignedTo": number }
GET | /api/stats | none | 200, { "users": number, "tasks": number }

Validation rules:
- email must contain @
- name must be non-empty
- assignedTo must correspond to an existing user id

## Submission ZIP format
Your ZIP must contain these top-level paths:
```
docker-compose.yml
services/
  gateway-service/
    Dockerfile
    app/
  user-service/
    Dockerfile
    app/
  task-service/
    Dockerfile
    app/
frontend/ (optional)
  Dockerfile
  app/
```
Notes:
- docker-compose.yml must expose the gateway on host port 8000.

## How grading works
The grader will:
1. Run docker-compose up -d inside your submission root.
2. Wait for the gateway on http://localhost:8000/health or fallback 10 seconds.
3. Run unit tests using pytest that call your gateway APIs with httpx.
4. Compute a score from passed tests and write /workspace/output/result.json.

## Scoring
- API correctness and validation through tests make up most of the score.
- Docker Compose correctness is required for the stack to start.
- Optional UI does not affect API test scores.
