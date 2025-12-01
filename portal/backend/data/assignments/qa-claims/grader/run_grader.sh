#!/bin/bash
set -e

S=/workspace/submission
O=/workspace/output
mkdir -p "$O"

PORT=8090

echo "[INIT] Starting reference Claims UI on port $PORT..."
npx http-server /workspace/ui -p $PORT -a 0.0.0.0 >/dev/null 2>&1 &
UI_PID=$!

echo "[WAIT] Checking http://localhost:$PORT ..."
for i in {1..30}; do
  if curl -fsS http://localhost:$PORT >/dev/null 2>&1; then
    echo "[OK] UI is reachable."
    break
  fi
  echo "[WAIT] Still waiting ($i)..."
  sleep 1
done

WORK=/workspace/work
mkdir -p "$WORK"
if [ -d "$S/tests" ]; then cp -r "$S/tests" "$WORK/"; fi
if [ -f "$S/package.json" ]; then cp "$S/package.json" "$WORK/"; fi
if [ -f "$S/playwright.config.ts" ]; then cp "$S/playwright.config.ts" "$WORK/"; fi
cd "$WORK"

echo "[SETUP] Installing Playwright test runner..."
PLAYWRIGHT_VERSION=1.49.0
npm init -y >/dev/null 2>&1 || true
npm i -D playwright@$PLAYWRIGHT_VERSION @playwright/test@$PLAYWRIGHT_VERSION >/dev/null 2>&1 || true

export BASE_URL=http://localhost:$PORT

