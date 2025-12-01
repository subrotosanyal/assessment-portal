import json
import math
import os
import time
from statistics import mean, pstdev

import numpy as np
import requests


BASE_URL = os.environ.get("CANDIDATE_URL", "http://localhost:18000")
EVENTS_PATH = "/workspace/assets/sample_events.jsonl"
REF_PATH = "/workspace/assets/reference_stats.json"
OUT_PATH = "/workspace/output/result.json"

FALLBACK_EVENTS = [
  {"timestamp":"2024-06-01T00:00:01Z","prediction":0.42,"feature_vector":[0.22,-0.04,0.55],"label":1},
  {"timestamp":"2024-06-01T00:00:02Z","prediction":0.58,"feature_vector":[0.25,-0.01,0.48],"label":1},
  {"timestamp":"2024-06-01T00:00:03Z","prediction":0.35,"feature_vector":[0.19,-0.02,0.52],"label":0},
  {"timestamp":"2024-06-01T00:00:04Z","prediction":0.61,"feature_vector":[0.28,-0.08,0.5],"label":1},
  {"timestamp":"2024-06-01T00:00:05Z","prediction":0.47,"feature_vector":[0.21,-0.06,0.53],"label":0},
  {"timestamp":"2024-06-01T00:00:06Z","prediction":0.72,"feature_vector":[0.32,-0.1,0.49],"label":1},
  {"timestamp":"2024-06-01T00:00:07Z","prediction":0.55,"feature_vector":[0.26,-0.03,0.46],"label":1},
  {"timestamp":"2024-06-01T00:00:08Z","prediction":0.29,"feature_vector":[0.18,0.01,0.5],"label":0},
  {"timestamp":"2024-06-01T00:00:09Z","prediction":0.64,"feature_vector":[0.27,-0.05,0.47],"label":1},
  {"timestamp":"2024-06-01T00:00:10Z","prediction":0.39,"feature_vector":[0.2,0.0,0.51],"label":0}
]

FALLBACK_REF = {
  "prediction_mean": 0.5,
  "prediction_std": 0.15,
  "prediction_histogram": [
    { "bin": [0.0, 0.2], "prob": 0.15 },
    { "bin": [0.2, 0.4], "prob": 0.25 },
    { "bin": [0.4, 0.6], "prob": 0.3 },
    { "bin": [0.6, 0.8], "prob": 0.2 },
    { "bin": [0.8, 1.0], "prob": 0.1 }
  ],
  "feature_means": [0.2, -0.05, 0.5],
  "feature_stds": [0.1, 0.2, 0.15]
}


def read_events():
  if os.path.exists(EVENTS_PATH):
    with open(EVENTS_PATH, "r", encoding="utf-8") as f:
      return [json.loads(line) for line in f.readlines()]
  return FALLBACK_EVENTS.copy()


def load_reference():
  if os.path.exists(REF_PATH):
    with open(REF_PATH, "r", encoding="utf-8") as f:
      return json.load(f)
  return FALLBACK_REF.copy()


def percentiles(values, qs):
  if not values:
    return {q: 0 for q in qs}
  arr = np.array(values)
  return {q: float(np.percentile(arr, q)) for q in qs}


