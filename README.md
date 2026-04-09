# Scout — Frontend

Next.js frontend for the Scout research assistant. Streams results from the API over SSE and renders them as they arrive.

## Run locally

```bash
npm install
cp .env.local.example .env.local  # add your API URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For production, set this in your Vercel project settings (Settings → Environment Variables).
