import { checkNeo4jConnection } from "./rag.js";

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await checkNeo4jConnection();
    return res.status(200).json({ status: "ok", neo4j: "connected" });
  } catch (err) {
    console.error("Neo4j health check failed:", err);
    return res.status(503).json({ status: "error", neo4j: "unavailable" });
  }
}
