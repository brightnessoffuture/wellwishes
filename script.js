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

let isRepostingPaused = false;

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('join', (room) => {
        socket.join(room);
        if (room === 'moderator') {
            // Send all pending messages to the moderator
            socket.emit('load pending messages', pendingMessages);
            socket.emit('load approved messages', approvedMessages);
        } else if (room === 'user') {
            // logic for users, if any
        } else if (room === 'board') {
            // If on board view, send all approved messages to the board
            console.log("Joining board room");
            socket.emit('load approved messages', approvedMessages);
        }
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

    socket.on('toggle reposting', (command) => {  // New event handler
        if (command === 'pause') {
            isRepostingPaused = true;
        } else if (command === 'start') {
            isRepostingPaused = false;
            // Reschedule reposting for all messages if necessary
            // ...
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    socket.on('delete message', (msg, listType) => {
        let list = listType === 'approved' ? approvedMessages : pendingMessages;
        const index = list.indexOf(msg);
        if (index > -1) {
            list.splice(index, 1);
        }
                // You might want to forward the listType as well to ensure clients handle the deletion correctly
                socket.broadcast.emit('delete message', msg, listType);
        console.log(`${listType} messages after delete:`, list);
    });
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
