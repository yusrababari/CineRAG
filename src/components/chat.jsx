import { useState, useEffect, useRef } from "react";
import { askCineRAG } from "../api/chat";

const suggestions = [
  "Recommend a sci-fi thriller",
  "Who directed Inception?",
  "Explain the plot of Interstellar",
  "Best movies of 2023",
];

function cleanAnswer(text) {
  if (!text) return text;
  return String(text)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .split("\n")
    .map((line) => {
      const bullet = line.trim().match(/^[-*•]\s+(.*)$/);
      return bullet ? "🍿 " + bullet[1] : line.trim();
    })
    .filter(Boolean)
    .join("\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  async function sendMessage(text) {
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { id: Date.now(), sender: "user", text }]);
    setInput("");
    setIsTyping(true);

    try {
      const reply = await askCineRAG(text);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: "bot", text: cleanAnswer(reply) },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "bot",
          text: "⚠️ Oops, I couldn't reach the server. Please try again!",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  function handleSend(e) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>🎬 CineRAG</h2>
        <p>🔍 Ask CineRAG about a movie, actor, or plot...</p>
      </div>

      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            <p>{msg.text}</p>
          </div>
        ))}

        {isTyping && (
          <div className="message bot typing-indicator">
            Generating response
            <span className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="suggestions-container">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            type="button"
            className="suggestion-chip"
            onClick={() => sendMessage(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form className="chat-input-area" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Type your movie question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={isTyping}>
          Send
        </button>
      </form>
    </div>
  );
}
