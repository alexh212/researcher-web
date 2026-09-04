# researcher-web

A single-page Next.js frontend for Scout that opens an SSE connection to a separate FastAPI backend and renders a streaming multi-agent research report as it arrives.

**Status:** prototype
**Live:** https://researcher-web-nine.vercel.app — the backend it talks to is on Render's free tier and cold-starts after idling, so the first request can take a few seconds; the app shows "Server is waking up, hang tight..." if no frame has arrived within 6 seconds.

## The problem

A research run takes tens of seconds across several backend phases, so a plain request/response would leave the user staring at a spinner. The app consumes an SSE stream with seven frame types (`status`, `sub_questions`, `research_complete`, `report_chunk`, `evaluation`, `done`, `error`) and maps each onto a piece of UI, re-rendering an accumulating markdown string on every token chunk. It also has to handle a cold backend without looking broken, and be cancellable mid-stream.

## How it works

Everything lives in two files. `app/layout.tsx` is a thin root layout that loads the Geist fonts and sets the page title ("Scout"). `app/page.tsx` is the whole app: one `'use client'` component, `Home()`, holding all state.

`API_URL` resolves at module scope from `process.env.NEXT_PUBLIC_API_URL`, falling back to a hardcoded `https://researcher-api-bpkt.onrender.com`. `handleResearch()` guards against empty input and re-entry, resets state, builds `${API_URL}/api/research/stream?question=...&num_agents=...`, and opens a native `EventSource` (GET-only, no custom headers). It arms a 6-second cold-start timer at the same time.

`eventSource.onmessage` clears that timer on the first frame, parses the payload, and branches on `data.type`. `status` frames drive the status line. `sub_questions` populates the agent cards. `report_chunk` appends to the `report` string, which `<ReactMarkdown>` re-renders in full on every chunk with a blinking cursor while writing. `evaluation` fills a collapsible panel, with `getScoreClass()` bucketing each 1-5 score into low/medium/high. `done` sets the final status, closes the stream, and scrolls the report into view. `handleCancel()` closes the `EventSource` and resets all five pieces of state.

The agent cards look like live per-researcher progress but aren't. On a `sub_questions` frame, all cards are created at once as `'waiting'`, then a single `setTimeout(..., 300)` flips every card to `'running'` together. They all flip to `'done'` together on one `research_complete` (or `status: 'writing'`) frame. There's no per-agent event anywhere in the stream. This matches the backend: `agents/orchestrator.py` runs `await asyncio.gather(*tasks, return_exceptions=True)` with no `as_completed` and no progress channel, so it emits exactly one `research_complete` after every researcher finishes — it has no individual completions to report.

Styling is hand-written CSS in `app/globals.css` (dark theme, ~262 lines). Tailwind is imported but not actually wired up — see limitations.

## Setup

```bash
npm install
npm run dev   # http://localhost:3000 — no env file needed
npm run build && npm run start   # production build check
```

| Env var | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the researcher-api backend, read once at module scope in `app/page.tsx`. Optional — omitting it silently points local dev at the live production backend (`https://researcher-api-bpkt.onrender.com`), not a local one. Since it's `NEXT_PUBLIC_*`, changing it on Vercel requires a redeploy. |

## Known limitations

- The agent status cards are not real per-researcher telemetry. They flip from waiting to running together on a 300ms client-side timer, and to done together on one batch frame from the backend. If one researcher takes 2 seconds and another takes 40, the UI shows all cards pulsing for the full 40 seconds and then all turning green at once.
- Stream errors are swallowed. `eventSource.onerror` only calls `eventSource.close()` — it never sets an error state. On a network drop, CORS rejection, or backend 500, the spinner keeps spinning, `isLoading` stays true, and the input stays disabled. The only recovery is Cancel or a page reload. The "Something went wrong" UI only fires for an in-band `{type: 'error'}` frame.
- Because the wake timer only clears inside `onmessage`, a connection that fails before any frame arrives still shows "Server is waking up, hang tight..." at 6 seconds, which is misleading for what's actually a dead connection.
- Markdown tables don't render. `react-markdown` is used with no plugins, so GFM is off, while the backend's synthesizer prompt explicitly asks the model to use tables. Any table shows up as raw pipe characters.
- Tailwind is dead weight. `globals.css` uses Tailwind v4's `@import "tailwindcss"` with no `@config` or `@plugin` directive, so `tailwind.config.ts` and the `@tailwindcss/typography` plugin it registers are never loaded. There are zero Tailwind utility classes in `page.tsx`. `.prose` is hand-written CSS, unrelated to the typography plugin.
- No responsive design. `globals.css` has zero `@media` queries; `.agents` is hardcoded to a two-column grid, so the 12-agent option produces six cramped rows on a phone.
- No tests, no CI, no error boundary. A malformed SSE frame throws inside `JSON.parse` in `onmessage` and takes down the render with no fallback UI.
- State is entirely ephemeral — no history, no URL state, no persistence. Refreshing mid-run or after a run loses the report, even though the backend does save the session server-side.
- Backend CORS is a hardcoded allowlist of three origins (localhost:3000 and two specific Vercel hostnames), so a new Vercel preview deployment of this frontend will fail against the production API with the same swallowed-error behavior described above.
- The GitHub link in the nav points to a personal profile, not to this repository.

## What I'd build next

- Make the agent cards honest: either relabel them as planned sub-questions and drop the running/done states, or change the backend to use `asyncio.as_completed` and emit an `agent_complete` frame per researcher, and key card state off that.
- Fix `eventSource.onerror` to set a real error status and message, and clear the wake timer there too.
- Add `remark-gfm` to the `ReactMarkdown` call and table styles to `.prose`, since the backend prompt asks for tables.
- Decide on Tailwind: either wire up `tailwind.config.ts` and actually use the typography plugin, or remove it and keep the hand-written CSS.
