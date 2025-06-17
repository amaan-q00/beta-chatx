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
  pending?: boolean; // for optimistic UI
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

  // Helper to send media (always chunked, ArrayBuffer)
  const sendMedia = useCallback((file: File, meta: any, onProgress?: (percent: number) => void) => {
    const CHUNK_SIZE = 256 * 1024; // 256KB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = `${Date.now()}-${Math.random()}`;
    let chunkIndex = 0;
    function sendNextChunk() {
      const offset = chunkIndex * CHUNK_SIZE;
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const reader = new FileReader();
      reader.onload = () => {
        // Send ArrayBuffer chunk
        const arrayBuffer = reader.result as ArrayBuffer;
        socketRef.current?.emit('media-chunk', {
          uploadId,
          chunk: arrayBuffer,
          chunkIndex,
          totalChunks,
          meta: { ...meta, mimeType: file.type },
          roomId,
        });
        chunkIndex++;
        if (chunkIndex < totalChunks) {
          sendNextChunk();
        }
      };
      reader.readAsArrayBuffer(slice);
    }
    sendNextChunk();
    // Listen for progress events
    const socket = socketRef.current;
    if (socket) {
      const progressHandler = (data: any) => {
        if (data.uploadId === uploadId && onProgress) {
          onProgress(data.percent);
        }
      };
      socket.on('upload-progress', progressHandler);
      // Remove listener after upload is done
      socket.once('message', (msg: any) => {
        if (msg && msg.filename === meta.filename) {
          socket.off('upload-progress', progressHandler);
        }
      });
    }
  }, [roomId]);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_SERVER_URL, {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
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

    // Chunked media receive (binary)
    let chunkBuffers: Record<string, { chunks: ArrayBuffer[]; meta: any; totalChunks: number }> = {};
    socket.on('media-chunk', (data) => {
      const { chunk, chunkIndex, totalChunks, meta, uploadId } = data;
      if (!chunkBuffers[uploadId]) {
        chunkBuffers[uploadId] = { chunks: [], meta, totalChunks };
      }
      chunkBuffers[uploadId].chunks[chunkIndex] = chunk;
      if (chunkBuffers[uploadId].chunks.filter(Boolean).length === totalChunks) {
        // Assemble all ArrayBuffers into a single Blob
        const allChunks = chunkBuffers[uploadId].chunks;
        const blob = new Blob(allChunks, { type: meta.mimeType });
        const objectUrl = URL.createObjectURL(blob);
        setMessages((prev) => [
          ...prev,
          {
            ...meta,
            content: objectUrl,
            timestamp: Date.now(),
            id: uploadId || `${Date.now()}-${Math.random()}`,
          },
        ]);
        delete chunkBuffers[uploadId];
      }
    });

    // Listen for assembled binary from server
    socket.on('media-binary', (data) => {
      const { buffer, mimeType, ...meta } = data;
      // Convert buffer (Node.js Buffer or ArrayBuffer) to Uint8Array
      let arrBuf;
      if (buffer instanceof ArrayBuffer) {
        arrBuf = buffer;
      } else if (buffer && buffer.type === 'Buffer' && Array.isArray(buffer.data)) {
        arrBuf = new Uint8Array(buffer.data).buffer;
      } else {
        arrBuf = buffer;
      }
      const blob = new Blob([arrBuf], { type: mimeType });
      const objectUrl = URL.createObjectURL(blob);
      setMessages((prev) => [
        ...prev,
        {
          ...meta,
          content: objectUrl,
          timestamp: Date.now(),
        },
      ]);
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

  return { messages, sendMessage, markMediaViewed, sendMedia, socketRef };
} 