const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

let players = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    players[socket.id] = {
        id: socket.id, x: 0, y: 0, direction: 'front', state: 'idle', name: 'CHARA', isTalking: false
    };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('joinGame', (name) => {
        if (players[socket.id]) {
            let cleanName = name.substring(0, 6).replace(/</g, "&lt;").replace(/>/g, "&gt;").toUpperCase();
            players[socket.id].name = cleanName || "CHARA";
            io.emit('updatePlayerName', { id: socket.id, name: players[socket.id].name });
        }
    });

    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].direction = movementData.direction;
            players[socket.id].state = movementData.state;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    socket.on('sendMsg', (msg) => {
        if (players[socket.id]) {
            let cleanMsg = msg.substring(0, 40).replace(/</g, "&lt;").replace(/>/g, "&gt;");
            if (cleanMsg.trim().length > 0) {
                io.emit('receiveMsg', { id: socket.id, name: players[socket.id].name, text: cleanMsg });
            }
        }
    });

    // --- NEW: VOICE CHAT EVENTS ---
    socket.on('talkingState', (isTalking) => {
        if (players[socket.id]) {
            players[socket.id].isTalking = isTalking;
            socket.broadcast.emit('playerTalking', { id: socket.id, isTalking: isTalking });
        }
    });

    socket.on('voiceData', (audioBlob) => {
        // Send the audio blob to everyone else
        socket.broadcast.emit('playVoice', { id: socket.id, audio: audioBlob });
    });

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
