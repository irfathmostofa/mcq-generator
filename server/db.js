import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.VERCEL
  ? path.join("/tmp", "ai-mcq-data")
  : path.join(__dirname, "..", "data");
const uploadDir = path.join(dataDir, "uploads");

fs.mkdirSync(uploadDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "app.db"));
export { uploadDir, dataDir };

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'super_admin',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  parent_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (subject_id, name)
);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject_id TEXT,
  topic_id TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  file_size_bytes INTEGER,
  page_count INTEGER,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  extraction_error TEXT,
  uploaded_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  subject_id TEXT,
  topic_id TEXT,
  page_number INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_estimate INTEGER,
  created_at TEXT NOT NULL,
  UNIQUE (resource_id, page_number, chunk_index)
);

CREATE TABLE IF NOT EXISTS question_bank (
  id TEXT PRIMARY KEY,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL,
  explanation TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  language TEXT NOT NULL DEFAULT 'en',
  subject_id TEXT,
  topic_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  is_uncertain INTEGER NOT NULL DEFAULT 0,
  uncertainty_reason TEXT,
  generation_model TEXT,
  prompt_version TEXT,
  generation_batch_id TEXT,
  generated_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS question_sources (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  chunk_id TEXT,
  page_number INTEGER,
  supporting_text TEXT,
  is_conflicting INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS examinations (
  id TEXT PRIMARY KEY,
  public_slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  subject_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  total_questions INTEGER NOT NULL DEFAULT 0,
  total_marks REAL NOT NULL DEFAULT 0,
  marks_per_question REAL NOT NULL DEFAULT 1,
  negative_marking REAL NOT NULL DEFAULT 0,
  time_limit_minutes INTEGER,
  starts_at TEXT,
  ends_at TEXT,
  max_attempts INTEGER NOT NULL DEFAULT 1,
  randomize_questions INTEGER NOT NULL DEFAULT 0,
  randomize_options INTEGER NOT NULL DEFAULT 0,
  result_visibility TEXT NOT NULL DEFAULT 'immediate',
  show_correct_answers INTEGER NOT NULL DEFAULT 0,
  show_explanations INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS examination_questions (
  id TEXT PRIMARY KEY,
  examination_id TEXT NOT NULL,
  source_question_id TEXT,
  sort_order INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL,
  explanation TEXT,
  marks REAL NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE (examination_id, sort_order)
);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (email, phone)
);

CREATE TABLE IF NOT EXISTS exam_attempts (
  id TEXT PRIMARY KEY,
  examination_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  access_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'in_progress',
  started_at TEXT NOT NULL,
  deadline_at TEXT,
  submitted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS participant_answers (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  examination_question_id TEXT NOT NULL,
  selected_option TEXT,
  marked_for_review INTEGER NOT NULL DEFAULT 0,
  answered_at TEXT,
  UNIQUE (attempt_id, examination_question_id)
);

CREATE TABLE IF NOT EXISTS exam_results (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL UNIQUE,
  examination_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  unanswered_count INTEGER NOT NULL DEFAULT 0,
  obtained_marks REAL NOT NULL DEFAULT 0,
  total_marks REAL NOT NULL,
  percentage REAL NOT NULL DEFAULT 0,
  rank INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS generation_jobs (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT UNIQUE,
  examination_title TEXT,
  subject_id TEXT,
  config TEXT NOT NULL DEFAULT '{}',
  selected_resource_ids TEXT NOT NULL DEFAULT '[]',
  model TEXT,
  prompt_version TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  generated_count INTEGER NOT NULL DEFAULT 0,
  validated_count INTEGER NOT NULL DEFAULT 0,
  uncertain_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`);

export function now() {
  return new Date().toISOString();
}

export function id() {
  return crypto.randomUUID();
}

export function bool(value) {
  return value ? 1 : 0;
}

export function asBool(value) {
  return Boolean(value);
}

export function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}

export function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}

export function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}
