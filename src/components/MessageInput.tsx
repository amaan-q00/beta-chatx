import React, { useState } from 'react';
import { FaPaperclip } from 'react-icons/fa';

export function MessageInput({ onSend, onSendMedia, loading }: {
  onSend: (text: string) => void;
  onSendMedia: () => void;
  loading?: boolean;
}) {
  const [text, setText] = useState('');

  return (
    <form
      className="flex items-center gap-2 w-full"
      onSubmit={e => {
        e.preventDefault();
        if (text.trim()) {
          onSend(text);
          setText('');
        }
      }}
    >
      <input
        type="text"
        className="flex-1 rounded-full px-4 py-2 bg-neutral-900 text-foreground placeholder:text-neutral-500 outline-none border border-neutral-800 focus:border-blue-500 transition"
        placeholder="Type a message..."
        value={text}
        onChange={e => setText(e.target.value)}
        disabled={loading}
      />
      <button
        type="button"
        className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white"
        onClick={onSendMedia}
        disabled={loading}
        title="Send media"
      >
        <FaPaperclip />
      </button>
      <button
        type="submit"
        className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
        disabled={loading || !text.trim()}
        title="Send"
      >
        ➤
      </button>
    </form>
  );
} 