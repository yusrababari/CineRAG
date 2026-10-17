import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let chunks = null;
let loadPromise = null;
let vectorStore = null;
let vectorStorePromise = null;
let graphLoadPromise = null;
let movieData = null;
let openrouter = null;
const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const EMBEDDING_BATCH_SIZE = 32;

function getOpenRouter() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set. Add it in Vercel → Project Settings → Environment Variables.");
  }
  if (!openrouter) {
    const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.SITE_URL || "http://localhost:5173";

    openrouter = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": siteUrl,
        "X-Title": "CineRAG",
      },
    });
  }
  return openrouter;
}

function findFile(names) {
  for (const name of names) {
    const candidates = [
      path.join(process.cwd(), name),
      path.join(process.cwd(), "server", name),
      path.join(__dirname, "..", "server", name),
      path.join(__dirname, name),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function chunkText(text, size = 1000, overlap = 150) {
  const result = [];
  let start = 0;
  while (start < text.length) {
    result.push(text.slice(start, start + size));
    start += size - overlap;
  }
  return result;
}

function buildMovieGraph(text) {
  const moviesSection = text.split(/^Section 2\b/m)[0];
  const movies = [];
  let currentMovie = null;

  for (const line of moviesSection.split(/\r?\n/)) {
    const titleMatch = line.match(/^(.+?) \((\d{4})\)$/);
    if (titleMatch) {
      currentMovie = {
        title: titleMatch[1],
        year: titleMatch[2],
        genres: [],
        director: "",
        rating: "",
        cast: [],
        synopsis: "",
      };
      movies.push(currentMovie);
      continue;
    }

    if (!currentMovie) continue;

    const metadata = line.match(/Genres:\s*(.*?)\s*\|\s*Director:\s*(.*?)\s*\|\s*Rating:\s*([\d.]+)/);
    if (metadata) {
      currentMovie.genres = metadata[1].split(",").map((genre) => genre.trim());
      currentMovie.director = metadata[2].trim();
      currentMovie.rating = metadata[3];
    }

    const castLine = line.match(/^Cast:\s*(.*)$/);
    if (castLine) {
      currentMovie.cast = [...castLine[1].matchAll(/([^,]+?) as ([^,]+?)(?:, |$)/g)]
        .map(([, name, role]) => ({ name: name.trim(), role: role.trim() }));
    }

    const synopsis = line.match(/^Synopsis:\s*(.*)$/);
    if (synopsis) currentMovie.synopsis = synopsis[1].trim();
  }

  const reviews = [];
  const reviewsSection = text.split(/^Section 4\b/m)[1] || "";
  const titlesByLength = movies.map(({ title }) => title).sort((a, b) => b.length - a.length);

  for (const line of reviewsSection.split(/\r?\n/)) {
    if (!line || line === "ReviewerMovieStarsComment") continue;
    const title = titlesByLength.find((candidate) => line.includes(candidate));
    if (!title) continue;

    const titleIndex = line.indexOf(title);
    const reviewer = line.slice(0, titleIndex).trim();
    const review = line.slice(titleIndex + title.length).match(/^([\d.]+)(.*)$/);
    if (!review || !reviewer) continue;

    reviews.push({
      reviewer,
      movie: title,
      stars: Number(review[1]),
      comment: review[2].trim(),
    });
  }

  return { movies, reviews };
}

async function queryGraph(statement, parameters = {}) {
  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;
  const database = process.env.NEO4J_DATABASE || "neo4j";

  if (!uri || !username || !password) {
    throw new Error("Set NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD to connect to Neo4j Aura.");
  }

  let parsedUri;
  try {
    parsedUri = new URL(uri);
  } catch {
    throw new Error("NEO4J_URI must be a valid Neo4j Aura URI.");
  }
  if (parsedUri.protocol !== "neo4j+s:" && parsedUri.protocol !== "https:") {
    throw new Error("NEO4J_URI must use the secure neo4j+s:// or https:// protocol.");
  }

  const endpoint = `https://${parsedUri.host}/db/${encodeURIComponent(database)}/query/v2`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ statement, parameters }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Neo4j request failed (${response.status}): ${JSON.stringify(result.errors || result)}`);
  }
  if (result.errors?.length) {
    throw new Error(`Neo4j query failed: ${result.errors.map((error) => error.message).join("; ")}`);
  }
  return result.data?.values || [];
}

async function ensureGraphLoaded() {
  if (!graphLoadPromise) {
    graphLoadPromise = (async () => {
      await getChunks();
      const { movies, reviews } = movieData;
      await queryGraph("CREATE CONSTRAINT movie_title IF NOT EXISTS FOR (m:Movie) REQUIRE m.title IS UNIQUE");
      await queryGraph("CREATE CONSTRAINT person_name IF NOT EXISTS FOR (p:Person) REQUIRE p.name IS UNIQUE");
      await queryGraph("CREATE CONSTRAINT genre_name IF NOT EXISTS FOR (g:Genre) REQUIRE g.name IS UNIQUE");
      await queryGraph(
        "UNWIND $movies AS row MERGE (m:Movie {title: row.title}) SET m.year = toInteger(row.year), m.rating = toFloat(row.rating), m.synopsis = row.synopsis",
        { movies },
      );
      await queryGraph(
        "UNWIND $movies AS row MATCH (m:Movie {title: row.title}) UNWIND row.genres AS name MERGE (g:Genre {name: name}) MERGE (m)-[:IN_GENRE]->(g)",
        { movies },
      );
      await queryGraph(
        "UNWIND $movies AS row MATCH (m:Movie {title: row.title}) MERGE (p:Person {name: row.director}) MERGE (p)-[:DIRECTED]->(m)",
        { movies },
      );
      await queryGraph(
        "UNWIND $movies AS row MATCH (m:Movie {title: row.title}) UNWIND row.cast AS member MERGE (p:Person {name: member.name}) MERGE (p)-[r:ACTED_IN]->(m) SET r.role = member.role",
        { movies },
      );
      await queryGraph(
        "UNWIND $reviews AS row MATCH (m:Movie {title: row.movie}) MERGE (reviewer:Person {name: row.reviewer}) MERGE (reviewer)-[r:REVIEWED {comment: row.comment}]->(m) SET r.stars = row.stars",
        { reviews },
      );
      console.log(`Loaded graph into Neo4j: ${movies.length} movies, ${reviews.length} reviews`);
    })().catch((err) => {
      graphLoadPromise = null;
      throw err;
    });
  }
  return graphLoadPromise;
}

async function getGraphContext(question, limit = 5) {
  await ensureGraphLoaded();
  const rows = await queryGraph(
    [
      "MATCH (seed)",
      "WHERE (seed:Movie AND toLower($question) CONTAINS toLower(seed.title))",
      "OR ((seed:Person OR seed:Genre) AND toLower($question) CONTAINS toLower(seed.name))",
      "WITH collect(DISTINCT seed) AS seeds",
      "UNWIND seeds AS seed",
      "OPTIONAL MATCH (seed)-[*1..2]-(related:Movie)",
      "WITH seeds, collect(DISTINCT related) + [item IN seeds WHERE item:Movie] AS candidates",
      "UNWIND candidates AS movie",
      "WITH DISTINCT movie ORDER BY movie.title LIMIT $limit",
      "OPTIONAL MATCH (director:Person)-[:DIRECTED]->(movie)",
      "OPTIONAL MATCH (actor:Person)-[acted:ACTED_IN]->(movie)",
      "OPTIONAL MATCH (movie)-[:IN_GENRE]->(genre:Genre)",
      "OPTIONAL MATCH (reviewer:Person)-[review:REVIEWED]->(movie)",
      "RETURN movie.title, movie.year, movie.rating, movie.synopsis, director.name,",
      "collect(DISTINCT genre.name),",
      "collect(DISTINCT CASE WHEN actor IS NULL THEN null ELSE actor.name + ' as ' + acted.role END),",
      "collect(DISTINCT CASE WHEN review IS NULL THEN null ELSE reviewer.name + ': ' + toString(review.stars) + '/10 - ' + review.comment END)[0..3]",
    ].join(" "),
    { question: question.toLowerCase(), limit },
  );

  return rows.map(([title, year, rating, synopsis, director, genres, cast, reviews]) => {
    const details = [
      `${title} (${year})`,
      director && `director: ${director}`,
      genres.length && `genres: ${genres.join(", ")}`,
      rating !== null && `rating: ${rating}/10`,
      cast.length && `cast: ${cast.join(", ")}`,
      synopsis && `synopsis: ${synopsis}`,
      reviews.length && `reviews: ${reviews.join(" | ")}`,
    ].filter(Boolean).join("; ");
    return `Movie: ${details}`;
  }).join("\n");
}

async function embedTexts(texts) {
  const response = await getOpenRouter().embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });

  if (response.data.length !== texts.length) {
    throw new Error("Embedding API returned an unexpected number of vectors.");
  }

  return response.data
    .sort((a, b) => a.index - b.index)
    .map(({ embedding }) => embedding);
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    throw new Error("Embedding vectors have different dimensions.");
  }

  let dotProduct = 0;
  let aMagnitude = 0;
  let bMagnitude = 0;

  for (let i = 0; i < a.length; i += 1) {
    dotProduct += a[i] * b[i];
    aMagnitude += a[i] * a[i];
    bMagnitude += b[i] * b[i];
  }

  if (!aMagnitude || !bMagnitude) {
    throw new Error("Embedding vectors cannot be empty.");
  }

  return dotProduct / (Math.sqrt(aMagnitude) * Math.sqrt(bMagnitude));
}

async function getVectorStore() {
  await getChunks();
  if (vectorStore) return vectorStore;
  if (!vectorStorePromise) {
    vectorStorePromise = (async () => {
      const vectors = [];
      for (let start = 0; start < chunks.length; start += EMBEDDING_BATCH_SIZE) {
        const batch = chunks.slice(start, start + EMBEDDING_BATCH_SIZE);
        vectors.push(...(await embedTexts(batch)));
      }
      vectorStore = chunks.map((chunk, index) => ({ chunk, embedding: vectors[index] }));
      console.log(`Indexed ${vectorStore.length} chunks with embeddings`);
      return vectorStore;
    })().catch((err) => {
      vectorStorePromise = null;
      throw err;
    });
  }
  return vectorStorePromise;
}

async function getTopChunks(question, k = 5) {
  const store = await getVectorStore();
  const [questionEmbedding] = await embedTexts([question]);

  return store
    .map(({ chunk, embedding }) => ({
      chunk,
      score: cosineSimilarity(questionEmbedding, embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.chunk);
}

async function loadPdf() {
  const txtPath = findFile(["notes.txt", "data/notes.txt"]);
  if (txtPath) {
    const text = fs.readFileSync(txtPath, "utf8");
    chunks = chunkText(text);
    movieData = buildMovieGraph(text);
    console.log(`Loaded notes: ${chunks.length} chunks`);
    console.log(`Parsed movie data: ${movieData.movies.length} movies, ${movieData.reviews.length} reviews`);
    return;
  }

  const pdfPath = findFile(["notes.pdf", "data/notes.pdf"]);
  if (!pdfPath) {
    throw new Error("notes.txt or notes.pdf not found in the project.");
  }

  const { default: pdfParse } = await import("pdf-parse");
  const data = await pdfParse(fs.readFileSync(pdfPath));
  chunks = chunkText(data.text);
  movieData = buildMovieGraph(data.text);
  console.log(`Loaded PDF: ${chunks.length} chunks`);
  console.log(`Parsed movie data: ${movieData.movies.length} movies, ${movieData.reviews.length} reviews`);
}

function getChunks() {
  if (chunks) return Promise.resolve(chunks);
  if (!loadPromise) {
    loadPromise = loadPdf().catch((err) => {
      loadPromise = null;
      throw err;
    });
  }
  return loadPromise;
}

export function cleanAnswer(text) {
  if (!text) return text;
  let out = text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\s{2,}/g, " ")
    .split("\n")
    .map((line) => {
      const bullet = line.trim().match(/^[-*•]\s+(.*)$/);
      if (bullet) return "🍿 " + bullet[1];
      return line.trim();
    })
    .filter(Boolean)
    .join("\n");
  return out.trim();
}

export async function runRAG(question) {
  await getChunks();
  const vectorContext = (await getTopChunks(question)).join("\n\n---\n\n");
  const graphContext = getGraphContext(question);
  const context = [
    `VECTOR SEARCH RESULTS:\n${vectorContext}`,
    graphContext && `GRAPH SEARCH RESULTS:\n${graphContext}`,
  ].filter(Boolean).join("\n\n---\n\n");

  const completion = await getOpenRouter().chat.completions.create({
    model: "openrouter/auto",
    messages: [
      {
        role: "system",
        content:
          "You are CineRAG, a friendly movie assistant. Answer in clean, simple, plain text. Do NOT use markdown symbols such as *, **, #, or backticks. Keep answers short and easy to read. Use a few friendly emojis (like 🎬 🍿 ⭐ 👍) to make the answer lively.",
      },
      {
        role: "user",
        content: `Use this movie data to answer the question. Only use the data given below.\n\nDATA:\n${context}\n\nQUESTION: ${question}`,
      },
    ],
    max_tokens: 1000,
  });

  return cleanAnswer(completion.choices[0].message.content);
}
