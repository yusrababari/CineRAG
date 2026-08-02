import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let chunks = null;
let loadPromise = null;
let openrouter = null;

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

function scoreChunk(question, chunk) {
  const qWords = question.toLowerCase().match(/\w+/g) || [];
  const chunkLower = chunk.toLowerCase();
  return qWords.reduce((score, w) => score + (chunkLower.includes(w) ? 1 : 0), 0);
}

function getTopChunks(question, k = 5) {
  return chunks
    .map((c) => ({ chunk: c, score: scoreChunk(question, c) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.chunk);
}

async function loadPdf() {
  const txtPath = findFile(["notes.txt", "data/notes.txt"]);
  if (txtPath) {
    chunks = chunkText(fs.readFileSync(txtPath, "utf8"));
    console.log(`Loaded notes: ${chunks.length} chunks`);
    return;
  }

  const pdfPath = findFile(["notes.pdf", "data/notes.pdf"]);
  if (!pdfPath) {
    throw new Error("notes.txt or notes.pdf not found in the project.");
  }

  const { default: pdfParse } = await import("pdf-parse");
  const data = await pdfParse(fs.readFileSync(pdfPath));
  chunks = chunkText(data.text);
  console.log(`Loaded PDF: ${chunks.length} chunks`);
}

function getChunks() {
  if (chunks) return Promise.resolve(chunks);
  if (!loadPromise) loadPromise = loadPdf();
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
  const context = getTopChunks(question).join("\n\n---\n\n");

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
