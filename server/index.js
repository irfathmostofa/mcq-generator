import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { all, bool, db, get, id, now, run, uploadDir } from "./db.js";
import { loginLocalAdmin, requireAdmin, supabaseReady } from "./auth.js";
import { chunkPages, extractPdfPages, isLikelyScanned, repairBengaliSpacing } from "./extract.js";
import { calculateScore, generateFromChunks, rewriteQuestionStem } from "./generate.js";

const PORT = Number(process.env.PORT || 5173);
const DIST = path.join(process.cwd(), "dist");
const app = express();

app.use(cors());
app.use(express.json({ limit: "4mb" }));

function cleanText(value) {
  return rewriteQuestionStem(repairBengaliSpacing(value ?? ""));
}

function rewriteStoredText(table, columns) {
  const rows = all(`SELECT id, ${columns.join(", ")} FROM ${table}`);
  const assignments = columns.map((column) => `${column} = ?`).join(", ");
  const update = db.prepare(`UPDATE ${table} SET ${assignments} WHERE id = ?`);
  for (const row of rows) {
    const values = columns.map((column) =>
      column === "question_text"
        ? cleanText(row[column])
        : repairBengaliSpacing(row[column] ?? ""),
    );
    update.run(...values, row.id);
  }
}

rewriteStoredText("question_bank", [
  "question_text",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "explanation",
]);
rewriteStoredText("examination_questions", [
  "question_text",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "explanation",
]);
rewriteStoredText("document_chunks", ["content"]);
rewriteStoredText("question_sources", ["supporting_text"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-]+/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Only PDF files are supported"));
      return;
    }
    cb(null, true);
  },
});

function mapQuestion(row) {
  if (!row) return null;
  return {
    ...row,
    question_text: cleanText(row.question_text),
    option_a: repairBengaliSpacing(row.option_a),
    option_b: repairBengaliSpacing(row.option_b),
    option_c: repairBengaliSpacing(row.option_c),
    option_d: repairBengaliSpacing(row.option_d),
    explanation: row.explanation ? repairBengaliSpacing(row.explanation) : row.explanation,
    is_uncertain: Boolean(row.is_uncertain),
  };
}

function mapExam(row) {
  if (!row) return null;
  return {
    ...row,
    randomize_questions: Boolean(row.randomize_questions),
    randomize_options: Boolean(row.randomize_options),
    show_correct_answers: Boolean(row.show_correct_answers),
    show_explanations: Boolean(row.show_explanations),
  };
}

function mapJob(row) {
  if (!row) return null;
  return {
    ...row,
    config: JSON.parse(row.config || "{}"),
    selected_resource_ids: JSON.parse(row.selected_resource_ids || "[]"),
  };
}

function count(table, where = "", params = []) {
  const row = get(`SELECT COUNT(*) AS n FROM ${table} ${where}`, params);
  return row?.n ?? 0;
}

function publicExamPayload(exam) {
  return {
    id: exam.id,
    public_slug: exam.public_slug,
    title: exam.title,
    description: exam.description,
    instructions: exam.instructions,
    total_questions: exam.total_questions,
    total_marks: exam.total_marks,
    time_limit_minutes: exam.time_limit_minutes,
    starts_at: exam.starts_at,
    ends_at: exam.ends_at,
    result_visibility: exam.result_visibility,
    status: exam.status,
  };
}

function publicQuestions(examId) {
  return all(
    `SELECT id, examination_id, sort_order, question_text, option_a, option_b, option_c, option_d, marks
     FROM examination_questions WHERE examination_id = ? ORDER BY sort_order`,
    [examId],
  ).map((row) => ({
    ...row,
    question_text: cleanText(row.question_text),
    option_a: repairBengaliSpacing(row.option_a),
    option_b: repairBengaliSpacing(row.option_b),
    option_c: repairBengaliSpacing(row.option_c),
    option_d: repairBengaliSpacing(row.option_d),
  }));
}

