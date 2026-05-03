# Scout — Frontend

Next.js frontend for the Scout research assistant. Streams results from the API over SSE and renders them as they arrive.

## Run locally

```bash
npm install
cp .env.local.example .env.local  # add API + Supabase vars
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

For production, set this in your Vercel project settings (Settings → Environment Variables).
