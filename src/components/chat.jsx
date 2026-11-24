import { useState, useEffect, useRef } from "react";
import { askCineRAG } from "../api/chat";

function formatAnswer(text) {
  const lines = text.split("\n");

  return lines.map((line, index) => {
    const match = line.match(/^([^:]+)(:)(\s*)(.*)$/);

    return (
      <span key={index}>
        {match ? (
          <>
            <strong>{match[1]}</strong>
            {match[2]}
            {match[3]}
            {match[4]}
          </>
        ) : (
          line
        )}
        {index < lines.length - 1 && <br />}
      </span>
    );
  });
}

const suggestions = [
  "Find a sci-fi thriller",
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
      return bullet ? `• ${bullet[1]}` : line.trim();
    })
    .join("\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
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

function getInitialAccentHue() {
  try {
    const storedHue = localStorage.getItem("cinerag-accent-hue");
    const hue = Number(storedHue);
    return storedHue !== null && Number.isFinite(hue) && hue >= 0 && hue <= 359
      ? hue
      : 38;
  } catch {
    return 38;
  }
}

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);
  const [accentHue, setAccentHue] = useState(getInitialAccentHue);
  const [toast, setToast] = useState("");
  const messagesEndRef = useRef(null);
  const toastTimer = useRef(null);
  const requestId = useRef(0); // bumped by Home so late replies are ignored

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Apply and remember the theme and accent color.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.setProperty("--accent-hue", String(accentHue));
    try {
      localStorage.setItem("cinerag-theme", theme);
      localStorage.setItem("cinerag-accent-hue", String(accentHue));
    } catch {
      /* storage can be blocked; ignore */
    }
  }, [theme, accentHue]);

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
          text: `Couldn't get an answer: ${err instanceof Error ? err.message : "I couldn't reach the server. Please try again."}`,
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
        <p className="sidebar-title">Recent questions</p>

        {history.length === 0 ? (
          <p className="sidebar-empty">Your questions will show up here.</p>
        ) : (
          <ul className="sidebar-list">
            {history.map((m, index) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="sidebar-link"
                  onClick={() => sendMessage(m.text)}
                  disabled={isTyping}
                  title="Ask again"
                >
                  <span className="sidebar-icon">{String(index + 1).padStart(2, "0")}</span>
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
            className="new-chat-btn"
            onClick={goHome}
            disabled={messages.length === 0 && !isTyping}
            title="Start a new chat"
          >
            <span aria-hidden="true">+</span>
            New chat
          </button>

          <div className="chat-header-text">
            <h2>CineRAG</h2>
            <p>
              <span className={`status-dot${isTyping ? " busy" : ""}`} />
              {isTyping ? "Searching the collection..." : "Films, filmmakers, and stories"}
            </p>
          </div>

          <div className="header-actions">
            <div className="theme-control">
              <label htmlFor="accent-hue">Accent</label>
              <input
                id="accent-hue"
                type="range"
                min="0"
                max="359"
                value={accentHue}
                onChange={(e) => setAccentHue(Number(e.target.value))}
                aria-label="Accent color"
                title="Change accent color"
              />
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>
        </div>

        <div className="chat-messages" role="log" aria-live="polite">
          {messages.length === 0 && !isTyping && (
            <div className="empty-state">
              <p className="empty-eyebrow">CINERAG / FILM INDEX</p>
              <h3>Where should we start?</h3>
              <p>Ask about a film, a filmmaker, or a particular year.</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`message-row ${msg.sender}`}>
              <div className="avatar" aria-hidden="true">
                {msg.sender === "bot" ? "CR" : "YOU"}
              </div>
              <div className={`message ${msg.sender}`}>
                <p>
                  {msg.sender === "bot" ? formatAnswer(msg.text) : msg.text}
                </p>
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
              <div className="avatar" aria-hidden="true">CR</div>
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
            placeholder="Ask CineRAG about a movie..."
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