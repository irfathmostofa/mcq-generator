# Environment variables

## Frontend (Vite)

| Name | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon key |

## API server (Express / Vercel function)

| Name | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL (falls back to `VITE_SUPABASE_URL`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Verifies tokens and reads `admin_profiles`. Server only |

## Edge Functions only

| Name | Purpose |
| --- | --- |
| `USER_LLM_API_KEY` | Gemini API key |
| `USER_LLM_BASE_URL` | Gemini API base URL |
| `USER_LLM_MODEL` | Configurable model, default `gemini-2.0-flash` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only |

Never put Gemini or service-role values in `VITE_*` variables or source files.
