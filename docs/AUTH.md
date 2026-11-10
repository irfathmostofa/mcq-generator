# Authentication

Admin authentication uses **Supabase Auth** (email + password).

## Flow

1. The browser signs in with `supabase.auth.signInWithPassword` (anon key). supabase-js stores and refreshes the session.
2. Every API call sends `Authorization: Bearer <access_token>` (`src/lib/api.ts`).
3. `server/auth.js` validates the token with Supabase Auth (`auth.getUser`), then checks that the user exists in `public.admin_profiles`.
4. The result is cached for 60 s per user to avoid a database round trip on every request.

| Response | Meaning |
| --- | --- |
| 401 | Missing, invalid or expired token |
| 403 | Valid Supabase user that is not an admin |
| 503 | Server is missing `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` |

The API fails closed: any verification error denies access.

## Create the first admin

1. Supabase Dashboard → Authentication → Users → **Add user** (tick *Auto Confirm User*).
2. In the SQL Editor, promote that user:

```sql
insert into public.admin_profiles (id, full_name, role)
select id, 'Your Name', 'super_admin'
from auth.users
where email = 'you@example.com';
```

To revoke access, delete the row from `admin_profiles` (effective within 60 s).

## Hardening checklist

- Disable public sign-ups: Authentication → Providers → Email → turn off **Allow new users to sign up**. Even if left on, new users cannot use the API without an `admin_profiles` row.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only. Never prefix it with `VITE_`.
- Use a strong password policy and enable MFA/leaked-password protection in Supabase settings.
