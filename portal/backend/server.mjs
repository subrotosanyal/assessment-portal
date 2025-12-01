import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { spawn } from "child_process";
import archiver from "archiver";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const DATA_DIR = "/app/data";
const ASSIGNMENTS_DIR = path.join(DATA_DIR, "assignments");
const TMP_DIR = path.join(DATA_DIR, "tmp");
// Keep base folders; actual submission/result directories are timestamped per hour
const SUBMISSIONS_BASE = path.join(DATA_DIR, "submissions");
const RESULTS_BASE = path.join(DATA_DIR, "results");

fs.mkdirSync(SUBMISSIONS_BASE, { recursive: true });
fs.mkdirSync(RESULTS_BASE, { recursive: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

// Helper: return YYYY-MM-DD-HH (24h) string for current time
function getDateHour(ts = Date.now()) {
  const d = new Date(ts);
  const YYYY = d.getUTCFullYear();
  const MM = String(d.getUTCMonth() + 1).padStart(2, "0");
  const DD = String(d.getUTCDate()).padStart(2, "0");
  const HH = String(d.getUTCHours()).padStart(2, "0");
  return `${YYYY}-${MM}-${DD}-${HH}`;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readConfig(id) {
  const cfgPath = path.join(ASSIGNMENTS_DIR, id, "config.json");
  if (!fs.existsSync(cfgPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  } catch (e) {
    return null;
  }
}

function writeConfig(id, cfg) {
  const cfgPath = path.join(ASSIGNMENTS_DIR, id, "config.json");
  ensureDir(path.dirname(cfgPath));
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
}

function safeId(str = "") {
  return str.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function unzipTo(zipPath, dest) {
  return new Promise((resolve, reject) => {
    ensureDir(dest);
    const unzip = spawn("unzip", ["-o", zipPath, "-d", dest]);
    unzip.on("close", (code) => {
      if (code !== 0) return reject(new Error(`unzip failed with code ${code}`));
      resolve();
    });
    unzip.on("error", reject);
  });
}

app.use(cors());
app.use(express.json());

// Serve results directories so the frontend (or users) can fetch result.json or output files
app.use('/assets/results', express.static(RESULTS_BASE, {
  index: false,
  extensions: ['json', 'txt', 'html', 'png', 'jpg', 'jpeg', 'svg'],
  setHeaders: (res, filePath) => {
    res.setHeader('Cache-Control', 'no-store')
  }
}));

/* ---------- API: List assignments ---------- */
app.get("/api/assignments", (req, res) => {
  const dirs = fs.readdirSync(ASSIGNMENTS_DIR, { withFileTypes: true }).filter(d => d.isDirectory());
  const items = dirs.map(d => {
    const cfgPath = path.join(ASSIGNMENTS_DIR, d.name, "config.json");
    if (!fs.existsSync(cfgPath)) return null;
    const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
    return {
      id: cfg.id,
      title: cfg.title,
      description: cfg.description,
      type: cfg.type,
      enabled: cfg.enabled !== false,
      hasDocs: fs.existsSync(path.join(ASSIGNMENTS_DIR, d.name, "docs/instructions.md"))
    };
  }).filter(Boolean);
  res.json(items);
});

/* ---------- API: Get assignment docs ---------- */
app.get("/api/assignments/:id/docs", (req, res) => {
  const mdPath = path.join(ASSIGNMENTS_DIR, req.params.id, "docs/instructions.md");
  if (!fs.existsSync(mdPath)) return res.status(404).send("Docs not found");
  res.setHeader("Content-Type", "text/markdown");
  res.send(fs.readFileSync(mdPath, "utf8"));
});

/* ---------- Admin: Create/enable/disable/delete assignments ---------- */
const creatorUpload = multer({
  storage: multer.diskStorage({
    destination: TMP_DIR,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${safeId(file.originalname)}`)
  })
});

app.post("/api/assignments", creatorUpload.fields([
  { name: "package", maxCount: 1 },
  { name: "instructionsFile", maxCount: 1 },
  { name: "graderZip", maxCount: 1 },
  { name: "assetsZip", maxCount: 1 }
]), async (req, res) => {
  try {
    const meta = JSON.parse(req.body.metadata || "{}");
    const id = safeId(meta.id || "");
    if (!id || !meta.title || !meta.description || !meta.type) {
      return res.status(400).json({ error: "id, title, description, and type are required" });
    }
    const targetDir = path.join(ASSIGNMENTS_DIR, id);
    if (fs.existsSync(targetDir)) return res.status(409).json({ error: "Assignment already exists" });

    ensureDir(targetDir);

    const pkg = req.files?.package?.[0];
    if (pkg) {
      await unzipTo(pkg.path, targetDir);
    }

    const cfg = {
      id,
      title: meta.title,
      description: meta.description,
      type: meta.type,
      enabled: meta.enabled !== false,
      createdAt: meta.createdAt || new Date().toISOString()
    };
    writeConfig(id, cfg);

    const docsDir = path.join(targetDir, "docs");
    ensureDir(docsDir);
    if (req.body.instructions || req.files?.instructionsFile?.[0]) {
      const md = req.body.instructions || fs.readFileSync(req.files.instructionsFile[0].path, "utf8");
      fs.writeFileSync(path.join(docsDir, "instructions.md"), md);
    }

    if (req.files?.graderZip?.[0]) {
      const graderDir = path.join(targetDir, "grader");
      fs.rmSync(graderDir, { recursive: true, force: true });
      await unzipTo(req.files.graderZip[0].path, graderDir);
    }

    if (req.files?.assetsZip?.[0]) {
      const assetsDir = path.join(docsDir, "assets");
      fs.rmSync(assetsDir, { recursive: true, force: true });
      await unzipTo(req.files.assetsZip[0].path, assetsDir);
    }

    // Cleanup temp uploads
    [req.files?.package, req.files?.instructionsFile, req.files?.graderZip, req.files?.assetsZip].forEach(arr => {
      if (Array.isArray(arr)) arr.forEach(f => fs.rmSync(f.path, { force: true }));
    });

    res.status(201).json({ ok: true, id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create assignment", detail: e?.message });
  }
});

app.patch("/api/assignments/:id/enabled", (req, res) => {
  const id = req.params.id;
  const cfg = readConfig(id);
  if (!cfg) return res.status(404).json({ error: "Not found" });
  if (typeof req.body.enabled !== "boolean") return res.status(400).json({ error: "enabled must be boolean" });
  cfg.enabled = req.body.enabled;
  writeConfig(id, cfg);
  res.json({ ok: true, enabled: cfg.enabled });
});

app.delete("/api/assignments/:id", (req, res) => {
  const id = req.params.id;
  const dir = path.join(ASSIGNMENTS_DIR, id);
  if (!fs.existsSync(dir)) return res.status(404).json({ error: "Not found" });
  fs.rmSync(dir, { recursive: true, force: true });
  res.json({ ok: true });
});

/* ---------- Upload submissions ---------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create a folder per current UTC date-hour so it changes every hour
    const hourDir = path.join(SUBMISSIONS_BASE, getDateHour());
    ensureDir(hourDir);
    cb(null, hourDir);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  }
});
const upload = multer({ storage });

app.post("/api/assignments/:id/upload", upload.single("submission"), (req, res) => {
  const cfg = readConfig(req.params.id);
  if (!cfg) return res.status(404).json({ error: "Assignment not found" });
  if (cfg.enabled === false) return res.status(403).json({ error: "Assignment disabled" });
  res.json({ ok: true, path: req.file.path });
});

/* ---------- Grade submissions ---------- */
app.post("/api/assignments/:id/grade", (req, res) => {
  const id = req.params.id;
  const { file, socketId } = req.body || {};
  const cfg = readConfig(id);
  if (!cfg) return res.status(404).json({ error: "Assignment not found" });
  if (cfg.enabled === false) return res.status(403).json({ error: "Assignment disabled" });
  if (!file || typeof file !== "string") return res.status(400).json({ error: "file is required and must be a string path" });

  const submissionId = `${id}-${Date.now()}`;
  // Put extracted submission next to the uploaded file (it lives inside a date-hour folder)
  const fileDir = path.dirname(file);
  const subDir = path.join(fileDir, submissionId);
  // Results are stored under the results base in the current date-hour folder
  const hour = getDateHour();
  const outDir = path.join(RESULTS_BASE, hour, submissionId);
  const publicResultPath = `/assets/results/${hour}/${submissionId}`;
  fs.mkdirSync(subDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  progress(socketId, "extract", 0, "Unzipping submission...");
  const unzip = spawn("unzip", ["-o", file, "-d", subDir]);
  forward(unzip, socketId);

  unzip.on("close", code => {
    if (code !== 0) {
      fail(socketId, "Extraction failed", code);
      return;
    }
    progress(socketId, "extract", 100, "Submission extracted");
    buildAndRun(id, subDir, outDir, socketId, publicResultPath);
  });

  res.json({ status: "started", submissionId, resultPath: publicResultPath });
});

/* ---------- Candidate: Build workspace archive ---------- */
app.post("/api/candidate/archive", async (req, res) => {
  try {
    const { assignmentId, files } = req.body || {};
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "files array is required" });
    }
    const hourDir = path.join(SUBMISSIONS_BASE, getDateHour());
    ensureDir(hourDir);
    const baseName = `${safeId(assignmentId || "candidate")}-${Date.now()}`;
    const workspaceDir = path.join(hourDir, baseName);
    ensureDir(workspaceDir);

    for (const f of files) {
      const rel = String(f?.path || f?.name || "").trim();
      if (!rel || rel.includes("..") || path.isAbsolute(rel)) continue;
      const target = path.join(workspaceDir, rel);
      const resolved = path.resolve(target);
      if (!resolved.startsWith(path.resolve(workspaceDir))) continue;
      ensureDir(path.dirname(target));
      fs.writeFileSync(target, f.content ?? "");
    }

    const zipPath = path.join(hourDir, `${baseName}.zip`);
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", resolve);
      archive.on("warning", (err) => {
        if (err.code === "ENOENT") console.warn(err);
        else reject(err);
      });
      archive.on("error", reject);

      archive.pipe(output);
      archive.directory(workspaceDir, false);
      archive.finalize();
    });

    res.json({ ok: true, path: zipPath, name: `${baseName}.zip` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not create archive", detail: e?.message });
  }
});

/* ---------- Build grader image and run grading ---------- */
function buildAndRun(id, subDir, outDir, socketId, publicResultPath) {
  const graderDir = path.join(ASSIGNMENTS_DIR, id, "grader");
  const tag = `grader-${id}`;

  progress(socketId, "build", 0, "Building grader image...");
  const build = spawn("docker", ["build", "-t", tag, graderDir]);
  forward(build, socketId);

  build.on("close", code => {
    if (code !== 0) {
      fail(socketId, "Docker build failed", code);
      return;
    }
    progress(socketId, "build", 100, "Build complete");
    runGrader(tag, id, subDir, outDir, socketId, publicResultPath);
  });
}

/* ---------- Run grader container ---------- */
function runGrader(tag, id, subDir, outDir, socketId, publicResultPath) {
  progress(socketId, "grade", 0, "Starting grader...");

  let hostSubDir = subDir;
  let hostOutDir = outDir;
  if (hostSubDir.startsWith("/app/data")) {
    const mapped = process.env.HOST_DATA_DIR || process.cwd() + "/data";
    hostSubDir = hostSubDir.replace("/app/data", mapped);
    hostOutDir = hostOutDir.replace("/app/data", mapped);
  }

  const run = spawn("docker", [
    "run", "--rm",
    "--network", "host", 
    "-v", `${hostSubDir}:/workspace/submission:ro`,
    "-v", `${hostOutDir}:/workspace/output`,
    "-v", "/var/run/docker.sock:/var/run/docker.sock", // required for nested Docker
    tag
  ]);

  forward(run, socketId);
  let gradeProgress = 10;
  const interval = setInterval(() => {
    gradeProgress = Math.min(gradeProgress + 10, 90);
    progress(socketId, "grade", gradeProgress, "Grading in progress...");
  }, 1500);

  run.on("close", code => {
    clearInterval(interval);
    if (code !== 0) {
      fail(socketId, "Grader run failed", code);
      return;
    }

    progress(socketId, "parse_result", 90, "Parsing result.json...");
    const resultPath = path.join(outDir, "result.json");
    try {
      if (fs.existsSync(resultPath)) {
        const result = JSON.parse(fs.readFileSync(resultPath, "utf8"));
        progress(socketId, "done", 100, "Grading complete");
        // include public result path so frontend can link to the output folder
        const payload = Object.assign({}, result, { resultPath: publicResultPath });
        io.to(socketId).emit("result", payload);
      } else {
        fail(socketId, "No result.json found", code);
      }
    } catch (e) {
      fail(socketId, "Could not parse result.json", code);
    }
    io.to(socketId).emit("done", { code });
  });
}

/* ---------- Helper: Forward logs ---------- */
function forward(child, socketId) {
  child.stdout.on("data", d => log(socketId, d.toString()));
  child.stderr.on("data", d => log(socketId, d.toString()));
}

/* ---------- Helper: Log ---------- */
function log(socketId, msg) {
  if (socketId) io.to(socketId).emit("log", msg);
  else console.log(msg);
}

/* ---------- Helper: Progress events ---------- */
function progress(socketId, phase, percent, message) {
  if (socketId) io.to(socketId).emit("progress", { phase, percent, message });
  log(socketId, `[${phase.toUpperCase()}] ${message}`);
}

/* ---------- Helper: Failure ---------- */
function fail(socketId, message, code = 1) {
  progress(socketId, "error", 100, message);
  io.to(socketId).emit("done", { code, error: message });
  log(socketId, `❌ ${message} (exit code ${code})`);
}

/* ---------- Start server ---------- */
const PORT = 4000;
server.listen(PORT, () => console.log(`API running on port ${PORT}`));
