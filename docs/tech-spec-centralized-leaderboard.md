# Tech Spec: Centralized Typing Score Storage

**Status:** Draft  
**Author:** joadoumie  
**Issue:** [#19](https://github.com/joadoumie/joadoumie.github.io/issues/19)

---

## Background

Typing scores are currently stored in browser `localStorage` under the key `jordi.leaderboard.v1`. Each visitor's scores are siloed to their own browser — there is no shared leaderboard, scores are lost on cache/storage clears, and the host's personal best is hardcoded in the client bundle.

Moving to a centralized store would give every visitor access to the same live leaderboard, make scores durable across devices and browsers, and allow the host's PB to be managed from a single source of truth.

---

## Goals

- Persist submitted scores in a hosted, centralized data store.
- Serve a shared, real-time leaderboard to all visitors.
- Keep the submit UX identical: `submit <handle>` in the terminal, no login required.
- Remain deployable as a fully static frontend on GitHub Pages (no self-hosted server).
- Degrade gracefully to `localStorage` when the remote is unreachable.

## Non-Goals

- User authentication or accounts (v1 is anonymous submit).
- Score editing or deletion by submitters.
- Real-time push/websocket updates (polling on load is sufficient).
- Algorithmic anti-cheat (the site is a personal portfolio, not a competitive platform).

---

## Proposed Architecture

### Backend: Supabase (Recommended)

Supabase is a hosted Postgres service with a first-party REST API (PostgREST) that can be called directly from the browser. This is already called out in `src/lib/leaderboard.ts` as the intended next step:

```ts
// localStorage-backed leaderboard. The README points to Supabase as the next
// step; for v1 we keep it local. Swap implementations here, not in the UI.
```

**Why Supabase over alternatives:**

| Concern | Supabase | Firebase Firestore | Cloudflare D1 + Worker |
|---|---|---|---|
| Setup complexity | Low — REST API out of the box | Low | Medium (Worker code required) |
| Query model | SQL (easy WPM sort, pagination) | NoSQL (requires composite index) | SQL |
| Frontend key exposure | Safe by design (anon key + RLS) | Safe (client config is public) | N/A (no exposed key) |
| Free tier | 500 MB DB, 2 GB bandwidth/mo | 1 GB storage, 50k reads/day | 100k reads/day |
| Existing codebase signal | Already referenced in comments | None | None |

**Verdict:** Supabase is the path of least resistance and the already-intended direction.

### Data Flow

```
Browser (React)
   │
   ├─ GET /rest/v1/scores  ──► Supabase PostgREST
   │                               └─ Postgres (scores table)
   │
   └─ POST /rest/v1/scores ──► Supabase PostgREST
                                   └─ Row-Level Security validates & inserts
```

---

## Data Model

### `scores` Table

```sql
CREATE TABLE public.scores (
  id           bigserial    PRIMARY KEY,
  name         text         NOT NULL,
  wpm          smallint     NOT NULL,
  acc          smallint     NOT NULL,
  raw          smallint     NOT NULL,
  consistency  smallint     NOT NULL,
  chars        smallint     NOT NULL,
  submitted_at timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT name_length     CHECK (char_length(name) BETWEEN 1 AND 16),
  CONSTRAINT wpm_range       CHECK (wpm > 0 AND wpm < 300),
  CONSTRAINT acc_range       CHECK (acc >= 0 AND acc <= 100),
  CONSTRAINT raw_range       CHECK (raw > 0 AND raw < 300),
  CONSTRAINT consistency_range CHECK (consistency >= 0 AND consistency <= 100),
  CONSTRAINT chars_positive  CHECK (chars > 0)
);

CREATE INDEX scores_wpm_idx ON public.scores (wpm DESC);
```

**Design notes:**

- `submitted_at` is set server-side — clients cannot forge submission dates.
- `raw` and `consistency` are already computed in `src/lib/typing.ts` but not persisted today; capturing them enriches future leaderboard displays without any UX change.
- `id` enables stable cursor-based pagination if the leaderboard grows large.
- The existing client-side `Score.when` field (an ISO date string) maps to `submitted_at::date` when reading back.

### Comparison with current `Score` type

| Current (`src/lib/leaderboard.ts`) | New DB column | Notes |
|---|---|---|
| `name: string` | `name text` | Same; max 16 chars enforced by constraint |
| `wpm: number` | `wpm smallint` | Same |
| `acc: number` | `acc smallint` | Same |
| `when: string` | `submitted_at timestamptz` | Server-set; format as `YYYY-MM-DD` on read |
| `pinned?: boolean` | — | Not stored; host PB remains client-side constant |
| — | `raw smallint` | New: raw WPM (already computed, not yet persisted) |
| — | `consistency smallint` | New: consistency % (already computed, not yet persisted) |
| — | `chars smallint` | New: character count |

---

## Row-Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- Anyone (anon role) can read all scores
CREATE POLICY "scores_select_public"
  ON public.scores FOR SELECT
  TO anon
  USING (true);

-- Anyone can insert their own score (no UPDATE or DELETE)
CREATE POLICY "scores_insert_public"
  ON public.scores FOR INSERT
  TO anon
  WITH CHECK (true);
```

The Supabase `anon` key is safe to embed in the frontend because RLS prevents any write beyond a single INSERT, and there is no sensitive data.

---

## API Contract

All calls use the Supabase REST API. The client needs two environment variables:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### Fetch leaderboard

```
GET {SUPABASE_URL}/rest/v1/scores
  ?select=name,wpm,acc,submitted_at
  &order=wpm.desc
  &limit=50

Headers:
  apikey: {SUPABASE_ANON_KEY}
  Authorization: Bearer {SUPABASE_ANON_KEY}
```

**Response (200):**

```json
[
  { "name": "joadoumie", "wpm": 129, "acc": 99, "submitted_at": "2026-01-15T20:30:00Z" },
  { "name": "challenger", "wpm": 115, "acc": 97, "submitted_at": "2026-06-10T14:22:00Z" }
]
```

### Submit score

```
POST {SUPABASE_URL}/rest/v1/scores

Headers:
  apikey: {SUPABASE_ANON_KEY}
  Authorization: Bearer {SUPABASE_ANON_KEY}
  Content-Type: application/json
  Prefer: return=representation

Body:
{
  "name": "challenger",
  "wpm": 115,
  "acc": 97,
  "raw": 118,
  "consistency": 88,
  "chars": 287
}
```

**Response (201):** The inserted row.  
**Response (400/422):** Constraint violation — impossible values rejected by the DB.

---

## Client-Side Changes

The UI layer (`TerminalTakeover.tsx`, `Leaderboard.tsx`, `Monkeytype.tsx`) does **not** need to change. All changes are contained in `src/lib/leaderboard.ts`, which already exists as an isolated persistence abstraction.

### `loadBoard()` — becomes async

```ts
export async function loadBoard(): Promise<Score[]> {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/scores` +
        `?select=name,wpm,acc,submitted_at&order=wpm.desc&limit=50`,
      { headers: supabaseHeaders() }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    return rows.map((r: RemoteScore) => ({
      name: r.name,
      wpm: r.wpm,
      acc: r.acc,
      when: r.submitted_at.slice(0, 10),
    }));
  } catch {
    // remote unavailable — fall back to local cache
    return loadBoardLocal();
  }
}
```

### `saveBoard()` — posts to Supabase, falls back locally

```ts
export async function saveBoard(score: Omit<Score, 'when' | 'pinned'> & {
  raw: number; consistency: number; chars: number;
}): Promise<void> {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/scores`,
      {
        method: 'POST',
        headers: { ...supabaseHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(score),
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch {
    // fall back: append to local board so the session isn't lost
    const local = loadBoardLocal();
    saveBoardLocal([...local, { ...score, when: new Date().toISOString().slice(0, 10) }]);
  }
}
```

### Callsite changes in `Monkeytype.tsx`

`loadBoard` becomes async, so it needs to be called in a `useEffect` with state. `submitScore` should be updated to pass `raw`, `consistency`, and `chars` alongside the existing `name`, `wpm`, and `acc`.

---

## Migration Plan

1. **Phase 1 — Supabase project setup:** Create project, run DDL, configure RLS.
2. **Phase 2 — Swap leaderboard.ts:** Implement remote `loadBoard` / `saveBoard` with `localStorage` fallback.
3. **Phase 3 — Seed host PB:** Insert `joadoumie / 129 / 99` into the DB so it loads from remote instead of being hardcoded.
4. **Phase 4 — Remove client hardcode:** Delete the `PINNED` constant from `leaderboard.ts` once the remote entry exists (or keep it as a client fallback).
5. **Phase 5 — Deprecate localStorage:** After a few weeks of confirmed remote stability, remove the `localStorage` write path.

---

## Open Questions

1. **Duplicate handles** — Should the same handle be allowed to appear multiple times (e.g., same person plays many sessions)? The current local board keeps all entries and shows the top 50. The remote could do the same, or could deduplicate per handle keeping the personal best.

2. **Host PB source of truth** — Should `joadoumie`'s pinned PB be kept as a client-side constant (current approach), or seeded into the DB and fetched like any other score? The DB approach is more flexible (easy to update) but requires the remote to be reachable for it to appear.

3. **Leaderboard cap** — 50 entries seems reasonable; confirm the right number before writing the RLS / query limit.

4. **Rate limiting** — Supabase's project-level rate limiting (default: 1000 req/min per project on free tier) is sufficient for a personal portfolio. If spam becomes an issue, a Supabase Edge Function could add per-IP throttling without changing the frontend contract.

5. **Offline / private browsing** — The `localStorage` fallback handles offline submissions gracefully; these scores will not sync to the global board. Acceptable for v1.
