const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const PORT = 5050;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Store rooms and users
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join room', (roomID) => {
    if (rooms.has(roomID)) {
      rooms.get(roomID).push(socket.id);
    } else {
      rooms.set(roomID, [socket.id]);
    }

    const otherUsers = rooms.get(roomID).filter(id => id !== socket.id);
    socket.emit('all users', otherUsers);
  });

  socket.on('sending signal', (payload) => {
    io.to(payload.userToSignal).emit('user joined', { 
      signal: payload.signal, 
      callerID: payload.callerID 
    });
  });

  socket.on('returning signal', (payload) => {
    io.to(payload.callerID).emit('receiving returned signal', { 
      signal: payload.signal, 
      id: socket.id 
    });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    rooms.forEach((value, key) => {
      if (value.includes(socket.id)) {
        rooms.set(key, value.filter(id => id !== socket.id));
        if (rooms.get(key).length === 0) {
          rooms.delete(key);
        }
      }
    });
    socket.broadcast.emit('user left', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
