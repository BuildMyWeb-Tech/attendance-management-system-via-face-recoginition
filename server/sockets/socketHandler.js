const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.on('disconnect', () => console.log(`Socket disconnected: ${socket.id}`));
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket not initialized');
  return io;
};

module.exports = { initSocket, getIO };
