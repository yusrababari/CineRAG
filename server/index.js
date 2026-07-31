import express from "express";
import cors from "cors";
import fs from "fs";
import dotenv from "dotenv";
import pdfParse from "pdf-parse";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
console.log("Loaded key:", process.env.GEMINI_API_KEY ? "✅ Found" : "❌ Missing");



const app = express();
app.use(cors());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("🎬 CineRAG server is running!");
});

// Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

let chunks = [];

// PDF chunking
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
  const buffer = fs.readFileSync("./notes.pdf");
  const data = await pdfParse(buffer);
  chunks = chunkText(data.text);
  console.log(`Loaded PDF: ${chunks.length} chunks`);
}

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { question } = req.body;
    const context = getTopChunks(question).join("\n\n---\n\n");

    const prompt = `
You are CineRAG. Answer ONLY using the data below.
If the answer is not in the data, say "I don't know."

DATA:
${context}

QUESTION:
${question}
`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Start server
loadPdf()
  .then(() => {
    console.log("PDF loaded successfully");
    app.listen(8000, () => {
      console.log("Server running on http://localhost:8000");
    });
  })
  .catch((err) => {
    console.error("Startup failed:");
    console.error(err);
  });
