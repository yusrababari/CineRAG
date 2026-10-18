import { useState, useEffect, useRef } from "react";
import { askCineRAG } from "../api/chat";

const suggestions = [
  "Recommend a sci-fi thriller",
  "Who directed The Signal Room?",
  "Who starred in The Beekeeper's Ledger?",
  "What is Iron Harvest about?",
  "Find movies released after 2020.",
  "What is the average rating of horror movies?"
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

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getInitialTheme() {
  try {
    return localStorage.getItem("cinerag-theme") || "dark";
  } catch {
    return "dark";
  }
}

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);
  const [toast, setToast] = useState("");
  const messagesEndRef = useRef(null);
  const toastTimer = useRef(null);
  const requestId = useRef(0); // bumped by Home so late replies are ignored

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Apply + remember the theme (the CSS reads [data-theme="light"] on <html>)
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("cinerag-theme", theme);
    } catch {
      /* storage can be blocked; ignore */
    }
  }, [theme]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  function showToast(message) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1600);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied!");
    } catch {
      showToast("Couldn't copy");
    }
  }

  async function sendMessage(text) {
    if (!text.trim() || isTyping) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: "user", text, time: timeNow() },
    ]);
    setInput("");
    setIsTyping(true);

    const myRequest = requestId.current;

    try {
      const reply = await askCineRAG(text);
      if (requestId.current !== myRequest) return; // user went Home meanwhile
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: "bot", text: cleanAnswer(reply), time: timeNow() },
      ]);
    } catch (err) {
      if (requestId.current !== myRequest) return;
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "bot",
          text: `⚠️ ${err instanceof Error ? err.message : "I couldn't reach the server. Please try again!"}`,
          time: timeNow(),
        },
      ]);
    } finally {
      if (requestId.current === myRequest) setIsTyping(false);
    }
  }

  // Back to the start page: empty chat, original suggestions
  function goHome() {
    requestId.current += 1;
    setMessages([]);
    setInput("");
    setIsTyping(false);
  }

  function handleSend(e) {
    e.preventDefault();
    sendMessage(input);
  }

  // Sidebar history = the questions asked this session, newest first
  const history = messages.filter((m) => m.sender === "user").slice().reverse();

  return (
    <div className="app-shell">
      <aside className={`sidebar${history.length === 0 ? " is-empty" : ""}`}>
        <p className="sidebar-title">History</p>

        {history.length === 0 ? (
          <p className="sidebar-empty">Your questions will show up here.</p>
        ) : (
          <ul className="sidebar-list">
            {history.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="sidebar-link"
                  onClick={() => sendMessage(m.text)}
                  disabled={isTyping}
                  title="Ask again"
                >
                  <span className="sidebar-icon">💬</span>
                  <span className="sidebar-label">{m.text}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="sidebar-footer">Answers come from the CineRAG movie database.</div>
      </aside>

      <div className="chat-container">
        <div className="chat-header">
          <button
            type="button"
            className="icon-btn"
            onClick={goHome}
            disabled={messages.length === 0 && !isTyping}
            aria-label="Home"
            title="Back to start"
          >
            🏠
          </button>

          <div className="chat-header-text">
            <h2>🎬 CineRAG</h2>
            <p>
              <span className={`status-dot${isTyping ? " busy" : ""}`} />
              {isTyping ? "Thinking..." : "Ask about a movie, actor, or plot"}
            </p>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              title="Toggle theme"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        <div className="chat-messages" role="log" aria-live="polite">
          {messages.length === 0 && !isTyping && (
            <div className="empty-state">
              <h3>What do you want to watch?</h3>
              <p>Ask about a movie, actor, or plot, or try one of the ideas below.</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`message-row ${msg.sender}`}>
              <div className="avatar" aria-hidden="true">
                {msg.sender === "bot" ? "🎬" : "🙂"}
              </div>
              <div className={`message ${msg.sender}`}>
                <p>{msg.text}</p>
                <span className="timestamp">{msg.time}</span>
                {msg.sender === "bot" && (
                  <div className="message-actions">
                    <button type="button" onClick={() => copyText(msg.text)}>
                      Copy
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="message-row bot">
              <div className="avatar" aria-hidden="true">🎬</div>
              <div className="message bot typing-indicator">
                Generating response - this may take a few seconds
                <span className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length === 0 && (
          <div className="suggestions-container">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="suggestion-chip"
                onClick={() => sendMessage(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <form className="chat-input-area" onSubmit={handleSend}>
          <input
            type="text"
            placeholder="> type your movie question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Your movie question"
          />
          <button type="submit" disabled={isTyping || !input.trim()}>
            Send
          </button>
        </form>

        {toast && <div className="toast">{toast}</div>}
      </div>
    </div>
  );
}