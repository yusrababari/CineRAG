import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { runRAG } from "../api/rag.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(projectRoot, ".env") });

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("CineRAG server is running. Configure OPENROUTER_API_KEY to use chat.");
});

app.post("/api/chat", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Missing question" });
    }

    const answer = await runRAG(question);
    res.json({ answer });
  } catch (err) {
    console.error(err);
    const message = err && err.message ? String(err.message) : "Internal server error";
    res.status(500).json({ error: message });
  }
});

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
