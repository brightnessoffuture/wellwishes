document.addEventListener("DOMContentLoaded", function () {
        // Get references to the buttons
        const pauseButton = document.getElementById('pauseButton');
        const startButton = document.getElementById('startButton');
        const statusElement = document.getElementById('status');
    const socket = io.connect('https://wellwishes-8bf7e15b4939.herokuapp.com/');
    const qrCode = document.getElementById('uniquetoboard');  // Query for the QR code element
    const approvedMessagesList = document.getElementById('approvedMessages');
    let lastPostTime = Date.now();
    const maxApprovedMessages = 40;
    const approvedMessagesArray = [];
    let isRepostingPaused = false;

    if (qrCode) {
        initBoard();
    } else {
        initMain();
    }

    if (pauseButton && startButton) {
        // Set up event listeners
        pauseButton.addEventListener('click', function () {
            socket.emit('toggle reposting', 'pause');
            updateStatus('Paused');
        });

        startButton.addEventListener('click', function () {
            socket.emit('toggle reposting', 'start');
            updateStatus('Showing');
        });
    }

    function updateStatus(status) {
        statusElement.textContent = `Status: ${status}`;
    }

    function initBoard() {
        console.log("Joining board room");
        socket.emit('join', 'board');

        socket.on('approved message', function(msg) {
            console.log('Approved message received:', msg);  // Log the received message
            displayApprovedMessage(msg);
        });

        socket.on('load approved messages', function (messages) {
            console.log("Received approved messages:", messages);
            messages.forEach((msg, index) => {
                let randomDelay = Math.random() * 3000;
                setTimeout(() => {
                    displayMessage(msg);
                }, randomDelay);
            });
        });

        socket.on('delete message', function (messageText, listType) {
            if (listType === 'approved') {
                const messageElements = bulletinBoard.querySelectorAll('.message');
                messageElements.forEach(messageElement => {
                    if (messageElement.textContent === messageText) {
                        messageElement.remove();
                    }
                });
                const messageIndex = approvedMessagesArray.indexOf(messageText);
                if (messageIndex > -1) {
                    approvedMessagesArray.splice(messageIndex, 1);
                }
                // Clear the repost timer for the deleted message
                clearRepostTimer(messageText);
            }
        });

        socket.on('toggle reposting', function(command) {
            if (command === 'pause') {
                isRepostingPaused = true;
            } else if (command === 'start') {
                isRepostingPaused = false;
                // Reschedule reposting for all messages if necessary
                approvedMessagesArray.forEach(msg => {
                    scheduleRepost(msg);
                });
            }
        });
        
    }

    function initMain() {
        const messageInput = document.getElementById('messageInput');
        const postButton = document.getElementById('postButton');

        if (document.getElementById('pendingMessages')) {
            console.log("Joining moderator room");
            socket.emit('join', 'moderator');
        } else {
            console.log("Joining user room");
            socket.emit('join', 'user');
        }

        socket.on('load pending messages', function (messages) {
            console.log("Received pending messages:", messages);  // New line
            for (let msg of messages) {
                addPendingMessage(msg);
            }
        });
        socket.on('load approved messages', function (messages) {
            console.log("Received approved messages:", messages);
            messages.forEach((msg, index) => {
                let randomDelay = Math.random() * 3000;
                setTimeout(() => {
                    displayMessage(msg);
                }, randomDelay);
            });
        });

        socket.on('approved message', function(msg) {
            displayApprovedMessage(msg);
        });

        postButton.addEventListener('click', () => {
            postMessage();
            console.log('Post button clicked');
        });

        messageInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' && document.activeElement === messageInput) {
                postMessage();
            }
        });

        if (document.getElementById('pendingMessages')) {
            socket.on('new message', function (msg) {
                addPendingMessage(msg);
            });
        }

    function addPendingMessage(messageText) {
        const pendingMessagesList = document.getElementById('pendingMessages');
        const pendingMessageItem = document.createElement('li');
        pendingMessageItem.textContent = messageText;
        pendingMessagesList.appendChild(pendingMessageItem);
        
        const approveButton = document.createElement('button');
approveButton.textContent = 'Approve';
approveButton.addEventListener('click', function () {
    socket.emit('approve message', messageText); // Emit an event to approve the message
    pendingMessagesList.removeChild(pendingMessageItem);
});
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', function () {
            pendingMessagesList.removeChild(pendingMessageItem);
            socket.emit('delete message', messageText, 'approved');
        });
        
        pendingMessageItem.appendChild(approveButton);
        pendingMessageItem.appendChild(deleteButton);
    }

    function postMessage() {
        const messageText = messageInput.value.trim();
        if (messageText !== '') {
            console.log('Emitting new message:', messageText);  // Add this line
            socket.emit('new message', messageText);  // Existing line
            messageInput.value = '';
        }
    }

}


    function displayMessage(messageText) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.textContent = messageText;

        // Calculate a random line that is not already occupied
        const randomLine = getRandomLine(bulletinBoard);

        // Detect and resolve collisions
        const collisionResolvedTop = resolveCollision(messageElement, randomLine);

        // Set the top position for the message
        messageElement.style.top = collisionResolvedTop + 'px';

        bulletinBoard.appendChild(messageElement);

        // Animate the message
        animateMessage(messageElement);

        // Update the last post time
        lastPostTime = Date.now();

    // Check if the Active Message List has exceeded the maximum limit
    if (approvedMessagesList && approvedMessagesList.children.length > maxApprovedMessages) {
        // Remove the oldest message from the Active Message List
        const oldestMessage = approvedMessagesList.firstElementChild;
        approvedMessagesList.removeChild(oldestMessage);
        // Clear the repost timer for the removed message
        clearRepostTimer(oldestMessage.textContent);
    }

        // Schedule reposting of the message
        scheduleRepost(messageText, messageElement);

        if (approvedMessagesList) {  // Check if approvedMessagesList is not null
            const messageListItem = createApprovedMessageItem(messageText);
            approvedMessagesList.appendChild(messageListItem);
        }
    
    }

    function getRandomLine(bulletinBoard) {
        // Calculate the available vertical space within the bulletin board
        const bulletinHeight = bulletinBoard.clientHeight;
        // Calculate the maximum number of lines based on the message height
        const maxLines = Math.floor(bulletinHeight / 20); // Adjust the line height as needed

        // Generate a random line number within the available space
        const randomLine = Math.floor(Math.random() * maxLines);

        // Calculate the vertical position based on the line number
        const lineHeight = 20; // Adjust the line height as needed
        return randomLine * lineHeight;
    }

    function animateMessage(messageElement) {
        const messageWidth = messageElement.offsetWidth;
        let posX = window.innerWidth;
    
        messageElement.style.left = posX + 'px';
    
        function step() {
            if (posX < -messageWidth) {
                // Remove the message after it passes the left edge of the bulletin
                messageElement.remove();
            } else {
                posX -= 1.5;  // Adjust this value to control the speed. Higher value = faster, Lower value = slower
                messageElement.style.left = posX + 'px';
                requestAnimationFrame(step);
            }
        }
    
        // Start the animation
        requestAnimationFrame(step);
    }

    function createApprovedMessageItem(messageText) {
        const messageListItem = document.createElement('li');
        messageListItem.textContent = messageText;
    
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', function () {
            // Remove from approved message list
            approvedMessagesList.removeChild(messageListItem);
            
            socket.emit('delete message', messageText, 'approved');

            // Remove from the bulletin board
            const bulletinMessages = bulletinBoard.querySelectorAll('.message');
            for (const msgElement of bulletinMessages) {
                if (msgElement.textContent === messageText) {
                    msgElement.remove();
                }
            }
    
            // Clear the repost timer for the removed message
            clearRepostTimer(messageText);
        });
    
        messageListItem.appendChild(deleteButton);
        
        return messageListItem;
    }

    const repostTimers = new Map();

    function scheduleRepost(messageText) {
        if (isRepostingPaused) return;  // Do nothing if reposting is paused
        console.log('Scheduling repost for:', messageText);
        // Random delay between 5 to 15 seconds for example
        let randomRepostDelay = 7000 + Math.random() * 5000;
        const repostTimer = setInterval(() => {
            if (!isRepostingPaused) {  // Check the pause flag before reposting
                postMessageFromActiveList(messageText);
            }
        }, randomRepostDelay);
    
        // Store the timer for later reference (associated with the message text)
        repostTimers.set(messageText, repostTimer);
    }
    
    function postMessageFromActiveList(messageText) {  // accept a messageText argument here
        if (isRepostingPaused) return;  // Exit early if reposting is paused
        console.log('Reposting message:', messageText);
        // Create a new message element and post it to the bulletin board
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.textContent = messageText;
    
        // Calculate a random line that is not already occupied
        const randomLine = getRandomLine(bulletinBoard);
    
        // Detect and resolve collisions
        const collisionResolvedTop = resolveCollision(messageElement, randomLine);
    
        // Set the top position for the message
        messageElement.style.top = collisionResolvedTop + 'px';
    
        bulletinBoard.appendChild(messageElement);
    
        // Animate the message
        animateMessage(messageElement);
    }


    function resolveCollision(newMessageElement, desiredTop) {
        // Get the height of a message (line height)
        const messageHeight = 20; // Adjust this value as needed

        // Find all existing messages in the bulletin
        const existingMessages = bulletinBoard.querySelectorAll('.message');

        let top = desiredTop;

        // Check for collisions with existing messages
        for (const existingMessage of existingMessages) {
            const existingTop = parseInt(existingMessage.style.top, 10);
            const existingBottom = existingTop + messageHeight;

            if (top >= existingTop && top < existingBottom) {
                // Collision detected, adjust the top position
                top = existingBottom;
            }
        }

        return top;
    }

    function clearRepostTimer(messageText) {
        const repostTimer = repostTimers.get(messageText);
        if (repostTimer) {
            clearInterval(repostTimer);
            repostTimers.delete(messageText);
            console.log('Cleared repost timer for:', messageText);  // Add this line
        }
    }

    function displayApprovedMessage(messageText) {
        const bulletinBoard = document.getElementById('bulletinBoard');
        const approvedMessagesList = document.getElementById('approvedMessages');
        if (bulletinBoard) {
            const approvedMessageItem = document.createElement('div');
            approvedMessageItem.classList.add('message');  // Assuming you have a 'message' class for styling
            approvedMessageItem.textContent = messageText;
            bulletinBoard.appendChild(approvedMessageItem);
        } else if (approvedMessagesList) {
            const messageListItem = document.createElement('li');
            messageListItem.textContent = messageText;
            approvedMessagesList.appendChild(messageListItem);
        } else {
            console.warn('No element to display the approved message found.');
        }
    }
    

});
