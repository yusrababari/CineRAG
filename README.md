# CineRAG

A movie chatbot combining vector search and graph traversal for hybrid recommendation queries.

## Local Development

```bash
npm install          # install frontend + api deps
npm run install --prefix server  # install local backend deps (optional)
```

Create a `.env` file with your OpenRouter key:

```
OPENROUTER_API_KEY=sk-or-...
```

Run the backend (optional, the Vite dev proxy forwards `/api` to it):

```bash
npm run dev --prefix server
```

Then run the frontend:

```bash
npm run dev
```

Open http://localhost:5173.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. Import the repo in Vercel (framework is auto-detected as **Vite**).
3. Add the environment variable in Project → Settings → Environment Variables:
   - `OPENROUTER_API_KEY` — your OpenRouter key
4. Deploy. The frontend is served from `dist/` and the backend runs as a
   serverless function at `/api/chat`.

Notes:
- The movie notes are stored as text in `server/notes.txt` (chunked at runtime)
  so the serverless function has no file-parsing dependency.
- Cold starts lazily parse the notes once and cache them for the function instance.
