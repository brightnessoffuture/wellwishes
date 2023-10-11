const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(__dirname));

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('new message', (msg) => {
    io.emit('new message', msg);  // Broadcast the message to all clients
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('join', (room) => {
      socket.join(room);
  });

  socket.on('new message', (msg) => {
      // When a user sends a message, emit it to the moderator's room
      io.to('moderator').emit('new message', msg);
  });

  socket.on('approve message', (msg) => {
      // When a moderator approves a message, emit it to all users (including other moderators)
      io.emit('approved message', msg);
  });

  socket.on('disconnect', () => {
      console.log('user disconnected');
  });
});