const { createServer } = require('http');
const next = require('next');
const { Server: SocketIOServer } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  // Attach Socket.IO
  const io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    cors: { origin: '*' },
    maxHttpBufferSize: 3e7, // 30MB
  });

  // In-memory message store per room
  const roomMessages = {};
  const oneTimeViews = {};

  io.on('connection', (socket) => {
    socket.on('join', (roomId) => {
      socket.join(roomId);
      socket.emit('init', roomMessages[roomId] || []);
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
  });

  const PORT = process.env.PORT || 4001;
  httpServer.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
}); 