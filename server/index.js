import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { runRAG } from "../api/rag.js";

dotenv.config();
console.log("Loaded key:", process.env.OPENROUTER_API_KEY ? "✅ Found" : "❌ Missing");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("🎬 CineRAG server is running with OpenRouter!");
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
    res.status(500).json({ error: "Something went wrong" });
  }
});

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
