const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

//const hostname = '127.0.0.1';
const port = process.env.PORT || 3000;

let rooms = 0;

app.use(express.static('.'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  // Create a new game room and notify the creator of game.
  socket.on('createGame', (data) => {
    socket.join(rooms);

      socket.emit('newGame', {
        name: data.name,
        room: rooms,
      });

      rooms++;
  });

  // Connect the Player 2 to the room he requested. Show error if room full.
  socket.on('joinGame', async (data) => {
    const roomID = parseInt(data.room);
    const room = await io.in(roomID).fetchSockets();
    //console.log(room)
    //console.log(room.length);
    if (room && room.length === 1) {
      socket.join(roomID);
      socket.broadcast.to(roomID).emit('player1', {});
      socket.emit('player2', { name: data.name, room: roomID });
    } else {
      socket.emit('err', { message: 'Sorry, The room is full!' });
    }

  });

  /**
       * Notify the players about the victor.
       */
   socket.on('gameOver', (data) => {
    roomID = parseInt(data.room);
    //console.log(data.message);
    socket.broadcast.to(roomID).emit('gameEnd', data);
    socket.leave(roomID);
  });

  /**
       * Handle the turn played by either player and notify the other.
       */
  socket.on('playTurn', (data) => {
    socket.broadcast.to(parseInt(data.room)).emit('turnPlayed', {
      tile: data.tile,
      room: data.room,
    });
  });



});


server.listen(port, () => {
  console.log('Server running on ' + port);
});