# Deployment

## Vercel

1. Import the repo. `vercel.json` already sets the Vite build, the SPA rewrites and the `/api` function.
2. Add environment variables (Project Settings → Environment Variables):
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, plus the `USER_LLM_*` values.
3. In Supabase → Authentication → URL Configuration, add your Vercel domain to **Site URL / Redirect URLs**.

Authentication is stateless (Supabase JWT), so it works across serverless instances.
Application data (SQLite in `/tmp`) is **not persistent** on Vercel. Migrate the data layer to Supabase Postgres before real use.

## Frontend

Target: Cloudflare Pages (free tier).

1. Build command: `npm run build`
2. Output directory: `dist`
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Pages environment variables.

Do not set Gemini keys or the Supabase service role key in Pages.

## Backend

1. Create a Supabase project.
2. Run SQL in `supabase/migrations/`.
3. Create storage bucket `resources` (private). See `docs/STORAGE.md`.
4. Deploy edge functions:

```bash
# generate-mcq extract-pdf exam-public start-exam save-answers submit-exam evaluate-exam
npx supabase functions deploy generate-mcq
```

5. Set function secrets: `USER_LLM_API_KEY`, `USER_LLM_MODEL`, `USER_LLM_BASE_URL`.

## Notes

- Free-tier quotas are limited. Batch generation and cache extracted chunks.
- Public exam traffic must go through edge functions so answer keys never reach the browser.