async function processResource(resourceId) {
  const resource = get("SELECT * FROM resources WHERE id = ?", [resourceId]);
  if (!resource) throw new Error("Resource not found");
  run(
    "UPDATE resources SET processing_status = 'processing', updated_at = ? WHERE id = ?",
    [now(), resourceId],
  );
  try {
    const pages = await extractPdfPages(resource.storage_path);
    if (isLikelyScanned(pages)) {
      run(
        `UPDATE resources SET processing_status = 'ocr_required', page_count = ?, chunk_count = 0,
         extraction_error = ?, updated_at = ? WHERE id = ?`,
        [
          pages.length,
          "No extractable text. OCR is not implemented.",
          now(),
          resourceId,
        ],
      );
      return get("SELECT * FROM resources WHERE id = ?", [resourceId]);
    }
    run("DELETE FROM document_chunks WHERE resource_id = ?", [resourceId]);
    const chunks = chunkPages(pages);
    const timestamp = now();
    const insert = db.prepare(
      `INSERT INTO document_chunks
       (id, resource_id, subject_id, topic_id, page_number, chunk_index, content, token_estimate, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const chunk of chunks) {
      insert.run(
        id(),
        resourceId,
        resource.subject_id,
        resource.topic_id,
        chunk.pageNumber,
        chunk.chunkIndex,
        chunk.content,
        Math.ceil(chunk.content.length / 4),
        timestamp,
      );
    }
    run(
      `UPDATE resources SET processing_status = 'processed', page_count = ?, chunk_count = ?,
       extraction_error = NULL, updated_at = ? WHERE id = ?`,
      [pages.length, chunks.length, now(), resourceId],
    );
    return get("SELECT * FROM resources WHERE id = ?", [resourceId]);
  } catch (error) {
    run(
      `UPDATE resources SET processing_status = 'failed', extraction_error = ?, updated_at = ? WHERE id = ?`,
      [error instanceof Error ? error.message : "Extraction failed", now(), resourceId],
    );
    throw error;
  }
}

function evaluateAttempt(attempt) {
  const exam = get("SELECT * FROM examinations WHERE id = ?", [attempt.examination_id]);
  const questions = all(
    "SELECT * FROM examination_questions WHERE examination_id = ? ORDER BY sort_order",
    [exam.id],
  );
  const answers = all("SELECT * FROM participant_answers WHERE attempt_id = ?", [
    attempt.id,
  ]);
  const byQuestion = new Map(
    answers.map((answer) => [answer.examination_question_id, answer]),
  );
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;
  for (const question of questions) {
    const selected = byQuestion.get(question.id)?.selected_option ?? null;
    if (!selected) unanswered += 1;
    else if (selected === question.correct_option) correct += 1;
    else incorrect += 1;
  }
  const score = calculateScore({
    totalQuestions: questions.length,
    correctCount: correct,
    incorrectCount: incorrect,
    unansweredCount: unanswered,
    marksPerQuestion: exam.marks_per_question,
    negativeMarking: exam.negative_marking,
  });
  const timestamp = now();
  const existing = get("SELECT id FROM exam_results WHERE attempt_id = ?", [
    attempt.id,
  ]);
  if (existing) {
    run(
      `UPDATE exam_results SET correct_count = ?, incorrect_count = ?, unanswered_count = ?,
       obtained_marks = ?, total_marks = ?, percentage = ? WHERE attempt_id = ?`,
      [
        correct,
        incorrect,
        unanswered,
        score.obtainedMarks,
        score.totalMarks,
        score.percentage,
        attempt.id,
      ],
    );
  } else {
    run(
      `INSERT INTO exam_results
       (id, attempt_id, examination_id, participant_id, total_questions, correct_count, incorrect_count,
        unanswered_count, obtained_marks, total_marks, percentage, rank, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
      [
        id(),
        attempt.id,
        exam.id,
        attempt.participant_id,
        questions.length,
        correct,
        incorrect,
        unanswered,
        score.obtainedMarks,
        score.totalMarks,
        score.percentage,
        timestamp,
      ],
    );
  }
  const ranked = all(
    "SELECT id FROM exam_results WHERE examination_id = ? ORDER BY obtained_marks DESC, created_at ASC",
    [exam.id],
  );
  ranked.forEach((row, index) => {
    run("UPDATE exam_results SET rank = ? WHERE id = ?", [index + 1, row.id]);
  });
  return get("SELECT * FROM exam_results WHERE attempt_id = ?", [attempt.id]);
}

app.get("/api/auth/config", (_req, res) => {
  res.json({
    supabase: supabaseReady(),
    local: true,
  });
});

app.post("/api/auth/login", (req, res) => {
  const email = String(req.body?.email || "").trim();
  const password = String(req.body?.password || "");
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  const result = loginLocalAdmin(email, password);
  if (!result) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }
  res.json({ token: result.token, user: result.admin });
});

