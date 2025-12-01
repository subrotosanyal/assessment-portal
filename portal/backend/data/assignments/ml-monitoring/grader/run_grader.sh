#!/bin/bash
set -euo pipefail
S=/workspace/submission
O=/workspace/output
mkdir -p "$O"

IMAGE_TAG="candidate-ml-monitoring"
PORT_HOST=18000
PORT_CONT=8000

echo "[BUILD] Building candidate image..."
if ! docker build -t "$IMAGE_TAG" "$S" > "$O/build.log" 2>&1; then
  echo "{\"status\":\"failed\",\"score\":0,\"sections\":[],\"feedback\":\"Docker build failed\"}" > "$O/result.json"
  exit 0
fi

echo "[RUN] Starting candidate container..."
CONTAINER_ID=$(docker run -d -p ${PORT_HOST}:${PORT_CONT} --rm "$IMAGE_TAG")
echo "$CONTAINER_ID" > "$O/container.id"

cleanup() {
  if [ -f "$O/container.id" ]; then
    CID=$(cat "$O/container.id")
    docker logs "$CID" > "$O/candidate.log" 2>&1 || true
    docker stop "$CID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

echo "[WAIT] Waiting for health..."
for i in {1..30}; do
  if curl -fsS "http://localhost:${PORT_HOST}/metrics" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "[GRADE] Running grader..."
export CANDIDATE_URL="http://localhost:${PORT_HOST}"
python /workspace/grader.py || true

echo "[DONE] Grading finished."
