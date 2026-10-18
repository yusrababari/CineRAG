// src/api/chat.js

export async function askCineRAG(question) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Chat request failed (${res.status}).`);
  }

  if (typeof data.answer !== "string" || !data.answer.trim()) {
    throw new Error("The chat server returned an empty answer.");
  }

  return data.answer;
}