app.get("/api/auth/me", requireAdmin, (req, res) => {
  res.json(req.admin);
});

app.get("/api/dashboard", requireAdmin, (_req, res) => {
  res.json({
    stats: {
      total_resources: count("resources"),
      total_subjects: count("subjects"),
      total_topics: count("topics"),
      total_questions: count("question_bank"),
      total_published_exams: count("examinations", "WHERE status = ?", ["published"]),
      total_participants: count("participants"),
      total_completed_exams: count("exam_results"),
    },
    recent_exams: all(
      "SELECT * FROM examinations ORDER BY created_at DESC LIMIT 5",
    ).map(mapExam),
  });
});

app.get("/api/subjects", requireAdmin, (_req, res) => {
  res.json(all("SELECT * FROM subjects ORDER BY name"));
});

app.post("/api/subjects", requireAdmin, (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (name.length < 2) {
    res.status(400).json({ error: "Subject name is required" });
    return;
  }
  const timestamp = now();
  const row = {
    id: id(),
    name,
    description: req.body?.description || null,
    created_by: req.admin.id,
    created_at: timestamp,
    updated_at: timestamp,
  };
  try {
    run(
      `INSERT INTO subjects (id, name, description, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [row.id, row.name, row.description, row.created_by, row.created_at, row.updated_at],
    );
  } catch {
    res.status(409).json({ error: "Subject already exists" });
    return;
  }
  res.status(201).json(row);
});

app.patch("/api/subjects/:id", requireAdmin, (req, res) => {
  const existing = get("SELECT * FROM subjects WHERE id = ?", [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }
  const name = req.body?.name ? String(req.body.name).trim() : existing.name;
  const description =
    req.body?.description === undefined ? existing.description : req.body.description;
  run(
    "UPDATE subjects SET name = ?, description = ?, updated_at = ? WHERE id = ?",
    [name, description, now(), existing.id],
  );
  res.json(get("SELECT * FROM subjects WHERE id = ?", [existing.id]));
});

app.delete("/api/subjects/:id", requireAdmin, (req, res) => {
  run("DELETE FROM topics WHERE subject_id = ?", [req.params.id]);
  run("DELETE FROM subjects WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

app.get("/api/topics", requireAdmin, (req, res) => {
  const subjectId = String(req.query.subject_id || "");
  if (!subjectId) {
    res.status(400).json({ error: "subject_id is required" });
    return;
  }
  res.json(
    all("SELECT * FROM topics WHERE subject_id = ? ORDER BY name", [subjectId]),
  );
});

app.post("/api/topics", requireAdmin, (req, res) => {
  const name = String(req.body?.name || "").trim();
  const subjectId = String(req.body?.subject_id || "");
  if (!subjectId || name.length < 2) {
    res.status(400).json({ error: "subject_id and name are required" });
    return;
  }
  const timestamp = now();
  const row = {
    id: id(),
    subject_id: subjectId,
    parent_id: req.body?.parent_id || null,
    name,
    description: req.body?.description || null,
    created_at: timestamp,
    updated_at: timestamp,
  };
  run(
    `INSERT INTO topics (id, subject_id, parent_id, name, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.subject_id,
      row.parent_id,
      row.name,
      row.description,
      row.created_at,
      row.updated_at,
    ],
  );
  res.status(201).json(row);
});

app.delete("/api/topics/:id", requireAdmin, (req, res) => {
  run("DELETE FROM topics WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

app.get("/api/resources", requireAdmin, (req, res) => {
  const filters = [];
  const params = [];
  if (req.query.subject_id) {
    filters.push("subject_id = ?");
    params.push(req.query.subject_id);
  }
  if (req.query.topic_id) {
    filters.push("topic_id = ?");
    params.push(req.query.topic_id);
  }
  if (req.query.category) {
    filters.push("category = ?");
    params.push(req.query.category);
  }
  if (req.query.search) {
    filters.push("title LIKE ?");
    params.push(`%${req.query.search}%`);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  res.json(
    all(`SELECT * FROM resources ${where} ORDER BY created_at DESC`, params),
  );
});

app.post("/api/resources", requireAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "PDF file is required" });
    return;
  }
  const title = String(req.body?.title || req.file.originalname).trim();
  const timestamp = now();
  const rowId = id();
  run(
    `INSERT INTO resources
     (id, title, description, subject_id, topic_id, category, storage_path, original_filename,
      mime_type, file_size_bytes, page_count, chunk_count, processing_status, extraction_error,
      uploaded_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, 'pending', NULL, ?, ?, ?)`,
    [
      rowId,
      title,
      req.body?.description || null,
      req.body?.subject_id || null,
      req.body?.topic_id || null,
      req.body?.category || "other",
      req.file.path,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      req.admin.id,
      timestamp,
      timestamp,
    ],
  );
  try {
    const processed = await processResource(rowId);
    res.status(201).json(processed);
  } catch (error) {
    res.status(201).json({
      ...get("SELECT * FROM resources WHERE id = ?", [rowId]),
      extraction_error: error instanceof Error ? error.message : "Extraction failed",
    });
  }
});

app.post("/api/resources/:id/retry", requireAdmin, async (req, res) => {
  try {
    const processed = await processResource(req.params.id);
    res.json(processed);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Retry failed",
    });
  }
});