# --- Inject automatic coverage setup ---
mkdir -p "$WORK/tests"
cat > "$WORK/tests/coverage-setup.ts" <<'COV'
import { test as base } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export const test = base.extend({
  page: async ({ page }, use) => {
    const client = await page.context().newCDPSession(page);
    await client.send('Profiler.enable');
    await client.send('Profiler.startPreciseCoverage', { callCount: true, detailed: true });

    await use(page);

    const result = await client.send('Profiler.takePreciseCoverage');
    await client.send('Profiler.stopPreciseCoverage');
    await client.send('Profiler.disable');

    const outDir = '/workspace/output/v8-coverage';
    fs.mkdirSync(outDir, { recursive: true });
    const file = path.join(outDir, `coverage-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(result));
  },
});
export { expect } from '@playwright/test';
COV

# --- Create minimal config ---
cat > playwright.config.ts <<'CFG'
import { defineConfig } from '@playwright/test';
export default defineConfig({
  reporter: [['json', { outputFile: '/workspace/output/playwright.json' }]],
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8090',
    screenshot: 'on',
    video: 'off',
    trace: 'off',
  },
});
CFG

# --- Smart coverage injection ---
echo "[PATCH] Injecting coverage fixture imports..."
find tests -type f -name "*.ts" | while read -r file; do
  if grep -q "@playwright/test" "$file"; then
    sed -i "s|import { test, expect } from '@playwright/test';|import { test, expect } from './coverage-setup';|" "$file"
  elif ! grep -q "coverage-setup" "$file"; then
    sed -i "1i import { test, expect } from './coverage-setup';" "$file"
  fi
done

echo "[GRADE] Running Playwright tests..."
npx playwright test --config=./playwright.config.ts > "$O/playwright.log" 2>&1 || true

PLAN_POINTS=0
if [ -f "$S/testplan.md" ]; then
  PLAN_POINTS=20
  echo "[SCORE] Test plan found (+20)."
else
  echo "[SCORE] No test plan (0)."
fi

BUG_REPORT_POINTS=0
for FILE in "$S/bug-report.md" "$S/defect-report.md"; do
  if [ -f "$FILE" ]; then
    BUG_REPORT_POINTS=10
    echo "[SCORE] Bug/defect report found (+10)."
    break
  fi
done
if [ "$BUG_REPORT_POINTS" -eq 0 ]; then
  echo "[SCORE] No bug report (0)."
fi

EXPLORATION_POINTS=0
for FILE in "$S/exploratory-notes.md" "$S/qa-notes.md"; do
  if [ -f "$FILE" ]; then
    EXPLORATION_POINTS=10
    echo "[SCORE] Exploratory notes found (+10)."
    break
  fi
done
if [ "$EXPLORATION_POINTS" -eq 0 ]; then
  echo "[SCORE] No exploratory notes (0)."
fi

PLAY_JSON="$O/playwright.json"
PASSED=0
TOTAL=0
if [ -f "$PLAY_JSON" ]; then
  PASSED=$(node -e "
    const fs=require('fs');
    const j=JSON.parse(fs.readFileSync('$PLAY_JSON','utf8'));
    function walk(suites){
      let c=0; for(const s of suites||[]){ if(s.specs){for(const sp of s.specs){for(const t of sp.tests||[]){if(t.ok||t.status==='expected'||t.outcome==='expected')c++;}}} if(s.suites)c+=walk(s.suites);} return c;
    }
    console.log(walk(j.suites||[]));
  ")
  TOTAL=$(node -e "
    const fs=require('fs');
    const j=JSON.parse(fs.readFileSync('$PLAY_JSON','utf8'));
    function walk(suites){
      let c=0; for(const s of suites||[]){ if(s.specs){for(const sp of s.specs){for(const t of sp.tests||[])c++;}} if(s.suites)c+=walk(s.suites);} return c;
    }
    console.log(walk(j.suites||[]));
  ")
else
  echo "[WARN] No JSON report; falling back to log parsing."
  PASSED=$(grep -oE '[0-9]+ passed' "$O/playwright.log" | head -1 | awk '{print $1}')
  TOTAL=$(grep -oE 'Running [0-9]+ tests' "$O/playwright.log" | head -1 | awk '{print $2}')
fi

PASSED=${PASSED:-0}
TOTAL=${TOTAL:-0}
if [ "$TOTAL" -gt 0 ]; then
  TEST_POINTS=$(( PASSED * 60 / TOTAL ))
else
  TEST_POINTS=0
fi

# --- Coverage points ---
COVER_POINTS=0
COVERAGE_DIR="/workspace/output/v8-coverage"
if [ -d "$COVERAGE_DIR" ]; then
  FILE_COUNT=$(find "$COVERAGE_DIR" -type f -name '*.json' | wc -l)
  if [ "$FILE_COUNT" -gt 0 ]; then
    COVER_POINTS=10
    echo "[SCORE] Coverage data found (+10)."
  else
    echo "[INFO] No coverage files found."
  fi
else
  echo "[INFO] No coverage directory found."
fi

SCORE=$(( PLAN_POINTS + BUG_REPORT_POINTS + EXPLORATION_POINTS + TEST_POINTS + COVER_POINTS ))
if [ "$SCORE" -gt 100 ]; then SCORE=100; fi

# --- Collect screenshots ---
SCREEN_DIR="$O/screenshots"
mkdir -p "$SCREEN_DIR"
for DIR in /workspace/work/test-results /workspace/output/playwright-report; do
  if [ -d "$DIR" ]; then
    find "$DIR" -type f -name '*.png' -exec cp --parents {} "$SCREEN_DIR/" \; 2>/dev/null || true
  fi
done
COUNT=$(find "$SCREEN_DIR" -type f -name '*.png' 2>/dev/null | wc -l)
if [ "$COUNT" -eq 0 ]; then
  echo "[INFO] No screenshots found."
else
  echo "[INFO] Collected $COUNT screenshot(s) into $SCREEN_DIR"
fi

# --- Write result.json ---
cat > "$O/result.json" <<EOF
{
  "status": "completed",
  "score": $SCORE,
  "sections": [
    { "name": "Test Plan", "score": $PLAN_POINTS, "max": 20 },
    { "name": "Bug Report", "score": $BUG_REPORT_POINTS, "max": 10 },
    { "name": "Exploratory Notes", "score": $EXPLORATION_POINTS, "max": 10 },
    { "name": "Playwright Tests", "score": $TEST_POINTS, "max": 60 },
    { "name": "Coverage", "score": $COVER_POINTS, "max": 10 }
  ],
  "feedback": "$PASSED of $TOTAL tests passed. Coverage: $COVER_POINTS/10. Bug report: $BUG_REPORT_POINTS/10. Exploratory notes: $EXPLORATION_POINTS/10."
}
EOF

kill $UI_PID >/dev/null 2>&1 || true

echo "Playwright Logs":
echo "======================"
cat "$O/playwright.log"
echo "======================"
echo "[DONE] QA grading complete. Final Score: $SCORE"
