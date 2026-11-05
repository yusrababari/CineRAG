# CineRAG

Ask questions about movies and get answers grounded in relevant passages from the movie dataset.

Live Link:https://cine-rag.vercel.app/
<img width="1534" height="751" alt="image" src="https://github.com/user-attachments/assets/013a0bf6-ecc5-42e5-afec-e3ae87e39069" />


## Features
- Natural-language movie Q&A
- Semantic vector retrieval over movie-data chunks
- Neo4j graph retrieval across movies, actors, directors, genres, and reviews
- Answers generated from retrieved movie data using OpenRouter
- Local, API-key-free movie search and answers from the bundled dataset

## Architecture
- The chat UI posts the question to `/api/chat`.
- `/api/health` checks the Neo4j connection and returns `neo4j: "connected"` when the configured database is reachable.
- The backend reads `server/notes.txt` (or `server/notes.pdf` if the text file is absent) and splits it into overlapping chunks.
- When an OpenRouter API key is configured and embeddings are enabled, `openai/text-embedding-3-small` embeds each chunk. The backend caches those vectors in memory for the lifetime of the server process.
- Each question is embedded and compared with the chunk vectors using cosine similarity. The four closest chunks are sent to the configured OpenRouter chat model as context for the answer.
- The backend parses movie and review records and upserts them into Neo4j Aura using Cypher over Neo4j's HTTPS Query API. The graph contains `Movie`, `Person`, and `Genre` nodes connected by `ACTED_IN`, `DIRECTED`, `IN_GENRE`, and `REVIEWED` relationships.
- Graph retrieval matches movie, person, or genre names in the question, then traverses up to two graph hops to find related movies and their cast, genres, ratings, synopsis, and sample reviews.
- With `OPENROUTER_API_KEY` configured, OpenRouter generates the final response from vector-search passages and graph-search facts. If Neo4j is unavailable, the backend can still answer from the relevant notes.
- Without an OpenRouter key, chat switches to local mode: it searches the bundled movie dataset and answers from movie details without embeddings or a Neo4j connection.
- The vector embeddings are cached in memory per backend process. Graph data is loaded idempotently into Neo4j when each backend process first needs graph retrieval.

## Tech stack
React and Vite provide the chat UI; Node.js runs the retrieval backend; OpenRouter provides embeddings and answer generation through the OpenAI-compatible JavaScript SDK; Neo4j Aura stores the graph; Cypher queries it through Neo4j's HTTPS Query API using Node's built-in `fetch`; and Vercel hosts the deployed API.

## Getting started
1. Install the frontend/backend shared dependencies with `npm install`.
2. Install the local Express server dependencies with `npm --prefix server install`.
3. Optional: create a Neo4j Aura instance and note its connection URI, username, and password if you want graph-backed answers.
4. For AI-generated responses, add `OPENROUTER_API_KEY` to the project-root `.env` file and configure it in Vercel. The chatbot also runs without an API key using local search over the bundled movie dataset; Neo4j is optional for this mode. To use Neo4j with AI-generated responses, configure `NEO4J_URI`, `NEO4J_USERNAME`, and `NEO4J_PASSWORD` as well. `DISABLE_EMBEDDINGS=true` skips vector search when using an API key. `NEO4J_URI` accepts a Neo4j Aura `neo4j+s://` URI or an HTTPS Query API URI; for Bolt URIs, the Bolt port is not used as an HTTPS port. `NEO4J_DATABASE` is optional and defaults to `neo4j`. The local server loads the root `.env` even when started with `npm --prefix server start`.
5. Start the backend with `npm --prefix server start` and the frontend with `npm run dev` in separate terminals.

The Vite development server proxies `/api` requests to the local backend on port 8000. Check `/api/health` locally or on the deployed app to verify Neo4j connectivity. The deployed app uses serverless handlers in `api/`.
## Licence
MIT
