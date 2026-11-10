# Installation

## Prerequisites

- Node.js 22.9+ (the API uses the built-in `node:sqlite`)
- npm
- A Supabase project
- A Gemini API key (server-side only)

## Steps

```bash
npm install
npm run dev
```

Scripts are Windows-safe (`PORT=...` no longer depends on bash). Vite uses the Rollup WASM build so Windows Application Control does not need to load `rollup.win32-x64-msvc.node`.

If a policy still blocks the app, copy the project out of `Downloads` (for example `C:\dev\ai-mcq-exam-platform`) and run `npm install` again.

Copy `.env.example` to `.env` and fill in the Supabase values, then create your first admin (see `docs/AUTH.md`). The API reads `.env` automatically.

Frontend: Vite on port 5173  
API: Express + SQLite on port 3001, proxied through `/api`

Optional later: copy `.env.example` and map the same schema onto Supabase. Do not put Gemini or service-role keys in frontend env vars.
