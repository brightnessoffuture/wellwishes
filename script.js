document.addEventListener("DOMContentLoaded", function () {
    const messageInput = document.getElementById('messageInput');
    const postButton = document.getElementById('postButton');
    const bulletinBoard = document.querySelector('.bulletin-board');
    const activeMessagesList = document.getElementById('activeMessages');
    let lastPostTime = Date.now(); // Track the timestamp of the last post
    const maxActiveMessages = 20; // Maximum number of active messages

    const socket = io();  // Initialize Socket.IO

    postButton.addEventListener('click', postMessage);

    // Add event listener for Enter key press only when input box is focused
    messageInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && document.activeElement === messageInput) {
            postMessage();
        }
    });

    // Listen for new messages from the server
    socket.on('new message', function (msg) {
        displayMessage(msg);
    });

    function addPendingMessage(messageText) {
        const pendingMessagesList = document.getElementById('pendingMessages');
        const pendingMessageItem = document.createElement('li');
        pendingMessageItem.textContent = messageText;
        
        const approveButton = document.createElement('button');
        approveButton.textContent = 'Approve';
        approveButton.addEventListener('click', function () {
            displayMessage(messageText);
            pendingMessagesList.removeChild(pendingMessageItem);
        });
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', function () {
            pendingMessagesList.removeChild(pendingMessageItem);
        });
        
        pendingMessageItem.appendChild(approveButton);
        pendingMessageItem.appendChild(deleteButton);
        pendingMessagesList.appendChild(pendingMessageItem);
    }

    // Modify the existing postMessage function to call addPendingMessage
    function postMessage() {
        const messageText = messageInput.value.trim();
        if (messageText !== '') {
            addPendingMessage(messageText);  // Call addPendingMessage instead of emitting a socket event
            messageInput.value = '';
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

        // Add the message to the Active Message List
        const messageListItem = createActiveMessageItem(messageText);
        activeMessagesList.appendChild(messageListItem);

        // Check if the Active Message List has exceeded the maximum limit
        if (activeMessagesList.children.length > maxActiveMessages) {
            // Remove the oldest message from the Active Message List
            const oldestMessage = activeMessagesList.firstElementChild;
            activeMessagesList.removeChild(oldestMessage);
            // Clear the repost timer for the removed message
            clearRepostTimer(oldestMessage.textContent);
        }

        // Schedule reposting of the message
        scheduleRepost(messageText, messageElement);
    
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
        // Get the width of the bulletin board
        const bulletinWidth = bulletinBoard.clientWidth;
        const messageWidth = messageElement.offsetWidth;

        let posX = window.innerWidth;

        messageElement.style.left = posX + 'px';

        function step() {
            if (posX < -messageWidth) {
                // Remove the message after it passes the left edge of the bulletin
                messageElement.remove();
            } else {
                posX -= 0.5;
                messageElement.style.left = posX + 'px';
                requestAnimationFrame(step);
            }
        }

        // Start the animation
        requestAnimationFrame(step);
    }

    function createActiveMessageItem(messageText) {
        const messageListItem = document.createElement('li');
        messageListItem.textContent = messageText;
        return messageListItem;
    }

    const repostTimers = new Map();

    function scheduleRepost(messageText, messageElement) {
        // Set a timer to repost the message every 5 seconds
        const repostTimer = setInterval(() => {
            postMessageFromActiveList(messageText);
        }, 5000);

        // Store the timer for later reference (associated with the message text)
        repostTimers.set(messageText, repostTimer);
    }

    function postMessageFromActiveList(messageText) {
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
        // Clear the repost timer associated with a message text
        const repostTimer = repostTimers.get(messageText);
        if (repostTimer) {
            clearInterval(repostTimer);
            repostTimers.delete(messageText);
        }
    }
});
