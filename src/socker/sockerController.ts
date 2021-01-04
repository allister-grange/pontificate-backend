const { getCurrentUser, userLeave, userJoin, getAllPlayersInGame, setPlayerToReady } = require("../dummyuser");

export default app => {

    const io = require("socket.io")(app, {
        cors: {
            origin: "http://localhost:3005",
            methods: ["GET", "POST"]
        }
    });

    //can store players in an array for now 
    //https://github.com/RishabhVerma098/gameappBackend/blob/master/server.js
    io.on("connection", async (socket) => {

        console.log("New connection");

        socket.on("playerLobbyEvent", () => {
            //* create user
            const { gameId, userName } = socket.handshake.query;
            const user = userJoin(socket.id, userName, gameId); //init new user who is not ready
            socket.join(user.gameId);
            const playersInGame = getAllPlayersInGame(gameId);
            console.log('Game ' + gameId + ' had player ' + userName + ' join');

            io.in(gameId).emit("playerLobbyEvent", {
                userId: user.id,
                userName: user.userName,
                text: `${user.userName} has joined the game`,
                playersInGame: playersInGame
            });
        });

        socket.on("playerReadyEvent", () => {
            //* get user
            const user = getCurrentUser(socket.id);

            setPlayerToReady(socket.id);

            console.log(`Player ${user.userName} is now ready in game ${user.gameId}`);
            const playersInGame = getAllPlayersInGame(user.gameId);

            //* emit message to all users that the player is ready
            console.log(playersInGame);
            
            io.in(user.gameId).emit("playerReadyEvent", {
                playersInGame
            });

        });


        // Disconnect , when user leave room
        socket.on("disconnect", () => {
            // delete user from users & emit that user has left the game
            const user = userLeave(socket.id);

            if (user) {
                console.log(`User ${user.userName} left the game`);

                io.to(user.room).emit("message", {
                    userId: user.id,
                    userName: user.userName,
                    text: `${user.userName} has left the game`,
                });
            }
        });

    });

}
