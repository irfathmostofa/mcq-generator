# Implementation phases

Structure is in place. Implement in this order.

## Phase 1 — Foundation

Auth, admin layout, subjects/topics CRUD, env, migrations.

## Phase 2 — Resources

PDF upload, storage, PDF.js extraction, chunking, retry, `ocr_required`.

## Phase 3 — AI MCQ engine (highest priority)

Chunk retrieval, prompt in `src/lib/prompts/mcq-generation.ts`, structured JSON, `src/lib/mcq-validation.ts`, duplicate detection, batching, review UI, question bank.

## Phase 4 — Examinations

Snapshots, public slug, participant intake, timer, answer persistence, secure submit.

## Phase 5 — Results

Server evaluation, negative marking, admin table, SheetJS export.

## Phase 6 — Test and deploy

Security, RLS, PDF, generation, submit, Excel, Cloudflare Pages.
