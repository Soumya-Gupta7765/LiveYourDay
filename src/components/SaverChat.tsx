/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle } from 'lucide-react';
import { Task } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface SaverChatProps {
  tasks: Task[];
}

export default function SaverChat({ tasks }: SaverChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm your Saver AI. When deadlines loom and stress gets high, I'm here to help you stay composed and guide you through immediate, low-friction steps. What's causing you pressure right now?",
      createdAt: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const rawText = textToSend || input;
    const trimmed = rawText.trim();
    if (!trimmed || loading) return;

    if (!textToSend) setInput('');

    const userMsg: Message = {
      id: Math.random().toString(),
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          tasks,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reach Saver AI');
      }

      const data = await response.json();
      const botMsg: Message = {
        id: Math.random().toString(),
        role: 'assistant',
        content: data.reply || "I'm sorry, I couldn't process that response. Let's try breaking down your first task instead!",
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'assistant',
          content: "Oops! My communication link broke, but don't panic! Focus on your highest priority task and complete just one small micro-step right now. You can do this!",
          createdAt: new Date().toISOString(),
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const stressPrompts = [
    "I'm deeply overwhelmed. What do I do first?",
    "Give me an absolute 5-minute action plan.",
    "Draft an apology email for a late submission."
  ];

  return (
    <div id="saver-chat-container" className="flex flex-col h-full bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-slate-950/60 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/25">
            <Sparkles className="w-5 h-5 text-rose-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 tracking-tight">Saver AI Assistant</h3>
            <p className="text-xs text-rose-400 font-mono tracking-wide">Emergency Task Savior</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[420px] scrollbar-thin scrollbar-thumb-slate-800">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 max-w-[85%] ${
              m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
            }`}
          >
            <div className={`p-2.5 rounded-xl flex-shrink-0 h-9 w-9 flex items-center justify-center ${
              m.role === 'user' 
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20' 
                : 'bg-rose-600/20 text-rose-400 border border-rose-500/20'
            }`}>
              {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`p-3.5 rounded-2xl text-sm leading-relaxed border ${
              m.role === 'user'
                ? 'bg-indigo-600/10 text-indigo-100 border-indigo-500/20'
                : 'bg-slate-950/80 text-slate-200 border-slate-800'
            }`}>
              <div className="whitespace-pre-line prose prose-invert prose-xs">
                {m.content}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 mr-auto max-w-[85%]">
            <div className="p-2.5 rounded-xl h-9 w-9 bg-rose-600/20 text-rose-400 border border-rose-500/20 flex items-center justify-center">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/80 text-slate-400 border border-slate-800 text-sm italic">
              Saver AI is formulating a stress-reducing roadmap...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick stress boosters */}
      <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-900/60 flex flex-wrap gap-2">
        {stressPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            disabled={loading}
            className="text-xs bg-slate-900 hover:bg-rose-500/15 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-500/30 px-3 py-1.5 rounded-full transition duration-150 text-left cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-3.5 bg-slate-950/80 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Feeling rushed? Type here..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500/40 focus:border-rose-500/40"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition duration-150 disabled:opacity-40 disabled:hover:bg-rose-600 flex items-center justify-center cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
