import React, { useState } from 'react';
import { Sparkles, Send, Bot, User, Lightbulb, Zap, ShieldCheck } from 'lucide-react';
import aiService from '../services/aiService.js';
import useAuth from '../hooks/useAuth.js';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-600" />
          ORION AI Life Coach
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Intelligent, context-aware coaching powered by your personal metrics and schedules.
        </p>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-xs font-bold text-purple-900 mb-2">
          <Lightbulb className="w-4 h-4 text-purple-600" />
          Suggested Questions
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              disabled={loading}
              className="text-xs bg-white hover:bg-purple-100/70 border border-purple-200/80 text-purple-900 px-3 py-1.5 rounded-xl font-medium transition-colors text-left cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Display Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[520px]">
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xs ${
                  msg.role === 'user' ? 'bg-indigo-600' : 'bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-md shadow-purple-500/20'
                }`}
              >
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-none whitespace-pre-wrap'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 flex items-center gap-2 text-xs text-slate-500">
                <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <span>ORION is analyzing your schedule and metrics...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask ORION about your habits, tasks, wellness, or health routines..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-xs"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl shadow-md shadow-purple-600/20 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OrionAi;
