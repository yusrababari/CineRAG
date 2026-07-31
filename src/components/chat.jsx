import { useState } from "react";
import { askCineRAG } from "../api/chat";

export default function Chat() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  async function handleAsk() {
    const reply = await askCineRAG(question);
    setAnswer(reply);
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2>🎬 CineRAG Chatbot</h2>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask about your notes..."
        style={{ width: "60%", padding: "0.5rem" }}
      />
      <button onClick={handleAsk} style={{ marginLeft: "1rem" }}>
        Ask
      </button>
      <p style={{ marginTop: "1rem" }}>{answer}</p>
    </div>
  );
}
