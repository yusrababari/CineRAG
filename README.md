# CineRAG

Ask questions about movies and get answers grounded in relevant passages from the movie dataset.

Live Link:https://cine-rag.vercel.app/
<img width="1534" height="751" alt="image" src="https://github.com/user-attachments/assets/013a0bf6-ecc5-42e5-afec-e3ae87e39069" />


## Features
- Natural-language movie Q&A
- Semantic vector retrieval over movie-data chunks
- Neo4j graph retrieval across movies, actors, directors, genres, and reviews
- Answers generated from retrieved movie data using OpenRouter

## Architecture
- The chat UI posts the question to `/api/chat`.
- The backend reads `server/notes.txt` (or `server/notes.pdf` if the text file is absent) and splits it into overlapping chunks.
- OpenRouter's `openai/text-embedding-3-small` model embeds each chunk. The backend caches those vectors in memory for the lifetime of the server process.
- Each question is embedded and compared with the chunk vectors using cosine similarity. The five closest chunks are sent to `openrouter/auto` as context for the answer.
- The backend parses movie and review records and upserts them into Neo4j Aura using Cypher over Neo4j's HTTPS Query API. The graph contains `Movie`, `Person`, and `Genre` nodes connected by `ACTED_IN`, `DIRECTED`, `IN_GENRE`, and `REVIEWED` relationships.
- Graph retrieval matches movie, person, or genre names in the question, then traverses up to two graph hops to find related movies and their cast, genres, ratings, synopsis, and sample reviews.
- OpenRouter generates the final response from both vector-search passages and graph-search facts. If Neo4j is unavailable, the backend logs the graph error and can still answer from the relevant notes.
- The vector embeddings are cached in memory per backend process. Graph data is loaded idempotently into Neo4j when each backend process first needs graph retrieval.

## Tech stack
React and Vite provide the chat UI; Node.js runs the retrieval backend; OpenRouter provides embeddings and answer generation through the OpenAI-compatible JavaScript SDK; Neo4j Aura stores the graph; Cypher queries it through Neo4j's HTTPS Query API using Node's built-in `fetch`; and Vercel hosts the deployed API.

## Getting started
1. Install the frontend/backend shared dependencies with `npm install`.
2. Install the local Express server dependencies with `npm --prefix server install`.
3. Create a Neo4j Aura instance and note its connection URI, username, and password.
4. Put `OPENROUTER_API_KEY`, `NEO4J_URI`, `NEO4J_USERNAME`, and `NEO4J_PASSWORD` in the project-root `.env` file for local development. An OpenRouter key is required for embeddings and chat responses. `NEO4J_DATABASE` is optional and defaults to `neo4j`. The local server loads this root `.env` even when started with `npm --prefix server start`. Add the same variables in Vercel Project Settings for deployment.
5. Start the backend with `npm --prefix server start` and the frontend with `npm run dev` in separate terminals.

The Vite development server proxies `/api` requests to the local backend on port 8000. The deployed app uses the serverless handler in `api/chat.js`.
## Licence
MIT
