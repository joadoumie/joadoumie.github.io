# Handoff: jordi adoumie · personal site

A monkeytype-inspired developer/PM portfolio with an ambient ASCII basketball court in the hero, a self-typing bio, a playable mini typing test that takes over with a matrix-green terminal post-session, a git-log-style projects list, and a contact card.

---

## About the design files

The files in `design/` are **design references created in HTML/JSX** — a high-fidelity prototype showing intended look, feel, and interaction. They are **not production code to ship as-is**. The job is to recreate the design in a real codebase that builds and deploys cleanly to **GitHub Pages**, using the framework you choose.

The prototype loads React + Babel from a CDN at runtime (in-browser JSX transpilation). Don't ship that pattern — bake it into a real build.

## Fidelity

**High-fidelity.** Final colors, typography, spacing, copy, animations, and interactions are all dialed in. Recreate pixel-for-pixel using these files as ground truth.

---

## Recommended stack

You said either is fine; given GH Pages + future iteration in Claude Code, the right call is:

### Vite + React + TypeScript (recommended)

- **Why over Next.js:** GH Pages is static. Next.js's value (SSR, image optimization, server actions) is wasted on a static export, and `next export` adds friction. Vite ships a clean static `dist/` folder, deploys to GH Pages in one workflow, and keeps the surface tiny.
- **Why over plain HTML:** the design has real component boundaries (Hero, Monkeytype, Court, Tweaks) and real state (typing test, terminal shell, leaderboard). React + TS pays for itself immediately.

### Suggested project layout

```
src/
  App.tsx
  main.tsx
  styles/
    tokens.css          # CSS custom properties from design/styles.css :root
    global.css          # body, a, ::selection, layout shell
    sections/           # one file per section, mirrors the prototype's structure
  components/
    Nav.tsx
    Hero.tsx
    AsciiCourt.tsx      # the ambient scene + HUD
    About.tsx
    Monkeytype.tsx      # stats card + playable test wrapper
    TypingTest.tsx      # the mini test itself
    TerminalTakeover.tsx # post-session matrix-green shell
    Leaderboard.tsx
    Work.tsx            # git-log projects list
    Contact.tsx
  data/
    projects.ts         # extracted from app.jsx PROJECTS const
    bio.ts              # HERO_BIO + HERO_META_LINES
  lib/
    leaderboard.ts      # client for the leaderboard API (see below)
    typing.ts           # WPM / accuracy math, prompt corpus
  hooks/
    useTweaks.ts        # port from tweaks-panel.jsx (or drop tweaks in prod)
public/
  fonts/                # if self-hosting JetBrains Mono instead of Google Fonts
```

### GH Pages deploy

- `vite.config.ts`: set `base: '/<repo-name>/'` (or `'/'` if deploying to a user/org page like `joadoumie.github.io`).
- Add `.github/workflows/deploy.yml` that runs `npm ci && npm run build` and publishes `dist/` via `actions/deploy-pages`. Use the official `actions/configure-pages` + `upload-pages-artifact` + `deploy-pages` trio.
- Custom domain: drop a `CNAME` file in `public/` if you want one.

---

## Leaderboard backend

The prototype's leaderboard is mocked in `monkeytype-test.jsx`. GH Pages can't run server code, so you need an external write target. Three options ranked by ease:

