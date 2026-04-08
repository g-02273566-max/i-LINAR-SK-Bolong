import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("ilinar.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    class TEXT NOT NULL,
    gender TEXT,
    archived INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS screenings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    subject TEXT NOT NULL, -- BM, EN, NUM
    items TEXT NOT NULL, -- JSON string of results
    status TEXT NOT NULL, -- Intervensi, Pengukuhan, Penggayaan
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, subject)
  );

  CREATE TABLE IF NOT EXISTS phase_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    phase INTEGER NOT NULL,
    items TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reading_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    category TEXT NOT NULL, -- Rendah, Sederhana, Tinggi
    status TEXT NOT NULL, -- Bacaan Lambat, Bacaan Sederhana, Bacaan Lancar
    is_mahir INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // --- API ROUTES ---

  // Students
  app.get("/api/students", (req, res) => {
    const students = db.prepare("SELECT * FROM students WHERE archived = 0").all();
    res.json(students);
  });

  app.post("/api/students", (req, res) => {
    const { name, class: className, gender } = req.body;
    const info = db.prepare("INSERT INTO students (name, class, gender) VALUES (?, ?, ?)").run(name, className, gender);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/students/:id", (req, res) => {
    db.prepare("UPDATE students SET archived = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Screenings
  app.get("/api/screenings", (req, res) => {
    const screenings = db.prepare("SELECT * FROM screenings").all();
    res.json(screenings);
  });

  app.post("/api/screenings", (req, res) => {
    const { student_id, subject, items, status } = req.body;
    try {
      db.prepare("INSERT INTO screenings (student_id, subject, items, status) VALUES (?, ?, ?, ?)").run(student_id, subject, JSON.stringify(items), status);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Saringan sudah wujud untuk murid ini." });
    }
  });

  // Phase Tests
  app.get("/api/phase-tests", (req, res) => {
    const tests = db.prepare("SELECT * FROM phase_tests").all();
    res.json(tests);
  });

  app.post("/api/phase-tests", (req, res) => {
    const { student_id, subject, phase, items, status } = req.body;
    db.prepare("INSERT INTO phase_tests (student_id, subject, phase, items, status) VALUES (?, ?, ?, ?, ?)").run(student_id, subject, phase, JSON.stringify(items), status);
    res.json({ success: true });
  });

  // Reading Records
  app.get("/api/reading-records", (req, res) => {
    const records = db.prepare("SELECT * FROM reading_records").all();
    res.json(records);
  });

  app.post("/api/reading-records", (req, res) => {
    const { student_id, category, status, is_mahir } = req.body;
    db.prepare("INSERT INTO reading_records (student_id, category, status, is_mahir) VALUES (?, ?, ?, ?)").run(student_id, category, status, is_mahir ? 1 : 0);
    res.json({ success: true });
  });

  // Dashboard Summary
  app.get("/api/dashboard/summary", (req, res) => {
    const { class: className } = req.query;
    let studentQuery = "SELECT id FROM students WHERE archived = 0";
    let params: any[] = [];
    
    if (className && className !== 'Semua') {
      studentQuery += " AND class = ?";
      params.push(className);
    }
    
    const students = db.prepare(studentQuery).all(...params);
    const totalStudents = students.length;
    
    const summary = {
      Intervensi: 0,
      Pengukuhan: 0,
      Penggayaan: 0,
      None: 0
    };

    students.forEach(s => {
      const latestTest = db.prepare("SELECT status FROM phase_tests WHERE student_id = ? ORDER BY created_at DESC LIMIT 1").get(s.id);
      if (latestTest) {
        summary[latestTest.status.replace('LULUS ', '')]++;
      } else {
        const screening = db.prepare("SELECT status FROM screenings WHERE student_id = ? LIMIT 1").get(s.id);
        if (screening) {
          summary[screening.status]++;
        } else {
          summary.None++;
        }
      }
    });

    res.json({ totalStudents, summary });
  });

  // Dashboard Phase Analysis
  app.get("/api/dashboard/phases", (req, res) => {
    const { class: className } = req.query;
    let studentQuery = "SELECT id FROM students WHERE archived = 0";
    let params: any[] = [];
    
    if (className && className !== 'Semua') {
      studentQuery += " AND class = ?";
      params.push(className);
    }
    
    const students = db.prepare(studentQuery).all(...params);
    
    const phases = [
      { name: 'Saringan', Intervensi: 0, Pengukuhan: 0, Penggayaan: 0 },
      { name: 'Fasa 1', Intervensi: 0, Pengukuhan: 0, Penggayaan: 0 },
      { name: 'Fasa 2', Intervensi: 0, Pengukuhan: 0, Penggayaan: 0 },
      { name: 'Fasa 3', Intervensi: 0, Pengukuhan: 0, Penggayaan: 0 },
      { name: 'Fasa 4', Intervensi: 0, Pengukuhan: 0, Penggayaan: 0 },
    ];

    students.forEach(s => {
      // Screening
      const screening = db.prepare("SELECT status FROM screenings WHERE student_id = ? LIMIT 1").get(s.id);
      if (screening) {
        phases[0][screening.status as keyof typeof phases[0]]++;
      }

      // Phases 1-4
      for (let i = 1; i <= 4; i++) {
        const test = db.prepare("SELECT status FROM phase_tests WHERE student_id = ? AND phase = ? ORDER BY created_at DESC LIMIT 1").get(s.id, i);
        if (test) {
          const status = test.status.replace('LULUS ', '');
          const phaseObj = phases[i];
          if (status in phaseObj) {
            (phaseObj as any)[status]++;
          }
        }
      }
    });

    res.json(phases);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
