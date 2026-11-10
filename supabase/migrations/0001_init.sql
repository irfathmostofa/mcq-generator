-- AI MCQ Exam Platform — initial schema
-- UUID identifiers, timestamps, status fields, FKs, indexes

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.resource_category as enum (
  'previous_question_paper',
  'previous_answer_sheet',
  'subject_content',
  'topic_content',
  'study_material',
  'notes',
  'other'
);

create type public.processing_status as enum (
  'pending',
  'processing',
  'processed',
  'ocr_required',
  'failed'
);

create type public.question_status as enum (
  'draft',
  'uncertain',
  'approved',
  'rejected'
);

create type public.difficulty_level as enum (
  'easy',
  'medium',
  'hard'
);

create type public.question_language as enum (
  'en',
  'bn'
);

create type public.exam_status as enum (
  'draft',
  'published',
  'unpublished',
  'closed'
);

create type public.attempt_status as enum (
  'in_progress',
  'submitted',
  'auto_submitted',
  'expired'
);

create type public.result_visibility as enum (
  'immediate',
  'after_close',
  'hidden'
);

-- ---------------------------------------------------------------------------
-- admin_profiles
-- ---------------------------------------------------------------------------

create table public.admin_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'admin' check (role in ('admin', 'super_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- subjects / topics
-- ---------------------------------------------------------------------------

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  parent_id uuid references public.topics (id) on delete set null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, name)
);

create index topics_subject_id_idx on public.topics (subject_id);
create index topics_parent_id_idx on public.topics (parent_id);

-- ---------------------------------------------------------------------------
-- resources / document_chunks
-- ---------------------------------------------------------------------------

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  subject_id uuid references public.subjects (id) on delete set null,
  topic_id uuid references public.topics (id) on delete set null,
  category public.resource_category not null default 'other',
  storage_path text not null,
  original_filename text not null,
  mime_type text not null default 'application/pdf',
  file_size_bytes bigint,
  page_count integer,
  chunk_count integer not null default 0,
  processing_status public.processing_status not null default 'pending',
  extraction_error text,
  uploaded_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index resources_subject_id_idx on public.resources (subject_id);
create index resources_topic_id_idx on public.resources (topic_id);
create index resources_category_idx on public.resources (category);
create index resources_status_idx on public.resources (processing_status);

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  topic_id uuid references public.topics (id) on delete set null,
  page_number integer not null,
  chunk_index integer not null,
  content text not null,
  token_estimate integer,
  created_at timestamptz not null default now(),
  unique (resource_id, page_number, chunk_index)
);

create index document_chunks_resource_id_idx on public.document_chunks (resource_id);
create index document_chunks_subject_topic_idx on public.document_chunks (subject_id, topic_id);

-- ---------------------------------------------------------------------------
-- question_bank / question_sources
-- ---------------------------------------------------------------------------

