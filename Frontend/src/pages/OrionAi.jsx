import { useState } from 'react';
import { Sparkles, Send, Bot, User, Lightbulb } from 'lucide-react';
import aiService from '../services/aiService.js';
import useAuth from '../hooks/useAuth.js';
import './OrionAi.css';

const QUICK_PROMPTS = [
  'Evaluate my recent task completion and suggest a prioritization strategy.',
  'How is my medication adherence tracking and what can improve consistency?',
  'Analyze my mood and energy ratings for healthy work-rest pacing.',
  'What micro-habits will best support my current streaks?',
];

export const OrionAi = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello ${user?.name || 'there'}! I am **ORION AI**, your personal life and health optimization intelligence. I synthesize your real-time task records, habit streaks, medication schedules, and check-in logs to provide evidence-backed guidance. How can I assist you today?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (queryText) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = { role: 'user', content: textToSend.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const reply = await aiService.getOrionAdvice(textToSend.trim());
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: reply || 'I was unable to generate advice at this moment. Please try again.',
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error fetching advice: ${err.friendlyMessage || err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="orion-container">
      {/* Header */}
      <div className="orion-header">
        <div className="orion-title-group">
          <h1>
            <Sparkles size={26} color="var(--color-ai-purple)" />
            ORION AI Life Coach
          </h1>
          <p>
            Intelligent, context-aware coaching powered by your personal metrics and schedules.
          </p>
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="orion-prompts-card">
        <div className="orion-prompts-label">
          <Lightbulb size={16} />
          Suggested Guidance Prompts
        </div>
        <div className="orion-prompts-list">
          {QUICK_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              disabled={loading}
              className="orion-prompt-chip"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Display Box */}
      <div className="orion-chat-card">
        <div className="chat-messages-viewport">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`chat-message-row ${
                msg.role === 'user' ? 'user-row' : 'ai-row'
              }`}
            >
              <div
                className={`chat-avatar ${
                  msg.role === 'user' ? 'user-avatar' : 'ai-avatar'
                }`}
              >
                {msg.role === 'user' ? <User size={15} /> : <Bot size={15} />}
              </div>

              <div className="chat-bubble">
                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-message-row ai-row">
              <div className="chat-avatar ai-avatar">
                <Bot size={15} />
              </div>
              <div className="chat-bubble">
                <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  Synthesizing your metrics & generating response...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="chat-input-bar"
        >
          <input
            type="text"
            placeholder="Ask ORION for lifestyle insights, advice, or schedule prioritization..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="chat-text-input"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="chat-send-btn"
          >
            <Send size={15} />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default OrionAi;
