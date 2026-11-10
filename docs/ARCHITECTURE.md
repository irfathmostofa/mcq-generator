# Architecture

Three areas:

1. Admin dashboard (`/admin/*`) — authenticated.
2. AI MCQ engine — Gemini via edge function `generate-mcq`.
3. Public exam portal (`/exam/:slug`) — no participant accounts.

## Data flow

```text
PDF upload -> Storage + resources row
           -> extract-pdf -> document_chunks (page + chunk)
           -> generate-mcq -> validate JSON -> question_bank (draft)
           -> admin review -> examination_questions snapshot
           -> public exam-public (no keys)
           -> start-exam / save-answers / submit-exam
           -> evaluate-exam -> exam_results
           -> Excel export (report only)
```

## Security

- Gemini key and service role stay on the server.
- RLS blocks public access to answer keys and participant PII.
- Exam timer deadline is stored on `exam_attempts.deadline_at`.
- Evaluation never trusts client-submitted marks.

## Phases

See `docs/PHASES.md`. Implement one phase at a time. Do not regenerate working modules.