def calc_expected(events):
  preds = [e["prediction"] for e in events]
  labels = [e.get("label") for e in events if "label" in e]
  feature_vectors = [e["feature_vector"] for e in events if "feature_vector" in e]
  latencies = []
  now = time.time()
  for e in events:
    try:
      ts = time.mktime(time.strptime(e["timestamp"], "%Y-%m-%dT%H:%M:%SZ"))
    except Exception:
      ts = now
    latencies.append((now - ts) * 1000)

  metrics = {
    "count_1h": len(events),
    "count_24h": len(events),
    "prediction_mean": float(mean(preds)) if preds else 0.0,
    "prediction_std": float(pstdev(preds)) if len(preds) > 1 else 0.0,
  }
  if latencies:
    pcts = percentiles(latencies, [50, 95, 99])
    metrics.update({
      "latency_ms_p50": pcts[50],
      "latency_ms_p95": pcts[95],
      "latency_ms_p99": pcts[99],
    })
  if labels and preds:
    # Simple threshold at 0.5
    preds_bin = [1 if p >= 0.5 else 0 for p in preds]
    tp = sum(1 for p, y in zip(preds_bin, labels) if p == 1 and y == 1)
    tn = sum(1 for p, y in zip(preds_bin, labels) if p == 0 and y == 0)
    fp = sum(1 for p, y in zip(preds_bin, labels) if p == 1 and y == 0)
    fn = sum(1 for p, y in zip(preds_bin, labels) if p == 0 and y == 1)
    acc = (tp + tn) / len(labels)
    prec = tp / (tp + fp) if (tp + fp) else 0
    rec = tp / (tp + fn) if (tp + fn) else 0
    f1 = (2 * prec * rec / (prec + rec)) if (prec + rec) else 0
    metrics.update({"accuracy": acc, "f1": f1})
  if feature_vectors:
    # Feature-wise mean drift vs reference
    ref = load_reference()
    ref_means = ref.get("feature_means", [])
    pvalues = []
    for idx in range(min(len(ref_means), len(feature_vectors[0]))):
      col = [fv[idx] for fv in feature_vectors]
      # basic z-test-ish p approximation
      diff = abs(mean(col) - ref_means[idx])
      std = ref.get("feature_stds", [0.1])[idx] or 0.1
      z = diff / std
      p = math.exp(-z)  # loose heuristic
      pvalues.append(p)
    metrics["feature_drift_pvalue"] = min(pvalues) if pvalues else 1.0
  return metrics


def closish(a, b, tol=0.1):
  if b == 0:
    return abs(a - b) < 0.05
  return abs(a - b) / abs(b) <= tol


def grade():
  events = read_events()
  expected = calc_expected(events)
  sections = []
  score = 0

  # Ingest
  try:
    resp = requests.post(f"{BASE_URL}/events", json=events, timeout=15)
    ok_ingest = resp.status_code < 300
  except Exception:
    ok_ingest = False
  sections.append({"name": "Ingestion API", "score": 10 if ok_ingest else 0, "max": 10})
  score += sections[-1]["score"]

  # Metrics
  try:
    mresp = requests.get(f"{BASE_URL}/metrics", timeout=10)
    metrics = mresp.json() if mresp.ok else {}
  except Exception:
    metrics = {}
  metric_points = 0
  checks = [
    ("count_1h", 10),
    ("count_24h", 10),
    ("prediction_mean", 10),
    ("prediction_std", 10),
    ("latency_ms_p95", 5),
  ]
  for key, pts in checks:
    if key in metrics and closish(metrics.get(key, 0), expected.get(key, 0), tol=0.25):
      metric_points += pts
  # labels
  if "accuracy" in metrics and "accuracy" in expected and closish(metrics["accuracy"], expected["accuracy"], 0.25):
    metric_points += 5
  if "f1" in metrics and "f1" in expected and closish(metrics["f1"], expected["f1"], 0.3):
    metric_points += 5
  sections.append({"name": "Metrics", "score": metric_points, "max": 50})
  score += metric_points

  # Alerts
  try:
    aresp = requests.get(f"{BASE_URL}/alerts", timeout=10)
    alerts = aresp.json() if aresp.ok else []
  except Exception:
    alerts = []
  alert_score = 10 if isinstance(alerts, list) else 0
  if isinstance(alerts, list) and any(isinstance(a, dict) for a in alerts):
    alert_score += 10
  sections.append({"name": "Alerts", "score": alert_score, "max": 20})
  score += alert_score

  # OpenAPI
  try:
    oresp = requests.get(f"{BASE_URL}/openapi.json", timeout=5)
    ok_openapi = oresp.ok and oresp.headers.get("content-type", "").startswith("application/json")
  except Exception:
    ok_openapi = False
  sections.append({"name": "OpenAPI", "score": 20 if ok_openapi else 0, "max": 20})
  score += sections[-1]["score"]

  status = "completed" if score > 0 else "failed"
  feedback = f"Score {score}/100. Metrics match {metric_points}/50; alerts {alert_score}/20; ingestion {'ok' if ok_ingest else 'fail'}."
  with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump({
      "status": status,
      "score": score,
      "sections": sections,
      "feedback": feedback,
      "resultPath": "/assets/results"
    }, f)


if __name__ == "__main__":
  os.makedirs("/workspace/output", exist_ok=True)
  try:
    grade()
  except Exception as exc:
    with open(OUT_PATH, "w", encoding="utf-8") as f:
      json.dump({"status": "failed", "score": 0, "sections": [], "feedback": f"Grader error: {exc}"}, f)
