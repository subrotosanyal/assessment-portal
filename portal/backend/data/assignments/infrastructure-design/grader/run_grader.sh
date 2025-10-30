#!/bin/bash
set -e
S=/workspace/submission
O=/workspace/output
mkdir -p "$O"
echo "[START] Validating submission ZIP contents"
DOC=$(find "$S" -maxdepth 2 -type f -regex '.*/design\.\(pdf\|pptx\)$' | head -n1 || true)
if [ -z "$DOC" ]; then
  STATUS="failed"
  SCORE=0
  FEEDBACK="ZIP must include design.pdf or design.pptx at top level."
  echo "{\"status\":\"$STATUS\",\"score\":$SCORE,\"sections\":[],\"feedback\":\"$FEEDBACK\"}" > "$O/result.json"
  echo "[DONE] $FEEDBACK"
  exit 0
fi
echo "[INFO] Found document: $DOC"
python /workspace/grader.py --doc "$DOC" --out "$O/result.json" || {
  echo "[ERROR] Grader crashed"
  echo "{\"status\":\"failed\",\"score\":0,\"sections\":[],\"feedback\":\"Grader error\"}" > "$O/result.json"
}
echo "[DONE] Grading complete"
