
    const P1 = 'X';
    const P2 = 'O';

    let player;
    let game;
  
    const hostname = 'localhost';
    const port = 5000;
  
    const socket = io.connect();//'http://'+hostname+':'+port

    class Player {
      constructor(name, type) {
        this.name = name;
        this.type = type;
        this.currentTurn = false;
        this.playsArr = 0;
      }
  
      static get wins() {
        return [7, 56, 448, 73, 146, 292, 273, 84];
      }
  
      // Set the bit of the move played by the player
      // tileValue - Bitmask used to set the recently played move.
      updatePlaysArr(tileValue) {
        this.playsArr += tileValue;
      }
  
      getPlaysArr() {
        return this.playsArr;
      }
  
      // Set the currentTurn for player to turn and update UI to reflect the same.
      setCurrentTurn(turn) {
        this.currentTurn = turn;
        //const message = turn ? 'Your turn' : 'Waiting for Opponent';
        //$('#turn').text(message);
      }
  
      getPlayerName() {
        return this.name;
      }
  
      getPlayerType() {
        return this.type;
      }
  
      getCurrentTurn() {
        return this.currentTurn;
      }
    }
  
    // roomId Id of the room in which the game is running on the server.
    class Game {
      constructor(roomId) {
        this.roomId = roomId;
        this.board = [];
        this.moves = 0;
      }
  
      // Create the Game board by attaching event listeners to the buttons.
      createGameBoard() {
        function tileClickHandler() {
          const row = parseInt(this.id.split('_')[1][0], 10);
          const col = parseInt(this.id.split('_')[1][1], 10);
          if (!player.getCurrentTurn() || !game) {
            alert('Its not your turn!');
            return;
          }
  
          if (this.disabled) {
            alert('This tile has already been played on!');
            return;
          }
  
          // Update board after your turn.
          game.playTurn(this);
          game.updateBoard(player.getPlayerType(), row, col, this.id);
  
          player.setCurrentTurn(false);
          player.updatePlaysArr(1 << ((row * 3) + col));
  
          game.checkWinner();
        }
  
        for (let i = 0; i < 3; i++) {
          this.board.push(['', '', '']);
          for (let j = 0; j < 3; j++) {
            document.getElementById("button_"+i+j).addEventListener('click', tileClickHandler);
          }
        }
      }
      // Remove the menu from DOM, display the gameboard and greet the player.
      displayBoard(message) {
        document.getElementById('initialScreen').style.display = "none";
        document.getElementById('gameScreen').style.display = "block";
        document.getElementById('gameCodeDisplay').innerText = message;
        //$('#userHello').html(message);
        this.createGameBoard();
      }
      /**
       * Update game board UI
       *
       * @param {string} type Type of player(X or O)
       * @param {int} row Row in which move was played
       * @param {int} col Col in which move was played
       * @param {string} tile Id of the the that was clicked
       */
      updateBoard(type, row, col, tile) {
        document.getElementById(tile).textContent = type;
        document.getElementById(tile).disabled = true;
        this.board[row][col] = type;
        this.moves++;
      }
  
      getRoomId() {
        return this.roomId;
      }
  
      // Send an update to the opponent to update their UI's tile
      playTurn(tile) {
        const clickedTile = tile.id;
  
        // Emit an event to update other player that you've played your turn.
        socket.emit('playTurn', {
          tile: clickedTile,
          room: this.getRoomId(),
        });
      }

      checkWinner() {
        const currentPlayerPositions = player.getPlaysArr();
  
        Player.wins.forEach((winningPosition) => {
          if ((winningPosition & currentPlayerPositions) === winningPosition) {
            game.announceWinner();
          }
        });
  
        const tieMessage = 'Game Tied :(';
        if (this.checkTie()) {
          socket.emit('gameOver', {
            room: this.getRoomId(),
            message: tieMessage,
          });
          alert(tieMessage);
          location.reload();
        }
      }
  
      checkTie() {
        return this.moves >= 9;
      }
  
      // Announce the winner if the current client has won.
      // Broadcast this on the room to let the opponent know.
      announceWinner() {
        const message =  player.name + " wins!";

        socket.emit('gameOver', {
          room: this.getRoomId(),
          message,
        });

          this.endGame(message);
      }
  
      // End the game if the other player won.
      endGame(message) {
        setTimeout(function () {
          alert(message);
          location.reload();
        }, 300);
      }
    }
  
    // Create a new game. Emit newGame event.
    document.getElementById('newGameButton').addEventListener('click', function(e) {
      const name = "Player One";
      if (!name) {
        alert('Please enter your name.');
        return;
      }
      socket.emit('createGame', { name });
      player = new Player(name, P1);
    });
  
    // Join an existing game on the entered roomId. Emit the joinGame event.
    document.getElementById('joinGameButton').addEventListener('click', function(e) {
      const name = "Player Two";
      const roomID = document.getElementById('gameCodeInput').value;
      if (!name || !roomID) {
        alert('Please enter your name and game ID.');
        return;
      }
      socket.emit('joinGame', { name, room: roomID });
      player = new Player(name, P2);
    });
  
    // New Game created by current client. Update the UI and create new Game var.
    socket.on('newGame', (data) => {
      const message = data.room;
  
      // Create game for player 1
      game = new Game(data.room);
      game.displayBoard(message);
    });
  
    /**
       * If player creates the game, he'll be P1(X) and has the first turn.
       * This event is received when opponent connects to the room.
       */
    socket.on('player1', (data) => {
      player.setCurrentTurn(true);
    });
  
    /**
       * Joined the game, so player is P2(O).
       * This event is received when P2 successfully joins the game room.
       */
    socket.on('player2', (data) => {
      const message = data.room;
  
      // Create game for player 2
      game = new Game(data.room);
      game.displayBoard(message);
      player.setCurrentTurn(false);
    });
  
    /**
       * Opponent played his turn. Update UI.
       * Allow the current player to play now.
       */
    socket.on('turnPlayed', (data) => {
      const row = data.tile.split('_')[1][0];
      const col = data.tile.split('_')[1][1];
      const opponentType = player.getPlayerType() === P1 ? P2 : P1;
  
      game.updateBoard(opponentType, row, col, data.tile);
      player.setCurrentTurn(true);
    });
  
    // If the other player wins, this event is received. Notify user game has ended.
    socket.on('gameEnd', (data) => {
      game.endGame(data.message);
      //socket.leave(parseInt(data.room));
    });
  
    /**
       * End the game on any err event.
       */
    socket.on('err', (data) => {
      if (game) {
        game.endGame(data.message);
      }
      alert('err')
    });
