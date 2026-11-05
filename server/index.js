import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(projectRoot, ".env") });

const { runRAG, checkNeo4jConnection } = await import("../api/rag.js");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("CineRAG server is running. Configure OPENROUTER_API_KEY to use chat.");
});

app.get("/api/health", async (req, res) => {
  try {
    await checkNeo4jConnection();
    res.json({ status: "ok", neo4j: "connected" });
  } catch (err) {
    console.error("Neo4j health check failed:", err);
    res.status(503).json({ status: "error", neo4j: "unavailable" });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const question =
      req.body && typeof req.body.question === "string"
        ? req.body.question.trim()
        : "";

    if (!question) {
      return res.status(400).json({ error: "A non-empty question is required." });
    }

    if (question.length > 2000) {
      return res
        .status(400)
        .json({ error: "Question must be 2000 characters or fewer." });
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
