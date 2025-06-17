import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export type Message = {
  id: string;
  type: 'text' | 'media';
  content: string;
  timestamp: number;
  oneTime?: boolean;
  mediaType?: string;
  filename?: string;
  sender?: string;
  username?: string;
  roomId?: string;
  viewedBy?: string[];
};

function getViewedMedia(roomId: string, viewerId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(`viewedMedia:${roomId}:${viewerId}`) || '[]');
  } catch {
    return [];
  }
}
function setViewedMedia(roomId: string, viewerId: string, ids: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`viewedMedia:${roomId}:${viewerId}`, JSON.stringify(ids));
}

export function useSocket(viewerId: string, roomId: string, username: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetch('/api/socket');
  }, []);

  useEffect(() => {
    const socket = io('/', {
      path: '/api/socket',
      transports: ['websocket'],
      forceNew: true,
    });
    socketRef.current = socket;

    socket.emit('join', roomId);

    socket.on('init', (msgs) => {
      // Merge server viewedBy with local viewed list
      const localViewed = getViewedMedia(roomId, viewerId);
      setMessages(
        msgs.map((m: Message) =>
          m.oneTime
            ? { ...m, viewedBy: Array.from(new Set([...(m.viewedBy || []), ...(localViewed.includes(m.id) ? [viewerId] : [])])) }
            : m
        )
      );
    });
    socket.on('message', (msg) => setMessages((prev) => [...prev, msg]));
    socket.on('mediaViewed', ({ messageId, viewerId: vId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, viewedBy: [...(m.viewedBy || []), vId] } : m
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, viewerId]);

  const sendMessage = useCallback((msg: Omit<Message, 'id' | 'timestamp'>) => {
    socketRef.current?.emit('message', { ...msg, roomId, username });
  }, [roomId, username]);

  const markMediaViewed = useCallback((messageId: string) => {
    // Update localStorage
    const viewed = getViewedMedia(roomId, viewerId);
    if (!viewed.includes(messageId)) {
      setViewedMedia(roomId, viewerId, [...viewed, messageId]);
    }
    socketRef.current?.emit('mediaViewed', { messageId, viewerId, roomId });
  }, [viewerId, roomId]);

  return { messages, sendMessage, markMediaViewed };
} 