import React, { useState, useRef, useEffect } from 'react';
import './index.css';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Example list of prompt suggestions for movie queries
  const suggestions = [
    'Recommend a sci-fi thriller',
    'Who directed Inception?',
    'Explain the plot of Interstellar',
    'Best movies of 2023',
  ];

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Mock function to simulate sentiment analysis logic or API call
  const analyzeSentiment = (text) => {
    const lower = text.toLowerCase();
    const positiveWords = ['good', 'great', 'awesome', 'love', 'happy', 'best', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'hate', 'sad', 'worst', 'horrible', 'angry'];

    let score = 0;
    positiveWords.forEach((word) => {
      if (lower.includes(word)) score += 1;
    });
    negativeWords.forEach((word) => {
      if (lower.includes(word)) score -= 1;
    });

    if (score > 0) return 'Positive';
    if (score < 0) return 'Negative';
    return 'Neutral';
  };

  // Reusable message submit logic
  const sendMessage = (text) => {
    if (!text.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: text,
      sentiment: null,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate backend request delay
    setTimeout(() => {
      const detectedSentiment = analyzeSentiment(text);
      const botResponse = {
        id: Date.now() + 1,
        sender: 'bot',
        text: `Analysis complete: This tweet/message sounds mainly ${detectedSentiment.toLowerCase()}.`,
        sentiment: detectedSentiment,
      };

      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000);
  };

  const handleSend = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestionClick = (promptText) => {
    sendMessage(promptText);
  };

  return (
    <div className="chat-container">
      {/* Header Area */}
      <div className="chat-header">
        <h2>CineRAG</h2>
        <p>🔍 Ask CineRAG about a movie, actor, or plot...</p>
      </div>

      {/* Messages Scroll Area */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            <p>{msg.text}</p>
            {msg.sentiment && (
              <span
                className={`sentiment-badge sentiment-${msg.sentiment.toLowerCase()}`}
              >
                {msg.sentiment}
              </span>
            )}
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

      {/* Suggestion Chips Container */}
      <div className="suggestions-container">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            type="button"
            className="suggestion-chip"
            onClick={() => handleSuggestionClick(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Form Input Area */}
      <form className="chat-input-area" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Type your movie question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}