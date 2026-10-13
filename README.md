# DevRoadmap

A personal 8-month developer roadmap app: track curriculum topics, log daily study sessions, manage DSA practice, GitHub repos, milestone projects, weekly reviews, and progress analytics — all per user, with email/password and Google sign-in.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | React 19 + TanStack Start (SSR + server functions) |
| Build tool | Vite 7 |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives) |
| Backend | Lovable Cloud (managed PostgreSQL, auth, RLS) — powered by Supabase |
| Language | TypeScript |
| Tests | Vitest |

## Prerequisites to run locally

1. **Node.js 20+** — download from <https://nodejs.org> (LTS version).
2. **A package manager** — npm (comes with Node) or [Bun](https://bun.sh) (`curl -fsSL https://bun.sh/install | bash`).
3. **Backend keys** — the app talks to a Lovable Cloud (Supabase) backend. You have two options:
   - **Use the existing backend:** copy `.env` from your Lovable project (it contains `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_PROJECT_ID`).
   - **Your own backend:** create a free project at <https://supabase.com>, then fill the same three variables with your project's URL and publishable (anon) key. Apply the schema with `supabase db push` (see `supabase/migrations/`).

## Run it

```bash
# 1. Install dependencies
npm install        # or: bun install

# 2. Start the dev server
npm run dev        # or: bun run dev

# 3. Open http://localhost:8080
```

Sign up with an email + password (or Google) and start tracking.

## Other commands

```bash
npm run build      # production build
npm run test       # run unit tests (progress rules, streaks, URL safety)
npm run lint       # eslint
```

## Project structure

```
src/
  data/        # Static curriculum catalog (8 months, topics, resources, milestones)
  lib/         # Pure progress/calculation rules + tests
  components/  # UI components (app shell, heatmap, topic detail, charts)
  routes/      # Pages: dashboard, roadmap, daily tracker, DSA, projects,
               # GitHub tracker, resources, reviews, analytics, settings
  integrations/supabase/  # Generated backend client
supabase/migrations/     # Database schema (per-user progress tables, RLS)
```

## Notes

- The curriculum catalog lives in `src/data/` as versioned static data; the database stores only per-user progress keyed by stable IDs (`m1-t1-s1` style).
- Progress rules (streaks, milestone completion, exactly 3 submission slots per topic) are pure functions in `src/lib/calc.ts` with tests in `src/lib/calc.test.ts`.
