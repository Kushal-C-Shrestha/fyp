import React, { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import ChatbotPanel from './ChatbotPanel';

const ChatbotWidget = () => {
  const [open, setOpen] = useState(false);
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    if (open) {
      setShowTip(false);
      return undefined;
    }

    const appearTimer = setTimeout(() => setShowTip(true), 1200);
    const hideTimer = setTimeout(() => setShowTip(false), 6200);

    return () => {
      clearTimeout(appearTimer);
      clearTimeout(hideTimer);
    };
  }, [open]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative flex items-end justify-end">
        {!open && showTip && (
          <div className="absolute bottom-3 right-16 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm">
            Need help finding a doctor?
          </div>
        )}

        <ChatbotPanel open={open} onClose={() => setOpen(false)} />

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-700 text-white shadow-lg transition hover:bg-emerald-800"
          aria-label={open ? 'Close chatbot' : 'Open chatbot'}
        >
          <MessageCircle className="h-6 w-6 -scale-x-100" />
        </button>
      </div>
    </div>
  );
};

export default ChatbotWidget;

