const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // In production, set this to your frontend URL
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5050;

// ==== Socket.IO logic ====
io.on('connection', socket => {
    console.log('New client connected:', socket.id);

    socket.on('join room', roomId => {
        socket.join(roomId);
        const otherUsers = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
            .filter(id => id !== socket.id);
        socket.emit('all users', otherUsers);
    });

    socket.on('sending signal', payload => {
        io.to(payload.userToSignal).emit('user joined', {
            signal: payload.signal,
            callerID: payload.callerID
        });
    });

    socket.on('returning signal', payload => {
        io.to(payload.callerID).emit('receiving returned signal', {
            signal: payload.signal,
            id: socket.id
        });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// ==== Serve React frontend in production ====
if (process.env.NODE_ENV === 'production') {
    const buildPath = path.join(__dirname, 'clint', 'build');
    app.use(express.static(buildPath));

    app.get('*', (req, res) => {
        res.sendFile(path.join(buildPath, 'index.html'));
    });
}

// ==== Start server ====
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
