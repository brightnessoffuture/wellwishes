const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const pendingMessages = [
    "I am truly regretful I am unable to attend due to last minute commitments. I wish you and your wife to be a blissful marriage and have a enjoyable wedding! ",
    "Blissful marriage EX-SPL HAHA",
    "Blissful matrimony! (:",
    "Can’t wait to see y’all 手牵手 walk down the aisle together :) CONGRATS!!!",
    "Chong Hao and Lifang, wish both of you a happy & blissful marriage!白头偕老, 宠好(Chonghao)她!!",
    "Congratulations on your wedding!! May the years ahead be filled with lasting love and happiness.",
    "Chong Hao Chong Hao what an amazing day to see you move on to your next phase in life. Marriage life is great so enjoy every moment of it.",
    "Congrats Chong Hao and Lifang! 🎉Wishing the both of you a most blissful marriage!",
    "Congrats!!!!!",
    "Congratulations Chong Hao!! We can finally stop pestering you to get out of singlehood everytime we meet",
    "Ever since polytechnic days, gone through thick and thin together. Days when we were troubled how to get a girlfriend and now his marrying already. Wish chonghao all the best for marriage life, proud of him that we have come so far.",
    "Finally married",
    "From Bytedance we know each other, I wish Lifang and Chonghao be happy and supportive for each other in any circumstances.",
    "Happy wife happy life",
    "Have a blissful marriage! 早生贵子！🎉🎉🎉",
    "HB",
    "I know them very well ❤️",
    "Lifang was the first few people I met at ByteDance and we survived days in 中航广场 and 融中心 together. I miss the good coffee and walks after lunch that we had together! Wish you a very happy chapter of life ahead!!!",
    "Lions club. Welcome to the married slave club!",
    "Make as many Babies as I have",
    "Secondary school - scouts",
    "Yeetbro 🤰🏻",
    "佳偶天成，幸福美满！",
    "平安喜乐，幸福美满！",
    "恭喜🎉祝你们白头偕老，早生贵子 👶",
    "早生贵子",
    "白头偕老！",
    "祝福 Chonghao & Lifang长长久久，圆满幸福！",
    "Yeetbro 🤰🏻",
];
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
        console.log('Received new message:', msg);  // Existing line
        pendingMessages.push(msg);
        console.log('Pending Messages:', pendingMessages);  // New line
        io.to('moderator').emit('new message', msg);
        console.log('Emitting new message to moderator room');  // New line
    });

    socket.on('approve message', (msg) => {
        console.log('Approve message received:', msg);  // Log the received message
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
        console.log('Approved message emitted:', msg);  // Log the emitted message
    });

    socket.on('toggle reposting', function(command) {
        console.log('Received toggle reposting command:', command);  // Log the received command
        if (command === 'pause') {
            isRepostingPaused = true;
            console.log('Reposting is now paused');  // Log the state change
        } else if (command === 'start') {
            isRepostingPaused = false;
            console.log('Reposting is now resumed');  // Log the state change
        }
        io.emit('toggle reposting', command);  // Emit the command to all clients
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

