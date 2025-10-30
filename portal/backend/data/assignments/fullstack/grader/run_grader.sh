#!/bin/bash
set -e
S=/workspace/submission
O=/workspace/output
mkdir -p "$O"

cd "$S"
if [ ! -f docker-compose.yml ]; then
  echo '{ "status":"failed","score":0,"feedback":"docker-compose.yml missing" }' > "$O/result.json"
  exit 0
fi

echo "Starting submission stack..."
docker compose up -d || docker-compose up -d

echo "Waiting for gateway health..."
for i in {1..20}; do
  if curl -sSf http://localhost:8000/health > /dev/null; then
    echo "Gateway is up"
    break
  fi
  sleep 1
done

echo "Running tests..."
pytest /workspace/tests --json-report --json-report-file="$O/pytest.json" || true

if [ -f "$O/pytest.json" ]; then
  PASSED=$(python - <<'PY'
import json
j=json.load(open('/workspace/output/pytest.json'))
print(sum(1 for t in j.get('tests',[]) if t.get('outcome')=='passed'))
PY
)
  TOTAL=$(python - <<'PY'
import json
j=json.load(open('/workspace/output/pytest.json'))
print(len(j.get('tests',[])))
PY
)
else
  PASSED=0; TOTAL=0
fi

SCORE=$(( PASSED * 12 ))
if [ $SCORE -gt 100 ]; then SCORE=100; fi

cat > "$O/result.json" <<EOF
{ "status":"completed", "score": $SCORE,
  "sections":[{"name":"API tests","score":$PASSED,"max":$TOTAL}],
  "feedback":"$PASSED of $TOTAL tests passed."
}
EOF

docker compose down || docker-compose down || true
echo "Fullstack grading complete."
