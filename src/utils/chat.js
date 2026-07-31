import { useState } from "react";
import { askCineRAG } from "./api/chat";

export default function Chat() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  async function handleAsk() {
    const reply = await askCineRAG(question);
    setAnswer(reply);
  }

  return (
    <div>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask CineRAG..."
      />

      <button onClick={handleAsk}>Ask</button>

      <p>{answer}</p>
    </div>
  );
}