app.get("/api/questions", requireAdmin, (req, res) => {
  const filters = [];
  const params = [];
  if (req.query.subject_id) {
    filters.push("subject_id = ?");
    params.push(req.query.subject_id);
  }
  if (req.query.topic_id) {
    filters.push("topic_id = ?");
    params.push(req.query.topic_id);
  }
  if (req.query.difficulty) {
    filters.push("difficulty = ?");
    params.push(req.query.difficulty);
  }
  if (req.query.status) {
    filters.push("status = ?");
    params.push(req.query.status);
  }
  if (req.query.search) {
    filters.push("question_text LIKE ?");
    params.push(`%${req.query.search}%`);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const questions = all(
    `SELECT * FROM question_bank ${where} ORDER BY created_at DESC`,
    params,
  ).map(mapQuestion);
  const sources = all("SELECT * FROM question_sources");
  const byQuestion = new Map();
  for (const source of sources) {
    const list = byQuestion.get(source.question_id) || [];
    list.push(source);
    byQuestion.set(source.question_id, list);
  }
  res.json(
    questions.map((question) => ({
      ...question,
      sources: byQuestion.get(question.id) || [],
    })),
  );
});

app.patch("/api/questions/:id", requireAdmin, (req, res) => {
  const existing = get("SELECT * FROM question_bank WHERE id = ?", [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: "Question not found" });
    return;
  }
  const fields = [
    "question_text",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "correct_option",
    "explanation",
    "difficulty",
    "status",
  ];
  for (const field of fields) {
    if (req.body?.[field] !== undefined) existing[field] = req.body[field];
  }
  run(
    `UPDATE question_bank SET question_text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?,
     correct_option = ?, explanation = ?, difficulty = ?, status = ?, updated_at = ? WHERE id = ?`,
    [
      existing.question_text,
      existing.option_a,
      existing.option_b,
      existing.option_c,
      existing.option_d,
      existing.correct_option,
      existing.explanation,
      existing.difficulty,
      existing.status,
      now(),
      existing.id,
    ],
  );
  res.json(mapQuestion(get("SELECT * FROM question_bank WHERE id = ?", [existing.id])));
});

app.post("/api/questions/:id/approve", requireAdmin, (req, res) => {
  run(
    "UPDATE question_bank SET status = 'approved', is_uncertain = 0, updated_at = ? WHERE id = ?",
    [now(), req.params.id],
  );
  res.json(mapQuestion(get("SELECT * FROM question_bank WHERE id = ?", [req.params.id])));
});

app.post("/api/questions/:id/reject", requireAdmin, (req, res) => {
  run(
    "UPDATE question_bank SET status = 'rejected', updated_at = ? WHERE id = ?",
    [now(), req.params.id],
  );
  res.json(mapQuestion(get("SELECT * FROM question_bank WHERE id = ?", [req.params.id])));
});