create table public.question_bank (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option char(1) not null check (correct_option in ('A', 'B', 'C', 'D')),
  explanation text,
  difficulty public.difficulty_level not null default 'medium',
  language public.question_language not null default 'en',
  subject_id uuid references public.subjects (id) on delete set null,
  topic_id uuid references public.topics (id) on delete set null,
  status public.question_status not null default 'draft',
  is_uncertain boolean not null default false,
  uncertainty_reason text,
  generation_model text,
  prompt_version text,
  generation_batch_id uuid,
  generated_at timestamptz,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index question_bank_subject_id_idx on public.question_bank (subject_id);
create index question_bank_topic_id_idx on public.question_bank (topic_id);
create index question_bank_status_idx on public.question_bank (status);
create index question_bank_difficulty_idx on public.question_bank (difficulty);
create index question_bank_batch_idx on public.question_bank (generation_batch_id);

create table public.question_sources (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.question_bank (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete restrict,
  chunk_id uuid references public.document_chunks (id) on delete set null,
  page_number integer,
  supporting_text text,
  is_conflicting boolean not null default false,
  created_at timestamptz not null default now()
);

create index question_sources_question_id_idx on public.question_sources (question_id);
create index question_sources_resource_id_idx on public.question_sources (resource_id);

-- ---------------------------------------------------------------------------
-- examinations / examination_questions (immutable snapshot)
-- ---------------------------------------------------------------------------

create table public.examinations (
  id uuid primary key default gen_random_uuid(),
  public_slug text not null unique,
  title text not null,
  description text,
  instructions text,
  subject_id uuid references public.subjects (id) on delete set null,
  status public.exam_status not null default 'draft',
  total_questions integer not null default 0,
  total_marks numeric(8, 2) not null default 0,
  marks_per_question numeric(6, 2) not null default 1,
  negative_marking numeric(6, 2) not null default 0,
  time_limit_minutes integer,
  starts_at timestamptz,
  ends_at timestamptz,
  max_attempts integer not null default 1,
  randomize_questions boolean not null default false,
  randomize_options boolean not null default false,
  result_visibility public.result_visibility not null default 'immediate',
  show_correct_answers boolean not null default false,
  show_explanations boolean not null default false,
  created_by uuid references public.admin_profiles (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index examinations_status_idx on public.examinations (status);
create index examinations_slug_idx on public.examinations (public_slug);

create table public.examination_questions (
  id uuid primary key default gen_random_uuid(),
  examination_id uuid not null references public.examinations (id) on delete cascade,
  source_question_id uuid references public.question_bank (id) on delete set null,
  sort_order integer not null,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option char(1) not null check (correct_option in ('A', 'B', 'C', 'D')),
  explanation text,
  marks numeric(6, 2) not null default 1,
  created_at timestamptz not null default now(),
  unique (examination_id, sort_order)
);

create index examination_questions_exam_id_idx on public.examination_questions (examination_id);

-- ---------------------------------------------------------------------------
-- participants / exam_attempts / participant_answers / exam_results
-- ---------------------------------------------------------------------------

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  unique (email, phone)
);

create index participants_email_idx on public.participants (email);

create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  examination_id uuid not null references public.examinations (id) on delete restrict,
  participant_id uuid not null references public.participants (id) on delete restrict,
  access_token uuid not null unique default gen_random_uuid(),
  status public.attempt_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  deadline_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exam_attempts_exam_id_idx on public.exam_attempts (examination_id);
create index exam_attempts_participant_id_idx on public.exam_attempts (participant_id);
create unique index exam_attempts_active_unique
  on public.exam_attempts (examination_id, participant_id)
  where status = 'in_progress';

create table public.participant_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts (id) on delete cascade,
  examination_question_id uuid not null references public.examination_questions (id) on delete restrict,
  selected_option char(1) check (selected_option in ('A', 'B', 'C', 'D')),
  marked_for_review boolean not null default false,
  answered_at timestamptz,
  unique (attempt_id, examination_question_id)
);

create index participant_answers_attempt_id_idx on public.participant_answers (attempt_id);

create table public.exam_results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.exam_attempts (id) on delete cascade,
  examination_id uuid not null references public.examinations (id) on delete restrict,
  participant_id uuid not null references public.participants (id) on delete restrict,
  total_questions integer not null,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  unanswered_count integer not null default 0,
  obtained_marks numeric(8, 2) not null default 0,
  total_marks numeric(8, 2) not null,
  percentage numeric(6, 2) not null default 0,
  rank integer,
  created_at timestamptz not null default now()
);

create index exam_results_examination_id_idx on public.exam_results (examination_id);
create index exam_results_participant_id_idx on public.exam_results (participant_id);

-- ---------------------------------------------------------------------------
-- generation_jobs (traceability / idempotency)
-- ---------------------------------------------------------------------------

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text unique,
  examination_title text,
  subject_id uuid references public.subjects (id) on delete set null,
  config jsonb not null default '{}'::jsonb,
  selected_resource_ids uuid[] not null default '{}',
  model text,
  prompt_version text,
  status text not null default 'pending',
  generated_count integer not null default 0,
  validated_count integer not null default 0,
  uncertain_count integer not null default 0,
  error_message text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.admin_profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.subjects
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.topics
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.resources
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.question_bank
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.examinations
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.exam_attempts
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.generation_jobs
  for each row execute function public.set_updated_at();
