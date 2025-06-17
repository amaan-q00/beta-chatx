const { createServer } = require('http');
const next = require('next');
const { Server: SocketIOServer } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create a basic HTTP server
  const httpServer = createServer((req, res) => {
    // CORS for /api/upload and preflight
    if (req.url && req.url.startsWith('/api/upload')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
    }
    handle(req, res);
  });

  // Attach Socket.IO
  const io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    cors: { origin: '*' },
    maxHttpBufferSize: 1e7, // 10MB
  });

  // In-memory message store per room
  const roomMessages = {};
  const oneTimeViews = {};
  // In-memory chunk buffer: { [uploadId]: { chunks: [], totalChunks, meta, received, roomId, mimeType } }
  const chunkBuffers = {};

  function cleanUpRoom(roomId) {
    // Remove room if no users
    const room = io.sockets.adapter.rooms.get(roomId);
    if (!room || room.size === 0) {
      delete roomMessages[roomId];
    }
  }

  io.on('connection', (socket) => {
    socket.on('join', (roomId) => {
      socket.join(roomId);
      socket.emit('init', roomMessages[roomId] || []);
      socket.roomId = roomId;
    });

    socket.on('disconnecting', () => {
      if (socket.roomId) {
        setTimeout(() => cleanUpRoom(socket.roomId), 1000);
      }
    });

    socket.on('message', (msg) => {
      const { roomId } = msg;
      const message = {
        id: require('uuid').v4(),
        ...msg,
        timestamp: Date.now(),
      };
      if (!roomMessages[roomId]) roomMessages[roomId] = [];
      roomMessages[roomId].push(message);
      io.to(roomId).emit('message', message);
    });

    socket.on('mediaViewed', ({ messageId, viewerId, roomId }) => {
      if (!oneTimeViews[messageId]) oneTimeViews[messageId] = new Set();
      oneTimeViews[messageId].add(viewerId);
      io.to(roomId).emit('mediaViewed', { messageId, viewerId });
    });

    // Chunked upload: assemble and emit progress
    socket.on('media-chunk', (data) => {
      const { uploadId, chunk, chunkIndex, totalChunks, meta, roomId } = data;
      if (!chunkBuffers[uploadId]) {
        chunkBuffers[uploadId] = {
          chunks: [],
          totalChunks,
          meta,
          received: 0,
          roomId,
          mimeType: meta.mimeType,
        };
      }
      // Convert chunk to Buffer if not already
      let buf = chunk;
      if (!(buf instanceof Buffer)) {
        buf = Buffer.from(new Uint8Array(chunk));
      }
      chunkBuffers[uploadId].chunks[chunkIndex] = buf;
      chunkBuffers[uploadId].received++;
      // Emit progress to sender
      socket.emit('upload-progress', {
        uploadId,
        received: chunkBuffers[uploadId].received,
        total: totalChunks,
        percent: Math.round((chunkBuffers[uploadId].received / totalChunks) * 100),
      });
      // If all chunks received, assemble and broadcast
      if (chunkBuffers[uploadId].received === totalChunks) {
        const allChunks = chunkBuffers[uploadId].chunks;
        const fullBuffer = Buffer.concat(allChunks);
        // Broadcast assembled binary to all clients in room
        io.to(roomId).emit('media-binary', {
          ...chunkBuffers[uploadId].meta,
          buffer: fullBuffer,
          mimeType: chunkBuffers[uploadId].mimeType,
          id: require('uuid').v4(),
          timestamp: Date.now(),
          type:"media"
        });
        // Clean up
        delete chunkBuffers[uploadId];
      }
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
}); 