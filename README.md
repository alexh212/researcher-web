# Scout Web

The Next.js frontend for [Scout](https://github.com/alexh212/researcher-api). Enter a question, choose the number of researchers, and read the report as it arrives. The evaluation appears after the report is complete.

**Status: prototype.**

[Demo](https://researcher-web-nine.vercel.app/) · [Backend source](https://github.com/alexh212/researcher-api) · [API docs](https://researcher-api-bpkt.onrender.com/docs)

## How it works

[app/page.tsx](app/page.tsx) opens an `EventSource` connection to the FastAPI backend and handles progress, report chunks, the evaluation, and completion. [app/layout.tsx](app/layout.tsx) supplies the page layout and fonts. Styling is in [app/globals.css](app/globals.css).

The report renders through `react-markdown` as text arrives. Agent cards represent batch progress, not individual researcher completion: they start together and finish when the backend reports completed research or begins writing. A card marked Done does not establish that its researcher succeeded.

Cancel closes the browser's stream connection and clears the current view. State is kept in memory; refreshing the page loses the report.

The hosted backend may take time to start after idling. The frontend shows a waiting message after six seconds without a stream frame, but that timer does not distinguish a slow startup from a connection failure.

## Run locally

Start the backend using its [setup instructions](https://github.com/alexh212/researcher-api#run-locally), then:

```bash
git clone https://github.com/alexh212/researcher-web.git
cd researcher-web
npm install
```

Create `.env.local` to use your local backend:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm run dev
```

Open `http://localhost:3000`. Without `NEXT_PUBLIC_API_URL`, the app defaults to the hosted backend at `https://researcher-api-bpkt.onrender.com`, which uses paid model and search services. Public environment variables are included in the frontend build; do not put secrets in them. Changing the API URL on Vercel requires a new build/deployment.

The backend CORS allowlist must include your frontend's origin. New preview deployment URLs are not automatically allowed.

## Build check

```bash
npm run build
npm run start
```

This checks the frontend build. It does not verify a research run or the backend's external services. There are no automated frontend tests or GitHub Actions workflow in this repository.

## Current limitations

- **Connection errors:** a failed SSE connection can leave the interface loading. Cancel or reload to recover. The waiting message can still appear after an early connection failure.
- **Response handling:** malformed event JSON has no user-facing fallback. The evaluation panel also needs a clearer distinction between failed evaluations and genuine low scores.
- **Rendering:** Markdown tables appear as raw text because GFM table support is not configured. The two-column agent layout has no narrow-screen breakpoint.
- **History:** there is no browser-side history or resumable run state. The backend attempts a session save, but successful deployed persistence remains unverified.
- **Styling:** the page uses hand-written CSS. Tailwind's existing configuration and typography plugin are not connected to the current styling setup.

The navigation's GitHub link currently opens the author's profile. Use the repository links above to inspect the frontend and backend directly.

Next changes would be a recoverable connection-error state, Markdown table support, and clearer progress labels. Frontend tests should cover successful completion, cancellation, and error handling.
