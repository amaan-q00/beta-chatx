import React, { useEffect, useRef } from 'react';
import { Message } from '../utils/useSocket';
import { MessageItem } from './MessageItem';

export function ChatWindow({ messages, viewerId, onMediaClick }: {
  messages: Message[];
  viewerId: string;
  onMediaClick: (msg: Message) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col gap-2">
      {messages.map((msg) => (
        <div key={msg.id}>
          <MessageItem
  message={msg}
  viewerId={viewerId}
  onMediaClick={onMediaClick}
  allowViewExpired={typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('secret')}
/>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
} 