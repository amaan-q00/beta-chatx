import { Server as IOServer, Socket as IOSocket } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as HTTPServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import type { Message } from '../../utils/useSocket';

// In-memory message store per room
const roomMessages: Record<string, Message[]> = {};
const oneTimeViews: Record<string, Set<string>> = {};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket || !('server' in res.socket) || !res.socket.server) {
    res.status(500).end();
    return;
  }
  const server = res.socket.server as typeof res.socket.server & { io?: IOServer };
  if (!server.io) {
    const io = new IOServer(res.socket.server as HTTPServer, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
      },
      maxHttpBufferSize: 1e7, // 10MB
    });
    server.io = io;

    io.on('connection', (socket: IOSocket) => {
      socket.on('join', (roomId: string) => {
        socket.join(roomId);
        // Send all messages for this room
        socket.emit('init', roomMessages[roomId] || []);
      });

      // Handle new message
      socket.on('message', (msg: Omit<Message, 'id' | 'timestamp'> & { roomId: string }) => {
        const { roomId } = msg;
        const message: Message = {
          id: uuidv4(),
          ...msg,
          timestamp: Date.now(),
        };
        if (!roomMessages[roomId]) roomMessages[roomId] = [];
        roomMessages[roomId].push(message);
        io.to(roomId).emit('message', message);
      });

      // Handle one-time media viewed
      socket.on('mediaViewed', ({ messageId, viewerId, roomId }: { messageId: string; viewerId: string; roomId: string }) => {
        if (!oneTimeViews[messageId]) oneTimeViews[messageId] = new Set();
        oneTimeViews[messageId].add(viewerId);
        io.to(roomId).emit('mediaViewed', { messageId, viewerId });
      });
    });
  }
  res.end();
} 