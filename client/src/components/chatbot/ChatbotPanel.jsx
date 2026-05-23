import React, { useEffect, useState } from 'react';
import { Send, X } from 'lucide-react';
import api from '../../api/axios';
import ChatMessage from './ChatMessage';

const QUICK_PROMPTS = [
  'Show available doctors today',
  'How do I book an appointment?',
];

const ChatbotPanel = ({ open, onClose }) => {
  const [sessionId, setSessionId] = useState('');
  const [chats, setChats] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [ready, setReady] = useState(false);

  const hasChats = chats.length > 0;

  const chatList = hasChats ? chats : [
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi, how can I help you with doctors, hospitals, or appointments today?',
    },
  ];

  useEffect(() => {
    if (!open || ready) return;

    const loadHistory = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/assistant/message', {
          headers: {
            'x-session-id': sessionId,
          },
        });
        const newSessionId = response?.headers?.['x-session-id'] || response?.data?.sessionId;
        if (newSessionId) {
          setSessionId(newSessionId);
        }
        const { data } = response;
        const history = data?.messages ? data.messages : [];
        setChats(
          history.map((item, index) => ({
            id: item.id || `${item.role}-${index}-${item.created_at || Date.now()}`,
            role: item.role,
            content: item.content,
          }))
        );
      } catch (error) {
        setChats([
          {
            id: 'error-load',
            role: 'assistant',
            content: 'Unable to load previous chat right now. You can still send a new message.',
          },
        ]);
      } finally {
        setIsLoading(false);
        setReady(true);
      }
    };

    loadHistory();
  }, [open, ready, sessionId]);

  useEffect(() => {
    if (!open) return;
    const node = document.getElementById('chatbot-list');
    if (node) node.scrollTop = node.scrollHeight;
  }, [open, chatList, typing]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || typing) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };

    setChats((prev) => [...prev, userMessage]);
    setInput('');
    setTyping(true);

    try {
      const response = await api.post(
        '/assistant/message',
        { message: text },
        {
          headers: {
            'x-session-id': sessionId,
          },
        }
      );
      const newSessionId = response?.headers?.['x-session-id'] || response?.data?.sessionId;
      if (newSessionId) {
        setSessionId(newSessionId);
      }
      const { data } = response;
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data?.message || 'Sorry, I could not generate a response right now.',
      };
      setChats((prev) => [...prev, assistantMessage]);
    } catch {
      setChats((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: 'Something went wrong while sending your message. Please try again.',
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const handleQuickPrompt = (prompt) => {
    if (typing) return;
    setInput(prompt);
    setTimeout(() => document.getElementById('chatbot-input')?.focus(), 0);
  };

  if (!open) return null;

  return (
    <div className="absolute bottom-0 right-16 w-[min(88vw,360px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Chatbot assistant</p>
          <p className="text-xs text-slate-500">Need help finding the right doctor or booking?</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div id="chatbot-list" className="max-h-80 min-h-64 space-y-3 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading chat...</p>
        ) : (
          <>
            {chatList.map((msg) => (
              <ChatMessage key={msg.id} chat={msg} />
            ))}

            {!hasChats && (
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleQuickPrompt(prompt)}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {typing && <p className="text-xs text-slate-400">Assistant is typing...</p>}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-2">
          <input
            id="chatbot-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={typing || !input.trim()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-700 text-white disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatbotPanel;
