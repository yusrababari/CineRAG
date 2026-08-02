import { runRAG } from "./rag.js";

export const config = {
  maxDuration: 60,
};

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method === "GET") {
    return res
      .status(200)
      .json({ message: "CineRAG API is running. Send a POST request to /api/chat with {\"question\": \"...\"}." });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Missing question" });
    }

    const answer = await runRAG(question);

    return res.status(200).json({ answer });
  } catch (err) {
    console.error("CineRAG error:", err);
    const message = err && err.message ? String(err.message) : "Internal server error";
    return res.status(500).json({ error: message });
  }
}