1. **Supabase (recommended).** Free tier, generous. Create a `scores` table (`id uuid pk`, `handle text`, `wpm int`, `accuracy int`, `created_at timestamp default now()`). Use the `@supabase/supabase-js` client directly from the browser with the **anon key** (safe to expose). Lock writes with a Row Level Security policy: allow `insert` where `wpm <= 250 AND length(handle) <= 24`, allow `select` to everyone. Read top N with `.from('scores').select().order('wpm', { ascending: false }).limit(8)`.
2. **Cloudflare Worker + KV/D1.** Tiny worker with two routes — `POST /scores` and `GET /scores?limit=8`. Free tier covers this comfortably. More setup than Supabase but no third-party SDK in the bundle.
3. **GitHub repo as DB (don't).** Tempting because everything's already on GitHub, but you'd need a token in the client and rate limits will bite. Skip.

Either way, validate server-side: cap WPM, throttle by IP, sanitize handle. Don't trust the client.

### Wiring it up

Replace the `submitScore` / `fetchLeaderboard` stubs in `TerminalTakeover.tsx` with calls to `lib/leaderboard.ts`. Keep the optimistic UI from the prototype — it feels good.

---

## Sections / Components

### Nav
Sticky top bar. Left: `▍ jordi.adoumie`. Right: `01 about · 02 type · 03 work · 04 contact` (smooth scroll to anchors). Adds a `.scrolled` class once `window.scrollY > 20` (lowers opacity / tightens border). Numbers in `--fg-mute`, labels in `--fg-dim`, hover → `--accent`.

### Hero
- **Eyebrow** with pulsing accent dot: `now playing · oh-my-posh nba integration`
- **Name** in 56px-ish weight 500: `jordi adoumie.` (period in `--accent`). Per-character stagger animation on mount.
- **Role line:** `pm @ bloomberg / bquant · prev microsoft`
- **Self-typing bio** at ~129 WPM (matches the brag): see `HERO_BIO` in `app.jsx`. Three reveal modes via Tweaks: `typewriter`, `fade`, `instant`. Cursor is a 1.05em accent block. Fixed `min-height: 6em` so layout doesn't jump.
- **Meta lines** below the bio (`now playing / open source / top speed`), revealed after typing finishes.
- **AsciiCourt** to the right (or below on mobile): see next section.

### AsciiCourt (`design/ascii-court.jsx`)
Ambient ASCII basketball court, ~32 cols × 14 rows, monospace. A `*` ball arcs from a player position toward the rim every few seconds. On hit, flashes `SWISH` / `RIM` / `MISS`. Uses `--accent` for ball + rim + flash, `--fg-mute` / `--fg-dim` for floor/lines/players. Below the scene is a fake terminal HUD that prints commands like `oh-my-posh print primary --shell zsh` and key=value telemetry. Toggleable via Tweaks (`showCourtAnimation`).

Implementation note: the scene is a single `<pre>` re-rendered on a `requestAnimationFrame` loop. Each cell is a span with a class — `c-ball`, `c-trail`, `c-rim`, `c-net`, `c-mute`, `c-floor`, `c-line`, `c-player`, `c-flash-made`. Keep it as a pre/spans grid; don't reach for canvas.

### About
Dense `key / value` rows on left, brief copy on right. Keys in `--fg-mute`, values in `--fg`. Content lives in `app.jsx` around line 270.

### Monkeytype (stats + test)
Two stacked cards, both on `--bg-1`:
- **Stats card** (`.mt-card`): top wpm `129` (large, `--accent`, 56px), accuracy `99%`, with a row of meta — `language: english · words: 50 · streak: 47 days · best on: thinkpad x1`.
- **Playable test** (`.mt-test`, see `monkeytype-test.jsx`): renders a 30-word prompt in `--fg-mute`. As the user types, correct chars flip to `--fg`, wrong chars to `--error` with bottom border, current char gets a 2px `--accent` underline. Live WPM + accuracy ticker in the head. Click-to-focus (`tabindex=0`); shows a "click or press any key to focus" hint when blurred.
- On completion, the test container morphs into the **TerminalTakeover** (matrix-green shell) at the same height — see next section.

Tweaks let you show stats only / test only / both.

### TerminalTakeover (post-session)
Replaces the test card in place when the run ends. Looks like a real shell.

- **Window chrome:** mac-style traffic dots + title `~ — typing-session — bash` on a green-tinted gradient.
- **Body** scrolls a self-typing terminal session:
  ```
  jordi@portfolio:~$ session --end
  ✓ session complete · captured 1 run
  jordi@portfolio:~$ cat results.json
  { "verdict": "PASS", "wpm": 87, "accuracy": 96, "rank": "#3 of 8" }
  jordi@portfolio:~$ leaderboard --top 8
  <ascii table>
  jordi@portfolio:~$ _   ← live blinking cursor
  ```
- **Live shell.** Captures keystrokes globally on `window` while visible. Commands:
  - `play-again` → resets the test
  - `submit <handle>` → posts score, updates leaderboard, pins the new row
  - `leaderboard` → reprints the table
  - `results` → reprints the JSON
  - `whoami` → prints handle / placeholder
  - `clear` → clears scrollback
  - `help` → command list
  - unknown → red `command not found: <cmd>`
- **Color rules:** prompt segments are colored like a real shell (user `--term-green`, host cyan-ish, path purple). Body text and JSON values are bright matrix-green `#00ff7f`. Verdict `PASS` glows. `FAIL` would use `--term-err`.
- **Leaderboard pinning:** the user's row gets `.pinned` (handle + wpm bright green with glow).

### Work (git-log style projects)
Header: `~/work · git log --oneline`. Then a list of `.commit` rows, each:
- bullet glyph in `--accent`
- short hash like `a3f9c2` in `--fg-mute`
- title (16px, `--fg`)
- description (13px, `--fg-dim`, max 60ch)
- meta row: tags (small accent-bordered pills), date
- `↗` arrow on the right, slides on hover

Project data is the `PROJECTS` array in `app.jsx` (~line 330). Four entries: oh-my-posh NBA segment, NBA CmdPal extension, Jordi Rants blog, and one more — copy them as-is.

### Contact
- Headline: `let's talk shop.` (period accent)
- Sub copy
- Link grid: github / youtube / blog / ms store. Each link is a 3-col row: `lbl` (mute) · `value` (fg) · `↗` arrow. Hover slides the arrow.

### Tweaks panel
The floating bottom-right panel is a development affordance. **Drop it from the production build** unless you actively want users to recolor your site. If you keep it, port `tweaks-panel.jsx` as a real React component and gate it behind `import.meta.env.DEV`.

---

## Design tokens

Lift these from `design/styles.css :root` directly into `tokens.css`:

```css
:root {
  --bg: #0e0e10;
  --bg-1: #131316;
  --bg-2: #1a1a1d;
  --bg-3: #232327;
  --line: #26262b;
  --fg: #d1d0c5;
  --fg-dim: #8a8a85;
  --fg-mute: #5a5a55;
  --accent: #e2b714;       /* monkeytype yellow */
  --accent-dim: #a3831a;
  --error: #ca4754;
  --mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
}
```

Terminal takeover scope (`.term-takeover`):
```
--term-green: #00ff7f;       /* matrix green, bright */
--term-green-bright: #6dffa3;
--term-green-dim: #2ea862;
--term-green-mute: #1f4a35;
--term-bg: #050807;
--term-fg: #00ff7f;
--term-fg-dim: #4ec984;
--term-fg-mute: #2a6b48;
--term-err: #ff6b6b;
```

### Type
- One family: **JetBrains Mono** (300/400/500/600/700 + 400 italic). Self-host via `@fontsource/jetbrains-mono` in production — don't keep the Google Fonts CDN link.
- Feature settings: `font-feature-settings: "ss01", "ss02", "calt", "liga";`
- Sizes: hero name ~56px / 500, section headers 28–32px, body 14–15px, meta 11–12px, micro labels 10–11px with `letter-spacing: 0.06–0.12em`.

### Spacing / shape
- Layout shell max-width ~1100px, generous side padding.
- Border radii: 2–4px. Nothing pillowy.
- Borders: 1px `--line`. Subtle.
- Selection: `::selection { background: var(--accent); color: var(--bg); }`.

---

## Interactions / animation

- **Char-by-char hero name:** opacity + translateY stagger, ~30ms per char.
- **Self-typing bio:** ~129 WPM = roughly 80ms per char with light jitter; cursor blinks at 1s.
- **Section fade-in on intersect:** `IntersectionObserver` adds a `.fade-in.visible` class.
- **Court loop:** rAF, ~30fps is plenty.
- **Test → terminal morph:** keep the same outer height (`Stage frame keeps prompt + end card the same vertical footprint` — see styles.css comment near line 546). Cross-fade the inner content.
- **Scanline overlay** on the terminal: subtle repeating linear-gradient, ~3% opacity. Don't overdo it.

Respect `prefers-reduced-motion`: kill the court loop, the typewriter (instant reveal), and any decorative bounce.

---

## Content / copy

All real copy lives in the JSX files. Don't paraphrase — copy strings verbatim:
- `HERO_BIO` (app.jsx ~line 118)
- `HERO_META_LINES` (~line 122)
- About key/value rows (~line 270)
- `PROJECTS` array (~line 330)
- Contact links (~line 410)

---

## Assets

- **Fonts:** JetBrains Mono (Google Fonts in prototype → switch to `@fontsource` for production).
- **Images:** none. Everything is type, ASCII, and CSS.
- **Favicon:** not in the prototype. Add a yellow caret `▍` SVG favicon.

---

## What's mocked vs. real

| Thing | Prototype | Production should |
|---|---|---|
| Leaderboard data | hardcoded array | Supabase / Worker (see above) |
| Score submission | console.log | `POST` to backend |
| Top WPM `129` | hardcoded | hardcode it (it's a brag, not a stat) |
| Streak `47 days` | hardcoded | hardcode or wire to Monkeytype profile if their API allows |
| `oh-my-posh nba integration` | hardcoded label | wire to live game via your existing segment if you want |
| Tweaks panel | always present | dev-only or removed |
| React + Babel via CDN | yes | replace with Vite build |

---

## Files in this handoff

- `design/index.html` — entry point. Shows how scripts compose.
- `design/styles.css` — every CSS rule. Treat as the source of truth for color, type, spacing, animation timing.
- `design/app.jsx` — Nav, Hero, About, Monkeytype wrapper, Work, Contact + content data.
- `design/ascii-court.jsx` — the ambient scene + HUD.
- `design/monkeytype-test.jsx` — playable test + TerminalTakeover + leaderboard mock.
- `design/tweaks-panel.jsx` — dev-mode tweak controls (drop or gate in prod).

---

## Suggested first PRs in Claude Code

1. **Scaffold Vite + React + TS, port tokens.css and global.css, get Nav + Hero shell rendering.**
2. **Port AsciiCourt as a self-contained component.** It's the trickiest piece; isolate it.
3. **Port the typing test + terminal takeover with the leaderboard still mocked.** Make sure the morph works.
4. **Stand up Supabase, wire `submit` and `leaderboard` commands to it. Add RLS policy.**
5. **Port Work + Contact (trivial after the rest).**
6. **GH Actions deploy workflow → push → live on `joadoumie.github.io/<repo>`.**
7. **Polish: reduced-motion, favicon, OG image, lighthouse pass.**
