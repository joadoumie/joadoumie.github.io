# Tech Spec: Centralized Typing Score Storage

**Status:** Draft  
**Issue:** #19  
**Author:** joadoumie

---

## Problem

Typing scores are currently stored in `localStorage`, which means:

- Scores are device-local and session-scoped — a user on a different device sees an empty board.
- The leaderboard can't function as a true global ranking.
- There's no persistent history of challengers.

The goal is a centralized leaderboard that any visitor can submit to and read from, with no backend server to manage.

---

## Recommendation: Supabase

Supabase (hosted Postgres + auto-generated REST API) is the right choice because:

- **No server needed.** The site is a static Vite/React build on GitHub Pages; Supabase's JS client calls the API directly from the browser.
- **RLS keeps the anon key safe.** Row-Level Security policies ensure the embedded public key can only INSERT and SELECT, never modify or delete rows.
- **Free tier is more than sufficient.** A personal portfolio leaderboard will never approach Supabase's 50,000 MAU / 500 MB free limits.
- **Already the intended next step.** `src/lib/leaderboard.ts` already contains the comment pointing to Supabase as v2.

---

## Design Decisions

### Host's score is pinned and hardcoded

The host's personal best (joadoumie / 129 wpm / 99%) is **always shown at row 0, regardless of what the remote returns**. This is already implemented via the `PINNED` constant in `src/lib/leaderboard.ts`.

**Rules:**

- `PINNED` is a client-side constant. It is **never written to or read from Supabase**.
- When `loadBoard()` fetches remote scores, the result set excludes the pinned entry (the filter `!(e.name === PINNED.name && e.wpm === PINNED.wpm)` is already in both render sites).
- The rendering layer (`Leaderboard.tsx`, `TerminalTakeover.tsx`) prepends `PINNED` before display — this is already implemented and requires no change.
- Updating the host's PB means editing the `PINNED` constant in `leaderboard.ts` — no DB migration needed.

```ts
// src/lib/leaderboard.ts — unchanged
export const PINNED: Score = {
  name: 'joadoumie',
  wpm: 129,
  acc: 99,
  when: 'personal best',
  pinned: true,
};
```

---

## DB Schema

One table in Supabase:

```sql
create table scores (
  id           bigserial primary key,
  name         text        not null check (char_length(name) between 1 and 16),
  wpm          int         not null check (wpm between 1 and 300),
  acc          int         not null check (acc between 1 and 100),
  raw          int         not null check (raw between 1 and 400),
  consistency  int         not null check (consistency between 0 and 100),
  submitted_at timestamptz not null default now()
);
```

Notes:

- `name` / `wpm` / `acc` map directly to the existing `Score` type. `raw` and `consistency` are already computed in the app but not persisted today — adding them now costs nothing.
- `submitted_at` is set server-side so clients cannot forge dates. The existing `when` field (a date string) is derived from this on read.
- DB-level constraints (`wpm between 1 and 300`, etc.) reject impossible values before they land.
- The same handle can appear multiple times. The leaderboard query returns distinct top scores sorted by `wpm DESC`, so a user who improves will naturally rise.

---

## Row-Level Security

```sql
alter table scores enable row level security;

-- anyone can read
create policy "public select"
  on scores for select
  using (true);

-- anyone can insert (constraints above prevent abuse)
create policy "public insert"
  on scores for insert
  with check (true);

-- no update, no delete
```

The anon key is safe to embed in the frontend bundle — it can only read and append, never modify.

---

## API Contract

All calls go through the Supabase JS client (`@supabase/supabase-js`). No custom Edge Functions needed for v1.

### `loadBoard()` → `Score[]`

```ts
const { data } = await supabase
  .from('scores')
  .select('name, wpm, acc, submitted_at')
  .order('wpm', { ascending: false })
  .limit(50);
```

Returns up to 50 rows, already sorted. The caller does not prepend `PINNED` — that happens in the render layer (unchanged).

### `saveBoard(entries)` — replaced by `submitScore(entry)`

The existing `saveBoard(entries: Score[])` signature (which overwrites the entire board) is replaced with a single-row insert:

```ts
async function submitScore(entry: Omit<Score, 'pinned' | 'when'>): Promise<void> {
  await supabase.from('scores').insert({
    name: entry.name,
    wpm: entry.wpm,
    acc: entry.acc,
    raw: entry.raw ?? entry.wpm,   // fallback for callers that don't pass raw
    consistency: entry.consistency ?? 100,
  });
}
```

---

## Client-Side Changes (scope: `src/lib/leaderboard.ts` only)

The UI components (`TerminalTakeover`, `Leaderboard`, `Monkeytype`) are **untouched** — the leaderboard persistence layer is already behind the `loadBoard` / `saveBoard` abstraction.

```ts
// src/lib/leaderboard.ts (v2 sketch)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

export async function loadBoard(): Promise<Score[]> {
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('name, wpm, acc, submitted_at')
      .order('wpm', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      name: r.name,
      wpm: r.wpm,
      acc: r.acc,
      when: r.submitted_at.slice(0, 10),
    }));
  } catch {
    // fall back to localStorage when offline / Supabase unreachable
    return loadBoardLocal();
  }
}

export async function submitScore(entry: Omit<Score, 'pinned' | 'when'>): Promise<void> {
  try {
    await supabase.from('scores').insert({ ...entry });
    // mirror to localStorage so offline sessions still show the entry
    const local = loadBoardLocal();
    saveBoardLocal([...local, { ...entry, when: new Date().toISOString().slice(0, 10) }]);
  } catch {
    saveBoardLocal([
      ...loadBoardLocal(),
      { ...entry, when: new Date().toISOString().slice(0, 10) },
    ]);
  }
}
```

The existing `loadBoard` / `saveBoard` functions become `loadBoardLocal` / `saveBoardLocal` and remain as fallbacks.

### Async migration note

`loadBoard` changes from synchronous to `async`. Call sites (`Monkeytype.tsx` / `TypingTest.tsx`) need to be updated to use `useEffect` + `useState` (or an existing data-fetching pattern already in the codebase).

---

## Environment Variables

Two Vite env vars are needed (safe to commit the anon key to `.env.example`; the actual values go in the GitHub repo secrets for the Pages deploy action):

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

---

## Migration Plan

1. Create the Supabase project and run the schema + RLS SQL above.
2. Install `@supabase/supabase-js` (`npm install @supabase/supabase-js`).
3. Add env vars to GitHub Pages deploy action (`Settings → Secrets`).
4. Update `src/lib/leaderboard.ts` as shown above.
5. Update call sites to handle the `async` `loadBoard`.
6. Ship — existing localStorage scores are untouched; users see the global board on next load.

---

## Open Questions

1. **Leaderboard cap** — spec proposes 50 entries. Increase or decrease?
2. **Deduplication** — allow the same handle multiple times (natural ranking), or keep only the personal best per handle?
3. **Rate limiting** — defer per-IP submission limits to v2, or add a Supabase Edge Function in v1?