app.post("/api/generate", requireAdmin, (req, res) => {
  const config = req.body?.config;
  // Question count follows marks: total_marks / marks_per_question.
  const totalMarks = Number(config?.total_marks);
  const perQuestion = Number(config?.marks_per_question);
  if (totalMarks > 0 && perQuestion > 0) {
    config.number_of_questions = Math.round(totalMarks / perQuestion);
  }
  if (!config?.resource_ids?.length || !config.number_of_questions) {
    res.status(400).json({ error: "Invalid generation configuration" });
    return;
  }
  const easy = Number(config.difficulty_distribution?.easy || 0);
  const medium = Number(config.difficulty_distribution?.medium || 0);
  const hard = Number(config.difficulty_distribution?.hard || 0);
  if (easy + medium + hard !== 100) {
    res.status(400).json({ error: "Difficulty distribution must total 100%" });
    return;
  }
  const idempotencyKey = req.body?.idempotency_key || null;
  if (idempotencyKey) {
    const existing = get(
      "SELECT * FROM generation_jobs WHERE idempotency_key = ?",
      [idempotencyKey],
    );
    if (existing) {
      res.json(mapJob(existing));
      return;
    }
  }
  const placeholders = config.resource_ids.map(() => "?").join(",");
  const resources = all(
    `SELECT * FROM resources WHERE id IN (${placeholders})`,
    config.resource_ids,
  );
  const processed = resources.filter((item) => item.processing_status === "processed");
  if (processed.length === 0) {
    res.status(400).json({ error: "Select at least one processed resource" });
    return;
  }
  const chunks = all(
    `SELECT c.*, r.category FROM document_chunks c
     JOIN resources r ON r.id = c.resource_id
     WHERE c.resource_id IN (${placeholders})`,
    config.resource_ids,
  );
  const existingTexts = all("SELECT question_text FROM question_bank").map(
    (row) => row.question_text,
  );
  const drafts = generateFromChunks(chunks, config, existingTexts);
  const timestamp = now();
  const jobId = id();
  const batchId = jobId;
  let uncertain = 0;
  const insertQuestion = db.prepare(
    `INSERT INTO question_bank
     (id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation,
      difficulty, language, subject_id, topic_id, status, is_uncertain, uncertainty_reason,
      generation_model, prompt_version, generation_batch_id, generated_at, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertSource = db.prepare(
    `INSERT INTO question_sources
     (id, question_id, resource_id, chunk_id, page_number, supporting_text, is_conflicting, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
  );
  for (const draft of drafts) {
    const questionId = id();
    const status = draft.is_uncertain ? "uncertain" : "draft";
    if (draft.is_uncertain) uncertain += 1;
    insertQuestion.run(
      questionId,
      cleanText(draft.question_text),
      repairBengaliSpacing(draft.option_a),
      repairBengaliSpacing(draft.option_b),
      repairBengaliSpacing(draft.option_c),
      repairBengaliSpacing(draft.option_d),
      draft.correct_option,
      draft.explanation ? repairBengaliSpacing(draft.explanation) : draft.explanation,
      draft.difficulty,
      config.language,
      config.subject_id || null,
      config.topic_ids?.[0] || null,
      status,
      bool(draft.is_uncertain),
      draft.uncertainty_reason,
      "local-source-grounded",
      "v1",
      batchId,
      timestamp,
      req.admin.id,
      timestamp,
      timestamp,
    );
    insertSource.run(
      id(),
      questionId,
      draft.source_resource_id,
      draft.source_chunk_id,
      draft.source_page_number,
      repairBengaliSpacing(draft.supporting_text),
      timestamp,
    );
  }
  run(
    `INSERT INTO generation_jobs
     (id, idempotency_key, examination_title, subject_id, config, selected_resource_ids, model,
      prompt_version, status, generated_count, validated_count, uncertain_count, error_message,
      created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
    [
      jobId,
      idempotencyKey,
      config.examination_title || null,
      config.subject_id || null,
      JSON.stringify(config),
      JSON.stringify(config.resource_ids),
      "local-source-grounded",
      "v1",
      "completed",
      drafts.length,
      drafts.length,
      uncertain,
      req.admin.id,
      timestamp,
      timestamp,
    ],
  );
  res.status(201).json(mapJob(get("SELECT * FROM generation_jobs WHERE id = ?", [jobId])));
});

app.get("/api/exams", requireAdmin, (_req, res) => {
  res.json(all("SELECT * FROM examinations ORDER BY created_at DESC").map(mapExam));
});

app.post("/api/exams", requireAdmin, (req, res) => {
  const title = String(req.body?.title || "").trim();
  if (title.length < 3) {
    res.status(400).json({ error: "Title is required" });
    return;
  }
  const timestamp = now();
  const row = {
    id: id(),
    public_slug: crypto.randomUUID().slice(0, 8),
    title,
    description: req.body?.description || null,
    instructions: req.body?.instructions || null,
    subject_id: req.body?.subject_id || null,
    status: "draft",
    total_questions: 0,
    total_marks: 0,
    marks_per_question: Number(req.body?.marks_per_question || 1),
    negative_marking: Number(req.body?.negative_marking || 0),
    time_limit_minutes: req.body?.time_limit_minutes || 30,
    starts_at: req.body?.starts_at || null,
    ends_at: req.body?.ends_at || null,
    max_attempts: Number(req.body?.max_attempts || 1),
    randomize_questions: bool(req.body?.randomize_questions),
    randomize_options: bool(req.body?.randomize_options),
    result_visibility: req.body?.result_visibility || "immediate",
    show_correct_answers: bool(req.body?.show_correct_answers),
    show_explanations: bool(req.body?.show_explanations),
    created_by: req.admin.id,
    published_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
  run(
    `INSERT INTO examinations
     (id, public_slug, title, description, instructions, subject_id, status, total_questions, total_marks,
      marks_per_question, negative_marking, time_limit_minutes, starts_at, ends_at, max_attempts,
      randomize_questions, randomize_options, result_visibility, show_correct_answers, show_explanations,
      created_by, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.public_slug,
      row.title,
      row.description,
      row.instructions,
      row.subject_id,
      row.status,
      row.total_questions,
      row.total_marks,
      row.marks_per_question,
      row.negative_marking,
      row.time_limit_minutes,
      row.starts_at,
      row.ends_at,
      row.max_attempts,
      row.randomize_questions,
      row.randomize_options,
      row.result_visibility,
      row.show_correct_answers,
      row.show_explanations,
      row.created_by,
      row.published_at,
      row.created_at,
      row.updated_at,
    ],
  );
  res.status(201).json(mapExam(get("SELECT * FROM examinations WHERE id = ?", [row.id])));
});

app.post("/api/exams/:id/publish", requireAdmin, (req, res) => {
  const exam = get("SELECT * FROM examinations WHERE id = ?", [req.params.id]);
  if (!exam) {
    res.status(404).json({ error: "Examination not found" });
    return;
  }
  const questions = all(
    "SELECT * FROM question_bank WHERE status = 'approved' AND (subject_id = ? OR ? IS NULL) ORDER BY created_at",
    [exam.subject_id, exam.subject_id],
  );
  if (questions.length === 0) {
    res.status(400).json({ error: "Approve at least one question before publishing" });
    return;
  }
  run("DELETE FROM examination_questions WHERE examination_id = ?", [exam.id]);
  const timestamp = now();
  questions.forEach((question, index) => {
    run(
      `INSERT INTO examination_questions
       (id, examination_id, source_question_id, sort_order, question_text, option_a, option_b, option_c,
        option_d, correct_option, explanation, marks, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id(),
        exam.id,
        question.id,
        index + 1,
        cleanText(question.question_text),
        repairBengaliSpacing(question.option_a),
        repairBengaliSpacing(question.option_b),
        repairBengaliSpacing(question.option_c),
        repairBengaliSpacing(question.option_d),
        question.correct_option,
        question.explanation,
        exam.marks_per_question,
        timestamp,
      ],
    );
  });
  const totalMarks = questions.length * exam.marks_per_question;
  run(
    `UPDATE examinations SET status = 'published', published_at = ?, total_questions = ?, total_marks = ?,
     updated_at = ? WHERE id = ?`,
    [timestamp, questions.length, totalMarks, timestamp, exam.id],
  );
  res.json(mapExam(get("SELECT * FROM examinations WHERE id = ?", [exam.id])));
});

app.post("/api/exams/:id/unpublish", requireAdmin, (req, res) => {
  run(
    "UPDATE examinations SET status = 'unpublished', updated_at = ? WHERE id = ?",
    [now(), req.params.id],
  );
  res.json(mapExam(get("SELECT * FROM examinations WHERE id = ?", [req.params.id])));
});

app.post("/api/exams/:id/close", requireAdmin, (req, res) => {
  run(
    "UPDATE examinations SET status = 'closed', updated_at = ? WHERE id = ?",
    [now(), req.params.id],
  );
  res.json(mapExam(get("SELECT * FROM examinations WHERE id = ?", [req.params.id])));
});

app.get("/api/results", requireAdmin, (req, res) => {
  const filters = [];
  const params = [];
  if (req.query.examination_id) {
    filters.push("r.examination_id = ?");
    params.push(req.query.examination_id);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  res.json(
    all(
      `SELECT r.*, p.full_name, p.email, p.phone, e.title AS examination_title
       FROM exam_results r
       JOIN participants p ON p.id = r.participant_id
       JOIN examinations e ON e.id = r.examination_id
        ${where}
        ORDER BY CASE WHEN r.rank IS NULL THEN 1 ELSE 0 END, r.rank ASC, r.obtained_marks DESC, r.created_at ASC`,
      params,
    ),
  );
});

app.get("/api/public/exams/:slug", (req, res) => {
  const exam = get(
    "SELECT * FROM examinations WHERE public_slug = ? AND status = 'published'",
    [req.params.slug],
  );
  if (!exam) {
    res.status(404).json({ error: "Examination not found or not published" });
    return;
  }
  res.json({
    exam: publicExamPayload(exam),
    questions: publicQuestions(exam.id),
  });
});

app.post("/api/public/exams/:slug/start", (req, res) => {
  const exam = get(
    "SELECT * FROM examinations WHERE public_slug = ? AND status = 'published'",
    [req.params.slug],
  );
  if (!exam) {
    res.status(404).json({ error: "Examination not found or not published" });
    return;
  }
  const fullName = String(req.body?.full_name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const phone = String(req.body?.phone || "").trim();
  if (fullName.length < 2 || !email.includes("@") || phone.length < 8) {
    res.status(400).json({ error: "Valid name, email, and phone are required" });
    return;
  }
  let participant = get(
    "SELECT * FROM participants WHERE email = ? AND phone = ?",
    [email, phone],
  );
  const timestamp = now();
  if (!participant) {
    participant = {
      id: id(),
      full_name: fullName,
      email,
      phone,
      created_at: timestamp,
    };
    run(
      "INSERT INTO participants (id, full_name, email, phone, created_at) VALUES (?, ?, ?, ?, ?)",
      [participant.id, participant.full_name, participant.email, participant.phone, participant.created_at],
    );
  }
  const attempts = all(
    "SELECT * FROM exam_attempts WHERE examination_id = ? AND participant_id = ?",
    [exam.id, participant.id],
  );
  if (attempts.length >= exam.max_attempts) {
    res.status(409).json({ error: "Maximum attempts reached" });
    return;
  }
  const inProgress = attempts.find((item) => item.status === "in_progress");
  if (inProgress) {
    res.json({
      access_token: inProgress.access_token,
      attempt_id: inProgress.id,
      deadline_at: inProgress.deadline_at,
      exam: publicExamPayload(exam),
      questions: publicQuestions(exam.id),
    });
    return;
  }
  const startedAt = new Date();
  const deadline = exam.time_limit_minutes
    ? new Date(startedAt.getTime() + exam.time_limit_minutes * 60 * 1000)
    : null;
  const attemptId = id();
  const accessToken = crypto.randomUUID();
  run(
    `INSERT INTO exam_attempts
     (id, examination_id, participant_id, access_token, status, started_at, deadline_at, submitted_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'in_progress', ?, ?, NULL, ?, ?)`,
    [
      attemptId,
      exam.id,
      participant.id,
      accessToken,
      startedAt.toISOString(),
      deadline ? deadline.toISOString() : null,
      timestamp,
      timestamp,
    ],
  );
  res.status(201).json({
    access_token: accessToken,
    attempt_id: attemptId,
    deadline_at: deadline ? deadline.toISOString() : null,
    exam: publicExamPayload(exam),
    questions: publicQuestions(exam.id),
  });
});

function loadAttempt(token) {
  return get("SELECT * FROM exam_attempts WHERE access_token = ?", [token]);
}

app.post("/api/public/attempts/save", (req, res) => {
  const attempt = loadAttempt(req.body?.access_token);
  if (!attempt) {
    res.status(404).json({ error: "Attempt not found" });
    return;
  }
  if (attempt.status !== "in_progress") {
    res.status(409).json({ error: "Attempt is already submitted" });
    return;
  }
  if (attempt.deadline_at && new Date(attempt.deadline_at).getTime() < Date.now()) {
    run(
      "UPDATE exam_attempts SET status = 'expired', updated_at = ? WHERE id = ?",
      [now(), attempt.id],
    );
    res.status(409).json({ error: "Time expired" });
    return;
  }
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
  const timestamp = now();
  for (const answer of answers) {
    const existing = get(
      "SELECT id FROM participant_answers WHERE attempt_id = ? AND examination_question_id = ?",
      [attempt.id, answer.examination_question_id],
    );
    if (existing) {
      run(
        `UPDATE participant_answers SET selected_option = ?, marked_for_review = ?, answered_at = ?
         WHERE id = ?`,
        [
          answer.selected_option || null,
          bool(answer.marked_for_review),
          timestamp,
          existing.id,
        ],
      );
    } else {
      run(
        `INSERT INTO participant_answers
         (id, attempt_id, examination_question_id, selected_option, marked_for_review, answered_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id(),
          attempt.id,
          answer.examination_question_id,
          answer.selected_option || null,
          bool(answer.marked_for_review),
          timestamp,
        ],
      );
    }
  }
  res.json({ ok: true });
});

app.post("/api/public/attempts/submit", (req, res) => {
  const attempt = loadAttempt(req.body?.access_token);
  if (!attempt) {
    res.status(404).json({ error: "Attempt not found" });
    return;
  }
  if (attempt.status !== "in_progress") {
    const result = get("SELECT * FROM exam_results WHERE attempt_id = ?", [attempt.id]);
    res.json({ result, already_submitted: true });
    return;
  }
  const expired =
    attempt.deadline_at && new Date(attempt.deadline_at).getTime() < Date.now();
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
  const timestamp = now();
  for (const answer of answers) {
    const existing = get(
      "SELECT id FROM participant_answers WHERE attempt_id = ? AND examination_question_id = ?",
      [attempt.id, answer.examination_question_id],
    );
    if (existing) {
      run(
        `UPDATE participant_answers SET selected_option = ?, marked_for_review = ?, answered_at = ?
         WHERE id = ?`,
        [
          answer.selected_option || null,
          bool(answer.marked_for_review),
          timestamp,
          existing.id,
        ],
      );
    } else {
      run(
        `INSERT INTO participant_answers
         (id, attempt_id, examination_question_id, selected_option, marked_for_review, answered_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id(),
          attempt.id,
          answer.examination_question_id,
          answer.selected_option || null,
          bool(answer.marked_for_review),
          timestamp,
        ],
      );
    }
  }
  run(
    `UPDATE exam_attempts SET status = ?, submitted_at = ?, updated_at = ? WHERE id = ?`,
    [expired ? "auto_submitted" : "submitted", timestamp, timestamp, attempt.id],
  );
  const result = evaluateAttempt({ ...attempt, status: "submitted" });
  const exam = get("SELECT * FROM examinations WHERE id = ?", [attempt.examination_id]);
  const payload = { result, already_submitted: false };
  if (exam.result_visibility !== "immediate") {
    payload.result = {
      ...result,
      correct_count: null,
      incorrect_count: null,
      obtained_marks: null,
      percentage: null,
      rank: null,
      hidden: true,
    };
  }
  res.json(payload);
});

app.get("/api/public/attempts/:token/result", (req, res) => {
  const attempt = loadAttempt(req.params.token);
  if (!attempt) {
    res.status(404).json({ error: "Attempt not found" });
    return;
  }
  const exam = get("SELECT * FROM examinations WHERE id = ?", [attempt.examination_id]);
  const result = get("SELECT * FROM exam_results WHERE attempt_id = ?", [attempt.id]);
  if (!result) {
    res.status(404).json({ error: "Result not ready" });
    return;
  }
  if (exam.result_visibility === "hidden") {
    res.json({ hidden: true, exam: publicExamPayload(exam) });
    return;
  }
  if (exam.result_visibility === "after_close" && exam.status !== "closed") {
    res.json({ hidden: true, exam: publicExamPayload(exam) });
    return;
  }
  res.json({ result, exam: publicExamPayload(exam) });
});

app.use((error, _req, res, _next) => {
  res.status(400).json({ error: error.message || "Request failed" });
});

if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(path.join(DIST, "index.html"));
  });
}

if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI MCQ platform listening on ${PORT}`);
  });
}

export default app;
