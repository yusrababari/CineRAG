import { runRAG } from "./rag.js";

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
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
    return res.status(500).json({ error: "Internal server error" });
  }
}
