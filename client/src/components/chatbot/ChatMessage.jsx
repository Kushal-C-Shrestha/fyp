import React from 'react';

const ChatMessage = ({ chat }) => {
  const isUser = chat.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6 ${
          isUser
            ? 'bg-emerald-700 text-white'
            : 'border border-slate-200 bg-slate-50 text-slate-700'
        }`}
      >
        {chat.content}
      </div>
    </div>
  );
};

export default ChatMessage;
