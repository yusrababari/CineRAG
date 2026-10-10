# CineRAG

Ask questions about movies and get answers grounded in retrieved sources.

Live Link:https://cine-rag.vercel.app/
<img width="1534" height="751" alt="image" src="https://github.com/user-attachments/assets/013a0bf6-ecc5-42e5-afec-e3ae87e39069" />


## Why this exists
Plain vector search struggles with multi-hop questions such as "which directors worked with actors from
[film]?". CineRAG adds a knowledge graph to fix that.
## Features
- Natural-language movie Q&A with cited sources
- Vector retrieval baseline
- Graph-augmented retrieval (actors, films, directors, genres)
- Evaluation script comparing both approaches
## Architecture
[Add a diagram: question -> retriever (vector + graph) -> LLM -> answer with sources]
## Tech stack
[Embedding model] | [Vector store] | [Neo4j or NetworkX] | [LLM] | JavaScript | Vercel
## Getting started
1. Clone the repo and copy .env.example to .env
2. Install dependencies with [npm install or pip install -r requirements.txt]
3. Load the data with [command]
4. Run the app with [command]
## Results
| Method | Accuracy on 25 questions | Accuracy on 10 multi-hop |
| --- | --- | --- |
| Vector only | [x%] | [x%] |
| Vector + graph | [x%] | [x%] |
## Roadmap
- [ ] Add more data sources
- [ ] Streaming answers
## Licence
MIT