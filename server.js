const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const pendingMessages = [];
const approvedMessages = [];

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('join', (room) => {
        socket.join(room);
        if (room === 'moderator') {
            // Send all pending messages to the moderator
            socket.emit('load pending messages', pendingMessages);
        } else if (room === 'user') {
          console.log("Sending approved messages to user");
            // Send all approved messages to the user
            socket.emit('load approved messages', approvedMessages);}
    });

    socket.on('new message', (msg) => {
      // Add message to pending messages
    pendingMessages.push(msg);
        // When a user sends a message, emit it to the moderator's room
        io.to('moderator').emit('new message', msg);
    });

    socket.on('approve message', (msg) => {
      // Move the message from pending to approved
    const index = pendingMessages.indexOf(msg);
    if (index > -1) {
        pendingMessages.splice(index, 1);
        approvedMessages.push(msg);
    }
    console.log("Approved messages:", approvedMessages);
console.log("Pending messages:", pendingMessages);
        // When a moderator approves a message, emit it to all users (including other moderators)
        io.emit('approved message', msg);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
