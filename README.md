# AI-Powered MCQ Generation and Online Examination Platform

React + TypeScript + Vite frontend with Supabase (Postgres, Auth, Storage, Edge Functions) and Gemini for source-grounded MCQ generation.

Authentication is handled by Supabase Auth. The Express API verifies every admin request against Supabase and the `admin_profiles` table. Application data currently lives in local SQLite (see `docs/DEPLOYMENT.md` for the Vercel caveat).

## Stack

- Frontend: React, TypeScript, Vite, Tailwind, shadcn/ui, React Router, Zod
- Backend: Supabase Postgres, Auth, Storage, Edge Functions
- AI: Google Gemini (server-side only)
- PDF: PDF.js (text PDFs; scanned files are `ocr_required`)
- Excel: SheetJS
- Deploy: Cloudflare Pages + Supabase

## Apps

- Admin dashboard: `/admin` (authenticated)
- Public exams: `/exam/:slug` (no participant accounts)

## Quick start

```bash
npm install
npm run dev
```

Windows cmd/PowerShell is supported. If Vite was previously blocked by Application Control, reinstall after pulling these script changes.

Admin sign-in uses Supabase Auth. See `docs/AUTH.md` to create the first admin.

1. Create a subject and topics.
2. Upload a text PDF.
3. Generate MCQs, approve them, publish an exam.
4. Open `/exam/:slug` as a participant.

See `docs/INSTALLATION.md`.

## Docs

- `docs/PROJECT_STRUCTURE.md`
- `docs/ARCHITECTURE.md`
- `docs/PHASES.md`
- `docs/STORAGE.md`
- `docs/DEPLOYMENT.md`
- `docs/TESTING.md`

## Rules

- Do not auto-publish AI questions.
- Do not send correct answers to the exam client before submission.
- Do not use mock data as the database.
- Do not claim OCR works until it is implemented.
