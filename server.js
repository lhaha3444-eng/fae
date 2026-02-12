const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*", // Allows connections from Neocities/Newgrounds
        methods: ["GET", "POST"]
    }
});

let players = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Initial state for new connection
    players[socket.id] = {
        id: socket.id,
        x: 0,
        y: 0,
        direction: 'front',
        state: 'idle',
        name: 'Anonymous' // Default name
    };

    // Send the current list of players to the new person
    socket.emit('currentPlayers', players);
    
    // Tell everyone else a new person joined
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // --- HANDLE JOIN (NAME SETTING) ---
    socket.on('joinGame', (name) => {
        if (players[socket.id]) {
            // Clean the name to prevent HTML injection or super long names
            let cleanName = name.substring(0, 15).replace(/</g, "&lt;").replace(/>/g, "&gt;");
            players[socket.id].name = cleanName || "Player";
            
            // Tell everyone to update this player's name tag
            io.emit('updatePlayerName', { id: socket.id, name: players[socket.id].name });
        }
    });

    // --- HANDLE MOVEMENT ---
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].direction = movementData.direction;
            players[socket.id].state = movementData.state;
            
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    // --- HANDLE CHAT ---
    socket.on('sendMsg', (msg) => {
        if (players[socket.id]) {
            // Clean the message
            let cleanMsg = msg.substring(0, 50).replace(/</g, "&lt;").replace(/>/g, "&gt;");
            if (cleanMsg.trim().length > 0) {
                // Send message to EVERYONE (including the sender)
                io.emit('receiveMsg', {
                    id: socket.id,
                    name: players[socket.id].name,
                    text: cleanMsg
                });
            }
        }
    });

    // --- DISCONNECT ---
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete players[socket.id];
        io.emit('disconnectUser', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
