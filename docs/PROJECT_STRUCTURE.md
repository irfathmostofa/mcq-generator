# Project structure

```text
.
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig*.json
├── components.json
├── .env.example
├── public/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── INSTALLATION.md
│   ├── PHASES.md
│   ├── STORAGE.md
│   └── TESTING.md
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 0001_init.sql
│   │   └── 0002_rls.sql
│   └── functions/
│       ├── _shared/
│       ├── generate-mcq/
│       ├── extract-pdf/
│       ├── exam-public/
│       ├── start-exam/
│       ├── save-answers/
│       ├── submit-exam/
│       └── evaluate-exam/
└── src/
    ├── app/routes.tsx
    ├── components/          # shared UI
    ├── features/            # auth, theme
    ├── layouts/
    ├── lib/                 # supabase, zod, prompts, validation
    ├── pages/admin/
    ├── pages/public/
    ├── services/            # data access
    └── types/
```
